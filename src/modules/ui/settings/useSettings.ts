import { useLocaleSettings } from '../../locale';

/** The settings screen's view of the saved settings. Saving goes through the locale settings store. */
export function useSettings() {
  return useLocaleSettings();
}
