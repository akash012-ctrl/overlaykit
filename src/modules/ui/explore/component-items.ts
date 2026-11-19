import type { RotatedBox } from '../../geometry';
import { computeCoverTransform, frameQuadToView, quadToRotatedBox } from '../../geometry';
import type { FrameRef, LocatedComponent, Quad, Size } from '../../shared';

/** A located component mapped into view space. Mapped on every render, never stored (DD-6). */
export type ViewComponent = {
  readonly id: string;
  readonly frameId: string;
  readonly quad: Quad;
  readonly outline: RotatedBox;
};

/**
 * Maps located components from image space to view space through geometry. A component of another
 * frame, or any geometry error, gives no items: nothing is drawn for a component that isn't located (R20.7).
 */
export function toViewComponents(
  located: readonly LocatedComponent[],
  shown: FrameRef | null,
  view: Size,
): readonly ViewComponent[] {
  if (!shown) return [];
  const transform = computeCoverTransform(shown.size, view);
  if (!transform.ok) return [];
  return located
    .filter((c) => c.frameId === shown.frameId)
    .map((c) => {
      const quad = frameQuadToView(c.quad, shown, transform.value);
      return { id: c.id, frameId: c.frameId, quad, outline: quadToRotatedBox(quad) };
    });
}
