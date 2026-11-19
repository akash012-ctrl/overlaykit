import type { LanguagePair, Translation } from '../shared';

export type TranslationCache = {
  get(pair: LanguagePair, text: string): Translation | undefined;
  set(pair: LanguagePair, text: string, value: Translation): void;
  clear(): void;
};

const keyOf = (pair: LanguagePair, text: string) => JSON.stringify([pair.source, pair.target, text]);

/** Memory only. Successes only. The oldest entry goes first past the cap. */
export function createTranslationCache(maxEntries: number): TranslationCache {
  const map = new Map<string, Translation>();
  return {
    get: (pair, text) => map.get(keyOf(pair, text)),
    set(pair, text, value) {
      if (maxEntries < 1) return;
      const key = keyOf(pair, text);
      map.delete(key);
      map.set(key, value);
      while (map.size > maxEntries) {
        const oldest = map.keys().next();
        if (oldest.done) break;
        map.delete(oldest.value);
      }
    },
    clear: () => map.clear(),
  };
}
