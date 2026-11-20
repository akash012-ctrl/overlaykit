import { ExpoSpeechRecognitionModule, type ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import { AppState } from 'react-native';

import type { LocaleCode, Result, SpErrorCode } from '../../shared';
import type { Locales } from '../locale-match';
import { listenTag } from '../locale-match';
import type { SpeechInput } from '../types';

// The only file that imports expo-speech-recognition. API per
// https://github.com/jamsch/expo-speech-recognition (start, abort, requestPermissionsAsync,
// getSupportedLocales, supportsOnDeviceRecognition, addListener "result" | "error" | "end").
// shortcut: no LISTEN_MAX_MS yet (unset in the spec); the recognizer's own silence timeout ends a turn.

function mapError(code: ExpoSpeechRecognitionErrorCode): SpErrorCode {
  switch (code) {
    case 'not-allowed':
      return 'SP_PERMISSION_DENIED';
    case 'language-not-supported':
      return 'SP_LANGUAGE_UNSUPPORTED';
    case 'service-not-allowed':
      return 'SP_NOT_AVAILABLE';
    case 'no-speech':
    case 'speech-timeout':
      return 'SP_NO_SPEECH';
    default:
      return 'SP_FAILED';
  }
}

/** null when there is no recognizer at all. An empty list means the service could not say which languages it has. */
async function supportedLocales(): Promise<Locales | null> {
  try {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return null;
  } catch {
    return null;
  }
  try {
    const { locales, installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return { all: locales, installed: installedLocales };
  } catch {
    return { all: [], installed: [] };
  }
}

export const androidRecognizer: SpeechInput = {
  async isAvailable(language) {
    const locales = await supportedLocales();
    return locales !== null && listenTag(locales, language) !== null;
  },

  async listen(language: LocaleCode, signal: AbortSignal): Promise<Result<string, SpErrorCode>> {
    if (signal.aborted) return { ok: false, error: 'SP_FAILED' };
    const locales = await supportedLocales();
    if (locales === null) return { ok: false, error: 'SP_NOT_AVAILABLE' };
    const pick = listenTag(locales, language);
    if (pick === null) return { ok: false, error: 'SP_LANGUAGE_UNSUPPORTED' };
    const { tag } = pick;

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) return { ok: false, error: 'SP_PERMISSION_DENIED' };
    } catch {
      return { ok: false, error: 'SP_FAILED' };
    }
    if (signal.aborted) return { ok: false, error: 'SP_FAILED' };

    return new Promise<Result<string, SpErrorCode>>((resolve) => {
      let transcript = '';
      let settled = false;
      const cleanups: (() => void)[] = [];

      const finish = (result: Result<string, SpErrorCode>) => {
        if (settled) return;
        settled = true;
        for (const cleanup of cleanups) cleanup();
        resolve(result);
      };
      const stop = () => {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // Nothing running: abort is best effort.
        }
      };

      const onResult = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        if (!event.isFinal) return;
        transcript = event.results[0]?.transcript.trim() ?? '';
        finish(transcript.length > 0 ? { ok: true, value: transcript } : { ok: false, error: 'SP_NO_SPEECH' });
      });
      const onError = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        finish({ ok: false, error: signal.aborted ? 'SP_FAILED' : mapError(event.error) });
      });
      const onEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
        finish(transcript.length > 0 ? { ok: true, value: transcript } : { ok: false, error: 'SP_NO_SPEECH' });
      });
      const appState = AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
          stop();
          finish({ ok: false, error: 'SP_FAILED' });
        }
      });
      const onAbort = () => {
        stop();
        finish({ ok: false, error: 'SP_FAILED' });
      };
      signal.addEventListener('abort', onAbort);
      cleanups.push(
        () => onResult.remove(),
        () => onError.remove(),
        () => onEnd.remove(),
        () => appState.remove(),
        () => signal.removeEventListener('abort', onAbort),
      );

      try {
        ExpoSpeechRecognitionModule.start({
          lang: tag,
          interimResults: false,
          continuous: false,
          // On-device only when the pack is installed; otherwise the phone's recognizer may use its service.
          requiresOnDeviceRecognition: pick.installed && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
          recordingOptions: { persist: false },
        });
      } catch {
        finish({ ok: false, error: 'SP_FAILED' });
      }
    });
  },
};
