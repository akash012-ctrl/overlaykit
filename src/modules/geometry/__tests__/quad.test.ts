import type { CoverTransform } from '..';
import { computeCoverTransform, frameQuadToView, imageToView, mapQuad, mirrorQuadX, quadToRotatedBox } from '..';
import type { Quad, Size } from '../../shared';

// Example quads for the geometry helpers. They are hand-built coordinates,
// not OCR output.

function transformFor(image: Size, view: Size): CoverTransform {
  const result = computeCoverTransform(image, view);
  if (!result.ok) {
    throw new Error(`expected a valid transform, got ${result.error}`);
  }
  return result.value;
}

function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

// A 3:4 photo shown on a 360 x 800 dp portrait phone: scale 0.2, offsetX -120.
const PHOTO = { width: 3000, height: 4000 };
const PHONE = { width: 360, height: 800 };
const LINE = box(600, 1000, 600, 100);

describe('mapQuad', () => {
  it('maps each corner with imageToView and keeps the corner order', () => {
    const t = transformFor(PHOTO, PHONE);
    const mapped = mapQuad(LINE, t);
    LINE.forEach((corner, i) => {
      expect(mapped[i]).toEqual(imageToView(corner, t));
    });
    expect(mapped[0].x).toBeCloseTo(0); // 600 × 0.2 − 120
    expect(mapped[0].y).toBeCloseTo(200);
    expect(mapped[2].x).toBeCloseTo(120); // 1200 × 0.2 − 120
    expect(mapped[2].y).toBeCloseTo(220);
  });

  it('does not change the input quad', () => {
    const copy = JSON.parse(JSON.stringify(LINE));
    mapQuad(LINE, transformFor(PHOTO, PHONE));
    expect(LINE).toEqual(copy);
  });
});

describe('mirrorQuadX', () => {
  it('replaces x with imageWidth − x on each corner and keeps y and the corner order', () => {
    const mirrored = mirrorQuadX(LINE, 3000);
    expect(mirrored).toEqual([
      { x: 2400, y: 1000 },
      { x: 1800, y: 1000 },
      { x: 1800, y: 1100 },
      { x: 2400, y: 1100 },
    ]);
  });

  it('is its own inverse', () => {
    expect(mirrorQuadX(mirrorQuadX(LINE, 3000), 3000)).toEqual(LINE);
  });
});

describe('frameQuadToView', () => {
  const t = transformFor(PHOTO, PHONE);

  it('equals mapQuad for a frame that is not mirrored', () => {
    expect(frameQuadToView(LINE, { size: PHOTO, mirrored: false }, t)).toEqual(mapQuad(LINE, t));
  });

  it('flips x with the frame width before mapping a mirrored frame', () => {
    const view = frameQuadToView(LINE, { size: PHOTO, mirrored: true }, t);
    expect(view).toEqual(mapQuad(mirrorQuadX(LINE, PHOTO.width), t));
    // Image x 1800 to 2400 lands at view x 240 to 360: the right edge of the screen.
    expect(view[1].x).toBeCloseTo(240);
    expect(view[0].x).toBeCloseTo(360);
  });
});

describe('quadToRotatedBox', () => {
  it('gives centre, width, height and zero angle for an upright line', () => {
    expect(quadToRotatedBox(box(10, 20, 200, 40))).toEqual({
      centre: { x: 110, y: 40 },
      width: 200,
      height: 40,
      angleRad: 0,
    });
  });

  it('follows edge [0] → [1] for a line turned a quarter turn clockwise on screen', () => {
    const turned: Quad = [
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 60, y: 200 },
      { x: 60, y: 0 },
    ];
    const rotated = quadToRotatedBox(turned);
    expect(rotated.centre).toEqual({ x: 80, y: 100 });
    expect(rotated.width).toBe(200);
    expect(rotated.height).toBe(40);
    expect(rotated.angleRad).toBeCloseTo(Math.PI / 2);
  });
});
