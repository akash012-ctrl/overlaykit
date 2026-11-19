import type { CameraState, PermissionState } from '../../capture';
import type { StringKey } from '../../locale';
import type { OcrFailureCode } from '../../ocr';
import type { FrameId, FrameRef, OcrResult, Result } from '../../shared';
import { ERROR_UI } from './error-map';

// The Camera_Screen state machine (design.md, "Screen model"). Pure: no React,
// no camera, no timers. The hook in task 11.1 runs the side effects.

export type EngineState =
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'unavailable'; readonly code: 'OCR_ENGINE_UNAVAILABLE' };

export type Flow =
  | { readonly kind: 'preview' }
  | { readonly kind: 'capturing' }
  | { readonly kind: 'capture-failed'; readonly code: 'CAM_CAPTURE_FAILED' }
  | { readonly kind: 'reading'; readonly frame: FrameRef }
  | { readonly kind: 'still'; readonly frame: FrameRef; readonly result: OcrResult }
  | { readonly kind: 'still-error'; readonly frame: FrameRef; readonly code: 'OCR_NO_TEXT' | 'OCR_RECOGNITION_FAILED' };

export type ScreenModel = {
  readonly permission: PermissionState;
  readonly engine: EngineState;
  readonly camera: CameraState;
  readonly appActive: boolean;
  readonly flow: Flow;
};

export type ScreenEvent =
  | { readonly type: 'permission-changed'; readonly state: PermissionState }
  | { readonly type: 'engine-checked'; readonly result: Result<void, 'OCR_ENGINE_UNAVAILABLE'> }
  | { readonly type: 'camera-changed'; readonly state: CameraState }
  | { readonly type: 'capture-started' }
  | { readonly type: 'capture-finished'; readonly result: Result<FrameRef, 'CAM_CAPTURE_FAILED'> }
  | { readonly type: 'ocr-finished'; readonly frameId: FrameId; readonly result: Result<OcrResult, OcrFailureCode> }
  | { readonly type: 'still-dismissed' }
  | { readonly type: 'retry-camera' }
  | { readonly type: 'app-background' }
  | { readonly type: 'app-foreground' };

export type ScreenActionKind = 'request-permission' | 'open-settings' | 'retry-camera' | 'retry-capture' | 'back-to-preview';
export type ScreenAction = { readonly kind: ScreenActionKind; readonly labelKey: StringKey };

type ViewBase<K extends string> = {
  readonly kind: K;
  /** Every view carries a message, so the screen always shows text (R18.4). */
  readonly messageKey: StringKey;
  readonly action: ScreenAction | null;
  readonly captureEnabled: boolean;
  readonly translateEnabled: boolean;
};

export type ScreenView =
  | ViewBase<'checking-permission'>
  | (ViewBase<'permission-denied'> & { readonly code: 'CAM_PERMISSION_DENIED' })
  | (ViewBase<'permission-blocked'> & { readonly code: 'CAM_PERMISSION_BLOCKED' })
  | (ViewBase<'engine-unavailable'> & { readonly code: 'OCR_ENGINE_UNAVAILABLE' })
  | ViewBase<'camera-starting'>
  | (ViewBase<'camera-unavailable'> & { readonly code: 'CAM_UNAVAILABLE' })
  | ViewBase<'preview'>
  | ViewBase<'capturing'>
  | (ViewBase<'capture-failed'> & { readonly code: 'CAM_CAPTURE_FAILED' })
  | (ViewBase<'reading'> & { readonly frameId: FrameId })
  | (ViewBase<'still'> & { readonly frameId: FrameId; readonly lowQuality: boolean })
  | (ViewBase<'no-text'> & { readonly frameId: FrameId; readonly code: 'OCR_NO_TEXT' })
  | (ViewBase<'recognition-failed'> & { readonly frameId: FrameId; readonly code: 'OCR_RECOGNITION_FAILED' });

export type ScreenViewKind = ScreenView['kind'];

