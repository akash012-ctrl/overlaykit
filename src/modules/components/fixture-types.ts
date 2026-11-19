import type { ComponentKind, LocaleCode, Point, Quad } from '../shared';

export type ReviewState = 'unreviewed' | { readonly reviewer: string; readonly reviewedOn: string };

/** A machine fixture for Explore. No fixture is shipped: TM-01 was dropped (D-043). */
export type MachineFixtureB = {
  readonly id: 'TM-01';
  readonly version: number;
  readonly verification: {
    readonly verifiedBy: string;
    readonly verifiedOn: string;
    readonly method: 'on-site' | 'replica';
    readonly evidence: readonly string[];
  };
  readonly identification: {
    readonly anchors: readonly { readonly text: string; readonly pos: Point }[];
    readonly minAnchors: number;
    readonly minScore: number;
  };
  readonly components: readonly {
    readonly id: string;
    readonly kind: ComponentKind;
    /** Machine space. */
    readonly region: Quad;
    readonly name: Readonly<Record<LocaleCode, string>>;
    readonly explanation: Readonly<Record<LocaleCode, string>>;
  }[];
  /** D-031: 'unreviewed' is allowed and is the only state while no reviewer exists. */
  readonly review: Readonly<Record<'hi' | 'kn', ReviewState>>;
};

export type FixtureRule =
  | 'TOO_FEW_ANCHORS'
  | 'MISSING_LOCALE'
  | 'EMPTY_REVIEW'
  | 'BAD_REGION'
  | 'DUPLICATE_COMPONENT_ID'
  | 'BAD_THRESHOLD'
  | 'EMPTY_ANCHOR_TEXT'
  | 'NON_FINITE_POSITION';

export type FixtureIssue = { readonly rule: FixtureRule; readonly path: string };

export type MachineFixture = MachineFixtureB;


