import type { ReadableScript } from '../shared';
import type { ConfidenceScale, RawOcrLine } from './types';

/**
 * The vendor seam (DD-2). Implemented by adapters/<engine>.ts, the only file
 * that imports the OCR binding. Chosen in the G1a spike (task 10.1).
 */
export interface OcrEngine {
  /** Engine name and version, for DECISIONS.md and snapshots. */
  readonly id: string;
  readonly supportedScripts: readonly ReadableScript[];
  readonly confidenceScale: ConfidenceScale;
  /** false or a rejection means OCR_ENGINE_UNAVAILABLE. */
  load(): Promise<boolean>;
  /** A throw or rejection means OCR_RECOGNITION_FAILED. */
  readStill(uri: string): Promise<readonly RawOcrLine[]>;
}
