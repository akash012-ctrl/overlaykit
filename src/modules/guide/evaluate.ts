import type { CheckpointResult, ObservedText } from '../components';
import type { MachineMatch, OcrResult } from '../shared';
import type { GuideObservation } from './types';

/**
 * Pure. A MachineMatch from another frame is not trusted: machine `none`, checkpoint `cannot-tell`.
 */
export function evaluateObservation(input: {
  readonly ocr: Pick<OcrResult, 'frameId' | 'capturedAtMs'>;
  readonly match: MachineMatch;
  readonly forStepId: string;
  readonly checkpoint: CheckpointResult;
  readonly text: ObservedText;
}): GuideObservation {
  const { ocr, match } = input;
  const same = match.frameId === ocr.frameId;
  const machine: GuideObservation['machine'] =
    !same || match.status === 'none'
      ? { status: 'none' }
      : match.status === 'verified'
        ? { status: 'verified', machineId: match.machineId }
        : { status: 'ambiguous' };
  return {
    observationId: `obs:${ocr.frameId}`,
    frameId: ocr.frameId,
    seq: ocr.capturedAtMs,
    forStepId: input.forStepId,
    machine,
    checkpoint: same ? input.checkpoint : 'cannot-tell',
    text: input.text,
  };
}
