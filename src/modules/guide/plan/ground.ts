import type { OcrResult, PlannerOutput, PlErrorCode, ProposedStep, Result } from '../../shared';
import { buildExpectation } from './expectation';
import { normalizeText } from './normalize';
import type { GroundedFinish, GroundedStep } from './types';

/** The id the ui puts in PlanRequest.lines for line `index` of the frame. */
export function planLineId(frameId: string, index: number): string {
  return `${frameId}#${index}`;
}

/**
 * Pure. The target must equal exactly one readable OCR line of this frame after normalization.
 * Zero or several matches give PL_TARGET_NOT_FOUND. No fuzzy matching (R5.1).
 * shortcut: exact match only; revisit with a measured miss rate on real machines.
 */
export function groundStep(
  output: PlannerOutput,
  ocr: OcrResult,
): Result<GroundedStep | GroundedFinish, PlErrorCode> {
  if (output.kind === 'finished') return { ok: true, value: { finished: true } };
  if (output.kind === 'cannot-plan') return { ok: false, error: 'PL_CANNOT_PLAN' };
  const step: ProposedStep = output.step;
  const wanted = normalizeText(step.targetText);
  if (wanted === '') return { ok: false, error: 'PL_TARGET_NOT_FOUND' };
  let found = -1;
  let count = 0;
  ocr.lines.forEach((line, index) => {
    if (line.script !== 'unsupported' && normalizeText(line.text) === wanted) {
      count += 1;
      found = index;
    }
  });
  const line = ocr.lines[found];
  if (count !== 1 || line === undefined) return { ok: false, error: 'PL_TARGET_NOT_FOUND' };
  return {
    ok: true,
    value: {
      id: `step:${ocr.frameId}`,
      instruction: step.instruction,
      action: step.action,
      enterHint: step.enterHint,
      target: { lineId: planLineId(ocr.frameId, found), quad: line.quad, frameId: ocr.frameId },
      expectation: buildExpectation(step, ocr),
    },
  };
}
