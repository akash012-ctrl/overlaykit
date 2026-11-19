import type { ComponentKind, LocaleCode, Point, Quad } from '../shared';

export type ReviewState = 'unreviewed' | { readonly reviewer: string; readonly reviewedOn: string };

/** The part of the machine fixture spec 02 fills. Spec C adds workflows and screens (CM-1). */
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

export type ScreenIssueRule = 'NO_SCREENS_FOR_CHECKPOINT' | 'EMPTY_SCREEN_TEXT' | 'DUPLICATE_SCREEN_ID';

export type FixtureIssue = { readonly rule: FixtureRule | ScreenIssueRule; readonly path: string };

export type LocalizedText = Readonly<Record<LocaleCode, string>>;

export type ScreenDef = {
  readonly id: string;
  /** Texts that identify the Screen. At least one. */
  readonly identifyingTexts: readonly string[];
};

export type Checkpoint =
  | { readonly kind: 'text-visible'; readonly text: string; readonly screenId?: string }
  | { readonly kind: 'manual' };

export type StepDef = {
  readonly id: string;
  readonly targetComponentId: string;
  readonly instruction: LocalizedText;
  readonly expectedResult: LocalizedText;
  readonly checkpoint: Checkpoint;
};

export type WorkflowReview =
  | { readonly status: 'unreviewed' }
  | { readonly status: 'reviewed'; readonly reviewer: string; readonly reviewedOn: string };

export type WorkflowDef = {
  readonly id: string;
  readonly title: LocalizedText;
  readonly steps: readonly StepDef[];
  /** Who performed this workflow on TM-01, when, and how. */
  readonly performed: { readonly by: string; readonly on: string; readonly method: 'on-site' | 'replica' };
  /** Review status of the hi and kn text (D-031). */
  readonly review: Readonly<Record<'hi' | 'kn', WorkflowReview>>;
  /** Marks that no text was generated or machine-translated. */
  readonly authored: true;
};

/** MachineFixtureB widened for Guide. identification and components are unchanged. */
export type MachineFixture = MachineFixtureB & {
  /** true for TM-01: printed panel plus screen images (D-029). */
  readonly simulated: boolean;
  readonly screens: readonly ScreenDef[];
  readonly workflows: readonly WorkflowDef[];
};
