// Public API of speech: text-to-speech output (spec 04) and speech input (spec 05).
// Input uses the microphone only inside listen(), after the permission is granted. Audio is never stored.
// Speech input (spec 05) is its own interface beside SpeechOutput.
import { createSpeechOutput } from './service';
import { expoSpeechEngine } from './adapters/expo-speech-engine';
import { androidRecognizer } from './adapters/android-recognizer';
import type { SpeechInput, SpeechOutput } from './types';

export { createSpeechOutput } from './service';
export { pickVoice } from './locale-match';
export type { SpeechEngine, SpeechInput, SpeechOutput } from './types';

let instance: SpeechOutput | null = null;
export function getSpeechOutput(): SpeechOutput {
  instance ??= createSpeechOutput(expoSpeechEngine);
  return instance;
}

export function createSpeechInput(): SpeechInput {
  return androidRecognizer;
}
