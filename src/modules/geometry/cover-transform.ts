import type { Point, Result, Size } from '../shared';

/**
 * Maps upright image pixels to view layout units for a preview that scales the
 * image to fill the whole view and crops the overflow equally on both sides
 * ("cover"). See docs/ARCHITECTURE.md §7.
 *
 * This assumes the preview really uses centred cover scaling. G1 must confirm
 * that against the chosen camera library on the reference phone.
 */
export type CoverTransform = {
  readonly scale: number;
  /** Where the image's left edge lands in the view. Zero or negative. */
  readonly offsetX: number;
  /** Where the image's top edge lands in the view. Zero or negative. */
  readonly offsetY: number;
  readonly image: Size;
  readonly view: Size;
};

export type CoverTransformError = 'INVALID_SIZE';

function isValidSize(size: Size): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

export function computeCoverTransform(
  image: Size,
  view: Size,
): Result<CoverTransform, CoverTransformError> {
  if (!isValidSize(image) || !isValidSize(view)) {
    return { ok: false, error: 'INVALID_SIZE' };
  }
  const scale = Math.max(view.width / image.width, view.height / image.height);
  return {
    ok: true,
    value: {
      scale,
      offsetX: (view.width - image.width * scale) / 2,
      offsetY: (view.height - image.height * scale) / 2,
      image,
      view,
    },
  };
}

export function imageToView(point: Point, transform: CoverTransform): Point {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY,
  };
}

export function viewToImage(point: Point, transform: CoverTransform): Point {
  return {
    x: (point.x - transform.offsetX) / transform.scale,
    y: (point.y - transform.offsetY) / transform.scale,
  };
}

/** False when the crop hides this image point, so nothing should be drawn for it. */
export function isVisibleInView(point: Point, transform: CoverTransform): boolean {
  const { x, y } = imageToView(point, transform);
  return x >= 0 && y >= 0 && x <= transform.view.width && y <= transform.view.height;
}
