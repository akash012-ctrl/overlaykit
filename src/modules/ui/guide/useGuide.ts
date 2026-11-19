import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';

import type { CaptureService, PreviewHandle } from '../../capture';
import { checkpointResult, createMachineService, describeObservedText, matchScreen, tm01Fixture } from '../../components';
import { computeCoverTransform } from '../../geometry';
import type { Rect } from '../../geometry';
import type { GuideObservation, LoadResult } from '../../guide';
import {
  MACHINE_LOST_TIMEOUT_MS,
  classifyLoss,
  currentStep,
  evaluateObservation,
  guideReducer,
  initialGuideState,
  listWorkflows,
  loadWorkflow,
} from '../../guide';
import { getUiLocale } from '../../locale';
import type { OcrService } from '../../ocr';
import type { FrameRef, MachineMatch, OcrResult, Size } from '../../shared';
import { computeHighlight } from './highlight-model';
import { useMachineLostTimer } from './useMachineLostTimer';
import type { GuideViewModel } from './view-model';
import { buildViewModel } from './view-model';

/**
 * Pause between automatic still captures (OQ-1). UNSET until G4 (NaN), then set with a DECISIONS.md
 * entry. While unset the capture loop does not start, so Guide reads nothing and advances nothing.
 */
export const GUIDE_CAPTURE_INTERVAL_MS = Number.NaN;

/** Observations kept since the last verified one, for `classifyLoss`. */
const SINCE_VERIFIED_LIMIT = 20;

const UNUSED_WORKFLOW: LoadResult = { ok: false, error: { code: 'GD_FIXTURE_INVALID', detail: 'unused' } };

export type GuideDeps = {
  readonly capture: Pick<CaptureService, 'captureStill' | 'releaseStill' | 'clock'>;
  readonly ocr: Pick<OcrService, 'recognize'>;
  readonly getPreview: () => PreviewHandle | null;
  /** The preview view's size, for the cover transform. */
  readonly viewSize: Size | null;
  /** The visible region the Highlight is clipped to. */
  readonly region: Rect | null;
};

type Latest = { readonly frame: FrameRef; readonly ocr: OcrResult; readonly match: MachineMatch };

// eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (R16.8)
const Debug = __DEV__ ? (require('./debug/invalid-workflow-hook') as typeof import('./debug/invalid-workflow-hook')) : null;

