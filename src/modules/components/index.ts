import type { ComponentKind, LocaleCode, MachineMatch, OcrResult, Result } from '../shared';
import { componentName, explain } from './explain';
import type { Explanation, ExplainError } from './explain';
import type { MachineFixtureB } from './fixture-types';
import { tm01Fixture } from './fixtures/tm-01';
import { identifyMachine } from './identify';
import { locateComponents } from './locate';
import type { LocateResult } from './locate';

export interface MachineService {
  /** Never throws. `none` with MCH_NOT_VERIFIED when the fixture is rejected by the validator. */
  identifyMachine(ocr: OcrResult): MachineMatch;
  /** Empty lists unless match.status is 'verified'. */
  locateComponents(match: MachineMatch, ocr: OcrResult): LocateResult;
  /** Authored text only. EXPLANATION_MISSING when the locale has none. */
  explain(componentId: string, locale: LocaleCode): Result<Explanation, ExplainError>;
  componentName(componentId: string, locale: LocaleCode): Result<string, ExplainError>;
  listComponents(): readonly { readonly id: string; readonly kind: ComponentKind }[];
}

export function createMachineService(fixture: MachineFixtureB = tm01Fixture): MachineService {
  return {
    identifyMachine: (ocr) => identifyMachine(fixture, ocr),
    locateComponents: (match, ocr) => locateComponents(fixture, match, ocr),
    explain: (id, locale) => explain(fixture, id, locale),
    componentName: (id, locale) => componentName(fixture, id, locale),
    listComponents: () => fixture.components.map((c) => ({ id: c.id, kind: c.kind })),
  };
}

export { validateFixture } from './validate-fixture';
export type { FixtureIssue, FixtureRule, MachineFixtureB, ReviewState } from './fixture-types';
export type { Explanation, ExplainError } from './explain';
export type { LocateResult } from './locate';
