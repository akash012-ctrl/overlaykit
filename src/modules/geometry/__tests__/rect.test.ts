import { quadBounds } from '..';
import type { Point, Quad } from '../../shared';
import type { Rect } from '../rect';
import { clipPolygonToRect, polygonArea, quadOverlapArea, rectInside, rectOverlapArea } from '../rect';

// Hand-built shapes for the rectangle and polygon helpers. Not OCR output.

function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

const RECT: Rect = { x: 0, y: 0, width: 100, height: 50 };

describe('quadBounds', () => {
  it('is the box of an upright quad', () => {
    expect(quadBounds(box(10, 20, 30, 40))).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('covers every corner of a rotated quad', () => {
    const diamond: Quad = [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ];
    expect(quadBounds(diamond)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('has zero width and height for four corners at one point', () => {
    const p = { x: 7, y: 9 };
    expect(quadBounds([p, p, p, p])).toEqual({ x: 7, y: 9, width: 0, height: 0 });
  });
});

describe('rectInside', () => {
  it('counts edges as inside', () => {
    expect(rectInside(RECT, RECT)).toBe(true);
    expect(rectInside({ x: 10, y: 10, width: 20, height: 20 }, RECT)).toBe(true);
  });

  it('is false when any edge pokes out', () => {
    expect(rectInside({ x: -0.5, y: 10, width: 20, height: 20 }, RECT)).toBe(false);
    expect(rectInside({ x: 90, y: 10, width: 20, height: 20 }, RECT)).toBe(false);
    expect(rectInside({ x: 10, y: 40, width: 20, height: 20 }, RECT)).toBe(false);
  });
});

describe('rectOverlapArea', () => {
  it('is the shared area', () => {
    expect(rectOverlapArea(RECT, { x: 90, y: 40, width: 20, height: 20 })).toBe(100);
  });

  it('is zero for rectangles that only touch along an edge or a corner', () => {
    expect(rectOverlapArea(RECT, { x: 100, y: 0, width: 10, height: 10 })).toBe(0);
    expect(rectOverlapArea(RECT, { x: 100, y: 50, width: 10, height: 10 })).toBe(0);
  });

  it('is zero for separate rectangles', () => {
    expect(rectOverlapArea(RECT, { x: 200, y: 200, width: 10, height: 10 })).toBe(0);
  });
});

describe('polygonArea and clipPolygonToRect', () => {
  it('gives the absolute area for either winding', () => {
    const square: Point[] = [...box(0, 0, 10, 10)];
    expect(polygonArea(square)).toBe(100);
    expect(polygonArea([...square].reverse())).toBe(100);
  });

  it('keeps a polygon that lies inside the rectangle', () => {
    expect(polygonArea(clipPolygonToRect(box(10, 10, 20, 20), RECT))).toBe(400);
  });

  it('clips a quad that covers the whole rectangle down to the rectangle', () => {
    expect(polygonArea(clipPolygonToRect(box(-50, -50, 300, 300), RECT))).toBe(5000);
  });

  it('gives an empty polygon for a quad outside the rectangle', () => {
    expect(clipPolygonToRect(box(200, 0, 10, 10), RECT)).toEqual([]);
  });

  it('gives zero area for a quad that only touches an edge', () => {
    expect(polygonArea(clipPolygonToRect(box(100, 10, 10, 10), RECT))).toBe(0);
  });

  it('clips a concave polygon correctly', () => {
    // An L shape: 40 x 40 square minus its top-right 20 x 20 quarter, area 1200.
    const lShape: Point[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 40 },
      { x: 0, y: 40 },
    ];
    expect(polygonArea(lShape)).toBe(1200);
    // RECT keeps y 0..50 and x 0..100, so all of it remains.
    expect(polygonArea(clipPolygonToRect(lShape, RECT))).toBe(1200);
    // Keeping only x 10..30 leaves 10 x 40 + 10 x 20 = 600.
    expect(polygonArea(clipPolygonToRect(lShape, { x: 10, y: 0, width: 20, height: 100 }))).toBe(600);
  });

  it('gives zero area for a degenerate quad inside the rectangle', () => {
    const line: Quad = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
      { x: 40, y: 40 },
    ];
    expect(quadOverlapArea(line, RECT)).toBe(0);
  });

  it('never changes its input', () => {
    const quad = box(-50, -50, 300, 300);
    const copy = JSON.parse(JSON.stringify(quad));
    clipPolygonToRect(quad, RECT);
    expect(quad).toEqual(copy);
  });
});
