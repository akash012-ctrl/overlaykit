import type { GuideState, LoadResult } from '../../guide';
import { currentStep } from '../../guide';
import type { LocaleCode } from '../../shared';
import type { HighlightModel, HighlightResult } from './highlight-model';

export type GuideViewModel =
  | { readonly kind: 'looking' }
  | {
      readonly kind: 'picker';
      readonly workflows: readonly { readonly id: string; readonly title: string }[];
      readonly noneAvailable: boolean;
    }
  | { readonly kind: 'refusal' }
  | {
      readonly kind: 'step';
      readonly stepId: string;
      readonly stepNumber: number;
      readonly stepCount: number;
      readonly workflowTitle: string;
      readonly instruction: string;
      readonly expectedResult: string;
      readonly showDone: boolean;
      readonly showBack: boolean;
      readonly checkpointNotSeen: boolean;
      readonly highlight: HighlightModel | null;
      readonly componentPrompt: string | null;
    }
  | { readonly kind: 'paused' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'completed'; readonly workflowTitle: string };

export type WorkflowListing = readonly {
  readonly id: string;
  readonly title: Readonly<Record<LocaleCode, string>>;
  readonly result: LoadResult;
}[];

/**
 * Pure. Maps GuideState to what the screen shows. It reads state and never decides a Step:
 * advance, pause and cancel all come from the reducer.
 * `machineSeen`: whether any frame has been read since Guide opened.
 */
export function buildViewModel(input: {
  readonly state: GuideState;
  readonly machineSeen: boolean;
  readonly listing: WorkflowListing;
  readonly locale: LocaleCode;
  readonly highlight: HighlightResult;
}): GuideViewModel {
  const { state, locale } = input;
  switch (state.status) {
    case 'idle': {
      if (state.error === 'GD_UNSUPPORTED') return { kind: 'refusal' };
      if (!input.machineSeen && state.error === null) return { kind: 'looking' };
      const workflows = input.listing
        .filter((w) => w.result.ok)
        .map((w) => ({ id: w.id, title: w.title[locale] }));
      return { kind: 'picker', workflows, noneAvailable: workflows.length === 0 || state.error === 'GD_FIXTURE_INVALID' };
    }
    case 'paused':
      return { kind: 'paused' };
    case 'cancelled':
      return { kind: 'cancelled' };
    case 'completed':
      return { kind: 'completed', workflowTitle: state.workflow?.title[locale] ?? '' };
    case 'running': {
      const step = currentStep(state);
      if (state.workflow === null || step === null) return { kind: 'looking' };
      return {
        kind: 'step',
        stepId: step.id,
        stepNumber: state.stepIndex + 1,
        stepCount: state.workflow.steps.length,
        workflowTitle: state.workflow.title[locale],
        instruction: step.instruction[locale],
        expectedResult: step.expectedResult[locale],
        showDone: step.checkpoint.kind === 'manual',
        showBack: state.stepIndex > 0,
        checkpointNotSeen: state.error === 'GD_CHECKPOINT_NOT_SEEN',
        highlight: input.highlight.highlight,
        componentPrompt: input.highlight.componentPrompt,
      };
    }
  }
}
