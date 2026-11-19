import * as Speech from 'expo-speech';

import type { SpeechEngine } from '../types';

// The only file that imports expo-speech. API per https://docs.expo.dev/versions/v58.0.0/sdk/speech/
// (getAvailableVoicesAsync, speak with language/onDone/onError/onStopped, stop). Android has no pause.
export const expoSpeechEngine: SpeechEngine = {
  async listVoiceTags() {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.map((voice) => voice.language).filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  },
  speak(text, voiceTag, signal) {
    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: voiceTag,
        onDone: () => resolve(),
        // A stop() from a newer call ends this one quietly.
        onStopped: () => resolve(),
        onError: (error) => (signal.stopped() ? resolve() : reject(error)),
      });
    });
  },
  stop() {
    void Speech.stop();
  },
};
