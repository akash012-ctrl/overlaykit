import {
  classifyVisibility,
  computeCoverTransform,
  computeVisibleRegion,
  frameQuadToView,
  placeLabels,
  quadToRotatedBox,
} from '../../../geometry';
import type { FrameRef, OcrResult, Quad } from '../../../shared';
import type { OverlayLayout } from '../build-items';
import { buildOverlayItems, labelBoxSize } from '../build-items';
import type { FreezeOverlayState } from '../freeze-overlay';
import { EMPTY_FREEZE_OVERLAY, freezeOverlayReducer } from '../freeze-overlay';
import { LABEL_FONT_SIZE_SP, LABEL_LINE_HEIGHT_FACTOR, LABEL_PADDING_DP, MIN_TOUCH_TARGET_DP } from '../styles';

// Hand-built image-space layout on a 3000 x 4000 still shown on a 360 x 800 dp
// phone (scale 0.2, offsetX -120). The TM-01 snapshot-based version of this
// test follows in task 15.2.

function box(left: number, top: number, width: number, height: number): Quad {
  return [
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height },
  ];
}

const FRAME: FrameRef = {
  frameId: 'still-1',
  capturedAtMs: 100,
  size: { width: 3000, height: 4000 },
  source: 'still',
  mirrored: false,
  pixels: { kind: 'file', uri: 'file:///cache/overlaykit-stills/still-1.jpg' },
};

const RESULT: OcrResult = {
  frameId: 'still-1',
  capturedAtMs: 100,
  imageSize: FRAME.size,
  lines: [
    { script: 'latin', text: 'TICKETS', quad: box(1000, 1000, 1000, 100) }, // view x 80..280: visible
    { script: 'unsupported', code: 'OCR_UNSUPPORTED_SCRIPT', quad: box(1000, 2000, 1000, 100) }, // visible
    { script: 'latin', text: 'EXIT', quad: box(400, 1500, 400, 100) }, // view x -40..40: clipped
    { script: 'latin', text: 'CROPPED', quad: box(0, 3000, 300, 100) }, // view x -120..-60: off-screen
  ],
  excludedLineCount: 0,
};

const LAYOUT: OverlayLayout = {
  view: { width: 360, height: 800 },
  insets: { top: 24, right: 0, bottom: 48, left: 0 },
  bars: { top: 56, bottom: 96 },
  fontScale: 1,
};

function stateFor(result: OcrResult): FreezeOverlayState {
  return [
    { type: 'still-shown', frame: FRAME } as const,
    { type: 'result-applied', result } as const,
  ].reduce(freezeOverlayReducer, EMPTY_FREEZE_OVERLAY);
}

function itemsFor(state: FreezeOverlayState, layout: OverlayLayout) {
  const built = buildOverlayItems(state, layout);
  if (!built.ok) throw new Error(`expected items, got ${built.error}`);
  return built.value;
}

