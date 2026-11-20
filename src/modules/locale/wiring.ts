import { createOnDeviceProvider } from './adapters/on-device';
import type { OnDeviceEngine } from './adapters/on-device';
import { createMlKitTranslateEngine } from './adapters/mlkit-translate';
import { DEFAULT_ROUTE_TABLE } from './route-table';
import { createTranslationService } from './service';
import type { TranslationService } from './service';
import type { LocaleCode } from '../shared';

/** Service limits for the on-device route (D-053). Values are first guesses; no G2 run has measured them. */
const PROVISIONAL_LIMITS = {
  // Long enough for a first call that waits on a model download; a ready model answers in well under a second.
  onDeviceTimeoutMs: 30_000,
  maxStringsPerRequest: 50,
  maxCharsPerRequest: 5_000,
  cacheMaxEntries: 200,
} as const;

let service: TranslationService | undefined;
let boundEngine: OnDeviceEngine | null = null;
const prepared = new Set<string>();

/**
 * The app's translation service. Binds ML Kit on-device translation when the native module is in the build;
 * without it (Jest) every pair answers TR_NOT_CONFIGURED with no network. Tests pass their own engine.
 */
export function getTranslationService(engine?: OnDeviceEngine): TranslationService {
  if (!service || engine) {
    const onDevice = engine ?? createMlKitTranslateEngine();
    boundEngine = onDevice;
    service = createTranslationService({
      routes: DEFAULT_ROUTE_TABLE,
      onDevice: onDevice ? createOnDeviceProvider(onDevice) : null,
      clock: () => Date.now(),
      limits: PROVISIONAL_LIMITS,
    });
  }
  return service;
}

/**
 * Starts the one-time model downloads for every source the camera reads into `target`, so the first labels do not
 * wait on them. Call only after the privacy note is acknowledged. Safe to call often: each pair starts once.
 */
export function prepareTranslation(target: LocaleCode): void {
  getTranslationService();
  const engine = boundEngine;
  if (!engine) return;
  for (const source of ['en', 'hi'] as const) {
    const key = `${source}>${target}`;
    if (source === target || prepared.has(key)) continue;
    prepared.add(key);
    void engine.downloadModel({ source, target }).then((r) => {
      if (!r.ok) prepared.delete(key);
    });
  }
}
