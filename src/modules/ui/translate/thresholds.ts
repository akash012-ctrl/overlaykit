/**
 * PROVISIONAL (task 4.3 is parked, so no measured value exists). How often failed TR_OFFLINE labels are
 * retried while a still is shown. No cloud route exists (D-030), so nothing offline can happen today.
 * Replace with the value from task 4.3 and record it in docs/DECISIONS.md.
 */
export const OFFLINE_RETRY_INTERVAL_MS = 15_000;

/**
 * PROVISIONAL (set in G2, task 4.3 parked). A line with a run of this many digits is not sent.
 * Infinity means no line is skipped for digits, so no value is invented here.
 */
export const DIGIT_SEQUENCE_MIN_LENGTH = Number.POSITIVE_INFINITY;
