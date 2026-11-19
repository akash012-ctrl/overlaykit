import type { OcrThresholds } from './post-process/post-process';

// Named OCR thresholds (R9.1). Changing a value needs a docs/DECISIONS.md entry
// and an update to its pinned test.
//
// PROVISIONAL (D-037): the OQ-5 values below are starting points chosen before
// any recorded snapshot exists, so the camera screen can run on the phone.
// They are NOT tuned and NOT valid for G1 measurements. Task 15.1 replaces them
// with values measured on recorded TM-01 L3 and CARD-KN snapshots.

/** validateQuad's zero-area tolerance, in image px squared (DD-5). Proposed in design.md. */
export const ZERO_AREA_EPSILON_PX2 = 1e-3;

/** Fewer non-whitespace characters than this over all readable lines is low quality. Provisional. */
export const LOW_QUALITY_MIN_TOTAL_CHARS = 3;

/** Mean ML Kit line confidence (0..1) below this is low quality (R9.2). Provisional. */
export const LOW_QUALITY_MIN_MEAN_CONFIDENCE = 0.5;

/** Only used when the engine gives no confidence; ML Kit does, so it is unused for now. Provisional. */
export const LOW_QUALITY_MIN_MEDIAN_LINE_HEIGHT_PX = 12;

/** Garble check counts only below this line confidence. Provisional. */
export const UNSUPPORTED_MAX_LINE_CONFIDENCE = 0.6;

/** Share of symbols at or above which a line looks garbled. Provisional. */
export const UNSUPPORTED_MIN_SYMBOL_FRACTION = 0.5;

/** Share of the minority script at or above which a line looks garbled. Provisional. */
export const UNSUPPORTED_MIN_MINORITY_SCRIPT_FRACTION = 0.3;

/** Languages whose script ML Kit v2 can't read (D-005). Lines it reports with these codes are unsupported. */
export const UNSUPPORTED_SCRIPT_LANGUAGES: readonly string[] = ['kn', 'ta', 'te', 'ml', 'bn', 'gu', 'pa', 'or'];

export const OCR_THRESHOLDS: OcrThresholds = {
  zeroAreaEpsilonPx2: ZERO_AREA_EPSILON_PX2,
  lowQuality: {
    minTotalChars: LOW_QUALITY_MIN_TOTAL_CHARS,
    minMeanConfidence: LOW_QUALITY_MIN_MEAN_CONFIDENCE,
    minMedianLineHeightPx: LOW_QUALITY_MIN_MEDIAN_LINE_HEIGHT_PX,
  },
  unsupported: {
    maxLineConfidence: UNSUPPORTED_MAX_LINE_CONFIDENCE,
    minSymbolFraction: UNSUPPORTED_MIN_SYMBOL_FRACTION,
    minMinorityScriptFraction: UNSUPPORTED_MIN_MINORITY_SCRIPT_FRACTION,
    languages: UNSUPPORTED_SCRIPT_LANGUAGES,
  },
};
