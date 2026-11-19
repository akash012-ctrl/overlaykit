// Named layout constants owned by geometry. Changing a value needs a
// docs/DECISIONS.md entry and an update to its pinned-value test.

/**
 * Space between a line's bounding box and its Label box, in dp.
 * Proposed 4 (design.md, Named threshold constants): visibly separates the
 * label from a 2 dp outline on a 360 dp screen and keeps it next to its line.
 * To be confirmed on the DT-G1-03 screenshots.
 */
export const LABEL_GAP_DP = 4;
