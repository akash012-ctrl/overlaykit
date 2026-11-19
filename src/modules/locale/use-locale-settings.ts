import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { LocaleCode, PlannerChoice } from '../shared';
import { getSettingsSnapshot, setSettingsSnapshot, subscribeSettings } from './current-settings';
import { createExpoSettingsFilePort } from './settings-file-adapter';
import type { LiveConsent, LocaleSettings, SettingsStore } from './settings-store';
import { createSettingsStore } from './settings-store';

let store: SettingsStore | undefined;
let loading: Promise<void> | undefined;

/** The one settings store (native adapter instance). */
function getStore(): SettingsStore {
  store ??= createSettingsStore(createExpoSettingsFilePort());
  return store;
}

function loadOnce(): Promise<void> {
  loading ??= getStore()
    .load()
    .then((settings) => setSettingsSnapshot({ loaded: true, settings }));
  return loading;
}

/** Applies the change at once, saves it, and puts the old value back if the save fails. */
async function update(next: Partial<LocaleSettings>): Promise<void> {
  await loadOnce();
  const before = getSettingsSnapshot().settings;
  setSettingsSnapshot({ loaded: true, settings: { ...before, ...next } });
  const saved = await getStore().save(next);
  if (!saved.ok) setSettingsSnapshot({ loaded: true, settings: before });
}

export function useLocaleSettings(): {
  readonly loaded: boolean;
  readonly targetLocale: LocaleCode;
  /** Equal to targetLocale under OQ-1. */
  readonly uiLocale: LocaleCode;
  readonly privacyAcknowledged: boolean;
  readonly setTargetLocale: (locale: LocaleCode) => Promise<void>;
  readonly acknowledgePrivacy: () => Promise<void>;
  readonly plannerChoice: PlannerChoice;
  readonly liveConsent: LiveConsent | null;
  readonly setPlannerChoice: (choice: PlannerChoice) => Promise<void>;
  readonly setLiveConsent: (consent: LiveConsent | null) => Promise<void>;
} {
  const { loaded, settings } = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot);
  useEffect(() => {
    void loadOnce();
  }, []);
  const setTargetLocale = useCallback((targetLocale: LocaleCode) => update({ targetLocale }), []);
  const acknowledgePrivacy = useCallback(() => update({ privacyAcknowledged: true }), []);
  const setPlannerChoice = useCallback((plannerChoice: PlannerChoice) => update({ plannerChoice }), []);
  const setLiveConsent = useCallback((liveConsent: LiveConsent | null) => update({ liveConsent }), []);
  return {
    loaded,
    targetLocale: settings.targetLocale,
    uiLocale: settings.targetLocale,
    privacyAcknowledged: settings.privacyAcknowledged,
    setTargetLocale,
    acknowledgePrivacy,
    plannerChoice: settings.plannerChoice,
    liveConsent: settings.liveConsent,
    setPlannerChoice,
    setLiveConsent,
  };
}
