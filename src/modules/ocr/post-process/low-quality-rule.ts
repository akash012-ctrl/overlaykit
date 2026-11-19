import type { ReadableLine } from '../../shared';
import { quadLineHeight } from '../../shared';
import { countNonWhitespace } from './script';

/**
 * Values come from the G1a spike (OQ-5) and live in ocr/thresholds.ts once
 * recorded in docs/DECISIONS.md. The rule takes them as a parameter and has
 * no defaults, so no value is invented before then.
 */
export type LowQualityThresholds = {
  /** Fewer non-whitespace characters than this over all readable lines is low quality. */
  readonly minTotalChars: number;
  /** With engine confidence: a mean line confidence below this (0..1) is low quality (R9.2). */
  readonly minMeanConfidence: number;
  /** Without engine confidence: a median line height below this, in image px, is low quality (R9.3). */
  readonly minMedianLineHeightPx: number;
};

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The Low-quality rule (R8.3, R9.1 to R9.3), over readable lines only. With no
 * readable line it is false: the unsupported state applies instead.
 *
 * 1. Low quality when the total non-whitespace character count is below `minTotalChars`.
 * 2. When the engine gives confidence and at least one line has one: low quality
 *    when the mean confidence of those lines is below `minMeanConfidence`.
 * 3. Otherwise the heuristic "few characters or small text": low quality when
 *    the median quadLineHeight is below `minMedianLineHeightPx`. Its name,
 *    inputs and values go into docs/DECISIONS.md with the G1a values.
 */
export function isLowQuality(
  lines: readonly ReadableLine[],
  engineGivesConfidence: boolean,
  t: LowQualityThresholds,
): boolean {
  if (lines.length === 0) return false;

  const totalChars = lines.reduce((sum, line) => sum + countNonWhitespace(line.text), 0);
  if (totalChars < t.minTotalChars) return true;

  const confidences = lines.flatMap((line) => (line.confidence === undefined ? [] : [line.confidence]));
  if (engineGivesConfidence && confidences.length > 0) {
    const mean = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    return mean < t.minMeanConfidence;
  }

  return median(lines.map((line) => quadLineHeight(line.quad))) < t.minMedianLineHeightPx;
}
