import type { StringKey } from '../../locale';
import type { PlErrorCode, SpErrorCode } from '../../shared';

export type PlanAct = 'retry' | 'translate' | 'explore' | 'stop' | 'setup' | 'key';

/** The one UI state each planner code maps to (design.md, Error handling). */
export type PlanUiState = {
  readonly messageKey: StringKey;
  /** Buttons offered, in order. `setup` shows the model setup steps. */
  readonly actions: readonly PlanAct[];
  readonly liveRegion: 'polite' | 'assertive';
};

/** Total: a new code in `PL_ERROR_CODES` is a type error here until it is mapped. */
export const PLAN_ERROR_UI: Readonly<Record<PlErrorCode, PlanUiState>> = {
  PL_NO_MODEL: { messageKey: 'guide.plan.err.PL_NO_MODEL', actions: ['setup', 'translate', 'explore'], liveRegion: 'polite' },
  PL_UNSUPPORTED_DEVICE: { messageKey: 'guide.plan.err.PL_UNSUPPORTED_DEVICE', actions: ['translate', 'explore'], liveRegion: 'polite' },
  PL_NO_TEXT: { messageKey: 'guide.plan.err.PL_NO_TEXT', actions: ['retry', 'translate'], liveRegion: 'polite' },
  // The text takes {reason} from the model (or the no-reason key when there is none).
  PL_CANNOT_PLAN: { messageKey: 'guide.plan.err.PL_CANNOT_PLAN', actions: ['translate', 'explore', 'stop'], liveRegion: 'polite' },
  PL_BAD_OUTPUT: { messageKey: 'guide.plan.err.PL_BAD_OUTPUT', actions: ['retry', 'translate', 'explore'], liveRegion: 'polite' },
  PL_TARGET_NOT_FOUND: { messageKey: 'guide.plan.err.PL_TARGET_NOT_FOUND', actions: ['retry', 'translate', 'explore'], liveRegion: 'polite' },
  PL_TIMEOUT: { messageKey: 'guide.plan.err.PL_TIMEOUT', actions: ['retry', 'translate'], liveRegion: 'polite' },
  // Gemini Live (R16.13). Retry means the user taps Start Gemini Live again. Nothing restarts by itself.
  PL_LIVE_NO_KEY: { messageKey: 'guide.plan.err.PL_LIVE_NO_KEY', actions: ['key', 'translate', 'explore'], liveRegion: 'polite' },
  PL_LIVE_AUTH: { messageKey: 'guide.plan.err.PL_LIVE_AUTH', actions: ['key', 'translate', 'explore'], liveRegion: 'polite' },
  PL_LIVE_QUOTA: { messageKey: 'guide.plan.err.PL_LIVE_QUOTA', actions: ['translate', 'explore', 'stop'], liveRegion: 'polite' },
  PL_LIVE_NETWORK: { messageKey: 'guide.plan.err.PL_LIVE_NETWORK', actions: ['retry', 'translate', 'explore'], liveRegion: 'polite' },
  PL_LIVE_SESSION_ENDED: { messageKey: 'guide.plan.err.PL_LIVE_SESSION_ENDED', actions: ['retry', 'translate', 'explore'], liveRegion: 'polite' },
  PL_LIVE_MIC_DENIED: { messageKey: 'guide.plan.err.PL_LIVE_MIC_DENIED', actions: ['retry', 'translate', 'explore'], liveRegion: 'polite' },
};

export type VoiceAct = 'tap' | 'retry' | 'openSettings';

export type VoiceUiState = {
  readonly messageKey: StringKey;
  /** The mic button is hidden after this code (nothing to retry). */
  readonly hideMic: boolean;
  readonly actions: readonly VoiceAct[];
};

/** Total over `SpErrorCode`. Tapping a line always stays possible (R2.7). */
export const VOICE_ERROR_UI: Readonly<Record<SpErrorCode, VoiceUiState>> = {
  SP_NOT_AVAILABLE: { messageKey: 'guide.voice.err.SP_NOT_AVAILABLE', hideMic: true, actions: ['tap'] },
  SP_PERMISSION_DENIED: { messageKey: 'guide.voice.err.SP_PERMISSION_DENIED', hideMic: false, actions: ['tap', 'openSettings'] },
  SP_LANGUAGE_UNSUPPORTED: { messageKey: 'guide.voice.err.SP_LANGUAGE_UNSUPPORTED', hideMic: true, actions: ['tap'] },
  SP_NO_SPEECH: { messageKey: 'guide.voice.err.SP_NO_SPEECH', hideMic: false, actions: ['retry'] },
  SP_FAILED: { messageKey: 'guide.voice.err.SP_FAILED', hideMic: false, actions: ['retry', 'tap'] },
  // Output-side code. Speak is already hidden without a voice; this covers a late failure.
  SP_NO_VOICE: { messageKey: 'guide.voice.err.SP_NO_VOICE', hideMic: false, actions: ['tap'] },
};
