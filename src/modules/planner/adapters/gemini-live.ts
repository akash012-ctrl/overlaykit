// Gemini Live planner adapter (spec 05 task 19.3, D-050, D-051). Opt-in, cloud: camera frames and
// optional mic audio go to Google only while a session is open and the ui has passed consent.
// The model answers by function call; it returns no coordinates. guide/plan grounds the words against local OCR.
import type { FrameId, PlanRequest, PlannerOutput, PlErrorCode, Result } from '../../shared';
import type { LiveKeyStore } from '../live-key-store';
import { LIVE_FRAME_INTERVAL_MS, LIVE_IDLE_STOP_MS, LIVE_MIN_FRAME_GAP_MS, LIVE_PLAN_TIMEOUT_MS } from '../live/manifest';
import {
  buildAudioMsg, buildAudioStreamEndMsg, buildFrameMsg, buildPlanText, buildTextMsg, buildToolResponse, callToOutput,
} from '../live/protocol';
import type { LiveToolCall, ServerMessage, ToolResult } from '../live/protocol';
import { createLiveSession } from '../live/session';
import type { LiveSession } from '../live/session';
import type { PlannerState, StepPlanner } from '../types';

export interface LiveFrameSource {
  /** JPEG, long edge <= 768 px, base64, for the still OCR read as `frameId`. null when it is gone. */
  frameJpegBase64(frameId: FrameId): Promise<string | null>;
}

export interface LiveMicSource {
  /** 16 kHz mono 16-bit PCM chunks (20 to 100 ms), base64. Off by default. */
  start(onChunk: (pcm16kBase64: string) => void): Promise<Result<void, 'PL_LIVE_MIC_DENIED'>>;
  stop(): void;
}

export type LiveSessionState =
  | { readonly kind: 'off' }
  | { readonly kind: 'connecting' }
  | { readonly kind: 'open'; readonly micOn: boolean }
  | { readonly kind: 'ended'; readonly code: PlErrorCode | null };

export interface LiveStepPlanner extends StepPlanner {
  /** Needs the ui's consent and a saved key. Sends nothing before it succeeds. */
  startSession(): Promise<Result<void, PlErrorCode>>;
  /** Idempotent. Works while connecting. */
  stopSession(): void;
  sessionState(): LiveSessionState;
  subscribeSession(cb: (s: LiveSessionState) => void): () => void;
  setMic(on: boolean): Promise<Result<void, PlErrorCode>>;
}

export type LiveStepPlannerOptions = {
  readonly frames: LiveFrameSource;
  readonly mic?: LiveMicSource;
  readonly keyStore: LiveKeyStore;
  /** The ui's stored consent, read at every startSession. Off by default: without it nothing is sent. */
  readonly consent: () => boolean;
};

type Pending = { readonly frameId: FrameId; readonly done: (r: Result<PlannerOutput, PlErrorCode>) => void };

/** NaN (unset threshold) never fires. */
function armTimer(ms: number, fn: () => void): ReturnType<typeof setTimeout> | null {
  return Number.isFinite(ms) ? setTimeout(fn, ms) : null;
}

const DENIED = { ok: false, error: 'PL_LIVE_MIC_DENIED' } as const;

