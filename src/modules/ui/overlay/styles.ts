import type { LabelState } from './freeze-overlay';

// Overlay style constants (design.md, "UI style constants"). They come from
// requirements or are layout choices, not recognition thresholds.

/** Label text size before the system font scale is applied (R19.2: 14 sp or larger). */
export const LABEL_FONT_SIZE_SP = 14;

/** Smallest touch target on the Camera_Screen, in dp (R19.6). */
export const MIN_TOUCH_TARGET_DP = 48;

/**
 * Line height as a multiple of the font size. Proposed 1.5: room for
 * Devanagari and Kannada marks above and below the line (R19.9). To be
 * confirmed on device screenshots.
 */
export const LABEL_LINE_HEIGHT_FACTOR = 1.5;

/** Padding inside a Label box, in dp. Layout choice. */
export const LABEL_PADDING_DP = 4;

/** Source_Outline border width, in dp. Layout choice. */
export const OUTLINE_WIDTH_DP = 2;

export type ColourPair = { readonly text: string; readonly backing: string };

/**
 * Opaque backings with white text, one per Label state (DD-8, R19.1). Each pair
 * has a contrast ratio of at least 4.5:1, checked in styles.test.ts. The state
 * is also shown as marker text, never by colour alone (R19.5).
 */
export const LABEL_COLOURS: { readonly [K in LabelState['kind']]: ColourPair } = {
  pending: { text: '#FFFFFF', backing: '#37474F' },
  translated: { text: '#FFFFFF', backing: '#1B5E20' },
  failed: { text: '#FFFFFF', backing: '#7F1D1D' },
  unsupported: { text: '#FFFFFF', backing: '#4A148C' },
};

/**
 * A result marked OCR_LOW_QUALITY uses this dimmer, still opaque, backing for
 * its readable labels, plus an icon and the low-quality marker text (R8.5).
 * Text opacity is never lowered, so contrast stays computable (DD-8).
 */
export const LOW_QUALITY_COLOURS: ColourPair = { text: '#FFFFFF', backing: '#545454' };

/** Source_Outline colour. Drawn on the photo, not behind text. */
export const OUTLINE_COLOUR = '#FFD54F';
