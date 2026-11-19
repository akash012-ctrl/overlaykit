import { CONSECUTIVE_MATCHES_REQUIRED } from '../constants';
import { GOAL_NOT_SEEN_LIMIT, MAX_STEPS_PER_GOAL } from './constants';
import type { PlanGuideEvent, PlanGuideState, PlanObservation, PlanProof } from './types';

export const initialPlanGuideState: PlanGuideState = {
  status: 'idle',
  goal: null,
  done: [],
  step: null,
  streak: [],
  notSeenCount: 0,
  lastSeq: null,
  notBeforeSeq: null,
  acceptedObservationIds: [],
  acceptedFrameIds: [],
  proofs: [],
  error: null,
};

/** Number of advances so far. */
export function planAdvanceCount(state: PlanGuideState): number {
  return state.proofs.length;
}

/** Clears the per-step evidence. The accepted-id lists and proofs stay. */
const cleared = { streak: [], notSeenCount: 0, error: null } as const;

/**
 * The only place a step is finished. Adds exactly one proof, then plans again
 * (or stops at MAX_STEPS_PER_GOAL, unset = never).
 */
function advance(
  state: PlanGuideState,
  proof: (ordinal: number, stepId: string) => PlanProof,
): PlanGuideState {
  const step = state.step;
  if (step === null) return state;
  const ordinal = state.proofs.length + 1;
  const atLimit = ordinal >= MAX_STEPS_PER_GOAL;
  return {
    ...state,
    ...cleared,
    status: atLimit ? 'cannot-plan' : 'planning',
    error: atLimit ? 'PL_CANNOT_PLAN' : null,
    step: null,
    done: [...state.done, step.instruction],
    proofs: [...state.proofs, proof(ordinal, step.id)],
  };
}

function pause(state: PlanGuideState, atMs: number): PlanGuideState {
  return { ...state, ...cleared, status: 'paused', error: 'GD_MACHINE_LOST', notBeforeSeq: atMs };
}

function observe(state: PlanGuideState, o: PlanObservation): PlanGuideState {
  if (state.status !== 'showing' && state.status !== 'paused') return state;
  const step = state.step;
  if (step === null) return state;
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
  const accepted: PlanGuideState = {
    ...state,
    lastSeq: o.seq,
    acceptedObservationIds: [...state.acceptedObservationIds, o.observationId],
    acceptedFrameIds: [...state.acceptedFrameIds, o.frameId],
  };
  if (state.status === 'paused') {
    // Resume only. The resuming observation never joins the streak (R9.2).
    return o.sceneVisible ? { ...accepted, ...cleared, status: 'showing' } : accepted;
  }
  if (step.expectation === 'manual') return accepted;
  if (o.result === 'met') {
    const first = state.streak[0];
    if (first !== undefined && state.streak.length + 1 >= CONSECUTIVE_MATCHES_REQUIRED) {
      return advance({ ...accepted, notSeenCount: 0 }, (ordinal, stepId) => ({
        kind: 'observed',
        ordinal,
        stepId,
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
  if (o.result === 'not-met') {
    const count = state.notSeenCount + 1;
    return {
      ...accepted,
      streak: [],
      notSeenCount: count,
      error: count >= GOAL_NOT_SEEN_LIMIT ? 'GD_CHECKPOINT_NOT_SEEN' : state.error,
    };
  }
  return { ...accepted, streak: [] };
}

/** Pure, total, deterministic, non-mutating. Returns the same object when nothing changes. */
export function planReducer(state: PlanGuideState, event: PlanGuideEvent): PlanGuideState {
  switch (event.type) {
    case 'goal-set':
      return state.status === 'idle' && event.goal.trim() !== ''
        ? { ...initialPlanGuideState, status: 'planning', goal: event.goal.trim() }
        : state;
    case 'plan-ready':
      return state.status === 'planning'
        ? { ...state, ...cleared, status: 'showing', step: event.step }
        : state;
    case 'plan-finished':
      return state.status === 'planning' ? { ...state, ...cleared, status: 'proposed-finish' } : state;
    case 'plan-failed':
      return state.status === 'planning'
        ? { ...state, ...cleared, status: 'cannot-plan', error: event.code }
        : state;
    case 'observation':
      return observe(state, event.observation);
    case 'done': {
      const step = state.step;
      if (state.status !== 'showing' || step === null || step.id !== event.stepId) return state;
      return advance(state, (ordinal, stepId) => ({ kind: 'done', ordinal, stepId, atMs: event.atMs }));
    }
    case 'back':
      return state.status === 'showing' && state.done.length > 0
        ? { ...state, ...cleared, status: 'planning', step: null, done: state.done.slice(0, -1) }
        : state;
    case 'retry':
      if (state.status === 'showing') return { ...state, ...cleared };
      return state.status === 'cannot-plan' ? { ...state, ...cleared, status: 'planning' } : state;
    case 'finish':
      return state.status === 'proposed-finish' ? { ...state, ...cleared, status: 'completed' } : state;
    case 'not-yet':
      return state.status === 'proposed-finish' ? { ...state, ...cleared, status: 'planning' } : state;
    case 'scene-lost':
      return state.status === 'showing' ? pause(state, event.atMs) : state;
    case 'interrupted':
      return state.status === 'showing' ? pause(state, event.atMs) : state;
    case 'cancel':
      return state.status === 'idle' || state.status === 'completed' || state.status === 'cancelled'
        ? state
        : { ...state, ...cleared, status: 'cancelled', step: null };
    case 'reset':
      return state.status === 'cancelled' || state.status === 'completed' || state.status === 'idle'
        ? initialPlanGuideState
        : state;
    default:
      return state;
  }
}
