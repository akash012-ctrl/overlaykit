import type { Quad } from '../../shared';
import { quadSignedArea } from '../../shared';
import type { RawOcrLine } from '../types';

export type QuadCheck = 'ok' | 'missing' | 'non-finite' | 'zero-area';

/**
 * The line's four corners, already in Quad order (see RawOcrLine.corners).
 * Falls back to the box corners when the engine gave no four corners, and
 * returns null when it gave neither.
 */
export function buildQuad(raw: RawOcrLine): Quad | null {
  const corners = raw.corners;
  if (corners && corners.length === 4) {
    return [corners[0], corners[1], corners[2], corners[3]];
  }
  if (raw.box) {
    const { left, top, right, bottom } = raw.box;
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
  }
  return null;
}

/**
 * non-finite: any coordinate is NaN or ±Infinity (R6.1).
 * zero-area: |shoelace area| ≤ epsilon, which covers corners on one straight
 * line or at one point, allowing for floating-point rounding (R6.2, DD-5).
 */
export function validateQuad(quad: Quad | null, zeroAreaEpsilonPx2: number): QuadCheck {
  if (!quad) return 'missing';
  if (!quad.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return 'non-finite';
  if (Math.abs(quadSignedArea(quad)) <= zeroAreaEpsilonPx2) return 'zero-area';
  return 'ok';
}
