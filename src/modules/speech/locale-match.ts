import type { LocaleCode } from '../shared';

/** Pure and deterministic: the first tag (sorted) whose language part equals the locale. */
export function pickVoice(tags: readonly string[], locale: LocaleCode): string | null {
  const matches = tags
    .filter((tag) => tag.toLowerCase().split(/[-_]/)[0] === locale)
    .sort();
  return matches[0] ?? null;
}
