import * as fc from 'fast-check';

import { imageSize, invalidDimension, viewSize } from '../../../../test-support/arbitraries';
import { ROUND_TRIP_TOLERANCE_PX, computeCoverTransform, imageToView, viewToImage } from '..';

const RUNS = { numRuns: 200 };

describe('cover transform properties', () => {
  // Feature: camera-ocr-geometry, Property 1: The cover transform covers the view and centres the image
  it('covers the view and centres the image for any valid sizes', () => {
    fc.assert(
      fc.property(imageSize(), viewSize(), (image, view) => {
        const result = computeCoverTransform(image, view);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const { scale, offsetX, offsetY } = result.value;
        expect(scale).toBe(Math.max(view.width / image.width, view.height / image.height));
        // Relative tolerance: one rounding step of the product.
        expect(image.width * scale).toBeGreaterThanOrEqual(view.width * (1 - 1e-12));
        expect(image.height * scale).toBeGreaterThanOrEqual(view.height * (1 - 1e-12));
        expect(offsetX).toBe((view.width - image.width * scale) / 2);
        expect(offsetY).toBe((view.height - image.height * scale) / 2);
        expect(offsetX).toBeLessThanOrEqual(view.width * 1e-12);
        expect(offsetY).toBeLessThanOrEqual(view.height * 1e-12);
        for (const value of [scale, offsetX, offsetY]) expect(Number.isFinite(value)).toBe(true);
      }),
      RUNS,
    );
  });

  // Feature: camera-ocr-geometry, Property 2: Image-to-view round trip
  it('maps a point to the view and back within ROUND_TRIP_TOLERANCE_PX', () => {
    const input = imageSize().chain((image) =>
      fc.record({
        image: fc.constant(image),
        view: viewSize(),
        fx: fc.double({ min: -0.5, max: 1.5, noNaN: true }),
        fy: fc.double({ min: -0.5, max: 1.5, noNaN: true }),
      }),
    );
    fc.assert(
      fc.property(input, ({ image, view, fx, fy }) => {
        const result = computeCoverTransform(image, view);
        if (!result.ok) throw new Error('valid sizes must give a transform');
        const p = { x: fx * image.width, y: fy * image.height };
        const v = imageToView(p, result.value);
        expect(Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
        const back = viewToImage(v, result.value);
        expect(Math.abs(back.x - p.x)).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE_PX);
        expect(Math.abs(back.y - p.y)).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE_PX);
      }),
      RUNS,
    );
  });

  // Feature: camera-ocr-geometry, Property 3: Invalid sizes are rejected
  it('rejects any size pair with a dimension that is not a finite number above zero', () => {
    const anyDimension = fc.oneof(fc.double({ min: 1, max: 20_000, noNaN: true }), invalidDimension());
    const sizes = fc
      .record({
        iw: anyDimension,
        ih: anyDimension,
        vw: anyDimension,
        vh: anyDimension,
        forced: fc.constantFrom('iw', 'ih', 'vw', 'vh'),
        bad: invalidDimension(),
      })
      .map(({ forced, bad, ...dims }) => ({ ...dims, [forced]: bad }));
    fc.assert(
      fc.property(sizes, ({ iw, ih, vw, vh }) => {
        expect(computeCoverTransform({ width: iw, height: ih }, { width: vw, height: vh })).toEqual({
          ok: false,
          error: 'INVALID_SIZE',
        });
      }),
      RUNS,
    );
  });
});
