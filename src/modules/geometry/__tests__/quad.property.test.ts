import * as fc from 'fast-check';

import { anyQuad, imageSize, rotatedRectQuad, viewSize } from '../../../../test-support/arbitraries';
import { ROUND_TRIP_TOLERANCE_PX, computeCoverTransform, frameQuadToView, imageToView, mapQuad, mirrorQuadX } from '..';
import type { Quad } from '../../shared';
import { quadSignedArea } from '../../shared';

const RUNS = { numRuns: 200 };

/** Sum of the absolute shoelace terms: the scale of the rounding error in quadSignedArea. */
function shoelaceMagnitude(quad: Quad): number {
  let sum = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    sum += Math.abs(a.x * b.y) + Math.abs(b.x * a.y);
  }
  return sum;
}

const quads = fc.oneof(rotatedRectQuad(-2_000, 22_000, 8_000), anyQuad(-2_000, 22_000));

describe('quad mapping properties', () => {
  // Feature: camera-ocr-geometry, Property 4: mapQuad keeps the corner order
  it('maps each corner with imageToView and scales the signed area by scale²', () => {
    fc.assert(
      fc.property(quads, imageSize(), viewSize(), (quad, image, view) => {
        const t = computeCoverTransform(image, view);
        if (!t.ok) throw new Error('valid sizes must give a transform');
        const mapped = mapQuad(quad, t.value);
        for (let i = 0; i < 4; i += 1) expect(mapped[i]).toEqual(imageToView(quad[i], t.value));
        const expected = quadSignedArea(quad) * t.value.scale ** 2;
        const tolerance = 1e-9 * Math.max(1, shoelaceMagnitude(mapped), shoelaceMagnitude(quad) * t.value.scale ** 2);
        expect(Math.abs(quadSignedArea(mapped) - expected)).toBeLessThanOrEqual(tolerance);
      }),
      RUNS,
    );
  });

  // Feature: camera-ocr-geometry, Property 5: Mirroring flips x and is its own inverse
  it('mirrors x exactly, round-trips, and leaves unmirrored frames to mapQuad', () => {
    fc.assert(
      fc.property(quads, fc.double({ min: 1, max: 20_000, noNaN: true }), imageSize(), viewSize(), (quad, width, image, view) => {
        const mirrored = mirrorQuadX(quad, width);
        for (let i = 0; i < 4; i += 1) {
          expect(mirrored[i].x).toBe(width - quad[i].x);
          expect(mirrored[i].y).toBe(quad[i].y);
        }
        const twice = mirrorQuadX(mirrored, width);
        for (let i = 0; i < 4; i += 1) {
          expect(Math.abs(twice[i].x - quad[i].x)).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE_PX);
          expect(twice[i].y).toBe(quad[i].y);
        }
        const t = computeCoverTransform(image, view);
        if (!t.ok) throw new Error('valid sizes must give a transform');
        expect(frameQuadToView(quad, { size: image, mirrored: false }, t.value)).toEqual(mapQuad(quad, t.value));
        expect(frameQuadToView(quad, { size: image, mirrored: true }, t.value)).toEqual(
          mapQuad(mirrorQuadX(quad, image.width), t.value),
        );
      }),
      RUNS,
    );
  });

  it('mirrors integer quads back to exactly the same quad', () => {
    const integerPoint = fc.record({ x: fc.integer({ min: -5_000, max: 25_000 }), y: fc.integer({ min: -5_000, max: 25_000 }) });
    fc.assert(
      fc.property(fc.tuple(integerPoint, integerPoint, integerPoint, integerPoint), fc.integer({ min: 1, max: 20_000 }), (quad, width) => {
        expect(mirrorQuadX(mirrorQuadX(quad, width), width)).toEqual(quad);
      }),
      RUNS,
    );
  });
});
