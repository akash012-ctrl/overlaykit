// Named layout constants owned by geometry. Changing a value needs a
// docs/DECISIONS.md entry and an update to its pinned-value test.

/**
 * Space between a line's bounding box and its Label box, in dp.
 * Proposed 4 (design.md, Named threshold constants): visibly separates the
 * label from a 2 dp outline on a 360 dp screen and keeps it next to its line.
 * To be confirmed on the DT-G1-03 screenshots.
 */
export const LABEL_GAP_DP = 4;

/**
 * Largest allowed error, in image px, when a point goes image → view → image,
 * or is mirrored twice (R25.3). Proposed 1e-6 (design.md): the measured error
 * is a few multiples of 2.2e-16 × 20,000 ≈ 4e-12 px for the property tests'
 * ranges, so 1e-6 leaves a wide margin and is still far below one pixel, so a
 * wrong scale or offset fails.
 */
export const ROUND_TRIP_TOLERANCE_PX = 1e-6;
