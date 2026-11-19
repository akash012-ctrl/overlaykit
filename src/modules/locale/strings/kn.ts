import type { LocalizedTable } from './types';

// Kannada drafts of spec A's UI strings. Written by Kiro (AI) on 2026-11-19
// while building the table, not machine-translated at runtime, and not checked
// by a fluent speaker. Every value is 'unreviewed' (D-031). They are never
// shown while the UI language is 'en', which it stays until spec B adds a
// setting. U+200C (zero-width non-joiner) is written as an escape so it stays
// visible in review.
export const KN_STRINGS: LocalizedTable = {
  'camera.permission.checking': { text: 'ಕ್ಯಾಮೆರಾ ಅನುಮತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…', review: 'unreviewed' },
  'camera.permission.why': {
    text: 'ಫಲಕಗಳು ಮತ್ತು ಯಂತ್ರಗಳ ಮೇಲಿನ ಪಠ್ಯವನ್ನು ಓದಲು OverlayKit ಕ್ಯಾಮೆರಾವನ್ನು ಬಳಸುತ್ತದೆ.',
    review: 'unreviewed',
  },
  'camera.permission.allow': { text: 'ಕ್ಯಾಮೆರಾಗೆ ಅನುಮತಿ ನೀಡಿ', review: 'unreviewed' },
  'camera.permission.openSettings': { text: 'ಸೆಟ್ಟಿಂಗ್\u200cಗಳನ್ನು ತೆರೆಯಿರಿ', review: 'unreviewed' },
  'camera.status.starting': { text: 'ಕ್ಯಾಮೆರಾ ಆರಂಭವಾಗುತ್ತಿದೆ…', review: 'unreviewed' },
  'camera.status.ready': { text: 'ಕ್ಯಾಮೆರಾವನ್ನು ಪಠ್ಯದ ಕಡೆಗೆ ಹಿಡಿದು ಫೋಟೋ ತೆಗೆಯಿರಿ.', review: 'unreviewed' },
  'camera.unavailable': { text: 'ಕ್ಯಾಮೆರಾ ಲಭ್ಯವಿಲ್ಲ', review: 'unreviewed' },
  'camera.captureFailed': { text: 'ಫೋಟೋ ತೆಗೆಯಲು ಆಗಲಿಲ್ಲ.', review: 'unreviewed' },
  'status.capturing': { text: 'ಫೋಟೋ ತೆಗೆಯಲಾಗುತ್ತಿದೆ…', review: 'unreviewed' },
  'status.reading': { text: 'ಪಠ್ಯವನ್ನು ಓದಲಾಗುತ್ತಿದೆ…', review: 'unreviewed' },
  'still.status.shown': { text: 'ಪೂರ್ಣ ಪಠ್ಯವನ್ನು ನೋಡಲು ಲೇಬಲ್ ಅನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ.', review: 'unreviewed' },
  'ocr.noText': {
    text: 'ಯಾವುದೇ ಪಠ್ಯ ಸಿಗಲಿಲ್ಲ. ಹತ್ತಿರ ಹೋಗಿ ಅಥವಾ ಹೆಚ್ಚು ಬೆಳಕು ಬರುವಂತೆ ಮಾಡಿ.',
    review: 'unreviewed',
  },
  'ocr.lowQuality.hint': { text: 'ಹತ್ತಿರ ಹೋಗಿ ಅಥವಾ ಹೆಚ್ಚು ಬೆಳಕು ಬರುವಂತೆ ಮಾಡಿ.', review: 'unreviewed' },
  'ocr.lowQuality.marker': { text: 'ಕಡಿಮೆ ಗುಣಮಟ್ಟ', review: 'unreviewed' },
  'ocr.unsupported.marker': { text: 'ಈ ಲಿಪಿಯನ್ನು ಇನ್ನೂ ಓದಲು ಆಗುವುದಿಲ್ಲ', review: 'unreviewed' },
  'ocr.unsupported.allLines': { text: 'ಈ ಫೋಟೋದಲ್ಲಿನ ಪಠ್ಯ ಇನ್ನೂ ಓದಲು ಆಗದ ಲಿಪಿಯಲ್ಲಿದೆ.', review: 'unreviewed' },
  'ocr.engineUnavailable': { text: 'ಈ ಸಾಧನದಲ್ಲಿ ಪಠ್ಯ ಓದುವ ಸೌಲಭ್ಯ ಲಭ್ಯವಿಲ್ಲ.', review: 'unreviewed' },
  'ocr.recognitionFailed': { text: 'ಈ ಫೋಟೋದಲ್ಲಿನ ಪಠ್ಯವನ್ನು ಓದಲು ಆಗಲಿಲ್ಲ.', review: 'unreviewed' },
  'label.pending': { text: 'ಅನುವಾದಿಸಲಾಗುತ್ತಿದೆ…', review: 'unreviewed' },
  'label.notAvailable': { text: 'ಅನುವಾದ ಲಭ್ಯವಿಲ್ಲ', review: 'unreviewed' },
  'label.translated': { text: 'ಅನುವಾದಿಸಲಾಗಿದೆ', review: 'unreviewed' },
  'label.a11y': { text: '{text}. {state}', review: 'unreviewed' },
  'action.retry': { text: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', review: 'unreviewed' },
  'action.capture': { text: 'ಫೋಟೋ ತೆಗೆಯಿರಿ', review: 'unreviewed' },
  'action.closeStill': { text: 'ಫೋಟೋ ಮುಚ್ಚಿ', review: 'unreviewed' },
  'action.closeSheet': { text: 'ಮುಚ್ಚಿ', review: 'unreviewed' },
  'mode.translate': { text: 'ಅನುವಾದ', review: 'unreviewed' },
};
