import type { StringKey } from '../../locale';

/**
 * What the mode switcher needs to list Guide. Lane C owns ModeSwitcher.tsx and wires this in.
 * `labelKey` must exist in the locale tables (it is added with the guide keys). Guide mounts
 * `GuideScreen` only while this mode is selected.
 */
export const GUIDE_MODE_ENTRY: { readonly id: 'guide'; readonly labelKey: StringKey } = {
  id: 'guide',
  labelKey: 'guide.title',
};