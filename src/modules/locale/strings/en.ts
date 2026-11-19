// English UI strings for spec A's screens (design.md, "String keys added by
// this spec"). This table is the key source: every key here must exist in the
// hi and kn tables, which the type system and strings.test.ts both check.
// One whole sentence per key, with {name} placeholders (R20.5).
export const EN_STRINGS = {
  'camera.permission.checking': 'Checking camera permission…',
  'camera.permission.why': 'OverlayKit uses the camera to read text on signs and machines.',
  'camera.permission.allow': 'Allow camera',
  'camera.permission.openSettings': 'Open settings',
  'camera.status.starting': 'Starting camera…',
  'camera.status.ready': 'Point the camera at text and take a photo.',
  'camera.unavailable': 'Camera unavailable',
  'camera.captureFailed': "Couldn't take the photo.",
  'status.capturing': 'Taking photo…',
  'status.reading': 'Reading text…',
  'still.status.shown': 'Tap a label to see all of it.',
  'ocr.noText': 'No text found. Move closer or add light.',
  'ocr.lowQuality.hint': 'Move closer or add light.',
  'ocr.lowQuality.marker': 'Low quality',
  'ocr.unsupported.marker': "This script can't be read yet",
  'ocr.unsupported.allLines': "The text in this photo uses a script that can't be read yet.",
  'ocr.engineUnavailable': "Text reading isn't available on this device.",
  'ocr.recognitionFailed': "Couldn't read the text in this photo.",
  'label.pending': 'Translating…',
  'label.notAvailable': 'Translation not available',
  'label.translated': 'Translated',
  'label.a11y': '{text}. {state}',
  'action.retry': 'Retry',
  'action.capture': 'Take photo',
  'action.closeStill': 'Close photo',
  'action.closeSheet': 'Close',
  'mode.translate': 'Translate',
} as const;

export type StringKey = keyof typeof EN_STRINGS;
