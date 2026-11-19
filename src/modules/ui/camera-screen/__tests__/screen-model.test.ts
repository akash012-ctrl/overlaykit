import type { CameraState, PermissionState } from '../../../capture';
import { t } from '../../../locale';
import type { FrameRef, OcrResult, Quad } from '../../../shared';
import { ERROR_UI } from '../error-map';
import type { EngineState, Flow, ScreenEvent, ScreenModel } from '../screen-model';
import { INITIAL_SCREEN_MODEL, previewActive, screenReducer, toScreenView } from '../screen-model';

// Hand-built frames and results for the state machine. They exercise the
// reducer, not OCR: no recorded snapshot is needed to test state transitions.

const QUAD: Quad = [
  { x: 100, y: 200 },
  { x: 900, y: 200 },
  { x: 900, y: 280 },
  { x: 100, y: 280 },
];

function frame(id: string): FrameRef {
  return {
    frameId: id,
    capturedAtMs: 100,
    size: { width: 3000, height: 4000 },
    source: 'still',
    mirrored: false,
    pixels: { kind: 'file', uri: `file:///cache/overlaykit-stills/${id}.jpg` },
  };
}

function result(id: string, fields: Partial<OcrResult> = {}): OcrResult {
  return {
    frameId: id,
    capturedAtMs: 100,
    imageSize: { width: 3000, height: 4000 },
    lines: [{ script: 'latin', text: 'TICKETS', quad: QUAD }],
    excludedLineCount: 0,
    ...fields,
  };
}

