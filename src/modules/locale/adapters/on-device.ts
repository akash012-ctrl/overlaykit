import type { LanguagePair, Result, TranslationOutcome } from '../../shared';
import type { TranslationProvider, TranslationRequest } from '../translation';

/** Vendor adapter around on-device translation (ML Kit). Not written yet: task 4.1 is parked. */
export interface OnDeviceEngine {
  readonly id: string;
  isModelReady(pair: LanguagePair): Promise<boolean>;
  downloadModel(pair: LanguagePair): Promise<Result<void, 'OFFLINE' | 'FAILED'>>;
  translate(texts: readonly string[], pair: LanguagePair): Promise<Result<readonly string[], 'UNSUPPORTED' | 'FAILED'>>;
}

export type OnDeviceStatus = { readonly pair: LanguagePair; readonly state: 'downloading' | 'ready' | 'idle' };
type Listener = (status: OnDeviceStatus) => void;

const listeners = new Set<Listener>();

/** ui reads this to show "Downloading language data". It does not poll the adapter. */
export function subscribeOnDeviceStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(status: OnDeviceStatus): void {
  listeners.forEach((listener) => listener(status));
}

/**
 * The on-device TranslationProvider. Makes no network request for the text.
 * One model download per pair at a time: a second request for the same pair waits on the first.
 */
export function createOnDeviceProvider(engine: OnDeviceEngine): TranslationProvider {
  const downloads = new Map<string, Promise<Result<void, 'OFFLINE' | 'FAILED'>>>();

  async function ensureModel(pair: LanguagePair): Promise<Result<void, 'OFFLINE' | 'FAILED'>> {
    if (await engine.isModelReady(pair)) return { ok: true, value: undefined };
    const key = `${pair.source}>${pair.target}`;
    let pending = downloads.get(key);
    if (!pending) {
      publish({ pair, state: 'downloading' });
      pending = engine.downloadModel(pair).finally(() => {
        downloads.delete(key);
      });
      downloads.set(key, pending);
    }
    const result = await pending;
    publish({ pair, state: result.ok ? 'ready' : 'idle' });
    return result;
  }

  return {
    id: engine.id,
    async translate(request: TranslationRequest): Promise<readonly TranslationOutcome[]> {
      const failAll = (error: 'TR_OFFLINE' | 'TR_PROVIDER_ERROR' | 'TR_UNSUPPORTED_PAIR'): TranslationOutcome[] =>
        request.texts.map(() => ({ ok: false, error }));
      if (request.source === 'auto') return failAll('TR_UNSUPPORTED_PAIR');
      const pair: LanguagePair = { source: request.source, target: request.target };
      try {
        const model = await ensureModel(pair);
        if (!model.ok) return failAll(model.error === 'OFFLINE' ? 'TR_OFFLINE' : 'TR_PROVIDER_ERROR');
        const result = await engine.translate(request.texts, pair);
        if (!result.ok) return failAll(result.error === 'UNSUPPORTED' ? 'TR_UNSUPPORTED_PAIR' : 'TR_PROVIDER_ERROR');
        if (result.value.length !== request.texts.length) return failAll('TR_PROVIDER_ERROR');
        return result.value.map(
          (text): TranslationOutcome =>
            text.trim() === ''
              ? { ok: false, error: 'TR_PROVIDER_ERROR' }
              : { ok: true, value: { text, providerId: engine.id, detectedSource: null } },
        );
      } catch {
        return failAll('TR_PROVIDER_ERROR');
      }
    },
  };
}
