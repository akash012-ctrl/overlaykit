// Public API of planner (spec 05). Pure prompt and parser plus an engine port.
// No network code and no vendor import here: the model runtime is an adapter (task 5.4).
import type { PlanRequest, PlannerOutput, PlErrorCode, Result } from '../shared';
import { createLitertEngine, loadLlmNative } from './adapters/litert';
import { buildPrompt } from './prompt';
import type { ModelStore } from './model-store';
import { PLANNER_OUTPUT_SCHEMA, parseOutput } from './schema';
import { stubEngine } from './stub-engine';
import type { PlannerEngine, StepPlanner, StepPlannerOptions } from './types';

// shortcut: provisional output cap, replaced by the measured value in task 14.
const DEFAULT_MAX_OUTPUT_TOKENS = 256;

/** LiteRT engine when the native module and a model store exist, else the stub (PL_NO_MODEL). */
function defaultEngine(store: ModelStore | undefined): PlannerEngine {
  const native = loadLlmNative();
  return store !== undefined && native !== null ? createLitertEngine({ store, native }) : stubEngine;
}

export function createStepPlanner(opts: StepPlannerOptions = {}): StepPlanner {
  const engine = opts.engine ?? defaultEngine(opts.store);
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  return {
    status: () => engine.status(),
    subscribe: (cb) => engine.subscribe(cb),
    async planNext(req: PlanRequest, signal: AbortSignal): Promise<Result<PlannerOutput, PlErrorCode>> {
      if (req.lines.every((l) => l.text.trim() === '')) return { ok: false, error: 'PL_NO_TEXT' };
      const raw = await engine.generate(buildPrompt(req), PLANNER_OUTPUT_SCHEMA, maxOutputTokens, signal);
      return raw.ok ? parseOutput(raw.value) : raw;
    },
    release: () => engine.release(),
  };
}

export { buildPrompt } from './prompt';
export { PLANNER_OUTPUT_SCHEMA, parseOutput } from './schema';
export { stubEngine } from './stub-engine';
export type { PlannerEngine, PlannerState, PromptText, StepPlanner, StepPlannerOptions } from './types';
export { MODEL_MANIFEST } from './model-manifest';
export type { ModelManifest } from './model-manifest';
export { createModelStore } from './model-store';
export type { ModelCheck, ModelFilePort, ModelStore } from './model-store';
export { createLitertEngine, PLAN_TIMEOUT_MS } from './adapters/litert';
