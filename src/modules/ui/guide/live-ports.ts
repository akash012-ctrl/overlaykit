import type { FrameRef } from '../../shared';
import type { LiveFrameSource, LiveMicSource } from '../../planner';
import { createLiveKeyStore } from '../../planner';

/**
 * Values the Live ports read when they run, written by the hook in effects.
 * A closure object, so no ref is passed around during render.
 */
export function createLiveBox() {
  let held: FrameRef | null = null;
  let allowed = false;
  let consent = false;
  return {
    held: (): FrameRef | null => held,
    hold: (f: FrameRef | null): void => {
      held = f;
    },
    allowed: (): boolean => allowed,
    allow: (v: boolean): void => {
      allowed = v;
    },
    consent: (): boolean => consent,
    setConsent: (v: boolean): void => {
      consent = v;
    },
  };
}

/** The one Google key store (a native adapter instance). Settings and Guide share it, so both see a save or a delete. */
export const liveKeys = createLiveKeyStore();

/** Long edge of a Live frame in pixels (design: 768). */
const LIVE_FRAME_LONG_EDGE_PX = 768;
// shortcut: provisional JPEG quality, replaced by the value measured on the phone (DQ-7).
const LIVE_FRAME_JPEG_QUALITY = 70;

type LiveNative = typeof import('../../../../modules/overlaykit-live');

/** The overlaykit-live module, or null when this build does not include it. Loaded on first use, never at start-up. */
function loadLiveNative(): LiveNative | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- the native module throws at import when it is not built in
    return require('../../../../modules/overlaykit-live') as LiveNative;
  } catch {
    return null;
  }
}

/**
 * Frames for Gemini Live, from the still the planner just read. Gives a JPEG only while `allowed()` is true and only
 * for the held still with that frame ID. Otherwise null, so nothing is sent.
 */
export function createLiveFrameSource(held: () => FrameRef | null, allowed: () => boolean): LiveFrameSource {
  return {
    async frameJpegBase64(frameId) {
      const frame = held();
      if (!allowed() || frame === null || frame.frameId !== frameId || frame.pixels.kind !== 'file') return null;
      const native = loadLiveNative();
      if (native === null) return null;
      const out = await native.scaleJpegBase64(frame.pixels.uri, LIVE_FRAME_LONG_EDGE_PX, LIVE_FRAME_JPEG_QUALITY);
      return out.ok && allowed() ? out.base64 : null;
    },
  };
}

/** Microphone for Gemini Live. Chunks flow only while `allowed()` is true. Off until the user switches it on. */
export function createLiveMicSource(allowed: () => boolean): LiveMicSource {
  return {
    async start(onChunk) {
      if (!allowed()) return { ok: false, error: 'PL_LIVE_MIC_DENIED' };
      const native = loadLiveNative();
      if (native === null) return { ok: false, error: 'PL_LIVE_MIC_DENIED' };
      // shortcut: a recorder failure (not a denial) also reads as PL_LIVE_MIC_DENIED. Add a code if the phone shows it.
      const res = await native.startMic((chunk) => {
        if (allowed()) onChunk(chunk);
      });
      return res.ok ? { ok: true, value: undefined } : { ok: false, error: 'PL_LIVE_MIC_DENIED' };
    },
    stop() {
      loadLiveNative()?.stopMic();
    },
  };
}