const PREVIEW: Flow = { kind: 'preview' };
const CAMERA_STARTING: CameraState = { kind: 'starting' };

export const INITIAL_SCREEN_MODEL: ScreenModel = {
  permission: { kind: 'checking' },
  engine: { kind: 'checking' },
  camera: CAMERA_STARTING,
  appActive: true,
  flow: PREVIEW,
};

function stillShown(flow: Flow): flow is Extract<Flow, { frame: FrameRef }> {
  return flow.kind === 'reading' || flow.kind === 'still' || flow.kind === 'still-error';
}

/**
 * true only when the app is active, permission is granted and the flow is
 * preview, capturing or capture-failed. The preview is inactive while a still
 * is shown (DD-9) and in the background (R2.7).
 */
export function previewActive(model: ScreenModel): boolean {
  return model.appActive && model.permission.kind === 'granted' && !stillShown(model.flow);
}

function canCapture(model: ScreenModel): boolean {
  return (
    previewActive(model) &&
    model.engine.kind === 'ready' &&
    model.camera.kind === 'ready' &&
    (model.flow.kind === 'preview' || model.flow.kind === 'capture-failed')
  );
}

/** Back to the live preview: overlays go with the still, and the camera restarts (DD-9). */
function backToPreview(model: ScreenModel): ScreenModel {
  return { ...model, flow: PREVIEW, camera: CAMERA_STARTING };
}

/** Events that don't apply to the current state return the same model object. */
export function screenReducer(model: ScreenModel, event: ScreenEvent): ScreenModel {
  switch (event.type) {
    case 'permission-changed':
      if (event.state.kind === 'granted') {
        return { ...model, permission: event.state };
      }
      return { ...backToPreview(model), permission: event.state };

    case 'engine-checked':
      return {
        ...model,
        engine: event.result.ok ? { kind: 'ready' } : { kind: 'unavailable', code: 'OCR_ENGINE_UNAVAILABLE' },
      };

    case 'camera-changed':
      // Reports from a preview that is shutting down (still shown, background) are ignored.
      return previewActive(model) ? { ...model, camera: event.state } : model;

    case 'capture-started':
      return canCapture(model) ? { ...model, flow: { kind: 'capturing' } } : model;

    case 'capture-finished':
      // Contract with the hook (task 11.1): when an ok FrameRef arrives after the
      // flow left 'capturing' (background, permission change), the same model is
      // returned and the hook must call releaseStill(frame), so no still is orphaned.
      if (model.flow.kind !== 'capturing') return model;
      return {
        ...model,
        flow: event.result.ok
          ? { kind: 'reading', frame: event.result.value }
          : { kind: 'capture-failed', code: 'CAM_CAPTURE_FAILED' },
      };

    case 'ocr-finished': {
      const flow = model.flow;
      // A result for a frame that isn't being read is discarded (R15.7).
      if (flow.kind !== 'reading' || flow.frame.frameId !== event.frameId) return model;
      if (event.result.ok) {
        // The result must carry the same frame too, or the overlay reducer would drop it.
        if (event.result.value.frameId !== flow.frame.frameId) return model;
        return { ...model, flow: { kind: 'still', frame: flow.frame, result: event.result.value } };
      }
      if (event.result.error === 'OCR_ENGINE_UNAVAILABLE') {
        return { ...backToPreview(model), engine: { kind: 'unavailable', code: 'OCR_ENGINE_UNAVAILABLE' } };
      }
      return { ...model, flow: { kind: 'still-error', frame: flow.frame, code: event.result.error } };
    }

    case 'still-dismissed':
      return stillShown(model.flow) ? backToPreview(model) : model;

    case 'retry-camera':
      return model.camera.kind === 'unavailable' ? { ...model, camera: CAMERA_STARTING } : model;

    case 'app-background':
      // The hook also purges the stills and clears the overlays (R4.4, R4.7).
      return { ...backToPreview(model), appActive: false };

    case 'app-foreground':
      // Permission is re-read, because it may have changed in Android settings (R1.9).
      return model.appActive ? model : { ...model, appActive: true, permission: { kind: 'checking' } };
  }
}

