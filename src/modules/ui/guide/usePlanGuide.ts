import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { CaptureService, PreviewHandle } from '../../capture';
import { computeCoverTransform } from '../../geometry';
import type { Rect } from '../../geometry';
import {
  SCENE_LOST_TIMEOUT_MS,
  evaluateExpectation,
  groundStep,
  initialPlanGuideState,
  normalizeText,
  planLineId,
  planReducer,
  sceneVisible,
} from '../../guide';
import { getTranslationService, getUiLocale } from '../../locale';
import type { OcrService } from '../../ocr';
import type { PlannerState } from '../../planner';
import { createStepPlanner } from '../../planner';
import type { FrameRef, OcrResult, PlanLine, Size, SourceLocale } from '../../shared';
import { buildGoalLines, buildPlanView, computePlanHighlight } from './plan-view-model';
import type { PlanViewModel } from './plan-view-model';
import { useMachineLostTimer } from './useMachineLostTimer';

/**
 * Pause between automatic still captures. UNSET until G4 (NaN), then set with a DECISIONS.md entry.
 * While unset the loop does not start. A step then advances only on Done, or on two "Check now" taps
 * that each see the expected change. Nothing advances by itself or by a timer.
 */
export const GUIDE_CAPTURE_INTERVAL_MS = Number.NaN;

export type GuideDeps = {
  readonly capture: Pick<CaptureService, 'captureStill' | 'releaseStill' | 'clock'>;
  readonly ocr: Pick<OcrService, 'recognize'>;
  readonly getPreview: () => PreviewHandle | null;
  /** The preview view's size, for the cover transform. */
  readonly viewSize: Size | null;
  /** The visible region the marks are clipped to. */
  readonly region: Rect | null;
};

type Latest = { readonly frame: FrameRef; readonly ocr: OcrResult };
type Read = { readonly ok: true; readonly value: Latest } | { readonly ok: false };

/** The step text in the user's language, from the translation provider (text only). */
export type StepText =
  | { readonly kind: 'english' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'translated'; readonly text: string }
  | { readonly kind: 'failed' };

function usePlannerState(planner: ReturnType<typeof createStepPlanner>): PlannerState {
  const [state, setState] = useState<PlannerState>(() => planner.status());
  useEffect(() => {
    return planner.subscribe(setState);
  }, [planner]);
  return state;
}

/** Translates `text` into the UI language when it is not already in it. Text goes to the provider and nothing else. */
function useTranslated(text: string | null, source: SourceLocale | null): StepText {
  const locale = getUiLocale();
  const [out, setOut] = useState<{ readonly key: string; readonly value: StepText } | null>(null);
  const key = `${source ?? ''}|${locale}|${text ?? ''}`;
  useEffect(() => {
    if (text === null || source === null || source === locale) return undefined;
    let alive = true;
    void getTranslationService()
      .translate([text], { source, target: locale })
      .then((res) => {
        if (!alive) return;
        const first = res.ok ? res.value[0] : undefined;
        setOut({ key, value: first?.ok ? { kind: 'translated', text: first.value.text } : { kind: 'failed' } });
      });
    return () => {
      alive = false;
    };
  }, [key, text, source, locale]);
  if (text === null || source === null || source === locale) return { kind: 'english' };
  return out !== null && out.key === key ? out.value : { kind: 'pending' };
}

/**
 * The only place `planner`, `guide` and the camera meet (task 8.3). Capture, OCR, plan, ground, dispatch.
 * Cancels the planning call on unmount and when the app leaves the foreground, and releases the planner there.
 * The reducer decides every step change. This hook only reports what the camera saw.
 */
