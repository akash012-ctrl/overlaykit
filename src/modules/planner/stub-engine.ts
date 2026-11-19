import type { PlannerEngine, PlannerState } from './types';

const MISSING: PlannerState = { kind: 'missing' };

/** Engine used until task 5.4 lands: no model, so every call is PL_NO_MODEL. */
export const stubEngine: PlannerEngine = {
  status: () => MISSING,
  subscribe: () => () => undefined,
  generate: () => Promise.resolve({ ok: false, error: 'PL_NO_MODEL' }),
  release: () => Promise.resolve(),
};
