import type { LocaleCode } from '../shared';
import { getSettingsSnapshot } from './current-settings';
import type { StringKey } from './strings/en';
import { EN_STRINGS } from './strings/en';
import { HI_STRINGS } from './strings/hi';
import { KN_STRINGS } from './strings/kn';

/** The saved target language ('en' until settings load), also the UI language (OQ-1). */
export function getUiLocale(): LocaleCode {
  return getSettingsSnapshot().settings.targetLocale;
}

/** The saved target language ('en' until settings load). */
export function getTargetLocale(): LocaleCode {
  return getSettingsSnapshot().settings.targetLocale;
}

/** The raw template for a key in one locale. */
export function templateFor(locale: LocaleCode, key: StringKey): string {
  switch (locale) {
    case 'hi':
      return HI_STRINGS[key].text;
    case 'kn':
      return KN_STRINGS[key].text;
    case 'en':
      return EN_STRINGS[key];
  }
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

/** Replaces {name} placeholders. A missing parameter leaves its placeholder visible. */
export function formatTemplate(template: string, params?: Readonly<Record<string, string | number>>): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
}

/** The UI string for a key in the current UI language (R20.1). */
export function t(key: StringKey, params?: Readonly<Record<string, string | number>>): string {
  return formatTemplate(templateFor(getUiLocale(), key), params);
}
