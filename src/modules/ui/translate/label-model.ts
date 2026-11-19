import type { SendPlan } from '../../locale';
import type { FrameId, LocaleCode, Result, TrErrorCode, TranslationOutcome } from '../../shared';

// Label content per source line (design.md, "Label model"). Pure: no React, no network.

export type PlanEntry = SendPlan & { readonly id: string };

export type LabelContent =
  /** recognizedText is kept so a failure can still show the source text (R9.4). */
  | { readonly state: 'pending'; readonly reason: 'translating' | 'downloading-language-data'; readonly recognizedText: string }
  | { readonly state: 'translated'; readonly origin: 'provider'; readonly text: string; readonly providerId: string }
  | { readonly state: 'translated'; readonly origin: 'same-language' | 'not-sent'; readonly text: string }
  | { readonly state: 'failed'; readonly code: TrErrorCode | 'PRIVACY_NOT_ACKNOWLEDGED'; readonly recognizedText: string }
  | { readonly state: 'unsupported' };

export type TranslationState = {
  readonly frameId: FrameId | null;
  readonly target: LocaleCode;
  /** By source id, one entry per line of the shown result. */
  readonly labels: Readonly<Record<string, LabelContent>>;
};

export type TranslationAction =
  | {
      readonly type: 'result-applied';
      readonly frameId: FrameId;
      readonly plan: readonly PlanEntry[];
      readonly gated: boolean;
      readonly target: LocaleCode;
    }
  | {
      readonly type: 'translation-settled';
      readonly frameId: FrameId;
      readonly target: LocaleCode;
      readonly ids: readonly string[];
      readonly outcomes: Result<readonly TranslationOutcome[], TrErrorCode>;
    }
  | { readonly type: 'download-state'; readonly frameId: FrameId; readonly ids: readonly string[]; readonly downloading: boolean }
  | { readonly type: 'retry'; readonly frameId: FrameId; readonly ids: readonly string[] }
  | { readonly type: 'target-changed'; readonly target: LocaleCode; readonly plan: readonly PlanEntry[] }
  | { readonly type: 'privacy-acknowledged'; readonly plan: readonly PlanEntry[] }
  | { readonly type: 'still-dismissed' };

export const EMPTY_TRANSLATION: TranslationState = { frameId: null, target: 'en', labels: {} };

function fromPlan(plan: readonly PlanEntry[], gated: boolean): Record<string, LabelContent> {
  const labels: Record<string, LabelContent> = {};
  for (const entry of plan) {
    if (entry.kind === 'send') {
      labels[entry.id] = gated
        ? { state: 'failed', code: 'PRIVACY_NOT_ACKNOWLEDGED', recognizedText: entry.text }
        : { state: 'pending', reason: 'translating', recognizedText: entry.text };
    } else if (entry.reason === 'unsupported-script' || entry.text === null) {
      labels[entry.id] = { state: 'unsupported' };
    } else {
      labels[entry.id] = {
        state: 'translated',
        origin: entry.reason === 'same-language' ? 'same-language' : 'not-sent',
        text: entry.text,
      };
    }
  }
  return labels;
}

function replan(state: TranslationState, plan: readonly PlanEntry[], target: LocaleCode, gated: boolean): TranslationState {
  return { frameId: state.frameId, target, labels: fromPlan(plan, gated) };
}

/** Actions for another frame, or a settled result for another target, return the same state object. */
export function translationReducer(state: TranslationState, action: TranslationAction): TranslationState {
  switch (action.type) {
    case 'result-applied':
      return { frameId: action.frameId, target: action.target, labels: fromPlan(action.plan, action.gated) };

    case 'translation-settled': {
      if (state.frameId !== action.frameId || state.target !== action.target) return state;
      const labels = { ...state.labels };
      const outcomes = action.outcomes;
      action.ids.forEach((id, i) => {
        const current = labels[id];
        if (!current || current.state !== 'pending') return;
        const recognizedText = current.recognizedText;
        if (!outcomes.ok) {
          labels[id] = { state: 'failed', code: outcomes.error, recognizedText };
          return;
        }
        const outcome = outcomes.value[i];
        if (!outcome) {
          labels[id] = { state: 'failed', code: 'TR_PROVIDER_ERROR', recognizedText };
        } else if (outcome.ok) {
          labels[id] = { state: 'translated', origin: 'provider', text: outcome.value.text, providerId: outcome.value.providerId };
        } else {
          labels[id] = { state: 'failed', code: outcome.error, recognizedText };
        }
      });
      return { ...state, labels };
    }

    case 'download-state': {
      if (state.frameId !== action.frameId) return state;
      const labels = { ...state.labels };
      for (const id of action.ids) {
        const current = labels[id];
        if (current?.state === 'pending') {
          labels[id] = { ...current, reason: action.downloading ? 'downloading-language-data' : 'translating' };
        }
      }
      return { ...state, labels };
    }

    case 'retry': {
      if (state.frameId !== action.frameId) return state;
      const labels = { ...state.labels };
      for (const id of action.ids) {
        const current = labels[id];
        if (current?.state === 'failed') labels[id] = { state: 'pending', reason: 'translating', recognizedText: current.recognizedText };
      }
      return { ...state, labels };
    }

    case 'target-changed':
      return replan(state, action.plan, action.target, false);

    case 'privacy-acknowledged':
      return replan(state, action.plan, state.target, false);

    case 'still-dismissed':
      return state.frameId === null ? state : { ...EMPTY_TRANSLATION, target: state.target };
  }
}
