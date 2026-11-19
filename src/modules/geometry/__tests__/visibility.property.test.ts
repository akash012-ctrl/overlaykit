import * as fc from 'fast-check';

import { anyQuad, controlBars, insets, rotatedRectQuad, viewSize } from '../../../../test-support/arbitraries';
import type { Rect } from '..';
import { classifyVisibility, computeVisibleRegion } from '..';
import type { Point, Quad } from '../../shared';

const RUNS = { numRuns: 300 };

const inClosed = (p: Point, r: Rect) => p.x >= r.x && p.y >= r.y && p.x <= r.x + r.width && p.y <= r.y + r.height;
const inOpen = (p: Point, r: Rect) => p.x > r.x && p.y > r.y && p.x < r.x + r.width && p.y < r.y + r.height;

/**
 * Independent check for a convex quad and a rectangle (separating axis theorem):
 * the smallest overlap of their projections over the rectangle's two axes and
 * the quad's four edge normals. Zero or less means they are separated or only touch.
 */
function smallestOverlap(quad: Quad, rect: Rect): number {
  const rectCorners: Point[] = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  const axes: Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > 0) axes.push({ x: -(b.y - a.y) / length, y: (b.x - a.x) / length });
  }
  let smallest = Infinity;
  for (const axis of axes) {
    const project = (points: readonly Point[]) => points.map((p) => p.x * axis.x + p.y * axis.y);
    const q = project(quad);
    const r = project(rectCorners);
    smallest = Math.min(smallest, Math.min(Math.max(...q), Math.max(...r)) - Math.max(Math.min(...q), Math.min(...r)));
  }
  return smallest;
}

const layout = fc.record({ view: viewSize(), insets: insets(), bars: controlBars() });

describe('visibility properties', () => {
  // Feature: camera-ocr-geometry, Property 6: Every mapped line has exactly one visibility state, and clipping never moves it
  it('puts the region inside the view minus insets and bars, and classifies every quad once without moving it', () => {
    fc.assert(
      fc.property(layout, fc.oneof(rotatedRectQuad(-500, 5_500, 3_000), anyQuad(-500, 5_500)), ({ view, insets: i, bars }, quad) => {
        const result = computeVisibleRegion(view, i, bars);
        fc.pre(result.ok);
        if (!result.ok) return;
        const region = result.value;
        expect(region.width).toBeGreaterThan(0);
        expect(region.height).toBeGreaterThan(0);
        expect(region.x).toBe(i.left);
        expect(region.y).toBe(i.top + bars.top);
        expect(region.x + region.width).toBeLessThanOrEqual(view.width - i.right + 1e-9);
        expect(region.y + region.height).toBeLessThanOrEqual(view.height - i.bottom - bars.bottom + 1e-9);

        const copy = quad.map((p) => ({ ...p }));
        const state = classifyVisibility(quad, region);
        expect(['visible', 'clipped', 'off-screen']).toContain(state);
        expect(quad).toEqual(copy); // the renderer gets the quad unchanged
        if (state === 'visible') expect(quad.every((p) => inClosed(p, region))).toBe(true);
        if (state === 'off-screen') expect(quad.some((p) => inOpen(p, region))).toBe(false);
        if (state === 'clipped') expect(quad.every((p) => inClosed(p, region))).toBe(false);
      }),
      RUNS,
    );
  });

  it('is off-screen for a convex quad exactly when a separating axis exists', () => {
    fc.assert(
      fc.property(layout, rotatedRectQuad(-500, 5_500, 3_000), ({ view, insets: i, bars }, quad) => {
        const result = computeVisibleRegion(view, i, bars);
        fc.pre(result.ok);
        if (!result.ok) return;
        const overlap = smallestOverlap(quad, result.value);
        const state = classifyVisibility(quad, result.value);
        if (state === 'off-screen') expect(overlap).toBeLessThanOrEqual(1e-6);
        if (overlap < -1e-6) expect(state).toBe('off-screen');
        if (overlap > 1e-6) expect(state).not.toBe('off-screen');
      }),
      RUNS,
    );
  });
});
