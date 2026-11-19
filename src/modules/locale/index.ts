// Public API of locale. Spec A adds t(key), its string tables, the
// TranslationProvider interface and the not-configured adapter (OQ-1, OQ-2,
// D-033). No API key, no secure storage and no network code (R17.9, D-028).
export { getTargetLocale, getUiLocale, t } from './t';
export type { StringKey } from './strings/en';
export type { StringReview } from './strings/types';

export { getTranslationProvider, notConfiguredProvider } from './translation';
export type { TranslationProvider, TranslationRequest } from './translation';
export type { Translation, TranslationOutcome } from '../shared';

export { createTranslationService } from './service';
export type { ServiceLimits, TranslationService, TranslationServiceDeps } from './service';
export { planTranslation } from './plan';
export type { SendPlan } from './plan';
export { DEFAULT_ROUTE_TABLE, pairKey } from './route-table';
export type { PairKey, Route, RouteTable } from './route-table';

export { createOnDeviceProvider, subscribeOnDeviceStatus } from './adapters/on-device';
export type { OnDeviceEngine, OnDeviceStatus } from './adapters/on-device';
export { getTranslationService } from './wiring';
export type { LocaleSettings, SettingsStore } from './settings-store';
export { useLocaleSettings } from './use-locale-settings';
