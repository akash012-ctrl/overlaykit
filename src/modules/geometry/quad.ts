import type { FrameRef, Point, Quad } from '../shared';
import { quadLineHeight } from '../shared';
import type { CoverTransform } from './cover-transform';
import { imageToView } from './cover-transform';

/** For drawing a quad as a rotated box (docs/ARCHITECTURE.md §7). */
export type RotatedBox = {
  readonly centre: Point;
  readonly width: number;
  readonly height: number;
  /** Angle of edge [0] → [1], in radians, y-down. */
  readonly angleRad: number;
};

/** imageToView on each corner, in the same index order (R10.4). */
export function mapQuad(quad: Quad, transform: CoverTransform): Quad {
  return [
    imageToView(quad[0], transform),
    imageToView(quad[1], transform),
    imageToView(quad[2], transform),
    imageToView(quad[3], transform),
  ];
}

/** x → imageWidth − x on each corner, in the same index order (R11.2). */
export function mirrorQuadX(quad: Quad, imageWidth: number): Quad {
  const flip = (p: Point): Point => ({ x: imageWidth - p.x, y: p.y });
  return [flip(quad[0]), flip(quad[1]), flip(quad[2]), flip(quad[3])];
}

/** Flips x first when the frame is mirrored, then applies the cover transform. */
export function frameQuadToView(
  quad: Quad,
  frame: Pick<FrameRef, 'size' | 'mirrored'>,
  transform: CoverTransform,
): Quad {
  const upright = frame.mirrored ? mirrorQuadX(quad, frame.size.width) : quad;
  return mapQuad(upright, transform);
}

/** centre = mean of corners; width = |[1] − [0]|; height = quadLineHeight; angle of edge [0] → [1]. */
export function quadToRotatedBox(quad: Quad): RotatedBox {
  const [a, b, c, d] = quad;
  return {
    centre: { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4 },
    width: Math.hypot(b.x - a.x, b.y - a.y),
    height: quadLineHeight(quad),
    angleRad: Math.atan2(b.y - a.y, b.x - a.x),
  };
}
