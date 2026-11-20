import type { LanguagePair, LocaleCode, SourceLocale } from '../shared';

export type Route = 'on-device' | 'cloud' | 'not-configured';
export type PairKey = `${SourceLocale}>${LocaleCode}`;
export type RouteTable = Readonly<Record<PairKey, Route>>;

export const pairKey = (pair: LanguagePair): PairKey => `${pair.source}>${pair.target}`;

/**
 * Every cross-language pair runs on the phone with ML Kit (D-053). OpenRouter stays deferred (D-030).
 * Same-language keys are never routed: planTranslation skips them.
 */
export const DEFAULT_ROUTE_TABLE: RouteTable = Object.freeze({
  'en>en': 'not-configured',
  'en>hi': 'on-device',
  'en>kn': 'on-device',
  'hi>en': 'on-device',
  'hi>hi': 'not-configured',
  'hi>kn': 'on-device',
});
