import type { LocaleCode, Result } from '../shared';
import type { MachineFixtureB } from './fixture-types';

export type Explanation = { readonly componentId: string; readonly locale: LocaleCode; readonly text: string };
export type ExplainError = 'EXPLANATION_MISSING';

function authored(
  fixture: MachineFixtureB,
  componentId: string,
  locale: LocaleCode,
  field: 'name' | 'explanation',
): Result<string, ExplainError> {
  const text = fixture.components.find((c) => c.id === componentId)?.[field]?.[locale];
  // No fallback to another locale and no generation (R22.2, R22.3).
  return typeof text === 'string' && text.trim() !== ''
    ? { ok: true, value: text }
    : { ok: false, error: 'EXPLANATION_MISSING' };
}

export function explain(
  fixture: MachineFixtureB,
  componentId: string,
  locale: LocaleCode,
): Result<Explanation, ExplainError> {
  const r = authored(fixture, componentId, locale, 'explanation');
  return r.ok ? { ok: true, value: { componentId, locale, text: r.value } } : r;
}

export function componentName(
  fixture: MachineFixtureB,
  componentId: string,
  locale: LocaleCode,
): Result<string, ExplainError> {
  return authored(fixture, componentId, locale, 'name');
}
