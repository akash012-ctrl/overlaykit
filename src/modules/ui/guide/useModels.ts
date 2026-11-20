import { useCallback, useEffect, useReducer, useState } from 'react';

import type { DownloadFailure, ModelStatus, ModelStore, PlannerState } from '../../planner';
import { createDeviceModelStore } from '../../planner';

let store: ModelStore | null | undefined;
let checkedThisRun = false;
/** The one on-device model store (a native adapter instance), or null when this build has no llm module. */
export function getDeviceModelStore(): ModelStore | null {
  if (store === undefined) store = createDeviceModelStore();
  return store;
}

export type Models = {
  /** False when this build has no llm module: nothing can be downloaded or run. */
  readonly available: boolean;
  readonly big: ModelStatus;
  readonly small: ModelStatus;
  /** The last download failure, or null. Cleared when a download starts. */
  readonly failure: DownloadFailure | null;
  /** True when a model file is in place and passed the size check. */
  readonly usable: boolean;
  readonly download: () => void;
  readonly cancel: () => void;
  readonly recheck: () => void;
};

/**
 * The model files as the user sees them. Checks them when Guide opens (a hash of 2.6 GB takes seconds), then follows
 * the store. A download starts only from `download()`, which only a button calls.
 */
export function useModels(): Models {
  const s = getDeviceModelStore();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [failure, setFailure] = useState<DownloadFailure | null>(null);

  useEffect(() => {
    if (s === null) return undefined;
    const off = s.subscribe(bump);
    // Hashing 2.6 GB takes a while: once per app run. The model-gate Check button re-checks on demand.
    if (!checkedThisRun) {
      checkedThisRun = true;
      void s.refresh();
    }
    return off;
  }, [s]);

  const download = useCallback(() => {
    if (s === null) return;
    setFailure(null);
    void s.download('gemma-4-e2b').then((res) => {
      if (!res.ok) setFailure(res.error);
    });
  }, [s]);
  const cancel = useCallback(() => s?.cancelDownload(), [s]);
  const recheck = useCallback(() => {
    if (s !== null) void s.refresh();
  }, [s]);

  const big: ModelStatus = s?.status('gemma-4-e2b') ?? { kind: 'missing' };
  const small: ModelStatus = s?.status('gemma-3-1b') ?? { kind: 'missing' };
  return { available: s !== null, big, small, failure, usable: big.kind === 'ready' || small.kind === 'ready', download, cancel, recheck };
}

/**
 * What the Guide view sees for the on-device planner. The engine only learns of the file when it first plans, so
 * "missing" before that would hide the goal picker forever. The file state decides, and a real engine failure
 * (no memory, bad file) still shows.
 */
export function onDeviceState(models: Models, engine: PlannerState): PlannerState {
  if (models.big.kind === 'downloading') return models.big;
  if (models.small.kind === 'downloading') return models.small;
  if (!models.usable) return { kind: 'missing' };
  return engine.kind === 'failed' || engine.kind === 'loading' ? engine : { kind: 'ready' };
}
