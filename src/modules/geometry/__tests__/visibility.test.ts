import type { Rect } from '..';
import { classifyVisibility, computeVisibleRegion } from '..';
import type { Quad } from '../../shared';

// Hand-built view-space quads around a fixed region. Not OCR output.

function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

const PHONE = { width: 360, height: 800 };
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const NO_BARS = { top: 0, bottom: 0 };

describe('computeVisibleRegion', () => {
  it('removes the safe-area insets and both control bars', () => {
    const region = computeVisibleRegion(
      PHONE,
      { top: 24, right: 0, bottom: 48, left: 0 },
      { top: 56, bottom: 96 },
    );
    expect(region).toEqual({ ok: true, value: { x: 0, y: 80, width: 360, height: 576 } });
  });

  it('removes left and right insets', () => {
    const region = computeVisibleRegion(PHONE, { top: 0, right: 20, bottom: 0, left: 30 }, NO_BARS);
    expect(region).toEqual({ ok: true, value: { x: 30, y: 0, width: 310, height: 800 } });
  });

  it('is the whole view with no insets and no bars', () => {
    expect(computeVisibleRegion(PHONE, NO_INSETS, NO_BARS)).toEqual({
      ok: true,
      value: { x: 0, y: 0, width: 360, height: 800 },
    });
  });

  it.each([
    ['a zero-size view', { width: 0, height: 0 }, NO_INSETS, NO_BARS],
    ['insets that use the whole width', PHONE, { top: 0, right: 180, bottom: 0, left: 180 }, NO_BARS],
    ['insets and bars taller than the view', PHONE, { top: 300, right: 0, bottom: 300, left: 0 }, { top: 100, bottom: 100 }],
    ['a negative inset', PHONE, { top: -10, right: 0, bottom: 0, left: 0 }, NO_BARS],
    ['a NaN bar height', PHONE, NO_INSETS, { top: Number.NaN, bottom: 0 }],
    ['an infinite view', { width: Number.POSITIVE_INFINITY, height: 800 }, NO_INSETS, NO_BARS],
  ])('gives EMPTY_REGION for %s', (_label, view, insets, bars) => {
    expect(computeVisibleRegion(view, insets, bars)).toEqual({ ok: false, error: 'EMPTY_REGION' });
  });
});

describe('classifyVisibility', () => {
  // Region of a 360 x 800 screen with a 24 dp status bar, 56 dp top bar and 96 dp bottom bar.
  const REGION: Rect = { x: 0, y: 80, width: 360, height: 600 };

  it('is visible when every corner is inside the region', () => {
    expect(classifyVisibility(box(20, 200, 200, 30), REGION)).toBe('visible');
  });

  it('is visible for a quad that exactly fills the region (edges count as inside)', () => {
    expect(classifyVisibility(box(0, 80, 360, 600), REGION)).toBe('visible');
  });

  it('is clipped for a quad larger than the region on every side', () => {
    expect(classifyVisibility(box(-10, 70, 380, 620), REGION)).toBe('clipped');
  });

  // For each edge: a line crossing it, a line fully beyond it, and a line that
  // only touches it from outside.
  it.each([
    ['left', box(-50, 200, 100, 30), box(-150, 200, 100, 30), box(-100, 200, 100, 30)],
    ['right', box(310, 200, 100, 30), box(400, 200, 100, 30), box(360, 200, 100, 30)],
    ['top', box(20, 65, 200, 30), box(20, 10, 200, 30), box(20, 50, 200, 30)],
    ['bottom', box(20, 665, 200, 30), box(20, 700, 200, 30), box(20, 680, 200, 30)],
  ])('at the %s edge: crossing is clipped, beyond is off-screen, touching is off-screen', (_edge, crossing, beyond, touching) => {
    expect(classifyVisibility(crossing, REGION)).toBe('clipped');
    expect(classifyVisibility(beyond, REGION)).toBe('off-screen');
    expect(classifyVisibility(touching, REGION)).toBe('off-screen');
  });

  it('is clipped for a rotated line with no corner strictly inside that still covers part of the region', () => {
    // A diamond around the region's top-left corner (0, 80). Two corners sit on
    // the region's edges, two are outside, and the overlap is an 800 dp² triangle.
    const diamond: Quad = [
      { x: 0, y: 40 },
      { x: 40, y: 80 },
      { x: 0, y: 120 },
      { x: -40, y: 80 },
    ];
    expect(classifyVisibility(diamond, REGION)).toBe('clipped');
  });

  it('is clipped, not off-screen, for a zero-area quad with a corner strictly inside', () => {
    // A straight segment from inside the region to outside it. Its clipped area
    // is zero, but part of it is on screen, so it is never called off-screen.
    // postProcess drops such quads before they reach geometry (R6.2).
    const segment: Quad = [
      { x: 100, y: 300 },
      { x: 500, y: 300 },
      { x: 500, y: 300 },
      { x: 100, y: 300 },
    ];
    expect(classifyVisibility(segment, REGION)).toBe('clipped');
  });

  it('never changes the quad it classifies', () => {
    const quad = box(-50, 200, 100, 30);
    const copy = JSON.parse(JSON.stringify(quad));
    classifyVisibility(quad, REGION);
    expect(quad).toEqual(copy);
  });
});
