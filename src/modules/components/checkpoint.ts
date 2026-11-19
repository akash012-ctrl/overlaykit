import type { OcrResult } from '../shared';
import type { Checkpoint } from './fixture-types';
import { normalizeAnchorText } from './identify';
import type { ScreenMatch } from './screen-match';
import { readableTexts } from './screen-match';

export type CheckpointResult = 'met' | 'not-met' | 'cannot-tell';

/**
 * `met` only when the checkpoint text is a whole Latin or Devanagari line and, if a screen is
 * named, the screen matched that id. `cannot-tell` for a manual checkpoint, OCR_LOW_QUALITY,
 * or a screen that cannot be told. Pure, never throws.
 */
export function checkpointResult(ocr: OcrResult, checkpoint: Checkpoint, screen: ScreenMatch): CheckpointResult {
  if (checkpoint.kind === 'manual') return 'cannot-tell';
  if (ocr.qualityFlag === 'OCR_LOW_QUALITY') return 'cannot-tell';
  if (checkpoint.screenId !== undefined) {
    if (screen.kind === 'cannot-tell') return 'cannot-tell';
    if (screen.screenId !== checkpoint.screenId) return 'not-met';
  }
  const wanted = normalizeAnchorText(checkpoint.text);
  return readableTexts(ocr).includes(wanted) ? 'met' : 'not-met';
}
