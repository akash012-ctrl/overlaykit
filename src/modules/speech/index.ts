// Public API of speech: text-to-speech output only (spec 04). No network, no microphone.
// Speech input (spec 05) is added beside SpeechOutput as its own interface.
import { createSpeechOutput } from './service';
import { expoSpeechEngine } from './adapters/expo-speech-engine';
import type { SpeechOutput } from './types';

export { createSpeechOutput } from './service';
export { pickVoice } from './locale-match';
export type { SpeechEngine, SpeechOutput } from './types';

let instance: SpeechOutput | null = null;
export function getSpeechOutput(): SpeechOutput {
  instance ??= createSpeechOutput(expoSpeechEngine);
  return instance;
}
