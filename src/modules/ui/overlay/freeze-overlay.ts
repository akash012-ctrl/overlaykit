import type { TranslationOutcome } from '../../locale';
import type { FrameId, FrameRef, OcrLine, OcrResult, TrErrorCode } from '../../shared';

// Freeze-frame overlay state (design.md, "Label state and freeze-frame overlay
// reducer"). Pure. Stores image-space lines only: view positions are derived
// on every render by build-items.ts and never stored (DD-6).

/** Exactly one per label (R17.7, QE-3). */
export type LabelState =
  | { readonly kind: 'pending' }
  /** Only from an ok TranslationProvider outcome (R17.8). Unreachable in spec A. */
  | { readonly kind: 'translated'; readonly text: string; readonly providerId: string }
  | { readonly kind: 'failed'; readonly code: TrErrorCode }
  | { readonly kind: 'unsupported'; readonly code: 'OCR_UNSUPPORTED_SCRIPT' };

export type OverlaySource = {
  /** `${frameId}/${lineIndex}` */
  readonly id: string;
  /** The frameId of the OcrResult the line came from (R15.1). */
  readonly frameId: FrameId;
  /** Image space. */
  readonly line: OcrLine;
  readonly label: LabelState;
};

export type FreezeOverlayState = {
  readonly shown: FrameRef | null;
  readonly lowQuality: boolean;
  readonly sources: readonly OverlaySource[];
};

export type FreezeOverlayAction =
  /** Replaces any shown still: its sources are removed first (R15.6). */
  | { readonly type: 'still-shown'; readonly frame: FrameRef }
  /** Ignored unless result.frameId is the shown still (R15.7). */
  | { readonly type: 'result-applied'; readonly result: OcrResult }
  | {
      readonly type: 'translation-settled';
      readonly frameId: FrameId;
      readonly outcomes: readonly { readonly id: string; readonly outcome: TranslationOutcome }[];
    }
  /** Removes every source (R15.5). */
  | { readonly type: 'still-dismissed' }
  /** App moved to the background (R4.7). */
  | { readonly type: 'cleared' };

export const EMPTY_FREEZE_OVERLAY: FreezeOverlayState = { shown: null, lowQuality: false, sources: [] };

function sourceId(frameId: FrameId, lineIndex: number): string {
  return `${frameId}/${lineIndex}`;
}

/** Actions for a frameId that isn't shown return the same state object. */
export function freezeOverlayReducer(state: FreezeOverlayState, action: FreezeOverlayAction): FreezeOverlayState {
  switch (action.type) {
    case 'still-shown':
      return { shown: action.frame, lowQuality: false, sources: [] };

    case 'result-applied': {
      const { result } = action;
      // One result per still: a late, foreign or repeated result changes nothing.
      if (!state.shown || result.frameId !== state.shown.frameId || state.sources.length > 0) {
        return state;
      }
      return {
        shown: state.shown,
        lowQuality: result.qualityFlag === 'OCR_LOW_QUALITY',
        sources: result.lines.map((line, index) => ({
          id: sourceId(result.frameId, index),
          frameId: result.frameId,
          line,
          label: line.script === 'unsupported' ? { kind: 'unsupported', code: line.code } : { kind: 'pending' },
        })),
      };
    }

    case 'translation-settled': {
      if (!state.shown || action.frameId !== state.shown.frameId) return state;
      const outcomes = new Map(action.outcomes.map(({ id, outcome }) => [id, outcome]));
      let changed = false;
      const sources = state.sources.map((source): OverlaySource => {
        const outcome = outcomes.get(source.id);
        // Only pending labels settle; unsupported lines were never sent (R17.4).
        if (!outcome || source.label.kind !== 'pending') return source;
        changed = true;
        const label: LabelState = outcome.ok
          ? { kind: 'translated', text: outcome.value.text, providerId: outcome.value.providerId }
          : { kind: 'failed', code: outcome.error };
        return { ...source, label };
      });
      return changed ? { ...state, sources } : state;
    }

    case 'still-dismissed':
    case 'cleared':
      return state.shown === null && state.sources.length === 0 ? state : EMPTY_FREEZE_OVERLAY;
  }
}

/**
 * The texts to send for one result: readable lines only, once each, in line
 * order (R17.3, R17.4). ids match the sources result-applied creates.
 */
export function translationRequestFor(result: OcrResult): { readonly ids: readonly string[]; readonly texts: readonly string[] } {
  const ids: string[] = [];
  const texts: string[] = [];
  result.lines.forEach((line, index) => {
    if (line.script !== 'unsupported') {
      ids.push(sourceId(result.frameId, index));
      texts.push(line.text);
    }
  });
  return { ids, texts };
}
