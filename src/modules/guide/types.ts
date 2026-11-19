import type { CheckpointResult, LocalizedText, ObservedText, StepDef } from '../components';
import type { FrameId, GdErrorCode } from '../shared';

export type ValidatedWorkflow = {
  readonly id: string;
  readonly machineId: 'TM-01';
  readonly title: LocalizedText;
  readonly steps: readonly StepDef[];
};

/** detail: failing field path, for debug and tests only. */
export type LoadError = { readonly code: 'GD_FIXTURE_INVALID'; readonly detail: string };

/** Like shared Result, but the error is an object: it carries the failing field path. */
export type LoadResult =
  | { readonly ok: true; readonly value: ValidatedWorkflow }
  | { readonly ok: false; readonly error: LoadError };

export type GuideMachine =
  | { readonly status: 'verified'; readonly machineId: string }
  | { readonly status: 'ambiguous' }
  | { readonly status: 'none' };

export type GuideObservation = {
  /** 'obs:' + frameId */
  readonly observationId: string;
  readonly frameId: FrameId;
  /** OcrResult.capturedAtMs. */
  readonly seq: number;
  /** The Step whose Checkpoint was evaluated. */
  readonly forStepId: string;
  readonly machine: GuideMachine;
  /** 'cannot-tell' for a manual Step. */
  readonly checkpoint: CheckpointResult;
  readonly text: ObservedText;
};

export type LossCause = 'not-seen' | 'other-machine-text';

export type GuideStatus = 'idle' | 'running' | 'paused' | 'cancelled' | 'completed';

/** Evidence that moved a Step. No image data, no OCR text. */
export type TransitionProof =
  | {
      readonly kind: 'observed';
      readonly ordinal: number;
      readonly fromStepId: string;
      readonly toStepId: string | null;
      readonly frameIds: readonly [FrameId, FrameId];
      readonly observationIds: readonly [string, string];
    }
  | {
      readonly kind: 'done';
      readonly ordinal: number;
      readonly fromStepId: string;
      readonly toStepId: string | null;
      readonly atMs: number;
    };

export type AcceptedRef = { readonly observationId: string; readonly frameId: FrameId; readonly seq: number };

export type GuideState = {
  readonly status: GuideStatus;
  readonly workflow: ValidatedWorkflow | null;
  readonly stepIndex: number;
  readonly streak: readonly AcceptedRef[];
  readonly notSeenCount: number;
  readonly lastSeq: number | null;
  readonly notBeforeSeq: number | null;
  readonly acceptedObservationIds: readonly string[];
  readonly acceptedFrameIds: readonly FrameId[];
  readonly proofs: readonly TransitionProof[];
  readonly error: GdErrorCode | null;
};

export type StartMachine = 'verified' | 'ambiguous' | 'none';

export type GuideEvent =
  | {
      readonly type: 'start';
      readonly machine: StartMachine;
      readonly workflow: LoadResult;
      readonly atMs: number;
    }
  | { readonly type: 'observation'; readonly observation: GuideObservation }
  | { readonly type: 'confirm-manual'; readonly stepId: string; readonly atMs: number }
  | { readonly type: 'machine-lost'; readonly cause: LossCause; readonly atMs: number }
  | { readonly type: 'interrupted'; readonly atMs: number }
  | { readonly type: 'retry' }
  | { readonly type: 'step-back' }
  | { readonly type: 'cancel' }
  | { readonly type: 'reset' };