export function useGuide(deps: GuideDeps) {
  const { capture, ocr } = deps;
  const machine = useMemo(() => createMachineService(), []);
  const listing = useMemo(() => listWorkflows(tm01Fixture).map((w) => ({
    id: w.id,
    result: w.result,
    title: tm01Fixture.workflows.find((x) => x.id === w.id)?.title ?? { en: w.id, hi: w.id, kn: w.id },
  })), []);
  const [state, dispatch] = useReducer(guideReducer, initialGuideState);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [machineSeen, setMachineSeen] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const stateRef = useRef(state);
  const depsRef = useRef(deps);
  const sinceVerified = useRef<GuideObservation[]>([]);
  const restartRef = useRef<() => void>(() => undefined);

  const running = state.status === 'running' || state.status === 'paused';

  useEffect(() => {
    stateRef.current = state;
    depsRef.current = deps;
  });

  // Machine-lost timer: restarts on a verified observation, stops in the background (R10.1, R14.8).
  const restart = useMachineLostTimer(appActive && running, MACHINE_LOST_TIMEOUT_MS, () => {
    dispatch({ type: 'machine-lost', cause: classifyLoss(sinceVerified.current), atMs: capture.clock() });
  });

  useEffect(() => {
    restartRef.current = restart;
  }, [restart]);

  const ingest = useCallback((frame: FrameRef, result: OcrResult) => {
    const match = machine.identifyMachine(result);
    setLatest({ frame, ocr: result, match });
    setMachineSeen(true);
    const st = stateRef.current;
    if (st.status === 'idle') {
      // Open: a verified machine shows the picker, anything else is refused by the reducer (R5.1, R5.3).
      if (match.status === 'verified') {
        if (st.error === 'GD_UNSUPPORTED') dispatch({ type: 'reset' });
      } else if (st.error === null) {
        dispatch({ type: 'start', machine: match.status, workflow: UNUSED_WORKFLOW, atMs: capture.clock() });
      }
      return;
    }
    const step = currentStep(st);
    if (step === null || (st.status !== 'running' && st.status !== 'paused')) return;
    const screen = matchScreen(result);
    const observation = evaluateObservation({
      ocr: result,
      match,
      forStepId: step.id,
      checkpoint: checkpointResult(result, step.checkpoint, screen),
      text: describeObservedText(result),
    });
    if (observation.machine.status === 'verified') {
      sinceVerified.current = [];
      restartRef.current();
    } else {
      sinceVerified.current = [...sinceVerified.current, observation].slice(-SINCE_VERIFIED_LIMIT);
    }
    dispatch({ type: 'observation', observation });
  }, [machine, capture]);

  // Observation loop: one still and one OCR at a time. A result for a frame that was not just
  // captured is dropped (R8.8). The still is released after reading; Highlight needs no image.
  useEffect(() => {
    if (!appActive || !Number.isFinite(GUIDE_CAPTURE_INTERVAL_MS)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async (): Promise<void> => {
      const shot = await capture.captureStill(depsRef.current.getPreview());
      if (shot.ok) {
        const frame = shot.value;
        const read = await ocr.recognize(frame);
        void capture.releaseStill(frame);
        if (!stopped && read.ok && read.value.frameId === frame.frameId) ingest(frame, read.value);
      }
      if (!stopped) timer = setTimeout(() => void tick(), GUIDE_CAPTURE_INTERVAL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [appActive, capture, ocr, ingest]);

  // Backgrounding: running becomes paused through `interrupted`; the old frame and Highlight go (R14.1, OQ-6).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) {
        if (stateRef.current.status === 'running') dispatch({ type: 'interrupted', atMs: capture.clock() });
        setLatest(null);
        sinceVerified.current = [];
      }
    });
    return () => sub.remove();
  }, [capture]);

  // Android back while running or paused cancels, then falls back to the picker (OQ-7, R14.7).
  useEffect(() => {
    if (!running) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dispatch({ type: 'cancel' });
      return true;
    });
    return () => sub.remove();
  }, [running]);

  // No valid Workflow means no machine can be verified for Guide: refuse on open instead of waiting for a frame.
  const anyValid = listing.some((w) => w.result.ok);
  useEffect(() => {
    if (!anyValid && stateRef.current.status === 'idle' && stateRef.current.error === null) {
      dispatch({ type: 'start', machine: 'none', workflow: UNUSED_WORKFLOW, atMs: capture.clock() });
    }
  }, [anyValid, capture]);

  const proofCount = state.proofs.length;
  useEffect(() => {
    if (Debug && proofCount > 0) Debug.logNewProof(stateRef.current);
  }, [proofCount]);

  const locale = getUiLocale();
  const transform = useMemo(() => {
    if (latest === null || deps.viewSize === null) return null;
    const t = computeCoverTransform(latest.frame.size, deps.viewSize);
    return t.ok ? t.value : null;
  }, [latest, deps.viewSize]);

  const highlight = computeHighlight({
    state,
    match: latest?.match ?? null,
    ocr: latest?.ocr ?? null,
    frame: latest?.frame ?? null,
    transform,
    machine,
    locale,
  });

  const view: GuideViewModel = buildViewModel({ state, machineSeen, listing, locale, highlight });

  const actions = useMemo(
    () => ({
      start: (workflowId: string) =>
        dispatch({ type: 'start', machine: 'verified', workflow: loadWorkflow(tm01Fixture, workflowId), atMs: capture.clock() }),
      startDebugInvalid: Debug
        ? () => dispatch({ type: 'start', machine: 'verified', workflow: Debug.debugInvalidWorkflow(), atMs: capture.clock() })
        : null,
      done: (stepId: string) => dispatch({ type: 'confirm-manual', stepId, atMs: capture.clock() }),
      retry: () => dispatch({ type: 'retry' }),
      back: () => dispatch({ type: 'step-back' }),
      reset: () => dispatch({ type: 'reset' }),
      cancel: () => dispatch({ type: 'cancel' }),
    }),
    [capture],
  );

  return { view, actions, region: deps.region, locale };
}
