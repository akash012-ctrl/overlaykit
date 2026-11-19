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
