import type { FrameRef, OcrResult, ReadableScript, Result } from '../shared';
import type { OcrEngine } from './engine';
import type { OcrThresholds } from './post-process/post-process';
import { postProcess } from './post-process/post-process';
import type { ConfidenceScale, OcrFailureCode, OcrService, RawOcrLine } from './types';

export type OcrServiceWithDebug = OcrService & {
  /** Raw lines of the last few frames, for the debug snapshot export only. */
  rawLinesFor(frameId: string): readonly RawOcrLine[] | null;
  readonly engineId: string;
  readonly confidenceScale: ConfidenceScale;
};

const KEEP_RAW_FRAMES = 3;

/**
 * recognize(frame):
 * 1. Not a still file: OCR_RECOGNITION_FAILED (a programming error).
 * 2. Loads the engine once and caches the outcome; false or a rejection is OCR_ENGINE_UNAVAILABLE (R8.7).
 * 3. readStill inside try: a throw or rejection is OCR_RECOGNITION_FAILED (R5.10, R8.9).
 * 4. postProcess.
 */
export function createOcrServiceFrom(engine: OcrEngine, thresholds: OcrThresholds): OcrServiceWithDebug {
  let loaded: Promise<boolean> | null = null;
  const raw = new Map<string, readonly RawOcrLine[]>();

  const load = (): Promise<boolean> => {
    if (!loaded) {
      loaded = engine.load().then(
        (ok) => ok === true,
        () => false,
      );
    }
    return loaded;
  };

  return {
    engineId: engine.id,
    confidenceScale: engine.confidenceScale,
    async checkEngine(): Promise<Result<void, 'OCR_ENGINE_UNAVAILABLE'>> {
      return (await load()) ? { ok: true, value: undefined } : { ok: false, error: 'OCR_ENGINE_UNAVAILABLE' };
    },
    async recognize(frame: FrameRef): Promise<Result<OcrResult, OcrFailureCode>> {
      if (frame.pixels.kind !== 'file') return { ok: false, error: 'OCR_RECOGNITION_FAILED' };
      if (!(await load())) return { ok: false, error: 'OCR_ENGINE_UNAVAILABLE' };
      let lines: readonly RawOcrLine[];
      try {
        lines = await engine.readStill(frame.pixels.uri);
      } catch {
        return { ok: false, error: 'OCR_RECOGNITION_FAILED' };
      }
      raw.set(frame.frameId, lines);
      while (raw.size > KEEP_RAW_FRAMES) raw.delete(raw.keys().next().value as string);
      return postProcess(lines, frame, engine, thresholds);
    },
    getSupportedScripts(): readonly ReadableScript[] {
      return engine.supportedScripts;
    },
    rawLinesFor(frameId) {
      return raw.get(frameId) ?? null;
    },
  };
}
