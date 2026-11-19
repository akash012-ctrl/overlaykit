import type { StringKey } from '../../locale';
import type { GdErrorCode } from '../../shared';

/** The one UI state each code maps to (R16.3, ARCHITECTURE.md 8). */
export type GuideUiState = {
  readonly view: 'refusal' | 'paused' | 'cancelled' | 'checkpoint-prompt' | 'unavailable' | 'component-prompt';
  readonly messageKey: StringKey;
  /** Announced to Android accessibility services when the state appears (QE-3, R16.9). */
  readonly liveRegion: 'polite' | 'assertive';
};

/** Total: a new code in `GD_ERROR_CODES` is a type error here until it is mapped. */
export const GUIDE_ERROR_UI: Readonly<Record<GdErrorCode | 'CMP_NOT_VISIBLE', GuideUiState>> = {
  GD_UNSUPPORTED: { view: 'refusal', messageKey: 'guide.refusal', liveRegion: 'polite' },
  GD_MACHINE_LOST: { view: 'paused', messageKey: 'guide.paused', liveRegion: 'polite' },
  GD_MACHINE_CHANGED: { view: 'cancelled', messageKey: 'guide.cancelled', liveRegion: 'assertive' },
  GD_CHECKPOINT_NOT_SEEN: { view: 'checkpoint-prompt', messageKey: 'guide.notSeen', liveRegion: 'polite' },
  GD_FIXTURE_INVALID: { view: 'unavailable', messageKey: 'guide.unavailable', liveRegion: 'polite' },
  // The text comes from `t('guide.pointCameraAt', { component })`, built by the highlight model.
  CMP_NOT_VISIBLE: { view: 'component-prompt', messageKey: 'guide.pointCameraAt', liveRegion: 'polite' },
};