export function createLiveStepPlanner(opts: LiveStepPlannerOptions): LiveStepPlanner {
  let state: LiveSessionState = { kind: 'off' };
  let session: LiveSession | null = null;
  let epoch = 0; // bumps on stop, so a late start or callback from an old session is ignored
  let pending: Pending | null = null;
  let lastFrameAt = -Infinity;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const stateSubs = new Set<(s: LiveSessionState) => void>();
  const statusSubs = new Set<(s: PlannerState) => void>();

  const status = (): PlannerState => (opts.keyStore.hasKey() ? { kind: 'ready' } : { kind: 'missing' });
  void opts.keyStore.get(); // fills the cached "has key" answer
  opts.keyStore.subscribe(() => statusSubs.forEach((cb) => cb(status())));

  function setState(s: LiveSessionState): void {
    state = s;
    stateSubs.forEach((cb) => cb(s));
  }

  function failPending(code: PlErrorCode): void {
    const p = pending;
    pending = null;
    p?.done({ ok: false, error: code });
  }

  function clearIdle(): void {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = null;
  }

  function teardown(next: LiveSessionState, code: PlErrorCode): void {
    epoch += 1;
    clearIdle();
    opts.mic?.stop();
    session?.close();
    session = null;
    failPending(code);
    setState(next);
  }

  function bumpIdle(): void {
    clearIdle();
    idleTimer = armTimer(LIVE_IDLE_STOP_MS, () => teardown({ kind: 'ended', code: 'PL_LIVE_SESSION_ENDED' }, 'PL_LIVE_SESSION_ENDED'));
  }

  function onToolCall(calls: readonly LiveToolCall[]): void {
    const p = pending;
    if (p === null) return;
    pending = null;
    const first = calls[0];
    const out = callToOutput(first, p.frameId);
    const results: ToolResult[] = calls.map((c) =>
      c === first && out.ok
        ? { id: c.id, name: c.name, status: 'ok', retryable: false, message: 'received' }
        : { id: c.id, name: c.name, status: 'error', retryable: false, message: 'rejected: not a valid answer for this frame' },
    );
    session?.send(buildToolResponse(results));
    p.done(out);
  }

  function onMessage(m: ServerMessage, myEpoch: number): void {
    if (myEpoch !== epoch) return;
    // shortcut: turnComplete without a tool call is not treated as a failure (it may belong to an earlier turn);
    // a silent model ends by LIVE_PLAN_TIMEOUT_MS or the caller's signal. Revisit with the measured value.
    if (m.kind === 'toolCall') onToolCall(m.calls);
  }

  async function sleep(ms: number, signal: AbortSignal): Promise<void> {
    await new Promise<void>((resolve) => {
      const t = setTimeout(done, ms);
      function done(): void {
        clearTimeout(t);
        signal.removeEventListener('abort', done);
        resolve();
      }
      signal.addEventListener('abort', done);
    });
  }

  return {
    status,
    subscribe(cb) {
      statusSubs.add(cb);
      return () => {
        statusSubs.delete(cb);
      };
    },
    sessionState: () => state,
    subscribeSession(cb) {
      stateSubs.add(cb);
      return () => {
        stateSubs.delete(cb);
      };
    },

    async startSession() {
      if (state.kind === 'connecting' || state.kind === 'open') return { ok: true, value: undefined };
      // shortcut: no PL_ code for "no consent"; PL_LIVE_SESSION_ENDED is used. The ui checks consent first.
      if (!opts.consent()) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      epoch += 1;
      const myEpoch = epoch;
      setState({ kind: 'connecting' });
      const key = await opts.keyStore.get();
      if (myEpoch !== epoch) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (!key.ok) {
        setState({ kind: 'ended', code: key.error });
        return key;
      }
      const s = createLiveSession({
        apiKey: key.value,
        onMessage: (m) => onMessage(m, myEpoch),
        onEnd: (code) => {
          if (myEpoch === epoch) teardown({ kind: 'ended', code }, code);
        },
      });
      session = s;
      const opened = await s.open();
      if (myEpoch !== epoch) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (!opened.ok) {
        teardown({ kind: 'ended', code: opened.error }, opened.error);
        return opened;
      }
      setState({ kind: 'open', micOn: false });
      bumpIdle();
      return { ok: true, value: undefined };
    },

    stopSession() {
      if (state.kind === 'off') return;
      teardown({ kind: 'off' }, 'PL_LIVE_SESSION_ENDED');
    },

    async setMic(on) {
      const mic = opts.mic;
      if (state.kind !== 'open') return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (!on) {
        mic?.stop();
        session?.send(buildAudioStreamEndMsg());
        setState({ kind: 'open', micOn: false });
        return { ok: true, value: undefined };
      }
      if (mic === undefined) return DENIED;
      const myEpoch = epoch;
      const started = await mic.start((chunk) => {
        if (myEpoch === epoch && state.kind === 'open' && state.micOn) session?.send(buildAudioMsg(chunk));
      });
      if (myEpoch !== epoch) {
        mic.stop();
        return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      }
      if (!started.ok) return started;
      setState({ kind: 'open', micOn: true });
      return { ok: true, value: undefined };
    },

    async planNext(req: PlanRequest, signal: AbortSignal) {
      if (state.kind !== 'open' || session === null) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (req.lines.every((l) => l.text.trim() === '')) return { ok: false, error: 'PL_NO_TEXT' };
      if (signal.aborted) return { ok: false, error: 'PL_TIMEOUT' };
      failPending('PL_TIMEOUT'); // a newer request cancels the older one
      const myEpoch = epoch;
      const waitMs = lastFrameAt + LIVE_MIN_FRAME_GAP_MS - Date.now();
      // Google's limit is 1 frame per second. LIVE_FRAME_INTERVAL_MS (unset) may only widen the gap.
      const gap = Math.max(waitMs, Number.isFinite(LIVE_FRAME_INTERVAL_MS) ? lastFrameAt + LIVE_FRAME_INTERVAL_MS - Date.now() : 0);
      if (gap > 0) await sleep(gap, signal);
      const jpeg = await opts.frames.frameJpegBase64(req.frameId);
      if (myEpoch !== epoch || state.kind !== 'open' || session === null) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (signal.aborted) return { ok: false, error: 'PL_TIMEOUT' };
      if (jpeg === null) return { ok: false, error: 'PL_CANNOT_PLAN' }; // shortcut: the still is gone; no text-only fallback

      bumpIdle();
      return new Promise<Result<PlannerOutput, PlErrorCode>>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const finish = (r: Result<PlannerOutput, PlErrorCode>): void => {
          if (timer !== null) clearTimeout(timer);
          signal.removeEventListener('abort', onAbort);
          resolve(r);
        };
        const onAbort = (): void => {
          if (pending?.done === finish) pending = null;
          finish({ ok: false, error: 'PL_TIMEOUT' });
        };
        pending = { frameId: req.frameId, done: finish };
        signal.addEventListener('abort', onAbort);
        timer = armTimer(LIVE_PLAN_TIMEOUT_MS, onAbort);
        lastFrameAt = Date.now();
        const sent = session?.send(buildFrameMsg(jpeg)) === true && session.send(buildTextMsg(buildPlanText(req)));
        if (!sent) {
          pending = null;
          finish({ ok: false, error: 'PL_LIVE_NETWORK' });
        }
      });
    },

    async release() {
      this.stopSession();
    },
  };
}
