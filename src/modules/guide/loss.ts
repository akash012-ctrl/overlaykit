import { LOSS_MAX_ANCHOR_LINES, LOSS_MIN_READABLE_LINES } from './constants';
import type { GuideObservation, LossCause } from './types';

/**
 * Observations since the last verified one. `other-machine-text` when readable lines reach the
 * minimum and anchor lines stay at or below the maximum. Unset constants (NaN) give `not-seen`.
 * The single definition of "a different machine" (R10.13).
 */
export function classifyLoss(sinceVerified: readonly GuideObservation[]): LossCause {
  let readable = 0;
  let anchors = 0;
  for (const o of sinceVerified) {
    readable += o.text.readableLines;
    anchors += o.text.anchorLines;
  }
  return readable >= LOSS_MIN_READABLE_LINES && anchors <= LOSS_MAX_ANCHOR_LINES
    ? 'other-machine-text'
    : 'not-seen';
}
