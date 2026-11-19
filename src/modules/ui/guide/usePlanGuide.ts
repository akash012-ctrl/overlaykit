import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { getTranslationService, getUiLocale, useLocaleSettings } from '../../locale';
import type { StringKey } from '../../locale';
import type { OcrService } from '../../ocr';
import type { LiveSessionState, LiveStepPlanner, PlannerState, StepPlanner } from '../../planner';
import { createStepPlanner } from '../../planner';
import type { FrameRef, OcrResult, PlanLine, PlErrorCode, Size, SourceLocale } from '../../shared';
import { createLiveBox, createLiveFrameSource, createLiveMicSource, liveKeys } from './live-ports';
import { hasValidConsent, liveStartBlock } from './live-view-model';
import type { LiveBannerState } from './live-view-model';
import { buildGoalLines, buildPlanView, computePlanHighlight } from './plan-view-model';
import type { PlanViewModel } from './plan-view-model';
import { useLiveSendGate } from './useLiveSendGate';
import { useMachineLostTimer } from './useMachineLostTimer';
import { getDeviceModelStore, onDeviceState, useModels } from './useModels';

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

function usePlannerState(planner: StepPlanner): PlannerState {
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
  const settings = useLocaleSettings();
  const choice = settings.plannerChoice;
  /** Holds the still the Live planner is about to send (only during one planning call) and the send gate's answer. */
  const [box] = useState(createLiveBox);
  const { planner, live } = useMemo((): { planner: StepPlanner; live: LiveStepPlanner | null } => {
    if (choice === 'gemini-live') {
      const p = createStepPlanner({
        choice: 'gemini-live',
        live: {
          frames: createLiveFrameSource(box.held, box.allowed),
          mic: createLiveMicSource(box.allowed),
          keyStore: liveKeys,
          consent: box.consent,
        },
      });
      return { planner: p, live: p };
    }
    // Nothing leaves the phone here: the on-device engine takes OCR text and the goal only.
    return { planner: createStepPlanner({ choice: 'on-device', store: getDeviceModelStore() ?? undefined }), live: null };
  }, [choice, box]);
  const models = useModels();
  const plannerState = usePlannerState(planner);

  const [seen, setSeen] = useState<{ readonly of: LiveStepPlanner; readonly state: LiveSessionState } | null>(null);
  useEffect(() => (live === null ? undefined : live.subscribeSession((next) => setSeen({ of: live, state: next }))), [live]);
  const session: LiveSessionState = live === null ? { kind: 'off' } : seen !== null && seen.of === live ? seen.state : live.sessionState();
  const bannerState: LiveBannerState = session.kind === 'connecting' ? 'connecting' : session.kind === 'open' ? 'open' : 'off';
  const [hasKey, setHasKey] = useState(liveKeys.hasKey());
  useEffect(() => {
    void liveKeys.get().then((r) => setHasKey(r.ok));
    return liveKeys.subscribe(setHasKey);
  }, []);
  const liveGate = useMemo(() => ({ plannerChoice: choice, consent: settings.liveConsent, hasKey }), [choice, settings.liveConsent, hasKey]);
  const stopLive = useCallback(() => live?.stopSession(), [live]);
  const sendAllowed = useLiveSendGate(liveGate, bannerState, stopLive);
  const [micError, setMicError] = useState<PlErrorCode | null>(null);
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
    box.setConsent(hasValidConsent(settings.liveConsent));
    box.allow(sendAllowed);
  });

  const releaseHeld = useCallback(() => {
    const h = box.held();
    box.hold(null);
    if (h !== null) void depsRef.current.capture.releaseStill(h);
  }, [box]);

  /**
   * One capture and OCR at a time. The still is released after reading; marks need no image.
   * With `keep` (a Live planning call) the still stays until `releaseHeld`, so its JPEG can be made for that frame.
   */
  const readFrame = useCallback((keep = false): Promise<Read> => {
    const run = async (): Promise<Read> => {
      const d = depsRef.current;
      if (keep) releaseHeld();
      const shot = await d.capture.captureStill(d.getPreview());
      if (!shot.ok) return { ok: false };
      const frame = shot.value;
      const read = await d.ocr.recognize(frame);
      if (keep) box.hold(frame);
      else void d.capture.releaseStill(frame);
      // A result for a frame that was not just captured is dropped.
      return read.ok && read.value.frameId === frame.frameId ? { ok: true, value: { frame, ocr: read.value } } : { ok: false };
    };
    const next = chain.current.then(run, run);
    chain.current = next.catch(() => undefined);
    return next;
  }, [releaseHeld, box]);

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
      try {
        setReason(null);
        const read = await readFrame(live !== null);
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
      } finally {
        releaseHeld();
      }
    })();
    return () => ctrl.abort();
  }, [status, appActive, planner, live, readFrame, releaseHeld]);

  // Leaving the foreground: running steps pause, planning is aborted by the effect above, the model is released.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) {
        if (stateRef.current.status === 'showing') dispatch({ type: 'interrupted', atMs: capture.clock() });
        setLatest(null);
        releaseHeld();
        void planner.release();
      }
    });
    return () => sub.remove();
  }, [capture, planner, releaseHeld]);

  // Unmount (mode switch, back): drop the model and end any Live session. The planning effect aborts its own call.
  useEffect(
    () => () => {
      releaseHeld();
      void planner.release();
    },
    [planner, releaseHeld],
  );
  // Leaving the screen for another route (Settings) ends Live too: the banner would be out of sight.
  useFocusEffect(
    useCallback(() => () => live?.stopSession(), [live]),
  );
  // Any time the gate closes while a session exists (consent withdrawn, key deleted, background), stop it.
  useEffect(() => {
    if (bannerState !== 'off' && !sendAllowed) live?.stopSession();
  }, [bannerState, sendAllowed, live]);
  // Goal done, cancelled or failed: stop Live. A new goal needs a new Start.
  useEffect(() => {
    if (status === 'completed' || status === 'cancelled' || status === 'cannot-plan') live?.stopSession();
  }, [status, live]);

  const stepText = useTranslated(state.step?.instruction ?? null, 'en');
  const goalText = useTranslated(state.goal, goalSource);

  const transform = useMemo(() => {
    if (latest === null || deps.viewSize === null) return null;
    const t = computeCoverTransform(latest.frame.size, deps.viewSize);
    return t.ok ? t.value : null;
  }, [latest, deps.viewSize]);

  const view: PlanViewModel = buildPlanView(state, live !== null ? { kind: 'ready' } : onDeviceState(models, plannerState));

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
      retry: () => {
        // Live retry means Start Gemini Live again, so a closed session goes back to the goal picker (R16.13).
        if (live !== null && bannerState !== 'open') {
          dispatch({ type: 'cancel' });
          dispatch({ type: 'reset' });
        } else dispatch({ type: 'retry' });
      },
      finish: () => dispatch({ type: 'finish' }),
      notYet: () => dispatch({ type: 'not-yet' }),
      /** Stop: ends any Live session, cancels any planning call (the effect aborts it) and returns to the goal picker. */
      stop: () => {
        live?.stopSession();
        dispatch({ type: 'cancel' });
        dispatch({ type: 'reset' });
      },
      reset: () => dispatch({ type: 'reset' }),
    }),
    [capture, readNow, live, bannerState],
  );

  const startLive = useCallback(() => {
    if (live === null || liveStartBlock(liveGate) !== null) return;
    setMicError(null);
    void live.startSession();
  }, [live, liveGate]);
  const setMic = useCallback(
    (on: boolean) => {
      if (live === null) return;
      void live.setMic(on).then((r) => setMicError(r.ok ? null : r.error));
    },
    [live],
  );
  const plannerNameKey: StringKey =
    live !== null ? 'guide.planner.live' : models.big.kind === 'ready' ? 'guide.planner.gemma4' : 'guide.planner.gemma3';

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
    models,
    plannerNameKey,
    liveInfo: {
      active: live !== null,
      gate: liveGate,
      banner: bannerState,
      micOn: session.kind === 'open' && session.micOn,
      micError,
      endedCode: session.kind === 'ended' ? session.code : null,
      start: startLive,
      stop: stopLive,
      setMic,
    },
    region: deps.region,
    locale: getUiLocale(),
    hasLatest: latest !== null,
  };
}

export type PlanGuide = ReturnType<typeof usePlanGuide>;
