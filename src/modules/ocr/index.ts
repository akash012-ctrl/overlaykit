// Public API of ocr. Only shared types and ocr's own vendor-neutral types
// leave this module (R5.9, R23.5). The engine adapter and createOcrService
// arrive with the G1a spike (tasks 10.1 and 10.4).
export type { ConfidenceScale, OcrFailureCode, OcrService, RawOcrLine } from './types';
