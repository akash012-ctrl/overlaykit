// Gemini Live socket helper (spec 05 task 19.2). Owns the WebSocket, the resumption handle and cleanup.
// The user's key is in the socket URL (Google's raw WebSocket guide), so the URL is built here, used once,
// and never logged, stored, thrown or returned. Nothing here logs. No frames or audio are kept.
import type { PlErrorCode, Result } from '../../shared';
import { LIVE_HOST, LIVE_MAX_RESUME_ATTEMPTS, LIVE_PATH } from './manifest';
import { buildSetup, mapClose, parseServerMessage } from './protocol';
import type { ServerMessage } from './protocol';

export type LiveSession = {
  /** Connects, sends setup, waits for setupComplete. Resolves once. */
  open(): Promise<Result<void, PlErrorCode>>;
  /** false when the socket is not ready: nothing is queued or buffered. */
  send(json: string): boolean;
  /** Idempotent. Works while connecting. After it, no callback fires. */
  close(): void;
};

export type LiveSessionOptions = {
  readonly apiKey: string;
  readonly onMessage: (m: ServerMessage) => void;
  /** Called at most once, when the session ends without close() being called. */
  readonly onEnd: (code: PlErrorCode) => void;
  readonly signal?: AbortSignal;
};

const OPEN = 1;

export function createLiveSession(opts: LiveSessionOptions): LiveSession {
  let current: WebSocket | null = null; // the socket sends go to
  let connecting: WebSocket | null = null;
  let handle: string | null = null; // latest resumable handle
  let closed = false;
  let ended = false;
  let attempts = 0;
  let cancelOpen: (() => void) | null = null;

  const url = (): string => `wss://${LIVE_HOST}${LIVE_PATH}?key=${encodeURIComponent(opts.apiKey)}`;

  function detach(s: WebSocket | null): void {
    if (s === null) return;
    s.onopen = null;
    s.onmessage = null;
    s.onerror = null;
    s.onclose = null;
    try {
      s.close();
    } catch {
      // already closed
    }
  }

  function end(code: PlErrorCode): void {
    if (closed || ended) return;
    ended = true;
    detach(current);
    detach(connecting);
    current = null;
    connecting = null;
    handle = null;
    opts.onEnd(code);
  }

  function connect(resume: string | null): Promise<Result<void, PlErrorCode>> {
    return new Promise((resolve) => {
      let settled = false;
      let sock: WebSocket;
      const settle = (r: Result<void, PlErrorCode>): void => {
        if (settled) return;
        settled = true;
        cancelOpen = null;
        resolve(r);
      };
      try {
        sock = new WebSocket(url());
      } catch {
        settle({ ok: false, error: 'PL_LIVE_NETWORK' });
        return;
      }
      sock.binaryType = 'arraybuffer';
      connecting = sock;
      cancelOpen = () => {
        detach(sock);
        if (connecting === sock) connecting = null;
        settle({ ok: false, error: 'PL_LIVE_SESSION_ENDED' });
      };
      sock.onopen = () => sock.send(buildSetup(resume));
      sock.onmessage = (ev: { data: unknown }) => {
        if (sock !== current && sock !== connecting) return;
        const m = parseServerMessage(ev.data);
        if (m.kind === 'setupComplete') {
          if (sock !== connecting) return;
          const old = current;
          current = sock;
          connecting = null;
          if (old !== null) detach(old);
          attempts = 0;
          settle({ ok: true, value: undefined });
          return;
        }
        if (m.kind === 'resumption') handle = m.resumable ? m.handle : null;
        if (m.kind === 'goAway') void resume_(null);
        opts.onMessage(m);
      };
      sock.onerror = () => {
        // onclose follows with the code; the error event carries nothing safe to keep.
      };
      sock.onclose = (ev: { code?: number; reason?: string }) => {
        if (sock !== current && sock !== connecting) return;
        const code = mapClose(ev.code ?? 1006, ev.reason ?? '');
        if (sock === connecting) {
          connecting = null;
          settle({ ok: false, error: code });
          return;
        }
        current = null;
        void resume_(code);
      };
    });
  }

  /** Reconnects with the saved handle. Without a handle, or after the attempts, the session ends. */
  async function resume_(dropCode: PlErrorCode | null): Promise<void> {
    if (closed || ended || connecting !== null) return;
    if (dropCode === 'PL_LIVE_AUTH' || dropCode === 'PL_LIVE_QUOTA') return end(dropCode);
    while (handle !== null && attempts < LIVE_MAX_RESUME_ATTEMPTS) {
      attempts += 1;
      const r = await connect(handle);
      if (closed || ended) return;
      if (r.ok) return;
      if (r.error === 'PL_LIVE_AUTH' || r.error === 'PL_LIVE_QUOTA') return end(r.error);
    }
    if (current === null) end('PL_LIVE_SESSION_ENDED');
  }

  const onAbort = (): void => api.close();
  opts.signal?.addEventListener('abort', onAbort);

  const api: LiveSession = {
    async open() {
      if (closed) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      if (opts.signal?.aborted === true) return { ok: false, error: 'PL_LIVE_SESSION_ENDED' };
      return connect(null);
    },
    send(json) {
      const s = current;
      if (closed || ended || s === null || s.readyState !== OPEN) return false;
      s.send(json);
      return true;
    },
    close() {
      if (closed) return;
      closed = true;
      opts.signal?.removeEventListener('abort', onAbort);
      cancelOpen?.();
      detach(current);
      detach(connecting);
      current = null;
      connecting = null;
      handle = null;
    },
  };
  return api;
}
