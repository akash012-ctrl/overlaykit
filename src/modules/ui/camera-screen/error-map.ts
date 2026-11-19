import type { StringKey } from '../../locale';
import type { CamErrorCode, OcrErrorCode, TrErrorCode } from '../../shared';
import type { ScreenAction, ScreenViewKind } from './screen-model';

/** Where a code shows up: as the screen's state, or as one label's state. */
export type ErrorSurface =
  | { readonly kind: 'screen'; readonly view: ScreenViewKind }
  | { readonly kind: 'label'; readonly labelState: 'failed' | 'unsupported' };

export type ErrorUi = {
  readonly surface: ErrorSurface;
  readonly messageKey: StringKey;
  readonly action: ScreenAction | null;
};

export type MappedErrorCode = CamErrorCode | OcrErrorCode | TrErrorCode;

const RETRY = 'action.retry' satisfies StringKey;

/**
 * Every CAM_*, OCR_* and TR_* code in spec A, mapped to the UI state in
 * docs/ARCHITECTURE.md §8 (R23.12). The mapped type makes a missing code a
 * type error. toScreenView builds its error views from this table.
 */
export const ERROR_UI: { readonly [C in MappedErrorCode]: ErrorUi } = {
  CAM_PERMISSION_DENIED: {
    surface: { kind: 'screen', view: 'permission-denied' },
    messageKey: 'camera.permission.why',
    action: { kind: 'request-permission', labelKey: 'camera.permission.allow' },
  },
  CAM_PERMISSION_BLOCKED: {
    surface: { kind: 'screen', view: 'permission-blocked' },
    messageKey: 'camera.permission.why',
    action: { kind: 'open-settings', labelKey: 'camera.permission.openSettings' },
  },
  CAM_UNAVAILABLE: {
    surface: { kind: 'screen', view: 'camera-unavailable' },
    messageKey: 'camera.unavailable',
    action: { kind: 'retry-camera', labelKey: RETRY },
  },
  CAM_CAPTURE_FAILED: {
    surface: { kind: 'screen', view: 'capture-failed' },
    messageKey: 'camera.captureFailed',
    action: { kind: 'retry-capture', labelKey: RETRY },
  },
  OCR_ENGINE_UNAVAILABLE: {
    // No recovery in the app (ARCHITECTURE.md §8). Capture and Translate are disabled.
    surface: { kind: 'screen', view: 'engine-unavailable' },
    messageKey: 'ocr.engineUnavailable',
    action: null,
  },
  OCR_RECOGNITION_FAILED: {
    surface: { kind: 'screen', view: 'recognition-failed' },
    messageKey: 'ocr.recognitionFailed',
    action: { kind: 'back-to-preview', labelKey: RETRY },
  },
  OCR_NO_TEXT: {
    surface: { kind: 'screen', view: 'no-text' },
    messageKey: 'ocr.noText',
    action: { kind: 'back-to-preview', labelKey: RETRY },
  },
  OCR_LOW_QUALITY: {
    // The still stays shown with the hint; its labels are dimmed and marked (R8.4, R8.5).
    surface: { kind: 'screen', view: 'still' },
    messageKey: 'ocr.lowQuality.hint',
    action: { kind: 'back-to-preview', labelKey: RETRY },
  },
  OCR_UNSUPPORTED_SCRIPT: {
    surface: { kind: 'label', labelState: 'unsupported' },
    messageKey: 'ocr.unsupported.marker',
    action: null,
  },
  TR_NOT_CONFIGURED: {
    surface: { kind: 'label', labelState: 'failed' },
    messageKey: 'label.notAvailable',
    action: null,
  },
};
