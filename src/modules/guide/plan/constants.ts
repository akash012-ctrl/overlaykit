/**
 * PROPOSED named thresholds (design.md, spec 05). UNSET (NaN) until measured on the Reference
 * phone and recorded in DECISIONS.md. Comparisons with NaN are false, so an unset threshold
 * never fires: nothing pauses, nothing errors, nothing stops by itself. Never a guessed value.
 */
/** Fraction (0..1) of baseline lines still seen below which the scene counts as lost. */
export const SCENE_OVERLAP_MIN = Number.NaN;
/** How long the scene may stay lost before ui sends `scene-lost`. Used by ui's timer only. */
export const SCENE_LOST_TIMEOUT_MS = Number.NaN;
/** Consecutive accepted `not-met` observations before GD_CHECKPOINT_NOT_SEEN. */
export const GOAL_NOT_SEEN_LIMIT = Number.NaN;
/** Advances allowed per goal before PL_CANNOT_PLAN. */
export const MAX_STEPS_PER_GOAL = Number.NaN;
