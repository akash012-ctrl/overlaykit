/** D-019. Pinned: two consecutive distinct observations. */
export const CONSECUTIVE_MATCHES_REQUIRED = 2 as const;

/** PROPOSED (ARCHITECTURE.md section 8), confirmed at G4 with a DECISIONS.md entry. Used by ui's timer only. */
export const MACHINE_LOST_TIMEOUT_MS = 3000;

/**
 * UNSET until G4 (NaN): comparisons with NaN are false, so the error never fires and
 * classifyLoss returns `not-seen`. Never a guessed value. Set with a DECISIONS.md entry.
 */
export const CHECKPOINT_NOT_SEEN_LIMIT = Number.NaN;
export const LOSS_MIN_READABLE_LINES = Number.NaN;
export const LOSS_MAX_ANCHOR_LINES = Number.NaN;
