import type { Point, Quad } from '..';
import { quadLineHeight, quadSignedArea } from '..';

// Example quads built by hand to exercise the helpers. They are geometry
// inputs, not OCR output.

/** An upright line box in Quad order: top-left, top-right, bottom-right, bottom-left. */
function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

function rotate(quad: Quad, angleRad: number, centre: Point): Quad {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const turn = (p: Point): Point => ({
    x: centre.x + (p.x - centre.x) * cos - (p.y - centre.y) * sin,
    y: centre.y + (p.x - centre.x) * sin + (p.y - centre.y) * cos,
  });
  return [turn(quad[0]), turn(quad[1]), turn(quad[2]), turn(quad[3])];
}

describe('quadSignedArea', () => {
  it('is positive for an upright line in Quad order', () => {
    expect(quadSignedArea(box(100, 50, 200, 40))).toBe(8000);
  });

  it('is negative when the corners run the other way', () => {
    const [a, b, c, d] = box(100, 50, 200, 40);
    expect(quadSignedArea([a, d, c, b])).toBe(-8000);
  });

  it('keeps the area of a rotated line', () => {
    const rotated = rotate(box(100, 50, 200, 40), Math.PI / 6, { x: 200, y: 70 });
    expect(quadSignedArea(rotated)).toBeCloseTo(8000, 9);
  });

  it('is zero for corners on one straight line', () => {
    const collinear: Quad = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    expect(quadSignedArea(collinear)).toBe(0);
  });

  it('is zero for four corners at one point', () => {
    const p = { x: 12, y: 34 };
    expect(quadSignedArea([p, p, p, p])).toBe(0);
  });
});

describe('quadLineHeight', () => {
  it('is the box height for an upright line', () => {
    expect(quadLineHeight(box(100, 50, 200, 40))).toBe(40);
  });

  it('is measured perpendicular to the baseline for a rotated line', () => {
    const rotated = rotate(box(100, 50, 200, 40), -Math.PI / 4, { x: 0, y: 0 });
    expect(quadLineHeight(rotated)).toBeCloseTo(40, 9);
  });

  it('averages the two top corners for a slanted top edge', () => {
    const slanted: Quad = [
      { x: 0, y: 10 },
      { x: 100, y: 0 },
      { x: 100, y: 30 },
      { x: 0, y: 30 },
    ];
    expect(quadLineHeight(slanted)).toBe(25); // (20 + 30) / 2
  });

  it('falls back to the side edges when the baseline has zero length', () => {
    const noBaseline: Quad = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 12 },
      { x: 5, y: 12 },
    ];
    // Edge [0]-[3] is 13 long (5, 12), edge [1]-[2] is 13 long (-5, 12).
    expect(quadLineHeight(noBaseline)).toBe(13);
  });
});
