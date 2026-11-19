// The only planner file that talks to the native module `overlaykit-llm` (lane K, design.md
// "Local Kotlin module"). The surface is typed here by hand: strings and numbers only.
// The module may be absent (not built yet, or iOS): then every call is PL_NO_MODEL.
import { requireOptionalNativeModule } from 'expo';

import type { PlErrorCode, Result } from '../../shared';
import type { ModelStore } from '../model-store';
import type { PlannerEngine, PlannerState, PromptText } from '../types';

type LlmLoadResult = { ok: true } | { ok: false; code: 'NO_FILE' | 'OUT_OF_MEMORY' | 'UNSUPPORTED' | 'FAILED' };
type LlmGenerateResult = { ok: true; text: string } | { ok: false; code: 'CANCELLED' | 'NOT_LOADED' | 'FAILED' };

/** Mirror of design.md "JS surface". Greedy decoding (temperature 0, topK 1) is fixed in Kotlin. */
export interface LlmNative {
  load(modelPath: string, options: { backend: 'cpu' | 'gpu'; maxTokens: number }): Promise<LlmLoadResult>;
  generate(
    requestId: string,
    system: string,
    user: string,
    schemaJson: string | null,
    maxOutputTokens: number,
  ): Promise<LlmGenerateResult>;
  cancel(requestId: string): void;
  release(): Promise<void>;
}

// shortcut: provisional values, replaced by measurements on the reference phone in task 14 (DQ-2).
export const PLAN_TIMEOUT_MS = 30_000;
const CONTEXT_TOKENS = 2048;
const BACKEND = 'cpu'; // CPU first (design DQ-2).

export function loadLlmNative(): LlmNative | null {
  return requireOptionalNativeModule<LlmNative>('OverlaykitLlm');
}

export type LitertEngineOptions = {
  readonly store: ModelStore;
  /** Defaults to the real module, or null when it is not built in. */
  readonly native?: LlmNative | null;
  readonly timeoutMs?: number;
};

function loadCode(code: Extract<LlmLoadResult, { ok: false }>['code']): PlErrorCode {
  switch (code) {
    case 'NO_FILE':
      return 'PL_NO_MODEL';
    default:
      return 'PL_UNSUPPORTED_DEVICE'; // OUT_OF_MEMORY, UNSUPPORTED, FAILED while loading
  }
}

export function createLitertEngine(opts: LitertEngineOptions): PlannerEngine {
  const native = opts.native === undefined ? loadLlmNative() : opts.native;
  const timeoutMs = opts.timeoutMs ?? PLAN_TIMEOUT_MS;
  const listeners = new Set<(s: PlannerState) => void>();
  let state: PlannerState = { kind: 'missing' };
  let loaded = false;
  let loading: Promise<Result<true, PlErrorCode>> | null = null;
  let counter = 0;

  const set = (next: PlannerState) => {
    state = next;
    listeners.forEach((cb) => cb(next));
  };

  async function ensureLoaded(): Promise<Result<true, PlErrorCode>> {
    if (native === null) return { ok: false, error: 'PL_NO_MODEL' };
    if (loaded) return { ok: true, value: true };
    const check = await opts.store.check();
    if (check.kind !== 'ready') {
      set(check.kind === 'missing' ? { kind: 'missing' } : { kind: 'failed', code: check.code });
      return { ok: false, error: check.code };
    }
    set({ kind: 'loading' });
    const res = await native.load(check.path, { backend: BACKEND, maxTokens: CONTEXT_TOKENS });
    if (!res.ok) {
      const code = loadCode(res.code);
      set(code === 'PL_NO_MODEL' ? { kind: 'missing' } : { kind: 'failed', code });
      return { ok: false, error: code };
    }
    loaded = true;
    set({ kind: 'ready' });
    return { ok: true, value: true };
  }

  return {
    status: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async generate(prompt: PromptText, schemaJson, maxOutputTokens, signal) {
      if (signal.aborted) return { ok: false, error: 'PL_CANNOT_PLAN' };
      loading ??= ensureLoaded().finally(() => {
        loading = null;
      });
      const ready = await loading;
      if (!ready.ok) return ready;
      if (native === null) return { ok: false, error: 'PL_NO_MODEL' };
      if (signal.aborted) return { ok: false, error: 'PL_CANNOT_PLAN' };

      counter += 1;
      const requestId = `plan-${counter}`;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        native.cancel(requestId);
      }, timeoutMs);
      const onAbort = () => native.cancel(requestId);
      signal.addEventListener('abort', onAbort, { once: true });
      try {
        const res = await native.generate(requestId, prompt.system, prompt.user, schemaJson, maxOutputTokens);
        if (res.ok) return { ok: true, value: res.text };
        if (timedOut) return { ok: false, error: 'PL_TIMEOUT' };
        // CANCELLED here is a user cancel: the caller already dropped the request.
        if (res.code === 'CANCELLED') return { ok: false, error: 'PL_CANNOT_PLAN' };
        if (res.code === 'NOT_LOADED') {
          loaded = false;
          return { ok: false, error: 'PL_NO_MODEL' };
        }
        return { ok: false, error: 'PL_BAD_OUTPUT' }; // FAILED while generating
      } catch {
        return { ok: false, error: 'PL_UNSUPPORTED_DEVICE' }; // the module should never throw
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      }
    },
    async release() {
      loaded = false;
      if (native !== null) {
        try {
          await native.release();
        } catch {
          // nothing to recover: the module owns the engine
        }
      }
      set({ kind: 'missing' });
    },
  };
}
