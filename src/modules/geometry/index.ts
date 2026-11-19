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

export { LABEL_GAP_DP } from './thresholds';
