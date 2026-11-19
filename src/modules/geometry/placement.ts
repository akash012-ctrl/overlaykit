import type { Quad, Size } from '../shared';
import type { Rect } from './rect';
import { quadBounds, quadOverlapArea, rectInside, rectOverlapArea } from './rect';
import { LABEL_GAP_DP } from './thresholds';

/** One label to place, in view space. Ids must be unique within one call. */
export type LabelRequest = { readonly id: string; readonly quad: Quad; readonly size: Size };

export type LabelPlacement =
  | { readonly id: string; readonly kind: 'placed'; readonly box: Rect }
  | { readonly id: string; readonly kind: 'unplaced' };

function clamp(value: number, low: number, high: number): number {
  // When high < low (the label is larger than the region) this returns high,
  // and the inside check then rejects the candidate.
  return Math.min(Math.max(value, low), high);
}

function isUsableRequest(request: LabelRequest): boolean {
  const { width, height } = request.size;
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    request.quad.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  );
}

function isUsableRegion(region: Rect): boolean {
  return [region.x, region.y, region.width, region.height].every(Number.isFinite) && region.width > 0 && region.height > 0;
}

/**
 * Candidate boxes in the order they are tried: below, above, right, left.
 * Each keeps `gap` from the bounding box on one axis and slides along the
 * other axis to fit the region, so it never moves onto its own text.
 */
function candidates(bounds: Rect, size: Size, region: Rect, gap: number): Rect[] {
  const { width: w, height: h } = size;
  const slidX = clamp(bounds.x, region.x, region.x + region.width - w);
  const slidY = clamp(bounds.y + bounds.height / 2 - h / 2, region.y, region.y + region.height - h);
  return [
    { x: slidX, y: bounds.y + bounds.height + gap, width: w, height: h },
    { x: slidX, y: bounds.y - gap - h, width: w, height: h },
    { x: bounds.x + bounds.width + gap, y: slidY, width: w, height: h },
    { x: bounds.x - gap - w, y: slidY, width: w, height: h },
  ];
}

function compareRequests(a: { bounds: Rect; id: string }, b: { bounds: Rect; id: string }): number {
  if (a.bounds.y !== b.bounds.y) return a.bounds.y - b.bounds.y;
  if (a.bounds.x !== b.bounds.x) return a.bounds.x - b.bounds.x;
  // Plain code-unit comparison, so the order never depends on the device locale.
  if (a.id < b.id) return -1;
  return a.id > b.id ? 1 : 0;
}

/**
 * Places each Label box next to its line (R13.2 to R13.5, R13.7):
 * fully inside the region, with zero overlap area with its own quad and with
 * every box placed before it. A label with no such position is `unplaced`.
 *
 * Deterministic and independent of the input order: requests are processed by
 * the top, then left edge of their quad's bounding box, then id. The output
 * has one entry per request, in input order.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  region: Rect,
  gapDp: number = LABEL_GAP_DP,
): readonly LabelPlacement[] {
  const byId = new Map<string, LabelPlacement>();
  if (!(Number.isFinite(gapDp) && gapDp >= 0) || !isUsableRegion(region)) {
    return requests.map((request) => ({ id: request.id, kind: 'unplaced' }));
  }

  // Unusable requests (non-finite corners, empty size) are unplaced and kept out
  // of the sort, so the comparator only ever sees finite numbers.
  const ordered = requests
    .filter(isUsableRequest)
    .map((request) => ({ request, id: request.id, bounds: quadBounds(request.quad) }))
    .sort(compareRequests);

  const placed: Rect[] = [];
  for (const { request, bounds } of ordered) {
    const chosen = candidates(bounds, request.size, region, gapDp).find(
      (box) =>
        rectInside(box, region) &&
        quadOverlapArea(request.quad, box) === 0 &&
        placed.every((other) => rectOverlapArea(other, box) === 0),
    );
    if (chosen) {
      placed.push(chosen);
      byId.set(request.id, { id: request.id, kind: 'placed', box: chosen });
    } else {
      byId.set(request.id, { id: request.id, kind: 'unplaced' });
    }
  }
  return requests.map((request) => byId.get(request.id) ?? { id: request.id, kind: 'unplaced' });
}
