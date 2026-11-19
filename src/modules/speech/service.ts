import type { LocaleCode, Result, SpErrorCode } from '../shared';
import { pickVoice } from './locale-match';
import type { SpeechEngine, SpeechOutput } from './types';

/** One playback at a time. A newer speak or stop makes older callbacks stale. */
export function createSpeechOutput(engine: SpeechEngine): SpeechOutput {
  let generation = 0;

  async function voiceFor(locale: LocaleCode): Promise<string | null> {
    try {
      return pickVoice(await engine.listVoiceTags(), locale);
    } catch {
      return null;
    }
  }

  return {
    async hasVoice(locale) {
      return (await voiceFor(locale)) !== null;
    },
    async speak(text, locale): Promise<Result<void, SpErrorCode>> {
      const voice = await voiceFor(locale);
      if (voice === null) return { ok: false, error: 'SP_NO_VOICE' };
      generation += 1;
      const mine = generation;
      try {
        engine.stop();
        await engine.speak(text, voice, { stopped: () => mine !== generation });
      } catch {
        // A stale playback that errors after stop() is not a failure of the current one.
        return mine === generation ? { ok: false, error: 'SP_FAILED' } : { ok: true, value: undefined };
      }
      return { ok: true, value: undefined };
    },
    stop() {
      generation += 1;
      try {
        engine.stop();
      } catch {
        // Nothing playing or engine gone: stop is best effort.
      }
    },
  };
}
