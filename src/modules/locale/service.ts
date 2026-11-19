import type { LanguagePair, MonotonicClock, Result, Translation, TrErrorCode, TranslationOutcome } from '../shared';
import { splitBatches } from './batching';
import { createTranslationCache } from './cache';
import { collapseUniformFailure } from './collapse';
import { createRateGate } from './rate-gate';
import type { Route, RouteTable } from './route-table';
import { pairKey } from './route-table';
import type { TranslationProvider } from './translation';

export type ServiceLimits = {
  readonly onDeviceTimeoutMs: number;
  readonly maxStringsPerRequest: number;
  readonly maxCharsPerRequest: number;
  readonly cacheMaxEntries: number;
};

/**
 * shortcut: cloud routes (team proxy, user OpenRouter key) are DEFERRED by D-030, so a
 * `cloud` route resolves to TR_NOT_CONFIGURED. Add `team`, `user` and `keys` deps when D-030 is reversed.
 */
export type TranslationServiceDeps = {
  readonly routes: RouteTable;
  readonly onDevice: TranslationProvider | null;
  readonly clock: MonotonicClock;
  readonly limits: ServiceLimits;
};

export interface TranslationService {
  /**
   * One call per language pair. ok:false means every text failed the same way.
   * Otherwise one outcome per input, same order and count. Never throws.
   */
  translate(texts: readonly string[], pair: LanguagePair): Promise<Result<readonly TranslationOutcome[], TrErrorCode>>;
  routeFor(pair: LanguagePair): Route;
  /** Milliseconds until a rate-limited route may be tried again, or null. */
  retryAfterMs(): number | null;
  clearCache(): void;
}

const fail = (error: TrErrorCode): TranslationOutcome => ({ ok: false, error });

/** A timeout yields TR_TIMEOUT. A rejection, against the provider contract, yields TR_PROVIDER_ERROR. */
async function callWithTimeout(
  provider: TranslationProvider,
  texts: readonly string[],
  pair: LanguagePair,
  timeoutMs: number,
): Promise<readonly TranslationOutcome[]> {
  const failAll = (error: TrErrorCode) => texts.map(() => fail(error));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    const result = await Promise.race([provider.translate({ texts, source: pair.source, target: pair.target }), timeout]);
    if (result === 'timeout') return failAll('TR_TIMEOUT');
    return result.length === texts.length ? result : failAll('TR_PROVIDER_ERROR');
  } catch {
    return failAll('TR_PROVIDER_ERROR');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function createTranslationService(deps: TranslationServiceDeps): TranslationService {
  const cache = createTranslationCache(deps.limits.cacheMaxEntries);
  const gate = createRateGate(deps.clock);

  const routeFor = (pair: LanguagePair): Route => {
    const route = deps.routes[pairKey(pair)] ?? 'not-configured';
    return route === 'on-device' && deps.onDevice ? 'on-device' : 'not-configured';
  };

  async function translate(
    texts: readonly string[],
    pair: LanguagePair,
  ): Promise<Result<readonly TranslationOutcome[], TrErrorCode>> {
    if (texts.length === 0) return { ok: true, value: [] };
    if (pair.source === pair.target) return { ok: false, error: 'TR_UNSUPPORTED_PAIR' };
    const provider = deps.onDevice;
    if (routeFor(pair) !== 'on-device' || !provider) return { ok: false, error: 'TR_NOT_CONFIGURED' };
    if (!gate.isOpen()) return { ok: false, error: 'TR_RATE_LIMITED' };

    const outcomes: TranslationOutcome[] = new Array<TranslationOutcome>(texts.length);
    const misses: number[] = [];
    texts.forEach((text, i) => {
      const hit = cache.get(pair, text);
      if (hit) outcomes[i] = { ok: true, value: hit };
      else misses.push(i);
    });

    const { batches, tooLong } = splitBatches(
      misses.map((i) => texts[i] as string),
      deps.limits,
    );
    for (const k of tooLong) outcomes[misses[k] as number] = fail('TR_PROVIDER_ERROR');

    for (const batch of batches) {
      const indexes = batch.map((k) => misses[k] as number);
      if (!gate.isOpen()) {
        for (const i of indexes) outcomes[i] = fail('TR_RATE_LIMITED');
        continue;
      }
      const batchTexts = indexes.map((i) => texts[i] as string);
      const results = await callWithTimeout(provider, batchTexts, pair, deps.limits.onDeviceTimeoutMs);
      results.forEach((outcome, n) => {
        const i = indexes[n] as number;
        outcomes[i] = outcome;
        if (outcome.ok) cache.set(pair, texts[i] as string, outcome.value as Translation);
      });
    }
    return collapseUniformFailure(outcomes);
  }

  return {
    translate,
    routeFor,
    retryAfterMs: () => gate.retryAfterMs(),
    clearCache: () => cache.clear(),
  };
}
