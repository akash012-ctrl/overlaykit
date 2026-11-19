import type { FrameRef, OcrResult, Point, ReadableScript, Result } from '../shared';

/** The Result errors of recognize(). OCR_LOW_QUALITY and OCR_UNSUPPORTED_SCRIPT are markers on an ok result. */
export type OcrFailureCode = 'OCR_ENGINE_UNAVAILABLE' | 'OCR_NO_TEXT' | 'OCR_RECOGNITION_FAILED';

export interface OcrService {
  /** Loads the engine and its bundled model once, at screen open (R8.6, R8.7). */
  checkEngine(): Promise<Result<void, 'OCR_ENGINE_UNAVAILABLE'>>;
  /** Never rejects (R5.1, R5.10). */
  recognize(frame: FrameRef): Promise<Result<OcrResult, OcrFailureCode>>;
  /** Latin and Devanagari unless the G1a spike changes D-005 (R5.8). */
  getSupportedScripts(): readonly ReadableScript[];
}

/** How the engine reports confidence: 0..1, 0..100, or not at all. */
export type ConfidenceScale = 'unit' | 'percent' | 'none';

/**
 * Vendor-neutral engine output before post-processing. Stored in recorded
 * snapshots (DD-11). The adapter converts the engine's own types into this
 * shape, so no vendor type leaves the adapter file.
 */
export type RawOcrLine = {
  readonly text: string;
  /**
   * Upright image pixels, in Quad order: start of the top edge, end of the top
   * edge, end of the bottom edge, start of the bottom edge. The adapter reorders
   * the engine's corners if the engine documents another order.
   */
  readonly corners: readonly Point[] | null;
  readonly box: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } | null;
  readonly confidence: number | null;
  /** BCP-47 code when the engine reports one (R7.3). */
  readonly language: string | null;
};
