import type { Point, Quad } from '../shared';
import { quadSignedArea } from '../shared';
import { HIT_MIN_TARGET_DP } from './thresholds';

export type HitItem =
  | { readonly kind: 'component'; readonly id: string; readonly quad: Quad }
  | { readonly kind: 'label'; readonly id: string; readonly quad: Quad };
export type HitResult =
  | { readonly kind: 'hit'; readonly item: HitItem; readonly via: 'inside' | 'margin' }
  | { readonly kind: 'none' };

const NONE: HitResult = { kind: 'none' };

function containsEvenOdd(point: Point, quad: Quad): boolean {
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i, i += 1) {
    const a = quad[i];
    const b = quad[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function edgeDistance(p: Point, quad: Quad): number {
  return Math.min(
    segmentDistance(p, quad[0], quad[1]),
    segmentDistance(p, quad[1], quad[2]),
    segmentDistance(p, quad[2], quad[3]),
    segmentDistance(p, quad[3], quad[0]),
  );
}

function inMarginBox(p: Point, quad: Quad, minTargetDp: number): boolean {
  const xs = quad.map((q) => q.x);
  const ys = quad.map((q) => q.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const mx = Math.max(0, (minTargetDp - (right - left)) / 2);
  const my = Math.max(0, (minTargetDp - (bottom - top)) / 2);
  return p.x >= left - mx && p.x <= right + mx && p.y >= top - my && p.y <= bottom + my;
}

const kindRank = (item: HitItem): number => (item.kind === 'component' ? 0 : 1);
const byId = (a: HitItem, b: HitItem): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Item under the point. Inside beats margin. Among containing items: component before label,
 * then smaller area, then smaller id. Otherwise the nearest edge among items whose margin box
 * holds the point, ties by kind then id. Non-finite point or minTargetDp gives 'none'.
 * Items with a non-finite corner are ignored.
 */
export function hitTest(
  point: Point,
  items: readonly HitItem[],
  minTargetDp: number = HIT_MIN_TARGET_DP,
): HitResult {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(minTargetDp)) return NONE;
  const valid = items.filter((i) => i.quad.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)));

  const containing = valid
    .filter((i) => containsEvenOdd(point, i.quad))
    .map((item) => ({ item, area: Math.abs(quadSignedArea(item.quad)) }))
    .sort((a, b) => kindRank(a.item) - kindRank(b.item) || a.area - b.area || byId(a.item, b.item));
  if (containing.length > 0) return { kind: 'hit', item: containing[0].item, via: 'inside' };

  const near = valid
    .filter((i) => inMarginBox(point, i.quad, minTargetDp))
    .map((item) => ({ item, dist: edgeDistance(point, item.quad) }))
    .sort((a, b) => a.dist - b.dist || kindRank(a.item) - kindRank(b.item) || byId(a.item, b.item));
  return near.length > 0 ? { kind: 'hit', item: near[0].item, via: 'margin' } : NONE;
}
