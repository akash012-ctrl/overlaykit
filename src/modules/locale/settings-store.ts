import type { LocaleCode, PlannerChoice, Result } from '../shared';
import type { SettingsFilePort } from './settings-file-adapter';

export type LocaleSettings = {
  /** Also the UI language and the Explanation language (OQ-1). */
  readonly targetLocale: LocaleCode;
  readonly privacyAcknowledged: boolean;
  /** Spec 05 (R15). Default 'on-device'. Only ui sets 'gemini-live', and only after a key and consent exist. */
  readonly plannerChoice: PlannerChoice;
  /** Spec 05 (R16.2). The consent text version the user accepted, or null (never accepted or declined). */
  readonly liveConsent: LiveConsent | null;
};

export type LiveConsent = { readonly version: number };

export const DEFAULT_SETTINGS: LocaleSettings = Object.freeze({ targetLocale: 'en', privacyAcknowledged: false, plannerChoice: 'on-device', liveConsent: null });

export interface SettingsStore {
  /** Defaults when the file is missing or unparsable, so a bad file never blocks start-up. */
  load(): Promise<LocaleSettings>;
  save(next: Partial<LocaleSettings>): Promise<Result<void, 'SETTINGS_WRITE_FAILED'>>;
}

const LOCALES: readonly LocaleCode[] = ['en', 'hi', 'kn'];

/** Keeps only known fields with valid values. Anything else falls back to the default. */
export function parseSettings(text: string | null): LocaleSettings {
  if (text === null) return DEFAULT_SETTINGS;
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
    const { targetLocale, privacyAcknowledged, plannerChoice, liveConsent } = raw as Record<string, unknown>;
    return {
      targetLocale: LOCALES.includes(targetLocale as LocaleCode) ? (targetLocale as LocaleCode) : DEFAULT_SETTINGS.targetLocale,
      privacyAcknowledged: privacyAcknowledged === true,
      plannerChoice: plannerChoice === 'gemini-live' ? 'gemini-live' : 'on-device',
      liveConsent: parseLiveConsent(liveConsent),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Holds no key and no image data. Writes are serialized so two saves never interleave. */
export function createSettingsStore(port: SettingsFilePort): SettingsStore {
  let queue: Promise<unknown> = Promise.resolve();
  const load = async () => parseSettings(await port.read());
  return {
    load,
    save(next) {
      const run = async (): Promise<Result<void, 'SETTINGS_WRITE_FAILED'>> => {
        const merged: LocaleSettings = { ...(await load()), ...next };
        const ok = await port.writeAtomic(JSON.stringify(merged));
        return ok ? { ok: true, value: undefined } : { ok: false, error: 'SETTINGS_WRITE_FAILED' };
      };
      const result = queue.then(run, run);
      queue = result;
      return result;
    },
  };
}

/** A bad or missing value means no consent. */
function parseLiveConsent(raw: unknown): LiveConsent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { version } = raw as Record<string, unknown>;
  return typeof version === 'number' && Number.isInteger(version) && version > 0 ? { version } : null;
}
