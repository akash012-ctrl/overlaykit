import type { LabelPlacement, LabelRequest, Rect } from '..';
import { LABEL_GAP_DP, placeLabels } from '..';
import type { Quad } from '../../shared';

// Hand-built view-space layouts. Not OCR output.

function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

const LABEL = { width: 120, height: 50 };
const REGION: Rect = { x: 0, y: 80, width: 360, height: 600 };

function request(id: string, quad: Quad, size = LABEL): LabelRequest {
  return { id, quad, size };
}

function placedBox(placements: readonly LabelPlacement[], id: string): Rect {
  const placement = placements.find((p) => p.id === id);
  if (!placement || placement.kind !== 'placed') {
    throw new Error(`expected ${id} to be placed, got ${JSON.stringify(placement)}`);
  }
  return placement.box;
}

describe('LABEL_GAP_DP', () => {
  it('is pinned to the proposed 4 dp', () => {
    expect(LABEL_GAP_DP).toBe(4);
  });

  it('places the label below only when the gap and the label both fit', () => {
    const line = request('a', box(20, 200, 200, 30)); // bottom edge at 230
    const exactRoom: Rect = { x: 0, y: 80, width: 360, height: 230 + LABEL_GAP_DP + LABEL.height - 80 };
    const halfPointShort: Rect = { ...exactRoom, height: exactRoom.height - 0.5 };

    expect(placeLabels([line], exactRoom)).toEqual([
      { id: 'a', kind: 'placed', box: { x: 20, y: 230 + LABEL_GAP_DP, width: 120, height: 50 } },
    ]);
    // Without room below, the next candidate (above) is used.
    expect(placeLabels([line], halfPointShort)).toEqual([
      { id: 'a', kind: 'placed', box: { x: 20, y: 200 - LABEL_GAP_DP - 50, width: 120, height: 50 } },
    ]);
  });

  it('is the default gap', () => {
    const lines = [request('a', box(20, 200, 200, 30))];
    expect(placeLabels(lines, REGION)).toEqual(placeLabels(lines, REGION, LABEL_GAP_DP));
  });
});

