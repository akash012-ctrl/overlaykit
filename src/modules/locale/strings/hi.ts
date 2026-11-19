import type { LocalizedTable } from './types';

// Hindi drafts of spec A's UI strings. Written by Kiro (AI) on 2026-11-19 while
// building the table, not machine-translated at runtime, and not checked by a
// fluent speaker. Every value is 'unreviewed' (D-031). They are never shown
// while the UI language is 'en', which it stays until spec B adds a setting.
export const HI_STRINGS: LocalizedTable = {
  'camera.permission.checking': { text: 'कैमरे की अनुमति जाँची जा रही है…', review: 'unreviewed' },
  'camera.permission.why': {
    text: 'OverlayKit साइनबोर्ड और मशीनों पर लिखा टेक्स्ट पढ़ने के लिए कैमरे का इस्तेमाल करता है।',
    review: 'unreviewed',
  },
  'camera.permission.allow': { text: 'कैमरे की अनुमति दें', review: 'unreviewed' },
  'camera.permission.openSettings': { text: 'सेटिंग खोलें', review: 'unreviewed' },
  'camera.status.starting': { text: 'कैमरा शुरू हो रहा है…', review: 'unreviewed' },
  'camera.status.ready': { text: 'कैमरे को टेक्स्ट की ओर करें और फ़ोटो लें।', review: 'unreviewed' },
  'camera.unavailable': { text: 'कैमरा उपलब्ध नहीं है', review: 'unreviewed' },
  'camera.captureFailed': { text: 'फ़ोटो नहीं ली जा सकी।', review: 'unreviewed' },
  'status.capturing': { text: 'फ़ोटो ली जा रही है…', review: 'unreviewed' },
  'status.reading': { text: 'टेक्स्ट पढ़ा जा रहा है…', review: 'unreviewed' },
  'still.status.shown': { text: 'पूरा टेक्स्ट देखने के लिए किसी लेबल पर टैप करें।', review: 'unreviewed' },
  'ocr.noText': { text: 'कोई टेक्स्ट नहीं मिला। पास जाएँ या रोशनी बढ़ाएँ।', review: 'unreviewed' },
  'ocr.lowQuality.hint': { text: 'पास जाएँ या रोशनी बढ़ाएँ।', review: 'unreviewed' },
  'ocr.lowQuality.marker': { text: 'कम गुणवत्ता', review: 'unreviewed' },
  'ocr.unsupported.marker': { text: 'यह लिपि अभी पढ़ी नहीं जा सकती', review: 'unreviewed' },
  'ocr.unsupported.allLines': {
    text: 'इस फ़ोटो का टेक्स्ट ऐसी लिपि में है जो अभी पढ़ी नहीं जा सकती।',
    review: 'unreviewed',
  },
  'ocr.engineUnavailable': { text: 'इस डिवाइस पर टेक्स्ट पढ़ने की सुविधा उपलब्ध नहीं है।', review: 'unreviewed' },
  'ocr.recognitionFailed': { text: 'इस फ़ोटो का टेक्स्ट नहीं पढ़ा जा सका।', review: 'unreviewed' },
  'label.pending': { text: 'अनुवाद हो रहा है…', review: 'unreviewed' },
  'label.notAvailable': { text: 'अनुवाद उपलब्ध नहीं है', review: 'unreviewed' },
  'label.translated': { text: 'अनुवादित', review: 'unreviewed' },
  'label.a11y': { text: '{text}। {state}', review: 'unreviewed' },
  'action.retry': { text: 'फिर से कोशिश करें', review: 'unreviewed' },
  'action.capture': { text: 'फ़ोटो लें', review: 'unreviewed' },
  'action.closeStill': { text: 'फ़ोटो बंद करें', review: 'unreviewed' },
  'action.closeSheet': { text: 'बंद करें', review: 'unreviewed' },
  'mode.translate': { text: 'अनुवाद', review: 'unreviewed' },
};
