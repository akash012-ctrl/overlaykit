import type { LocaleSettings } from './settings-store';
import { DEFAULT_SETTINGS } from './settings-store';

/** The one small in-memory copy of the saved settings, so t() and the hook agree. */
export type SettingsSnapshot = { readonly loaded: boolean; readonly settings: LocaleSettings };

let snapshot: SettingsSnapshot = { loaded: false, settings: DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

export const getSettingsSnapshot = (): SettingsSnapshot => snapshot;

export function setSettingsSnapshot(next: SettingsSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
