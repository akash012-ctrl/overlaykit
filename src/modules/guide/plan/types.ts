import type { FrameId, GdErrorCode, PlanAction, PlErrorCode, Quad } from '../../shared';
import type { AcceptedRef } from '../types';

/** `'manual'` when nothing observable is expected: the user must tap Done. Texts are normalized. */
export type Expectation =
  | 'manual'
  | { readonly appear: readonly string[]; readonly disappear: readonly string[] };

export type ExpectationResult = 'met' | 'not-met' | 'cannot-tell';

export type GroundedStep = {
  readonly id: string;
  readonly instruction: string;
  readonly action: PlanAction;
  readonly enterHint: string | null;
  readonly target: { readonly lineId: string; readonly quad: Quad; readonly frameId: FrameId };
  readonly expectation: Expectation;
};

export type GroundedFinish = { readonly finished: true };

export type PlanObservation = {
  /** 'obs:' + frameId */
  readonly observationId: string;
  readonly frameId: FrameId;
  /** OcrResult.capturedAtMs. */
  readonly seq: number;
  /** The step whose expectation was evaluated. */
  readonly forStepId: string;
  readonly result: ExpectationResult;
  /** From sceneVisible(). Only a visible scene resumes a pause. */
  readonly sceneVisible: boolean;
};

export type PlanGuideStatus =
  | 'idle'
  | 'planning'
  | 'showing'
  | 'proposed-finish'
  | 'paused'
  | 'cannot-plan'
  | 'completed'
  | 'cancelled';

/** Evidence that moved a step. No image data, no OCR text. */
export type PlanProof =
  | {
      readonly kind: 'observed';
      readonly ordinal: number;
      readonly stepId: string;
      readonly frameIds: readonly [FrameId, FrameId];
      readonly observationIds: readonly [string, string];
    }
  | {
      readonly kind: 'done';
      readonly ordinal: number;
      readonly stepId: string;
      readonly atMs: number;
    };

export type PlanGuideError = PlErrorCode | GdErrorCode;

export type PlanGuideState = {
  readonly status: PlanGuideStatus;
  readonly goal: string | null;
  /** English instructions of finished steps, in order. Fed back to the planner. */
  readonly done: readonly string[];
  readonly step: GroundedStep | null;
  readonly streak: readonly AcceptedRef[];
  readonly notSeenCount: number;
  readonly lastSeq: number | null;
  readonly notBeforeSeq: number | null;
  readonly acceptedObservationIds: readonly string[];
  readonly acceptedFrameIds: readonly FrameId[];
  /** Never shrinks, not even on Back (R7.8). */
  readonly proofs: readonly PlanProof[];
  readonly error: PlanGuideError | null;
};

export type PlanGuideEvent =
  | { readonly type: 'goal-set'; readonly goal: string }
  | { readonly type: 'plan-ready'; readonly step: GroundedStep }
  | { readonly type: 'plan-finished' }
  | { readonly type: 'plan-failed'; readonly code: PlErrorCode }
  | { readonly type: 'observation'; readonly observation: PlanObservation }
  | { readonly type: 'done'; readonly stepId: string; readonly atMs: number }
  | { readonly type: 'back' }
  | { readonly type: 'retry' }
  | { readonly type: 'finish' }
  | { readonly type: 'not-yet' }
  | { readonly type: 'scene-lost'; readonly atMs: number }
  | { readonly type: 'interrupted'; readonly atMs: number }
  | { readonly type: 'cancel' }
  | { readonly type: 'reset' };
