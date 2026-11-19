import type { ModelStore } from './model-store';
import type { PlanRequest, PlannerOutput, PlErrorCode, Result } from '../shared';

/** Planner state. Same shape as design.md section "Interfaces". */
export type PlannerState =
  | { readonly kind: 'missing' }
  | { readonly kind: 'downloading'; readonly receivedBytes: number; readonly totalBytes: number }
  | { readonly kind: 'ready' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly code: PlErrorCode };

export interface StepPlanner {
  status(): PlannerState;
  subscribe(cb: (s: PlannerState) => void): () => void;
  /** Proposes ONE next step. Output is parsed strictly but not grounded: guide/plan grounds it. */
  planNext(req: PlanRequest, signal: AbortSignal): Promise<Result<PlannerOutput, PlErrorCode>>;
  release(): Promise<void>;
}

/** Text sent to the model. Text only, never an image. */
export type PromptText = { readonly system: string; readonly user: string };

/**
 * What the planner needs from a model runtime. Task 5.4 implements it over the
 * local Kotlin module. Vendor types never appear here: strings and numbers only.
 */
export interface PlannerEngine {
  status(): PlannerState;
  subscribe(cb: (s: PlannerState) => void): () => void;
  /**
   * Returns the raw model text. Failures are PL_* codes (PL_NO_MODEL,
   * PL_UNSUPPORTED_DEVICE, PL_TIMEOUT, PL_BAD_OUTPUT). An aborted signal returns
   * PL_TIMEOUT only if the engine's own timeout fired; a user cancel is the caller's concern.
   */
  generate(
    prompt: PromptText,
    schemaJson: string | null,
    maxOutputTokens: number,
    signal: AbortSignal,
  ): Promise<Result<string, PlErrorCode>>;
  release(): Promise<void>;
}

export type StepPlannerOptions = {
  readonly engine?: PlannerEngine;
  /** Where the sideloaded model is checked. Without it, or without the native module, the stub engine is used. */
  readonly store?: ModelStore;
  /** Cap on model output tokens. */
  readonly maxOutputTokens?: number;
};
