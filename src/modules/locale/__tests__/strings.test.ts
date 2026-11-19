import { getTargetLocale, getUiLocale, t } from '..';
import type { StringKey } from '../strings/en';
import { EN_STRINGS } from '../strings/en';
import { HI_STRINGS } from '../strings/hi';
import { KN_STRINGS } from '../strings/kn';
import { formatTemplate, templateFor } from '../t';

const KEYS = Object.keys(EN_STRINGS) as StringKey[];
const DRAFTS = [
  ['hi', HI_STRINGS],
  ['kn', KN_STRINGS],
] as const;

function placeholdersOf(template: string): string[] {
  return Array.from(template.matchAll(/\{([A-Za-z0-9_]+)\}/g), (match) => match[1]).sort();
}

describe('string tables', () => {
  it.each(DRAFTS)('%s has exactly the en keys', (_locale, table) => {
    expect(Object.keys(table).sort()).toEqual([...KEYS].sort());
  });

  it.each(['en', 'hi', 'kn'] as const)('every %s value is a non-empty string', (locale) => {
    for (const key of KEYS) {
      expect(templateFor(locale, key).trim().length).toBeGreaterThan(0);
    }
  });

  it.each(DRAFTS)('every %s value is unreviewed and none claims a reviewer (D-031)', (_locale, table) => {
    for (const key of KEYS) {
      expect(table[key].review).toBe('unreviewed');
    }
  });

  it.each(DRAFTS)('%s uses the same placeholders as en for every key', (_locale, table) => {
    for (const key of KEYS) {
      expect({ key, placeholders: placeholdersOf(table[key].text) }).toEqual({
        key,
        placeholders: placeholdersOf(EN_STRINGS[key]),
      });
    }
  });

  it('keeps Kannada and Hindi drafts out of the en table', () => {
    for (const key of KEYS) {
      expect(EN_STRINGS[key]).not.toMatch(/[\u0900-\u097f\u0c80-\u0cff]/);
    }
  });
});

describe('t', () => {
  it('uses en as the UI language until spec B adds a setting (R20.4)', () => {
    expect(getUiLocale()).toBe('en');
    expect(getTargetLocale()).toBe('en');
    expect(t('ocr.noText')).toBe('No text found. Move closer or add light.');
  });

  it('fills placeholders', () => {
    expect(t('label.a11y', { text: 'TICKETS', state: 'Translation not available' })).toBe(
      'TICKETS. Translation not available',
    );
  });

  it('leaves a missing placeholder visible', () => {
    expect(t('label.a11y', { text: 'TICKETS' })).toBe('TICKETS. {state}');
    expect(formatTemplate('{a} and {b}')).toBe('{a} and {b}');
  });

  it('does not treat inherited object keys as parameters', () => {
    expect(formatTemplate('{toString}', {})).toBe('{toString}');
  });
});
