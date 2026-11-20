import type { LocaleCode } from '../shared';

/** Pure and deterministic: the first tag (sorted) whose language part equals the locale. */
export function pickVoice(tags: readonly string[], locale: LocaleCode): string | null {
  const matches = tags
    .filter((tag) => tag.toLowerCase().split(/[-_]/)[0] === locale)
    .sort();
  return matches[0] ?? null;
}

export type Locales = { readonly all: readonly string[]; readonly installed: readonly string[] };

/** Used when the phone's recognition service cannot list its languages (Google's TTS recognizer on many phones). */
const DEFAULT_TAG: Readonly<Record<LocaleCode, string>> = { en: 'en-US', hi: 'hi-IN', kn: 'kn-IN' };

/** The tag to listen with: an installed pack first, then a listed language, then the default when nothing is listed. */
export function listenTag(locales: Locales, language: LocaleCode): { readonly tag: string; readonly installed: boolean } | null {
  const installed = pickVoice(locales.installed, language);
  if (installed !== null) return { tag: installed, installed: true };
  const listed = pickVoice(locales.all, language);
  if (listed !== null) return { tag: listed, installed: false };
  return locales.all.length === 0 ? { tag: DEFAULT_TAG[language], installed: false } : null;
}
