import type { FrameRef, OcrLine, OcrResult, ReadableLine, ReadableScript, Result } from '../../shared';
import type { ConfidenceScale, RawOcrLine } from '../types';
import { normalizeConfidence } from './confidence';
import type { LowQualityThresholds } from './low-quality-rule';
import { isLowQuality } from './low-quality-rule';
import { buildQuad, validateQuad } from './quad';
import { classifyScript } from './script';
import type { UnsupportedScriptThresholds } from './unsupported-rule';
import { isUnsupportedLine } from './unsupported-rule';

/** Every value postProcess needs. The real values live in ocr/thresholds.ts once recorded (OQ-5). */
export type OcrThresholds = {
  /** validateQuad's zero-area tolerance, in image px² (DD-5). */
  readonly zeroAreaEpsilonPx2: number;
  readonly lowQuality: LowQualityThresholds;
  readonly unsupported: UnsupportedScriptThresholds;
};

export type EngineTraits = {
  readonly supportedScripts: readonly ReadableScript[];
  readonly confidenceScale: ConfidenceScale;
};

function withConfidence<T extends object>(line: T, confidence: number | undefined): T & { confidence?: number } {
  return confidence === undefined ? line : { ...line, confidence };
}

/**
 * Turns the adapter's raw lines for one frame into an OcrResult (R5, R6, R7, R8).
 * Pure: runs in Jest on recorded snapshots with no native code.
 *
 * 1. In input order: NFC-normalize and trim the text, build the quad, validate
 *    it. A line with an invalid quad or empty text is excluded and counted
 *    (R6.1 to R6.3, DD-4).
 * 2. Normalize the confidence (R5.6, R5.7).
 * 3. A line that meets the Unsupported-script rule becomes an UnsupportedLine
 *    with no text (R7.4, DD-3). Others are latin or devanagari (R7.1, R7.2).
 * 4. No line left: OCR_NO_TEXT (R8.1).
 * 5. qualityFlag when the Low-quality rule holds over the readable lines. Lines
 *    are never removed or changed by this step (R8.3).
 * 6. frameId, capturedAtMs and the image size come from the frame (R5.2, R5.3).
 */
export function postProcess(
  raw: readonly RawOcrLine[],
  frame: FrameRef,
  engine: EngineTraits,
  thresholds: OcrThresholds,
): Result<OcrResult, 'OCR_NO_TEXT'> {
  const lines: OcrLine[] = [];
  let excludedLineCount = 0;

  for (const rawLine of raw) {
    const text = rawLine.text.normalize('NFC').trim();
    const quad = buildQuad(rawLine);
    if (text.length === 0 || quad === null || validateQuad(quad, thresholds.zeroAreaEpsilonPx2) !== 'ok') {
      excludedLineCount += 1;
      continue;
    }

    const confidence = normalizeConfidence(rawLine.confidence, engine.confidenceScale);
    const script = classifyScript(text);
    if (
      script === 'unsupported' ||
      isUnsupportedLine(
        { text, confidence, language: rawLine.language, supportedScripts: engine.supportedScripts },
        thresholds.unsupported,
      )
    ) {
      lines.push(withConfidence({ script: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT', quad } as const, confidence));
    } else {
      lines.push(withConfidence({ script, text, quad }, confidence));
    }
  }

  if (lines.length === 0) {
    return { ok: false, error: 'OCR_NO_TEXT' };
  }

  const readable = lines.filter((line): line is ReadableLine => line.script !== 'unsupported');
  const lowQuality = isLowQuality(readable, engine.confidenceScale !== 'none', thresholds.lowQuality);

  return {
    ok: true,
    value: {
      frameId: frame.frameId,
      capturedAtMs: frame.capturedAtMs,
      imageSize: frame.size,
      lines,
      excludedLineCount,
      ...(lowQuality ? { qualityFlag: 'OCR_LOW_QUALITY' as const } : {}),
    },
  };
}
