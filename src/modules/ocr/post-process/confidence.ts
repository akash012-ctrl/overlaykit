import type { ConfidenceScale } from '../types';

/**
 * Engine confidence on a 0..1 scale, or undefined when the engine gave none
 * (R5.6, R5.7). undefined for null, a non-finite value, or scale 'none'.
 * Values outside the scale are clamped to it.
 */
export function normalizeConfidence(raw: number | null, scale: ConfidenceScale): number | undefined {
  if (raw === null || !Number.isFinite(raw) || scale === 'none') {
    return undefined;
  }
  const unit = scale === 'percent' ? raw / 100 : raw;
  return Math.min(Math.max(unit, 0), 1);
}
