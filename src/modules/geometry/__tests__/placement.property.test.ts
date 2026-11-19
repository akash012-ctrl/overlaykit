import * as fc from 'fast-check';

import { rotatedRectQuad } from '../../../../test-support/arbitraries';
import type { LabelRequest, Rect } from '..';
import { placeLabels, quadBounds } from '..';

const RUNS = { numRuns: 200 };

const region: fc.Arbitrary<Rect> = fc.record({
  x: fc.double({ min: 0, max: 100, noNaN: true }),
  y: fc.double({ min: 0, max: 200, noNaN: true }),
  width: fc.double({ min: 40, max: 1_000, noNaN: true }),
  height: fc.double({ min: 40, max: 2_000, noNaN: true }),
});

const requests: fc.Arbitrary<LabelRequest[]> = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    quad: rotatedRectQuad(-100, 1_200, 400),
    size: fc.record({
      width: fc.double({ min: 1, max: 600, noNaN: true }),
      height: fc.double({ min: 1, max: 200, noNaN: true }),
    }),
  }),
  { selector: (r) => r.id, minLength: 0, maxLength: 40 },
);

const overlapArea = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

describe('label placement properties', () => {
  // Feature: camera-ocr-geometry, Property 7: Label placement is valid or reported unplaced
  it('places each label inside the region, clear of its own line and of other labels, or reports it unplaced', () => {
    fc.assert(
      fc.property(requests, region, (reqs, r) => {
        const placements = placeLabels(reqs, r);
        expect(placements.map((p) => p.id)).toEqual(reqs.map((q) => q.id));
        const placedBoxes: Rect[] = [];
        placements.forEach((placement, index) => {
          const request = reqs[index];
          if (request.size.width > r.width || request.size.height > r.height) {
            expect(placement.kind).toBe('unplaced');
          }
          if (placement.kind !== 'placed') return;
          const box = placement.box;
          expect(box.width).toBe(request.size.width);
          expect(box.height).toBe(request.size.height);
          expect(box.x).toBeGreaterThanOrEqual(r.x);
          expect(box.y).toBeGreaterThanOrEqual(r.y);
          expect(box.x + box.width).toBeLessThanOrEqual(r.x + r.width);
          expect(box.y + box.height).toBeLessThanOrEqual(r.y + r.height);
          // Independent of the clipping code: the box lies outside the line's bounding box.
          const b = quadBounds(request.quad);
          const separate =
            box.y >= b.y + b.height || box.y + box.height <= b.y || box.x >= b.x + b.width || box.x + box.width <= b.x;
          expect(separate).toBe(true);
          placedBoxes.push(box);
        });
        for (let i = 0; i < placedBoxes.length; i += 1) {
          for (let j = i + 1; j < placedBoxes.length; j += 1) {
            expect(overlapArea(placedBoxes[i], placedBoxes[j])).toBe(0);
          }
        }
      }),
      RUNS,
    );
  });

  // Feature: camera-ocr-geometry, Property 8: Label placement is deterministic and independent of input order
  it('gives every id the same placement for any order of the same requests', () => {
    const input = requests.chain((reqs) =>
      fc.record({ reqs: fc.constant(reqs), shuffled: fc.shuffledSubarray(reqs, { minLength: reqs.length }), r: region }),
    );
    fc.assert(
      fc.property(input, ({ reqs, shuffled, r }) => {
        const byId = (list: readonly LabelRequest[]) =>
          new Map(placeLabels(list, r).map((placement) => [placement.id, placement]));
        const first = byId(reqs);
        expect(byId(reqs)).toEqual(first);
        expect(byId(shuffled)).toEqual(first);
      }),
      RUNS,
    );
  });
});
