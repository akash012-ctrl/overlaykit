// Shared fast-check generators for property tests. Test-only: app code may not
// import test-support/ (eslint.config.js). Generators produce geometry and
// strings, never OCR output: tests that need OCR lines use recorded snapshots.
import * as fc from 'fast-check';

import type { Point, Quad, Size } from '../src/modules/shared';

/** Image sizes in whole pixels, 1 to 20,000 (design.md, Property tests). */
export const imageSize = (): fc.Arbitrary<Size> =>
  fc.record({ width: fc.integer({ min: 1, max: 20_000 }), height: fc.integer({ min: 1, max: 20_000 }) });

/** View sizes in dp, 1 to 5,000, not necessarily whole numbers. */
export const viewSize = (): fc.Arbitrary<Size> =>
  fc.record({
    width: fc.double({ min: 1, max: 5_000, noNaN: true, noDefaultInfinity: true }),
    height: fc.double({ min: 1, max: 5_000, noNaN: true, noDefaultInfinity: true }),
  });

/** A dimension that is not a finite number above zero. */
export const invalidDimension = (): fc.Arbitrary<number> =>
  fc.oneof(
    fc.constantFrom(0, -0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    fc.double({ max: -Number.MIN_VALUE, noNaN: true }),
  );

const coordinate = (min: number, max: number): fc.Arbitrary<number> =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

export const point = (min: number, max: number): fc.Arbitrary<Point> =>
  fc.record({ x: coordinate(min, max), y: coordinate(min, max) });

/** A rotated rectangle in Quad order. Always convex. */
export const rotatedRectQuad = (centreMin: number, centreMax: number, maxSide: number): fc.Arbitrary<Quad> =>
  fc
    .record({
      centre: point(centreMin, centreMax),
      width: coordinate(1, maxSide),
      height: coordinate(1, maxSide),
      angle: coordinate(-Math.PI, Math.PI),
    })
    .map(({ centre, width, height, angle }) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const corner = (dx: number, dy: number): Point => ({
        x: centre.x + dx * cos - dy * sin,
        y: centre.y + dx * sin + dy * cos,
      });
      const hw = width / 2;
      const hh = height / 2;
      return [corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh)] as const;
    });

/** Any four points: possibly concave, self-intersecting or degenerate. */
export const anyQuad = (min: number, max: number): fc.Arbitrary<Quad> =>
  fc.tuple(point(min, max), point(min, max), point(min, max), point(min, max));

export const insets = () =>
  fc.record({
    top: coordinate(0, 200),
    right: coordinate(0, 200),
    bottom: coordinate(0, 200),
    left: coordinate(0, 200),
  });

export const controlBars = () => fc.record({ top: coordinate(0, 300), bottom: coordinate(0, 300) });
