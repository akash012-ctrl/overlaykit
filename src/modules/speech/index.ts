// Public API of speech: text-to-speech output only (spec 04). No network, no microphone.
// Speech input (spec 05) is added beside SpeechOutput as its own interface.
import { createSpeechOutput } from './service';
import type { SpeechEngine, SpeechOutput } from './types';

export { createSpeechOutput } from './service';
export { pickVoice } from './locale-match';
export type { SpeechEngine, SpeechOutput } from './types';

/**
 * shortcut: no vendor adapter yet. expo-speech awaits owner approval (spec 04 task 1.1/2.2),
 * so this engine reports no voice and the Speak control stays hidden.
 * Replace with the expo-speech adapter file when approved.
 */
const noEngine: SpeechEngine = {
  listVoiceTags: async () => [],
  speak: async () => {
    throw new Error('no speech engine installed');
  },
  stop: () => {},
};

let instance: SpeechOutput | null = null;
export function getSpeechOutput(): SpeechOutput {
  instance ??= createSpeechOutput(noEngine);
  return instance;
}