describe('buildOverlayItems', () => {
  const state = stateFor(RESULT);

  it('draws no item for an off-screen line, and outlines visible and clipped lines (R12.2, R13.1)', () => {
    const { items } = itemsFor(state, LAYOUT);
    expect(items.map((i) => [i.id, i.visibility])).toEqual([
      ['still-1/0', 'visible'],
      ['still-1/1', 'visible'],
      ['still-1/2', 'clipped'],
    ]);
    expect(items.every((i) => i.frameId === 'still-1')).toBe(true);
  });

  it('derives every position from geometry with the current layout (DD-6)', () => {
    const { items, region } = itemsFor(state, LAYOUT);
    const transform = computeCoverTransform(FRAME.size, LAYOUT.view);
    const expectedRegion = computeVisibleRegion(LAYOUT.view, LAYOUT.insets, LAYOUT.bars);
    if (!transform.ok || !expectedRegion.ok) throw new Error('expected a valid layout');
    expect(region).toEqual(expectedRegion.value);

    const quads = state.sources.slice(0, 3).map((s) => frameQuadToView(s.line.quad, FRAME, transform.value));
    items.forEach((item, i) => {
      expect(item.quad).toEqual(quads[i]); // clipping never moves the quad (R12.3)
      expect(item.outline).toEqual(quadToRotatedBox(quads[i]));
      expect(item.visibility).toBe(classifyVisibility(quads[i], region));
    });
    const placements = placeLabels(
      items.map((item) => ({ id: item.id, quad: item.quad, size: labelBoxSize(item.outline.width, region.width, 1) })),
      region,
    );
    expect(items.map((i) => i.label)).toEqual(placements);
  });

  it('recomputes positions when the safe-area insets change (R14.2)', () => {
    const before = itemsFor(state, LAYOUT);
    const after = itemsFor(state, { ...LAYOUT, insets: { ...LAYOUT.insets, top: 60 } });
    expect(after.region.y).toBe(116);
    expect(after.items.map((i) => i.quad)).toEqual(before.items.map((i) => i.quad)); // the still view didn't move
    expect(after).toEqual(itemsFor(state, { ...LAYOUT, insets: { ...LAYOUT.insets, top: 60 } }));
  });

  it('recomputes positions when the still view size changes (R14.1)', () => {
    const wider = itemsFor(state, { ...LAYOUT, view: { width: 412, height: 915 } });
    const transform = computeCoverTransform(FRAME.size, { width: 412, height: 915 });
    if (!transform.ok) throw new Error('expected a valid layout');
    expect(wider.items[0].quad).toEqual(frameQuadToView(RESULT.lines[0].quad, FRAME, transform.value));
  });

  it('shows the recognized text with a state marker, and no text for unsupported lines (R7.5, R17.5)', () => {
    const { items } = itemsFor(state, LAYOUT);
    expect(items.map((i) => i.content)).toEqual([
      { text: 'TICKETS', markerKey: 'label.pending', lowQuality: false },
      { text: null, markerKey: 'ocr.unsupported.marker', lowQuality: false },
      { text: 'EXIT', markerKey: 'label.pending', lowQuality: false },
    ]);
  });

  it('marks failed labels "Translation not available" (R17.6)', () => {
    const settled = freezeOverlayReducer(state, {
      type: 'translation-settled',
      frameId: 'still-1',
      outcomes: [{ id: 'still-1/0', outcome: { ok: false, error: 'TR_NOT_CONFIGURED' } }],
    });
    const { items } = itemsFor(settled, LAYOUT);
    expect(items[0].content.markerKey).toBe('label.notAvailable');
    expect(items[0].state).toEqual({ kind: 'failed', code: 'TR_NOT_CONFIGURED' });
  });

  it('marks readable labels of a low-quality result (R8.5)', () => {
    const { items } = itemsFor(stateFor({ ...RESULT, qualityFlag: 'OCR_LOW_QUALITY' }), LAYOUT);
    expect(items.map((i) => i.content.lowQuality)).toEqual([true, false, true]);
  });

  it('flips a mirrored frame before mapping (R11.2)', () => {
    const mirrored = { ...FRAME, mirrored: true };
    const mirroredState = [
      { type: 'still-shown', frame: mirrored } as const,
      { type: 'result-applied', result: RESULT } as const,
    ].reduce(freezeOverlayReducer, EMPTY_FREEZE_OVERLAY);
    const { items } = itemsFor(mirroredState, LAYOUT);
    // Image x 1000..2000 mirrors to 1000..2000 in a 3000 px frame, but corner [0] is now on the right.
    expect(items[0].quad[0].x).toBeCloseTo(280);
    expect(items[0].quad[1].x).toBeCloseTo(80);
  });

  it('gives no items for a view with no size yet, or no Visible region (R10.3)', () => {
    expect(buildOverlayItems(state, { ...LAYOUT, view: { width: 0, height: 0 } })).toEqual({
      ok: false,
      error: 'INVALID_SIZE',
    });
    expect(buildOverlayItems(state, { ...LAYOUT, bars: { top: 400, bottom: 400 } })).toEqual({
      ok: false,
      error: 'EMPTY_REGION',
    });
  });

  it('gives no items when no still is shown', () => {
    expect(itemsFor(EMPTY_FREEZE_OVERLAY, LAYOUT).items).toEqual([]);
  });
});

describe('labelBoxSize', () => {
  it('is at least one touch target wide and never wider than the region', () => {
    expect(labelBoxSize(10, 300, 1).width).toBe(MIN_TOUCH_TARGET_DP);
    expect(labelBoxSize(200, 300, 1).width).toBe(200);
    expect(labelBoxSize(500, 300, 1).width).toBe(300);
  });

  it('fits two rows of 14 sp text with padding, scaled by the system font scale', () => {
    const rows = (scale: number) => 2 * LABEL_FONT_SIZE_SP * scale * LABEL_LINE_HEIGHT_FACTOR + 2 * LABEL_PADDING_DP;
    expect(labelBoxSize(200, 300, 1).height).toBe(Math.max(rows(1), MIN_TOUCH_TARGET_DP));
    expect(labelBoxSize(200, 300, 2).height).toBe(rows(2));
    expect(labelBoxSize(200, 300, 2).height).toBeGreaterThan(labelBoxSize(200, 300, 1).height);
  });

  it('is never shorter than one touch target, even at a small font scale', () => {
    expect(labelBoxSize(200, 300, 0.5).height).toBe(MIN_TOUCH_TARGET_DP);
  });

  it('uses font scale 1 for an unusable font scale', () => {
    expect(labelBoxSize(200, 300, Number.NaN)).toEqual(labelBoxSize(200, 300, 1));
  });
});
