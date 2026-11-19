import type { ControlBars, Insets, LabelPlacement, Rect, RotatedBox } from '../../geometry';
import {
  classifyVisibility,
  computeCoverTransform,
  computeVisibleRegion,
  frameQuadToView,
  placeLabels,
  quadToRotatedBox,
} from '../../geometry';
import type { StringKey } from '../../locale';
import type { FrameId, Quad, Result, Size } from '../../shared';
import { ERROR_UI } from '../camera-screen/error-map';
import type { FreezeOverlayState, LabelState } from './freeze-overlay';
import { LABEL_FONT_SIZE_SP, LABEL_LINE_HEIGHT_FACTOR, LABEL_PADDING_DP, MIN_TOUCH_TARGET_DP } from './styles';

/** Everything on screen that overlay positions depend on (R14). */
export type OverlayLayout = {
  /** The still view's size from onLayout. */
  readonly view: Size;
  readonly insets: Insets;
  readonly bars: ControlBars;
  /** PixelRatio.getFontScale(). */
  readonly fontScale: number;
};

export type LabelContent = {
  /** The recognized text; null for unsupported lines, whose engine text is never shown (DD-3). */
  readonly text: string | null;
  /** The state marker shown under the text (R17.5, R17.6, R7.5). */
  readonly markerKey: StringKey;
  /** Adds the ocr.lowQuality.marker row and icon (R8.5). */
  readonly lowQuality: boolean;
};

export type OverlayItem = {
  readonly id: string;
  readonly frameId: FrameId;
  /** Off-screen lines produce no item (R12.2). */
  readonly visibility: 'visible' | 'clipped';
  /** View space, at its mapped position: clipping never moves it (R12.3). */
  readonly quad: Quad;
  /** Source_Outline (R13.1). */
  readonly outline: RotatedBox;
  /** Placed box, or unplaced (R13.5). */
  readonly label: LabelPlacement;
  readonly content: LabelContent;
  readonly state: LabelState;
};

function markerKeyFor(state: LabelState): StringKey {
  switch (state.kind) {
    case 'pending':
      return 'label.pending';
    case 'translated':
      return 'label.translated';
    case 'failed':
      return ERROR_UI[state.code].messageKey;
    case 'unsupported':
      return ERROR_UI[state.code].messageKey;
  }
}

/**
 * Label box size before placement. Width: the outline's width, at least one
 * touch target and at most the Visible region. Height: two text rows (content,
 * then state marker) at the scaled font size and line height, plus padding,
 * and at least one touch target (R19.2, R19.6).
 */
export function labelBoxSize(outlineWidth: number, regionWidth: number, fontScale: number): Size {
  // An unusable font scale (never expected from PixelRatio) falls back to 1 so a label still has a size.
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const rowHeight = LABEL_FONT_SIZE_SP * scale * LABEL_LINE_HEIGHT_FACTOR;
  const width = Math.min(Math.max(outlineWidth, MIN_TOUCH_TARGET_DP), regionWidth);
  const height = Math.max(2 * rowHeight + 2 * LABEL_PADDING_DP, MIN_TOUCH_TARGET_DP);
  return { width, height };
}

/**
 * Derives the overlay items for the shown still from its image-space sources
 * and the current layout (DD-6). Called on every render with the current
 * layout, so a size, inset, bar or font-scale change moves every item (R14).
 * Any geometry error means no items (R10.3).
 */
export function buildOverlayItems(
  state: FreezeOverlayState,
  layout: OverlayLayout,
): Result<{ readonly items: readonly OverlayItem[]; readonly region: Rect }, 'INVALID_SIZE' | 'EMPTY_REGION'> {
  const regionResult = computeVisibleRegion(layout.view, layout.insets, layout.bars);
  const shown = state.shown;
  if (!shown) {
    return regionResult.ok ? { ok: true, value: { items: [], region: regionResult.value } } : regionResult;
  }
  const transform = computeCoverTransform(shown.size, layout.view);
  if (!transform.ok) return transform;
  if (!regionResult.ok) return regionResult;
  const region = regionResult.value;

  const mapped = state.sources
    // Defensive: the reducer only keeps sources of the shown still (R15.2).
    .filter((source) => source.frameId === shown.frameId)
    .map((source) => {
      const quad = frameQuadToView(source.line.quad, shown, transform.value);
      return { source, quad, visibility: classifyVisibility(quad, region), outline: quadToRotatedBox(quad) };
    })
    .flatMap((entry) => (entry.visibility === 'off-screen' ? [] : [{ ...entry, visibility: entry.visibility }]));

  const placements = placeLabels(
    mapped.map(({ source, quad, outline }) => ({
      id: source.id,
      quad,
      size: labelBoxSize(outline.width, region.width, layout.fontScale),
    })),
    region,
  );

  const items = mapped.map(({ source, quad, visibility, outline }, index): OverlayItem => ({
    id: source.id,
    frameId: source.frameId,
    visibility,
    quad,
    outline,
    label: placements[index],
    content: {
      text: source.line.script === 'unsupported' ? null : source.line.text,
      markerKey: markerKeyFor(source.label),
      lowQuality: state.lowQuality && source.line.script !== 'unsupported',
    },
    state: source.label,
  }));

  return { ok: true, value: { items, region } };
}
