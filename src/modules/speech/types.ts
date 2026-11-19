import type { LocaleCode, Result, SpErrorCode } from '../shared';

/**
 * Vendor-neutral text-to-speech engine. One adapter file implements it.
 * Speech input (spec 05) gets its own SpeechInput interface beside this one.
 */
export type SpeechEngine = {
  /** BCP-47 tags of installed voices, e.g. "en-US", "hi-IN". Empty when none. */
  listVoiceTags(): Promise<readonly string[]>;
  /** Starts playback. Resolves when it ends. Rejects on engine error. */
  speak(text: string, voiceTag: string, signal: { readonly stopped: () => boolean }): Promise<void>;
  /** Stops any playback now. */
  stop(): void;
};

/** What the app uses. Text-to-speech only. */
export type SpeechOutput = {
  /** True when the device has a voice for this language. Never throws. */
  hasVoice(locale: LocaleCode): Promise<boolean>;
  /** Speaks the text unchanged. SP_NO_VOICE before any engine call when no voice. */
  speak(text: string, locale: LocaleCode): Promise<Result<void, SpErrorCode>>;
  stop(): void;
};
