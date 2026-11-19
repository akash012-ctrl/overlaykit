import { t } from '../../../locale';
import type { CamErrorCode, OcrErrorCode, TrErrorCode } from '../../../shared';
import { CAM_ERROR_CODES, OCR_ERROR_CODES, TR_ERROR_CODES } from '../../../shared';
import type { ErrorUi } from '../error-map';
import { ERROR_UI } from '../error-map';

// QE-1 mapping tests (R23.12, R25.8). The expected rows are copied from
// docs/ARCHITECTURE.md §8 ("User sees" and "Recovery") with the D-033 row for
// OCR_RECOGNITION_FAILED. The English text is checked through t(), so a
// changed string fails here too.
type Expected = {
  readonly surface: ErrorUi['surface'];
  /** The English message the user sees. */
  readonly message: string;
  /** The recovery button's English label and action, or null for "None". */
  readonly action: { readonly kind: string; readonly label: string } | null;
};

const EXPECTED: { readonly [C in CamErrorCode | OcrErrorCode | TrErrorCode]: Expected } = {
  CAM_PERMISSION_DENIED: {
    surface: { kind: 'screen', view: 'permission-denied' },
    message: 'OverlayKit uses the camera to read text on signs and machines.',
    action: { kind: 'request-permission', label: 'Allow camera' },
  },
  CAM_PERMISSION_BLOCKED: {
    surface: { kind: 'screen', view: 'permission-blocked' },
    message: 'OverlayKit uses the camera to read text on signs and machines.',
    action: { kind: 'open-settings', label: 'Open settings' },
  },
  CAM_UNAVAILABLE: {
    surface: { kind: 'screen', view: 'camera-unavailable' },
    message: 'Camera unavailable',
    action: { kind: 'retry-camera', label: 'Retry' },
  },
  CAM_CAPTURE_FAILED: {
    surface: { kind: 'screen', view: 'capture-failed' },
    message: "Couldn't take the photo.",
    action: { kind: 'retry-capture', label: 'Retry' },
  },
  OCR_ENGINE_UNAVAILABLE: {
    surface: { kind: 'screen', view: 'engine-unavailable' },
    message: "Text reading isn't available on this device.",
    action: null,
  },
  OCR_RECOGNITION_FAILED: {
    surface: { kind: 'screen', view: 'recognition-failed' },
    message: "Couldn't read the text in this photo.",
    action: { kind: 'back-to-preview', label: 'Retry' },
  },
  OCR_NO_TEXT: {
    surface: { kind: 'screen', view: 'no-text' },
    message: 'No text found. Move closer or add light.',
    action: { kind: 'back-to-preview', label: 'Retry' },
  },
  OCR_LOW_QUALITY: {
    surface: { kind: 'screen', view: 'still' },
    message: 'Move closer or add light.',
    action: { kind: 'back-to-preview', label: 'Retry' },
  },
  OCR_UNSUPPORTED_SCRIPT: {
    surface: { kind: 'label', labelState: 'unsupported' },
    message: "This script can't be read yet",
    action: null,
  },
  TR_NOT_CONFIGURED: {
    surface: { kind: 'label', labelState: 'failed' },
    message: 'Translation not available',
    action: null,
  },
};

describe('ERROR_UI', () => {
  const ALL_CODES = [...CAM_ERROR_CODES, ...OCR_ERROR_CODES, ...TR_ERROR_CODES];

  it('maps exactly the CAM, OCR and TR codes of spec A', () => {
    expect(Object.keys(ERROR_UI).sort()).toEqual([...ALL_CODES].sort());
  });

  it.each(ALL_CODES)('maps %s to its ARCHITECTURE.md §8 state', (code) => {
    const ui = ERROR_UI[code];
    const expected = EXPECTED[code];
    expect(ui.surface).toEqual(expected.surface);
    expect(t(ui.messageKey)).toBe(expected.message);
    expect(ui.action === null ? null : { kind: ui.action.kind, label: t(ui.action.labelKey) }).toEqual(expected.action);
  });
});
