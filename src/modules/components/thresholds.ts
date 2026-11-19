/**
 * Largest |rotation| matchLayout accepts, in radians. PLACEHOLDER: NaN until
 * task 25.2 records the G3 value in docs/DECISIONS.md. NaN makes matchLayout
 * return no-fit, so every machine is `none` until then. Never a guessed value.
 */
export const ROTATION_TOLERANCE_RAD = Number.NaN;

/**
 * Screen matcher thresholds. UNSET until G4: `undefined` makes matchScreen return
 * `cannot-tell` (safe direction). Values need a docs/DECISIONS.md entry first.
 */
export const SCREEN_MIN_TEXTS: number | undefined = undefined;
export const SCREEN_MARGIN: number | undefined = undefined;
