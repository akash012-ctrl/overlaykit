import type { LanguagePair, LocaleCode, SourceLocale } from '../shared';

export type Route = 'on-device' | 'cloud' | 'not-configured';
export type PairKey = `${SourceLocale}>${LocaleCode}`;
export type RouteTable = Readonly<Record<PairKey, Route>>;

export const pairKey = (pair: LanguagePair): PairKey => `${pair.source}>${pair.target}`;

/**
 * No pair has passed the G2 evaluation yet (task 4), and OpenRouter is deferred (D-030),
 * so every pair is not-configured. Task 4.3 replaces these values and records them in DECISIONS.md.
 * Same-language keys are never routed: planTranslation skips them.
 */
export const DEFAULT_ROUTE_TABLE: RouteTable = Object.freeze({
  'en>en': 'not-configured',
  'en>hi': 'not-configured',
  'en>kn': 'not-configured',
  'hi>en': 'not-configured',
  'hi>hi': 'not-configured',
  'hi>kn': 'not-configured',
});