export function usePlanGuide(deps: GuideDeps) {
  const { capture } = deps;
  const planner = useMemo(() => createStepPlanner(), []);
  const plannerState = usePlannerState(planner);
  const [state, dispatch] = useReducer(planReducer, initialPlanGuideState);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [reading, setReading] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reason, setReason] = useState<string | null>(null);
  const [targetText, setTargetText] = useState('');
  const [goalSource, setGoalSource] = useState<SourceLocale | null>(null);

  const stateRef = useRef(state);
  const depsRef = useRef(deps);
  /** Text of the target line and of the planning frame, kept for the highlight and the scene check. */
  const baseline = useRef<readonly string[]>([]);
  const restartRef = useRef<() => void>(() => undefined);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    stateRef.current = state;
    depsRef.current = deps;
  });

  /** One capture and OCR at a time. The still is released after reading; marks need no image. */
  const readFrame = useCallback((): Promise<Read> => {
    const run = async (): Promise<Read> => {
      const d = depsRef.current;
      const shot = await d.capture.captureStill(d.getPreview());
      if (!shot.ok) return { ok: false };
      const frame = shot.value;
      const read = await d.ocr.recognize(frame);
      void d.capture.releaseStill(frame);
      // A result for a frame that was not just captured is dropped.
      return read.ok && read.value.frameId === frame.frameId ? { ok: true, value: { frame, ocr: read.value } } : { ok: false };
    };
    const next = chain.current.then(run, run);
    chain.current = next.catch(() => undefined);
    return next;
  }, []);

  const restart = useMachineLostTimer(appActive && state.status === 'showing', SCENE_LOST_TIMEOUT_MS, () => {
    dispatch({ type: 'scene-lost', atMs: capture.clock() });
  });
  useEffect(() => {
    restartRef.current = restart;
  }, [restart]);

  /** Reports what this frame shows for the current step. Dispatches an observation and nothing else. */
  const observe = useCallback((read: Latest) => {
    setLatest(read);
    const st = stateRef.current;
    const step = st.step;
    if (step === null || (st.status !== 'showing' && st.status !== 'paused')) return;
    const scene = sceneVisible(baseline.current, read.ocr);
    if (scene === 'seen') restartRef.current();
    dispatch({
      type: 'observation',
      observation: {
        observationId: `obs:${read.ocr.frameId}`,
        frameId: read.ocr.frameId,
        seq: read.ocr.capturedAtMs,
        forStepId: step.id,
        result: evaluateExpectation(step.expectation, read.ocr),
        // shortcut: "cannot tell" counts as visible, so a pause can end while the threshold is unset (G4). Tighten then.
        sceneVisible: scene !== 'lost',
      },
    });
  }, []);

  /** A user-started read: the goal picker's "Read the screen" and the step's "Check now". */
  const readNow = useCallback(async (): Promise<void> => {
    setReading(true);
    const read = await readFrame();
    setReading(false);
    if (!read.ok) return;
    if (stateRef.current.status === 'idle') setLatest(read.value);
    else observe(read.value);
  }, [readFrame, observe]);

  // Automatic loop. Does not start while the interval is unset.
  const status = state.status;
  const looping = status === 'idle' || status === 'showing' || status === 'paused';
  useEffect(() => {
    if (!appActive || !looping || !Number.isFinite(GUIDE_CAPTURE_INTERVAL_MS)) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async (): Promise<void> => {
      const read = await readFrame();
      if (!stopped && read.ok) {
        if (stateRef.current.status === 'idle') setLatest(read.value);
        else observe(read.value);
      }
      if (!stopped) timer = setTimeout(() => void tick(), GUIDE_CAPTURE_INTERVAL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [appActive, looping, readFrame, observe]);

  // Planning: a fresh frame, one planner call, grounding, then one event. Aborted on leave.
  useEffect(() => {
    if (status !== 'planning' || !appActive) return undefined;
    const ctrl = new AbortController();
    void (async () => {
      setReason(null);
      const read = await readFrame();
      if (ctrl.signal.aborted) return;
      // shortcut: a camera or OCR failure has no code of its own in spec 05, so it shows as PL_NO_TEXT.
      if (!read.ok) return dispatch({ type: 'plan-failed', code: 'PL_NO_TEXT' });
      const { ocr: frameOcr } = read.value;
      setLatest(read.value);
      const lines: PlanLine[] = [];
      frameOcr.lines.forEach((line, index) => {
        if (line.script !== 'unsupported') lines.push({ lineId: planLineId(frameOcr.frameId, index), text: line.text });
      });
      const st = stateRef.current;
      const out = await planner.planNext({ frameId: frameOcr.frameId, goal: st.goal ?? '', lines, done: st.done }, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (!out.ok) return dispatch({ type: 'plan-failed', code: out.error });
      if (out.value.kind === 'cannot-plan') setReason(out.value.reason);
      const grounded = groundStep(out.value, frameOcr);
      if (!grounded.ok) return dispatch({ type: 'plan-failed', code: grounded.error });
      if ('finished' in grounded.value) return dispatch({ type: 'plan-finished' });
      const step = grounded.value;
      const index = Number(step.target.lineId.slice(step.target.lineId.lastIndexOf('#') + 1));
      setTargetText(frameOcr.lines[index]?.script === 'unsupported' ? '' : (frameOcr.lines[index]?.text ?? ''));
      baseline.current = frameOcr.lines.flatMap((l) => (l.script === 'unsupported' ? [] : [normalizeText(l.text)]));
      dispatch({ type: 'plan-ready', step });
    })();
    return () => ctrl.abort();
  }, [status, appActive, planner, readFrame]);

  // Leaving the foreground: running steps pause, planning is aborted by the effect above, the model is released.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) {
        if (stateRef.current.status === 'showing') dispatch({ type: 'interrupted', atMs: capture.clock() });
        setLatest(null);
        void planner.release();
      }
    });
    return () => sub.remove();
  }, [capture, planner]);

  // Unmount (mode switch, back): drop the model. The planning effect aborts its own call.
  useEffect(() => () => void planner.release(), [planner]);

  const stepText = useTranslated(state.step?.instruction ?? null, 'en');
  const goalText = useTranslated(state.goal, goalSource);

  const transform = useMemo(() => {
    if (latest === null || deps.viewSize === null) return null;
    const t = computeCoverTransform(latest.frame.size, deps.viewSize);
    return t.ok ? t.value : null;
  }, [latest, deps.viewSize]);

  const view: PlanViewModel = buildPlanView(state, plannerState);

  const highlight =
    view.kind === 'step' && state.step !== null
      ? computePlanHighlight({
          target: { text: targetText, frameId: state.step.target.frameId, quad: state.step.target.quad },
          ocr: latest?.ocr ?? null,
          frame: latest?.frame ?? null,
          transform,
        })
      : null;

  const goalLines = useMemo(
    () => buildGoalLines(latest?.ocr ?? null, latest?.frame ?? null, transform),
    [latest, transform],
  );

  const actions = useMemo(
    () => ({
      readNow: () => void readNow(),
      setGoal: (goal: string, source: SourceLocale | null) => {
        setGoalSource(source);
        dispatch({ type: 'goal-set', goal });
      },
      done: (stepId: string) => dispatch({ type: 'done', stepId, atMs: capture.clock() }),
      back: () => dispatch({ type: 'back' }),
      retry: () => dispatch({ type: 'retry' }),
      finish: () => dispatch({ type: 'finish' }),
      notYet: () => dispatch({ type: 'not-yet' }),
      /** Stop: cancels any planning call (the effect aborts it) and returns to the goal picker. */
      stop: () => {
        dispatch({ type: 'cancel' });
        dispatch({ type: 'reset' });
      },
      reset: () => dispatch({ type: 'reset' }),
    }),
    [capture, readNow],
  );

  return {
    view,
    state,
    actions,
    highlight,
    goalLines,
    goalText,
    stepText,
    reason,
    reading,
    plannerState,
    region: deps.region,
    locale: getUiLocale(),
    hasLatest: latest !== null,
  };
}

export type PlanGuide = ReturnType<typeof usePlanGuide>;