describe('placeLabels', () => {
  it('puts a label below its line, left-aligned with it', () => {
    expect(placeLabels([request('a', box(20, 200, 200, 30))], REGION)).toEqual([
      { id: 'a', kind: 'placed', box: { x: 20, y: 234, width: 120, height: 50 } },
    ]);
  });

  it('puts the label above a line at the bottom of the region', () => {
    expect(placedBox(placeLabels([request('a', box(20, 630, 200, 30))], REGION), 'a')).toEqual({
      x: 20,
      y: 576,
      width: 120,
      height: 50,
    });
  });

  it('slides the label left to stay inside the region for a line at the right edge', () => {
    expect(placedBox(placeLabels([request('a', box(300, 200, 50, 30))], REGION), 'a')).toEqual({
      x: 240,
      y: 234,
      width: 120,
      height: 50,
    });
  });

  it('puts the label to the right of a line that fills the height, centred and slid to fit', () => {
    expect(placedBox(placeLabels([request('a', box(20, 90, 100, 580))], REGION), 'a')).toEqual({
      x: 124,
      y: 355,
      width: 120,
      height: 50,
    });
  });

  it('falls back to the left when there is no room below, above or right', () => {
    expect(placedBox(placeLabels([request('a', box(240, 90, 100, 580))], REGION), 'a')).toEqual({
      x: 116,
      y: 355,
      width: 120,
      height: 50,
    });
  });

  it('moves a second label so that no two labels overlap', () => {
    const placements = placeLabels(
      [request('a', box(20, 200, 200, 30)), request('b', box(20, 240, 200, 30))],
      REGION,
    );
    const a = placedBox(placements, 'a');
    const b = placedBox(placements, 'b');
    expect(a).toEqual({ x: 20, y: 234, width: 120, height: 50 });
    // Below b would overlap a's label, and so would above b, so b goes right.
    expect(b).toEqual({ x: 224, y: 230, width: 120, height: 50 });
  });

  it('reports labels as unplaced in a crowded layout with no free position', () => {
    const tight: Rect = { x: 0, y: 0, width: 300, height: 120 };
    const size = { width: 140, height: 50 };
    const placements = placeLabels(
      [
        request('a', box(10, 10, 280, 20), size),
        request('b', box(10, 60, 280, 20), size),
        request('c', box(10, 90, 280, 20), size),
      ],
      tight,
    );
    expect(placements).toEqual([
      { id: 'a', kind: 'placed', box: { x: 10, y: 34, width: 140, height: 50 } },
      { id: 'b', kind: 'unplaced' },
      { id: 'c', kind: 'unplaced' },
    ]);
  });

  it('reports a label wider than the region as unplaced', () => {
    expect(placeLabels([request('a', box(20, 200, 200, 30), { width: 400, height: 50 })], REGION)).toEqual([
      { id: 'a', kind: 'unplaced' },
    ]);
  });

  it('reports a request with a non-finite corner as unplaced and still places the others', () => {
    const broken: Quad = [{ x: Number.NaN, y: 200 }, { x: 220, y: 200 }, { x: 220, y: 230 }, { x: 20, y: 230 }];
    const placements = placeLabels([request('bad', broken), request('good', box(20, 400, 200, 30))], REGION);
    expect(placements[0]).toEqual({ id: 'bad', kind: 'unplaced' });
    expect(placements[1].kind).toBe('placed');
  });

  it('reports every label as unplaced for an empty region or a negative gap', () => {
    const lines = [request('a', box(20, 200, 200, 30))];
    expect(placeLabels(lines, { x: 0, y: 0, width: 0, height: 600 })).toEqual([{ id: 'a', kind: 'unplaced' }]);
    expect(placeLabels(lines, REGION, -1)).toEqual([{ id: 'a', kind: 'unplaced' }]);
  });

  it('returns nothing for no requests', () => {
    expect(placeLabels([], REGION)).toEqual([]);
  });

  it('never covers its own line and keeps every placed box inside the region', () => {
    const lines = [
      request('a', box(20, 200, 200, 30)),
      request('b', box(20, 240, 200, 30)),
      request('c', box(300, 400, 50, 30)),
      request('d', box(20, 630, 200, 30)),
    ];
    for (const placement of placeLabels(lines, REGION)) {
      if (placement.kind !== 'placed') continue;
      const { box: label } = placement;
      const line = lines.find((l) => l.id === placement.id)!;
      const xs = line.quad.map((p) => p.x);
      const ys = line.quad.map((p) => p.y);
      const separate =
        label.x >= Math.max(...xs) ||
        label.x + label.width <= Math.min(...xs) ||
        label.y >= Math.max(...ys) ||
        label.y + label.height <= Math.min(...ys);
      expect(separate).toBe(true);
      expect(label.x).toBeGreaterThanOrEqual(REGION.x);
      expect(label.y).toBeGreaterThanOrEqual(REGION.y);
      expect(label.x + label.width).toBeLessThanOrEqual(REGION.x + REGION.width);
      expect(label.y + label.height).toBeLessThanOrEqual(REGION.y + REGION.height);
    }
  });

  it('gives the same placement for the same input, in any input order', () => {
    const lines = [
      request('a', box(20, 200, 200, 30)),
      request('b', box(20, 240, 200, 30)),
      request('c', box(20, 240, 120, 30)), // same top edge as b: the tie is broken by left edge, then id
      request('d', box(300, 400, 50, 30)),
    ];
    const forward = placeLabels(lines, REGION);
    const reversed = placeLabels([...lines].reverse(), REGION);
    expect(placeLabels(lines, REGION)).toEqual(forward);
    expect([...reversed].reverse()).toEqual(forward);
  });
});
