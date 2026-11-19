import type { Quad, Result, Size } from '../shared';
import type { Rect } from './rect';
import { quadOverlapArea } from './rect';

export type Insets = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

/** Heights of the Camera_Screen's opaque top and bottom control bars, inside the safe area. */
export type ControlBars = { readonly top: number; readonly bottom: number };

export type Visibility = 'visible' | 'clipped' | 'off-screen';

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * The part of the view inside the safe-area insets and outside the control bars.
 * The still view and the preview fill the screen, and the bars sit over them
 * inside the safe area.
 *
 * EMPTY_REGION when no positive area is left, and also when an input is not a
 * finite number or an inset or bar height is negative, because then no region
 * can be trusted.
 */
export function computeVisibleRegion(view: Size, insets: Insets, bars: ControlBars): Result<Rect, 'EMPTY_REGION'> {
  const inputs = [view.width, view.height, insets.top, insets.right, insets.bottom, insets.left, bars.top, bars.bottom];
  if (!inputs.every(isFiniteNonNegative)) {
    return { ok: false, error: 'EMPTY_REGION' };
  }
  const width = view.width - insets.left - insets.right;
  const height = view.height - insets.top - insets.bottom - bars.top - bars.bottom;
  if (!(width > 0 && height > 0)) {
    return { ok: false, error: 'EMPTY_REGION' };
  }
  return { ok: true, value: { x: insets.left, y: insets.top + bars.top, width, height } };
}

function inClosedRegion(x: number, y: number, region: Rect): boolean {
  return x >= region.x && y >= region.y && x <= region.x + region.width && y <= region.y + region.height;
}

function inOpenRegion(x: number, y: number, region: Rect): boolean {
  return x > region.x && y > region.y && x < region.x + region.width && y < region.y + region.height;
}

/**
 * visible: every corner inside the closed region.
 * off-screen: no corner strictly inside, and the quad clipped to the region has zero area.
 * clipped: otherwise.
 *
 * Never changes the quad. The caller draws it at its mapped position inside a
 * clip container at the region, so clipping never moves it (R12.1, R12.3, R12.4).
 */
export function classifyVisibility(quad: Quad, region: Rect): Visibility {
  if (quad.every((p) => inClosedRegion(p.x, p.y, region))) {
    return 'visible';
  }
  if (quad.some((p) => inOpenRegion(p.x, p.y, region))) {
    return 'clipped';
  }
  return quadOverlapArea(quad, region) > 0 ? 'clipped' : 'off-screen';
}
