import { createOnDeviceProvider } from './adapters/on-device';
import type { OnDeviceEngine } from './adapters/on-device';
import { DEFAULT_ROUTE_TABLE } from './route-table';
import { createTranslationService } from './service';
import type { TranslationService } from './service';

/**
 * PROVISIONAL service limits. No G2 evaluation has run, so no pair is routed on-device and
 * these are never used for a real call. Task 4.3 replaces them and records them in DECISIONS.md.
 */
const PROVISIONAL_LIMITS = {
  onDeviceTimeoutMs: 10_000,
  maxStringsPerRequest: 50,
  maxCharsPerRequest: 5_000,
  cacheMaxEntries: 200,
} as const;

let service: TranslationService | undefined;

/**
 * The app's translation service. No on-device engine is bound yet (task 4.1 parked) and the
 * route table is all not-configured, so every call returns TR_NOT_CONFIGURED with no network.
 * To bind an engine: pass it here and set the routes from task 4.3.
 */
export function getTranslationService(engine?: OnDeviceEngine): TranslationService {
  if (!service || engine) {
    service = createTranslationService({
      routes: DEFAULT_ROUTE_TABLE,
      onDevice: engine ? createOnDeviceProvider(engine) : null,
      clock: () => Date.now(),
      limits: PROVISIONAL_LIMITS,
    });
  }
  return service;
}
