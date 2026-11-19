// OVERLAYKIT_DEBUG_ONLY: loaded only behind __DEV__ (R21.6).
import type { ReadableScript } from '../../shared';
import type { OcrServiceWithDebug } from '../service';
import type { ConfidenceScale, RawOcrLine } from '../types';

export type OcrDebugTools = {
  rawLinesFor(frameId: string): readonly RawOcrLine[] | null;
  engineInfo(): { readonly id: string; readonly supportedScripts: readonly ReadableScript[]; readonly confidenceScale: ConfidenceScale };
};

export function createOcrDebugTools(service: OcrServiceWithDebug): OcrDebugTools {
  return {
    rawLinesFor: (frameId) => service.rawLinesFor(frameId),
    engineInfo: () => ({
      id: service.engineId,
      supportedScripts: service.getSupportedScripts(),
      confidenceScale: service.confidenceScale,
    }),
  };
}

/** Release-bundle search marker (R21.6). */
export const DEBUG_MARKER_RAW_LINES = 'OVERLAYKIT_DEBUG_ONLY';
