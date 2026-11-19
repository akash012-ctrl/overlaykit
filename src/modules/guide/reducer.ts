import type { StepDef } from '../components';
import type { GuideEvent, GuideObservation, GuideState, TransitionProof } from './types';
import { CHECKPOINT_NOT_SEEN_LIMIT } from './constants';

export const initialGuideState: GuideState = {
  status: 'idle',
  workflow: null,
  stepIndex: 0,
  streak: [],
  notSeenCount: 0,
  lastSeq: null,
  notBeforeSeq: null,
  acceptedObservationIds: [],
  acceptedFrameIds: [],
  proofs: [],
  error: null,
};

export function currentStep(state: GuideState): StepDef | null {
  return state.workflow?.steps[state.stepIndex] ?? null;
}

export function advanceCount(state: GuideState): number {
  return state.proofs.length;
}

/** Clears the per-step evidence. The accepted-id lists and proofs stay. */
const cleared = { streak: [], notSeenCount: 0, error: null } as const;

/** The only place a Step changes forward. Adds exactly one proof. */
function advance(
  state: GuideState,
  proof: (ordinal: number, from: string, to: string | null) => TransitionProof,
): GuideState {
  const steps = state.workflow?.steps ?? [];
  const from = steps[state.stepIndex];
  if (from === undefined) return state;
  const last = state.stepIndex >= steps.length - 1;
  const to = last ? null : (steps[state.stepIndex + 1]?.id ?? null);
  return {
    ...state,
    ...cleared,
    status: last ? 'completed' : state.status,
    stepIndex: last ? state.stepIndex : state.stepIndex + 1,
    proofs: [...state.proofs, proof(state.proofs.length + 1, from.id, to)],
  };
}

function pause(state: GuideState, atMs: number): GuideState {
  return { ...state, ...cleared, status: 'paused', error: 'GD_MACHINE_LOST', notBeforeSeq: atMs };
}

function cancelledByOtherMachine(state: GuideState): GuideState {
  return { ...state, ...cleared, status: 'cancelled', error: 'GD_MACHINE_CHANGED' };
}

function observe(state: GuideState, o: GuideObservation): GuideState {
  if (state.status !== 'running' && state.status !== 'paused') return state;
  const wf = state.workflow;
  const step = currentStep(state);
  if (wf === null || step === null) return state;
  if (
    !Number.isFinite(o.seq) ||
    state.acceptedObservationIds.includes(o.observationId) ||
    state.acceptedFrameIds.includes(o.frameId) ||
    (state.lastSeq !== null && !(o.seq > state.lastSeq)) ||
    (state.notBeforeSeq !== null && !(o.seq > state.notBeforeSeq)) ||
    o.forStepId !== step.id
  ) {
    return state;
  }
  const accepted: GuideState = {
    ...state,
    lastSeq: o.seq,
    acceptedObservationIds: [...state.acceptedObservationIds, o.observationId],
    acceptedFrameIds: [...state.acceptedFrameIds, o.frameId],
  };
  const verified = o.machine.status === 'verified';
  if (o.machine.status === 'verified' && o.machine.machineId !== wf.machineId) {
    return cancelledByOtherMachine(accepted);
  }
  if (state.status === 'paused') {
    // Resume only. The resuming observation never joins the streak (R10.6).
    return verified ? { ...accepted, ...cleared, status: 'running' } : accepted;
  }
  if (!verified) return { ...accepted, streak: [] };
  const cp = step.checkpoint;
  if (cp.kind === 'manual') return accepted;
  if (o.checkpoint === 'met') {
    const first = state.streak[0];
    if (first !== undefined) {
      return advance({ ...accepted, notSeenCount: 0 }, (ordinal, from, to) => ({
        kind: 'observed',
        ordinal,
        fromStepId: from,
        toStepId: to,
        frameIds: [first.frameId, o.frameId],
        observationIds: [first.observationId, o.observationId],
      }));
    }
    return {
      ...accepted,
      notSeenCount: 0,
      streak: [{ observationId: o.observationId, frameId: o.frameId, seq: o.seq }],
    };
  }
  if (o.checkpoint === 'not-met') {
    const count = state.notSeenCount + 1;
    return {
      ...accepted,
      streak: [],
      notSeenCount: count,
      error: count >= CHECKPOINT_NOT_SEEN_LIMIT ? 'GD_CHECKPOINT_NOT_SEEN' : state.error,
    };
  }
  return { ...accepted, streak: [] };
}

/** Pure, total, deterministic, non-mutating. Returns the same object when nothing changes. */
export function guideReducer(state: GuideState, event: GuideEvent): GuideState {
  switch (event.type) {
    case 'start': {
      if (state.status !== 'idle') return state;
      if (event.machine !== 'verified') return { ...initialGuideState, error: 'GD_UNSUPPORTED' };
      if (!event.workflow.ok) return { ...initialGuideState, error: 'GD_FIXTURE_INVALID' };
      return {
        ...initialGuideState,
        status: 'running',
        workflow: event.workflow.value,
        notBeforeSeq: event.atMs,
      };
    }
    case 'observation':
      return observe(state, event.observation);
    case 'confirm-manual': {
      const step = currentStep(state);
      if (state.status !== 'running' || step === null) return state;
      if (step.checkpoint.kind !== 'manual' || step.id !== event.stepId) return state;
      return advance(state, (ordinal, from, to) => ({
        kind: 'done',
        ordinal,
        fromStepId: from,
        toStepId: to,
        atMs: event.atMs,
      }));
    }
    case 'machine-lost': {
      if (state.status === 'running' || state.status === 'paused') {
        if (event.cause === 'other-machine-text') return cancelledByOtherMachine(state);
        return state.status === 'running' ? pause(state, event.atMs) : state;
      }
      return state;
    }
    case 'interrupted':
      return state.status === 'running' ? pause(state, event.atMs) : state;
    case 'retry':
      return state.status === 'running' ? { ...state, ...cleared } : state;
    case 'step-back':
      return state.status === 'running' && state.stepIndex > 0
        ? { ...state, ...cleared, stepIndex: state.stepIndex - 1 }
        : state;
    case 'cancel':
      return state.status === 'running' || state.status === 'paused' ? initialGuideState : state;
    case 'reset':
      return state.status === 'cancelled' || state.status === 'completed' || state.status === 'idle'
        ? initialGuideState
        : state;
    default:
      return state;
  }
}