function view<K extends ScreenViewKind>(
  kind: K,
  messageKey: StringKey,
  options: { action?: ScreenAction | null; captureEnabled?: boolean; translateEnabled?: boolean } = {},
): ViewBase<K> {
  return {
    kind,
    messageKey,
    action: options.action ?? null,
    captureEnabled: options.captureEnabled ?? false,
    translateEnabled: options.translateEnabled ?? true,
  };
}

/**
 * Exactly one view for the model, with precedence permission, then engine,
 * then the still flows (reading, still, still-error), then camera, then the
 * preview flows. The still flows come before camera because the preview is
 * inactive while a still is shown (DD-9), so the camera state doesn't apply.
 * design.md lists "permission, engine, camera, flow"; see its Open Design Points.
 */
export function toScreenView(model: ScreenModel): ScreenView {
  const { permission, engine, camera, flow } = model;

  if (permission.kind === 'checking' || permission.kind === 'undetermined') {
    return view('checking-permission', 'camera.permission.checking');
  }
  if (permission.kind === 'denied') {
    const ui = ERROR_UI.CAM_PERMISSION_DENIED;
    return { ...view('permission-denied', ui.messageKey, { action: ui.action }), code: permission.code };
  }
  if (permission.kind === 'blocked') {
    const ui = ERROR_UI.CAM_PERMISSION_BLOCKED;
    return { ...view('permission-blocked', ui.messageKey, { action: ui.action }), code: permission.code };
  }

  if (engine.kind === 'unavailable') {
    const ui = ERROR_UI.OCR_ENGINE_UNAVAILABLE;
    return {
      ...view('engine-unavailable', ui.messageKey, { action: ui.action, translateEnabled: false }),
      code: engine.code,
    };
  }

  switch (flow.kind) {
    case 'reading':
      return { ...view('reading', 'status.reading'), frameId: flow.frame.frameId };
    case 'still': {
      const lowQuality = flow.result.qualityFlag === 'OCR_LOW_QUALITY';
      const allUnsupported = flow.result.lines.every((line) => line.script === 'unsupported');
      if (lowQuality) {
        const ui = ERROR_UI.OCR_LOW_QUALITY;
        return { ...view('still', ui.messageKey, { action: ui.action }), frameId: flow.frame.frameId, lowQuality };
      }
      const messageKey: StringKey = allUnsupported ? 'ocr.unsupported.allLines' : 'still.status.shown';
      return { ...view('still', messageKey), frameId: flow.frame.frameId, lowQuality };
    }
    case 'still-error': {
      const frameId = flow.frame.frameId;
      if (flow.code === 'OCR_NO_TEXT') {
        const ui = ERROR_UI.OCR_NO_TEXT;
        return { ...view('no-text', ui.messageKey, { action: ui.action }), frameId, code: flow.code };
      }
      const ui = ERROR_UI.OCR_RECOGNITION_FAILED;
      return { ...view('recognition-failed', ui.messageKey, { action: ui.action }), frameId, code: flow.code };
    }
    case 'preview':
    case 'capturing':
    case 'capture-failed':
      break;
  }

  if (camera.kind === 'unavailable') {
    const ui = ERROR_UI.CAM_UNAVAILABLE;
    return { ...view('camera-unavailable', ui.messageKey, { action: ui.action }), code: camera.code };
  }
  if (camera.kind === 'starting' || engine.kind === 'checking') {
    return view('camera-starting', 'camera.status.starting');
  }

  switch (flow.kind) {
    case 'capturing':
      return view('capturing', 'status.capturing');
    case 'capture-failed': {
      const ui = ERROR_UI.CAM_CAPTURE_FAILED;
      return { ...view('capture-failed', ui.messageKey, { action: ui.action, captureEnabled: true }), code: flow.code };
    }
    case 'preview':
      return view('preview', 'camera.status.ready', { captureEnabled: true });
  }
}
