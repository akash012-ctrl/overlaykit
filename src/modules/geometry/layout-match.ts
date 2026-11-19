import type { MachineFit, Point, Quad } from '../shared';

export type AnchorTemplate = { readonly key: string; readonly pos: Point };
export type ObservedAnchor = { readonly key: string; readonly pos: Point };
export type LayoutMatch =
  | { readonly kind: 'fit'; readonly fit: MachineFit; readonly score: number; readonly matched: readonly string[] }
  | { readonly kind: 'no-fit' };

type Pair = { readonly key: string; readonly from: Point; readonly to: Point };

const NO_FIT: LayoutMatch = { kind: 'no-fit' };

const finite = (p: Point): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);

function applyFitToPoint(fit: MachineFit, p: Point): Point {
  const cos = Math.cos(fit.rotationRad);
  const sin = Math.sin(fit.rotationRad);
  return {
    x: fit.scale * (cos * p.x - sin * p.y) + fit.translation.x,
    y: fit.scale * (sin * p.x + cos * p.y) + fit.translation.y,
  };
}

/** Closed-form least-squares similarity (Umeyama, 2D) from template points to observed points. */
function solve(pairs: readonly Pair[]): { fit: MachineFit; rms: number } | null {
  const n = pairs.length;
  if (n < 2) return null;
  let ax = 0;
  let ay = 0;
  let bx = 0;
  let by = 0;
  for (const p of pairs) {
    ax += p.from.x;
    ay += p.from.y;
    bx += p.to.x;
    by += p.to.y;
  }
  ax /= n;
  ay /= n;
  bx /= n;
  by /= n;
  let dot = 0;
  let cross = 0;
  let varA = 0;
  for (const p of pairs) {
    const fx = p.from.x - ax;
    const fy = p.from.y - ay;
    const tx = p.to.x - bx;
    const ty = p.to.y - by;
    dot += fx * tx + fy * ty;
    cross += fx * ty - fy * tx;
    varA += fx * fx + fy * fy;
  }
  if (!(varA > 0)) return null;
  const rotationRad = Math.atan2(cross, dot);
  const scale = Math.hypot(dot, cross) / varA;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const translation = {
    x: bx - scale * (cos * ax - sin * ay),
    y: by - scale * (sin * ax + cos * ay),
  };
  if (!(scale > 0) || !Number.isFinite(scale) || !Number.isFinite(rotationRad) || !finite(translation)) return null;
  const fit: MachineFit = { scale, rotationRad, translation };
  let sq = 0;
  for (const p of pairs) {
    const q = applyFitToPoint(fit, p.from);
    sq += (q.x - p.to.x) ** 2 + (q.y - p.to.y) ** 2;
  }
  return { fit, rms: Math.sqrt(sq / n) };
}

/** Applies a fit to a Machine-space quad. Same corner order. */
export function applyFit(fit: MachineFit, machineQuad: Quad): Quad {
  return [
    applyFitToPoint(fit, machineQuad[0]),
    applyFitToPoint(fit, machineQuad[1]),
    applyFitToPoint(fit, machineQuad[2]),
    applyFitToPoint(fit, machineQuad[3]),
  ];
}

function extent(points: readonly Point[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      max = Math.max(max, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return max;
}

/**
 * Similarity fit between observed anchors and the template, matched by key.
 * Non-finite observed points are ignored. A key observed twice keeps the
 * candidate closest to the first fit over the single-match keys (ties by input order).
 * `no-fit` when fewer than `minPoints` distinct keys match, the fit is degenerate,
 * or |rotation| exceeds `rotationToleranceRad`.
 * shortcut: the rotation tolerance has no default here; the G3 value is set in task 25.2.
 */
export function matchLayout(
  observed: readonly ObservedAnchor[],
  template: readonly AnchorTemplate[],
  minPoints: number,
  rotationToleranceRad: number,
): LayoutMatch {
  if (!Number.isFinite(minPoints) || !Number.isFinite(rotationToleranceRad)) return NO_FIT;
  const templateByKey = new Map<string, Point>();
  for (const t of template) if (finite(t.pos) && !templateByKey.has(t.key)) templateByKey.set(t.key, t.pos);

  const candidates = new Map<string, Point[]>();
  for (const o of observed) {
    if (!finite(o.pos) || !templateByKey.has(o.key)) continue;
    const list = candidates.get(o.key);
    if (list) list.push(o.pos);
    else candidates.set(o.key, [o.pos]);
  }
  if (candidates.size < Math.max(2, minPoints)) return NO_FIT;

  const pair = (key: string, to: Point): Pair => ({ key, from: templateByKey.get(key) as Point, to });
  const singles: Pair[] = [];
  for (const [key, list] of candidates) if (list.length === 1) singles.push(pair(key, list[0]));
  const first = solve(singles);

  const chosen: Pair[] = [];
  for (const [key, list] of candidates) {
    if (list.length === 1 || !first) {
      chosen.push(pair(key, list[0]));
      continue;
    }
    const predicted = applyFitToPoint(first.fit, templateByKey.get(key) as Point);
    let best = list[0];
    let bestDist = Infinity;
    for (const c of list) {
      const d = Math.hypot(predicted.x - c.x, predicted.y - c.y);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    chosen.push(pair(key, best));
  }

  const solved = solve(chosen);
  if (!solved) return NO_FIT;
  if (Math.abs(solved.fit.rotationRad) > rotationToleranceRad) return NO_FIT;
  const observedExtent = extent(chosen.map((p) => p.to));
  if (!(observedExtent > 0)) return NO_FIT;
  const score = 1 - Math.min(1, solved.rms / observedExtent);
  if (!Number.isFinite(score)) return NO_FIT;
  return { kind: 'fit', fit: solved.fit, score, matched: chosen.map((p) => p.key) };
}
