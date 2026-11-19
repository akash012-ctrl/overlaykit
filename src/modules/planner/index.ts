// Public API of planner (spec 05). Pure prompt and parser plus an engine port.
// No network code and no vendor import here: the model runtime is an adapter (task 5.4).
import type { PlanRequest, PlannerOutput, PlErrorCode, Result } from '../shared';
import { createLiveStepPlanner } from './adapters/gemini-live';
import type { LiveStepPlanner, LiveStepPlannerOptions } from './adapters/gemini-live';
import { createDeviceModelStore, createLitertEngine, loadLlmNative } from './adapters/litert';
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
  const s = store ?? createDeviceModelStore(native) ?? undefined;
  return s !== undefined && native !== null ? createLitertEngine({ store: s, native }) : stubEngine;
}

/** 'gemini-live' without its options: nothing is sent anywhere, every plan says there is no key. */
const inertLive: StepPlanner = {
  status: () => ({ kind: 'missing' }),
  subscribe: () => () => undefined,
  planNext: async () => ({ ok: false, error: 'PL_LIVE_NO_KEY' }),
  release: async () => undefined,
};

/** Picks the planner for the user's choice. Live stays off until the ui passes consent in `live`. */
export function createStepPlanner(opts: StepPlannerOptions & { choice: 'gemini-live'; live: LiveStepPlannerOptions }): LiveStepPlanner;
export function createStepPlanner(opts?: StepPlannerOptions): StepPlanner;
export function createStepPlanner(opts: StepPlannerOptions = {}): StepPlanner {
  if (opts.choice === 'gemini-live') return opts.live === undefined ? inertLive : createLiveStepPlanner(opts.live);
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
export { MODEL_MANIFEST, MODEL_ORDER } from './model-manifest';
export type { ModelId, ModelManifest } from './model-manifest';
export { createModelStore } from './model-store';
export type { DownloadFailure, ModelCheck, ModelFilePort, ModelStatus, ModelStore } from './model-store';
export { createDeviceModelStore, createLitertEngine, PLAN_TIMEOUT_MS } from './adapters/litert';
export { createLiveStepPlanner } from './adapters/gemini-live';
export type {
  LiveFrameSource, LiveMicSource, LiveSessionState, LiveStepPlanner, LiveStepPlannerOptions,
} from './adapters/gemini-live';
export { createLiveKeyStore } from './live-key-store';
export type { LiveKeyError, LiveKeyStore } from './live-key-store';
export {
  LIVE_FRAME_INTERVAL_MS, LIVE_IDLE_STOP_MS, LIVE_MODEL_ID, LIVE_PLAN_TIMEOUT_MS, LIVE_STEP_MAX_AGE_MS,
} from './live/manifest';
