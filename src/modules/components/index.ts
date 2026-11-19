import type { ComponentKind, LocaleCode, MachineMatch, OcrResult, Result } from '../shared';
import { componentName, explain } from './explain';
import type { Explanation, ExplainError } from './explain';
import type { MachineFixtureB } from './fixture-types';
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

/**
 * No machine is verified: this fixture has no anchors, so the validator rejects it and every match is 
one.
 * Explore then shows only label translations. A real fixture would be passed in by the caller.
 */
const NO_MACHINE: MachineFixtureB = {
  id: 'TM-01', // shortcut: shared MachineMatch still types machineId as 'TM-01'; widen when shared is open
  version: 0,
  verification: { verifiedBy: '', verifiedOn: '', method: 'replica', evidence: [] },
  identification: { anchors: [], minAnchors: 0, minScore: 0 },
  components: [],
  review: { hi: 'unreviewed', kn: 'unreviewed' },
};

export function createMachineService(fixture: MachineFixtureB = NO_MACHINE): MachineService {
  return {
    identifyMachine: (ocr) => identifyMachine(fixture, ocr),
    locateComponents: (match, ocr) => locateComponents(fixture, match, ocr),
    explain: (id, locale) => explain(fixture, id, locale),
    componentName: (id, locale) => componentName(fixture, id, locale),
    listComponents: () => fixture.components.map((c) => ({ id: c.id, kind: c.kind })),
  };
}

export { validateFixture } from './validate-fixture';
export type { FixtureIssue, FixtureRule, MachineFixture, MachineFixtureB, ReviewState } from './fixture-types';
export type { Explanation, ExplainError } from './explain';
export type { LocateResult } from './locate';


