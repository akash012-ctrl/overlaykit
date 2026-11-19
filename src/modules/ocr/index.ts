// Public API of ocr. Only shared types and ocr's own vendor-neutral types
// leave this module (R5.9, R23.5).
import { mlKitEngine } from './adapters/mlkit';
import type { OcrServiceWithDebug } from './service';
import { createOcrServiceFrom } from './service';
import { OCR_THRESHOLDS } from './thresholds';

export type { ConfidenceScale, OcrFailureCode, OcrService, RawOcrLine } from './types';
export type { OcrServiceWithDebug } from './service';

/** The default service, wrapping the native ML Kit module. */
export function createOcrService(): OcrServiceWithDebug {
  return createOcrServiceFrom(mlKitEngine, OCR_THRESHOLDS);
}

export type { OcrDebugTools } from './debug/raw-lines';

/** Debug-only accessor. The require sits inside the __DEV__ branch so Metro drops the module from release bundles (R21.6). */
export function getOcrDebugTools(service: OcrServiceWithDebug): import('./debug/raw-lines').OcrDebugTools | null {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__-only debug accessor (DD-13)
    return (require('./debug/raw-lines') as typeof import('./debug/raw-lines')).createOcrDebugTools(service);
  }
  return null;
}