const UNSUPPORTED_ONLY = result('still-1', {
  lines: [{ script: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT', quad: QUAD }],
});

function run(events: readonly ScreenEvent[], start: ScreenModel = INITIAL_SCREEN_MODEL): ScreenModel {
  return events.reduce(screenReducer, start);
}

const READY_EVENTS: readonly ScreenEvent[] = [
  { type: 'permission-changed', state: { kind: 'granted' } },
  { type: 'engine-checked', result: { ok: true, value: undefined } },
  { type: 'camera-changed', state: { kind: 'ready' } },
];
const READY = run(READY_EVENTS);

function reading(id = 'still-1'): ScreenModel {
  return run(
    [
      { type: 'capture-started' },
      { type: 'capture-finished', result: { ok: true, value: frame(id) } },
    ],
    READY,
  );
}

describe('screenReducer', () => {
  it('starts by checking permission', () => {
    expect(toScreenView(INITIAL_SCREEN_MODEL).kind).toBe('checking-permission');
  });

  it('shows "Starting camera…" until the camera and the engine are ready, then the preview', () => {
    const granted = run(READY_EVENTS.slice(0, 1));
    expect(toScreenView(granted)).toMatchObject({ kind: 'camera-starting', messageKey: 'camera.status.starting' });
    expect(toScreenView(run(READY_EVENTS.slice(0, 2)))).toMatchObject({ kind: 'camera-starting' });
    expect(toScreenView(READY)).toMatchObject({ kind: 'preview', messageKey: 'camera.status.ready', captureEnabled: true });
  });

  it('runs the freeze-frame flow: capture, read, show the still, dismiss', () => {
    const capturing = screenReducer(READY, { type: 'capture-started' });
    expect(toScreenView(capturing)).toMatchObject({ kind: 'capturing', messageKey: 'status.capturing' });

    const read = reading();
    expect(toScreenView(read)).toMatchObject({ kind: 'reading', frameId: 'still-1', messageKey: 'status.reading' });
    expect(previewActive(read)).toBe(false); // DD-9: the preview is inactive under a still

    const still = screenReducer(read, { type: 'ocr-finished', frameId: 'still-1', result: { ok: true, value: result('still-1') } });
    expect(toScreenView(still)).toMatchObject({
      kind: 'still',
      frameId: 'still-1',
      messageKey: 'still.status.shown',
      action: null,
      lowQuality: false,
    });

    const back = screenReducer(still, { type: 'still-dismissed' });
    expect(back.flow).toEqual({ kind: 'preview' });
    expect(toScreenView(back).kind).toBe('camera-starting'); // the preview restarts (DD-9)
    expect(toScreenView(screenReducer(back, { type: 'camera-changed', state: { kind: 'ready' } })).kind).toBe('preview');
  });

  it('shows CAM_CAPTURE_FAILED over the preview, and Retry captures again', () => {
    const failed = run(
      [
        { type: 'capture-started' },
        { type: 'capture-finished', result: { ok: false, error: 'CAM_CAPTURE_FAILED' } },
      ],
      READY,
    );
    expect(toScreenView(failed)).toMatchObject({ kind: 'capture-failed', code: 'CAM_CAPTURE_FAILED', captureEnabled: true });
    expect(previewActive(failed)).toBe(true);
    expect(screenReducer(failed, { type: 'capture-started' }).flow).toEqual({ kind: 'capturing' });
  });

  it('discards an OCR result for a frame that is not being read (R15.7)', () => {
    const read = reading('still-2');
    const late = screenReducer(read, { type: 'ocr-finished', frameId: 'still-1', result: { ok: true, value: result('still-1') } });
    expect(late).toBe(read);
  });

  it('discards an ok result whose own frameId differs from the frame being read', () => {
    const read = reading('still-2');
    const mismatched = screenReducer(read, { type: 'ocr-finished', frameId: 'still-2', result: { ok: true, value: result('still-1') } });
    expect(mismatched).toBe(read);
  });

  it('returns the same model for a capture that finishes after the app went to the background', () => {
    // The hook sees the unchanged model and releases the still (contract in screenReducer).
    const capturing = screenReducer(READY, { type: 'capture-started' });
    const background = screenReducer(capturing, { type: 'app-background' });
    expect(screenReducer(background, { type: 'capture-finished', result: { ok: true, value: frame('still-1') } })).toBe(background);
  });

  it('discards an OCR result after the still was dismissed', () => {
    const dismissed = screenReducer(reading(), { type: 'still-dismissed' });
    const late = screenReducer(dismissed, { type: 'ocr-finished', frameId: 'still-1', result: { ok: true, value: result('still-1') } });
    expect(late).toBe(dismissed);
  });

  it.each([
    ['OCR_NO_TEXT', 'no-text', 'ocr.noText'],
    ['OCR_RECOGNITION_FAILED', 'recognition-failed', 'ocr.recognitionFailed'],
  ] as const)('shows %s with Retry back to the preview', (code, kind, messageKey) => {
    const model = screenReducer(reading(), { type: 'ocr-finished', frameId: 'still-1', result: { ok: false, error: code } });
    expect(toScreenView(model)).toMatchObject({
      kind,
      code,
      frameId: 'still-1',
      messageKey,
      action: { kind: 'back-to-preview', labelKey: 'action.retry' },
    });
    expect(screenReducer(model, { type: 'still-dismissed' }).flow).toEqual({ kind: 'preview' });
  });

  it('treats OCR_ENGINE_UNAVAILABLE during a read as the engine state, with capture and Translate disabled', () => {
    const model = screenReducer(reading(), {
      type: 'ocr-finished',
      frameId: 'still-1',
      result: { ok: false, error: 'OCR_ENGINE_UNAVAILABLE' },
    });
    expect(model.flow).toEqual({ kind: 'preview' });
    expect(toScreenView(model)).toMatchObject({
      kind: 'engine-unavailable',
      captureEnabled: false,
      translateEnabled: false,
      action: null,
    });
    expect(previewActive(model)).toBe(true); // R8.8: the preview stays visible
  });

  it('ignores capture while the engine is unavailable or the camera is not ready', () => {
    const noEngine = screenReducer(READY, { type: 'engine-checked', result: { ok: false, error: 'OCR_ENGINE_UNAVAILABLE' } });
    expect(screenReducer(noEngine, { type: 'capture-started' })).toBe(noEngine);
    const starting = run(READY_EVENTS.slice(0, 2));
    expect(screenReducer(starting, { type: 'capture-started' })).toBe(starting);
  });

  it('shows CAM_UNAVAILABLE with Retry, and Retry restarts the camera', () => {
    const lost = screenReducer(READY, { type: 'camera-changed', state: { kind: 'unavailable', code: 'CAM_UNAVAILABLE' } });
    expect(toScreenView(lost)).toMatchObject({ kind: 'camera-unavailable', code: 'CAM_UNAVAILABLE' });
    const retried = screenReducer(lost, { type: 'retry-camera' });
    expect(toScreenView(retried).kind).toBe('camera-starting');
    expect(screenReducer(READY, { type: 'retry-camera' })).toBe(READY);
  });

  it('ignores camera reports while a still is shown', () => {
    const read = reading();
    expect(screenReducer(read, { type: 'camera-changed', state: { kind: 'unavailable', code: 'CAM_UNAVAILABLE' } })).toBe(read);
  });

  it('releases everything in the background and re-reads permission on return (R1.9, R2.7, R2.8, R4.7)', () => {
    const still = screenReducer(reading(), { type: 'ocr-finished', frameId: 'still-1', result: { ok: true, value: result('still-1') } });
    const background = screenReducer(still, { type: 'app-background' });
    expect(background.flow).toEqual({ kind: 'preview' });
    expect(background.appActive).toBe(false);
    expect(previewActive(background)).toBe(false);

    const foreground = screenReducer(background, { type: 'app-foreground' });
    expect(foreground.appActive).toBe(true);
    expect(toScreenView(foreground).kind).toBe('checking-permission');

    const blocked = screenReducer(foreground, {
      type: 'permission-changed',
      state: { kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' },
    });
    expect(toScreenView(blocked)).toMatchObject({
      kind: 'permission-blocked',
      action: { kind: 'open-settings', labelKey: 'camera.permission.openSettings' },
    });
  });

  it('shows the denied state with "Allow camera" (R1.4)', () => {
    const denied = screenReducer(INITIAL_SCREEN_MODEL, {
      type: 'permission-changed',
      state: { kind: 'denied', code: 'CAM_PERMISSION_DENIED' },
    });
    expect(toScreenView(denied)).toMatchObject({
      kind: 'permission-denied',
      messageKey: 'camera.permission.why',
      action: { kind: 'request-permission', labelKey: 'camera.permission.allow' },
    });
    expect(previewActive(denied)).toBe(false);
  });

  it('shows the low-quality hint with Retry on a low-quality still (R8.4)', () => {
    const model = screenReducer(reading(), {
      type: 'ocr-finished',
      frameId: 'still-1',
      result: { ok: true, value: result('still-1', { qualityFlag: 'OCR_LOW_QUALITY' }) },
    });
    expect(toScreenView(model)).toMatchObject({
      kind: 'still',
      lowQuality: true,
      messageKey: 'ocr.lowQuality.hint',
      action: { kind: 'back-to-preview', labelKey: 'action.retry' },
    });
  });

  it('says the script cannot be read when every line is unsupported', () => {
    const model = screenReducer(reading(), { type: 'ocr-finished', frameId: 'still-1', result: { ok: true, value: UNSUPPORTED_ONLY } });
    expect(toScreenView(model)).toMatchObject({ kind: 'still', messageKey: 'ocr.unsupported.allLines', action: null });
  });
});

describe('toScreenView over every state combination', () => {
  const PERMISSIONS: PermissionState[] = [
    { kind: 'checking' },
    { kind: 'undetermined' },
    { kind: 'granted' },
    { kind: 'denied', code: 'CAM_PERMISSION_DENIED' },
    { kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' },
  ];
  const ENGINES: EngineState[] = [{ kind: 'checking' }, { kind: 'ready' }, { kind: 'unavailable', code: 'OCR_ENGINE_UNAVAILABLE' }];
  const CAMERAS: CameraState[] = [{ kind: 'starting' }, { kind: 'ready' }, { kind: 'unavailable', code: 'CAM_UNAVAILABLE' }];
  const FLOWS: Flow[] = [
    { kind: 'preview' },
    { kind: 'capturing' },
    { kind: 'capture-failed', code: 'CAM_CAPTURE_FAILED' },
    { kind: 'reading', frame: frame('still-1') },
    { kind: 'still', frame: frame('still-1'), result: result('still-1') },
    { kind: 'still', frame: frame('still-1'), result: result('still-1', { qualityFlag: 'OCR_LOW_QUALITY' }) },
    { kind: 'still', frame: frame('still-1'), result: UNSUPPORTED_ONLY },
    { kind: 'still-error', frame: frame('still-1'), code: 'OCR_NO_TEXT' },
    { kind: 'still-error', frame: frame('still-1'), code: 'OCR_RECOGNITION_FAILED' },
  ];
  const models: ScreenModel[] = PERMISSIONS.flatMap((permission) =>
    ENGINES.flatMap((engine) =>
      CAMERAS.flatMap((camera) =>
        FLOWS.flatMap((flow) => [true, false].map((appActive) => ({ permission, engine, camera, flow, appActive }))),
      ),
    ),
  );

  it('covers 810 combinations', () => {
    expect(models).toHaveLength(5 * 3 * 3 * 9 * 2);
  });

  it('gives every combination a view with a non-empty message (R18.4)', () => {
    for (const model of models) {
      const view = toScreenView(model);
      expect(t(view.messageKey).trim().length).toBeGreaterThan(0);
      if (view.action) expect(t(view.action.labelKey).trim().length).toBeGreaterThan(0);
    }
  });

  it('applies the precedence permission, engine, still flows, camera, preview flows', () => {
    for (const model of models) {
      const { kind } = toScreenView(model);
      const p = model.permission.kind;
      if (p === 'checking' || p === 'undetermined') expect(kind).toBe('checking-permission');
      else if (p === 'denied') expect(kind).toBe('permission-denied');
      else if (p === 'blocked') expect(kind).toBe('permission-blocked');
      else if (model.engine.kind === 'unavailable') expect(kind).toBe('engine-unavailable');
      else if (['reading', 'still', 'still-error'].includes(model.flow.kind)) {
        expect(['reading', 'still', 'no-text', 'recognition-failed']).toContain(kind);
      } else if (model.camera.kind === 'unavailable') expect(kind).toBe('camera-unavailable');
      else if (model.camera.kind === 'starting' || model.engine.kind === 'checking') expect(kind).toBe('camera-starting');
      else expect(['preview', 'capturing', 'capture-failed']).toContain(kind);
    }
  });

  it('enables capture only in the preview and after a failed capture, and disables Translate only without the engine', () => {
    for (const model of models) {
      const view = toScreenView(model);
      expect(view.captureEnabled).toBe(view.kind === 'preview' || view.kind === 'capture-failed');
      expect(view.translateEnabled).toBe(view.kind !== 'engine-unavailable');
    }
  });

  it('uses the ERROR_UI message and action for every error view', () => {
    for (const model of models) {
      const view = toScreenView(model);
      if (!('code' in view)) continue;
      const ui = ERROR_UI[view.code];
      expect(ui.surface).toEqual({ kind: 'screen', view: view.kind });
      expect(view.messageKey).toBe(ui.messageKey);
      expect(view.action).toEqual(ui.action);
    }
  });
});
