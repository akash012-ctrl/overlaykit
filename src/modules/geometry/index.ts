export {
  computeCoverTransform,
  imageToView,
  isVisibleInView,
  viewToImage,
} from './cover-transform';
export type { CoverTransform, CoverTransformError } from './cover-transform';

export { frameQuadToView, mapQuad, mirrorQuadX, quadToRotatedBox } from './quad';
export type { RotatedBox } from './quad';

export { quadBounds } from './rect';
export type { Rect } from './rect';

export { classifyVisibility, computeVisibleRegion } from './visibility';
export type { ControlBars, Insets, Visibility } from './visibility';

export { placeLabels } from './placement';
export type { LabelPlacement, LabelRequest } from './placement';

export { LABEL_GAP_DP, ROUND_TRIP_TOLERANCE_PX } from './thresholds';

export { applyFit, matchLayout } from './layout-match';
export type { AnchorTemplate, LayoutMatch, ObservedAnchor } from './layout-match';

export { hitTest } from './hit-test';
export type { HitItem, HitResult } from './hit-test';
export { HIT_MIN_TARGET_DP } from './thresholds';
