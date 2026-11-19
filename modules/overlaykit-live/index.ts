import { requireNativeModule } from 'expo';

/** Strings and numbers only. Never throws: every failure is a code string. */
export type LiveMicResult = { ok: true } | { ok: false; code: 'DENIED' | 'FAILED' };

export type LiveScaleResult =
  | { ok: true; base64: string }
  | { ok: false; code: 'NO_FILE' | 'FAILED' };

type OverlaykitLiveNative = {
  /**
   * Asks for RECORD_AUDIO if needed (only here, never at launch), then records 16 kHz mono 16-bit
   * little-endian PCM in 50 ms chunks. Each chunk arrives as base64 in `onMicChunk`. Writes no file.
   */
  startMic(): Promise<LiveMicResult>;
  /** Stops and releases the recorder. Safe to call when not running. */
  stopMic(): void;
  /**
   * Decodes `stillUri` (file:// path, plain path or content://), applies EXIF rotation, scales so the
   * long edge is at most `maxLongEdge` px (never enlarges), and returns JPEG base64 without line breaks.
   * Writes no file.
   */
  scaleJpegBase64(stillUri: string, maxLongEdge: number, quality: number): Promise<LiveScaleResult>;

  addListener(event: 'onMicChunk', cb: (e: { data: string }) => void): { remove(): void };
  /** Sent when the mic stopped without stopMic(): the app went to the background or was destroyed. */
  addListener(event: 'onMicStopped', cb: (e: { reason: 'background' | 'destroy' }) => void): { remove(): void };
};

const native = requireNativeModule<OverlaykitLiveNative>('OverlaykitLive');

/** Same shape as the design's `startMic(onChunk)`. The listener is removed on stopMic() and on a native stop. */
let chunkSub: { remove(): void } | null = null;
let stopSub: { remove(): void } | null = null;

function dropListeners(): void {
  chunkSub?.remove();
  stopSub?.remove();
  chunkSub = null;
  stopSub = null;
}

export async function startMic(onChunk: (pcm16kBase64: string) => void): Promise<LiveMicResult> {
  dropListeners();
  chunkSub = native.addListener('onMicChunk', (e) => onChunk(e.data));
  stopSub = native.addListener('onMicStopped', dropListeners);
  const result = await native.startMic();
  if (!result.ok) dropListeners();
  return result;
}

export function stopMic(): void {
  native.stopMic();
  dropListeners();
}

export const scaleJpegBase64 = native.scaleJpegBase64;
