import type { CoverTransform } from '../../geometry';
import { frameQuadToView } from '../../geometry';
import type { PlanGuideState } from '../../guide';
import { normalizeText } from '../../guide';
import type { PlannerState } from '../../planner';
import type { FrameId, FrameRef, OcrResult, PlanAction, PlErrorCode, Quad } from '../../shared';
import { PL_ERROR_CODES } from '../../shared';

/** A 2D mark at the text's place in one frame. Not tracking, not AR. */
export type PlanHighlight = {
  /** The frame the quad was read from. */
  readonly frameId: FrameId;
  /** From geometry only. */
  readonly viewQuad: Quad;
  /** The target text as the camera read it. */
  readonly label: string;
};

export type PlanHighlightResult =
  | { readonly kind: 'drawn'; readonly highlight: PlanHighlight }
  | { readonly kind: 'not-in-view' };

const finiteQuad = (q: Quad): boolean => q.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

/**
 * Pure. The mark is drawn only when the target text is exactly one readable line of the latest frame.
 * Otherwise "Not in view" and no mark. Never a mark from an older frame, never a guess.
 * shortcut: no age limit on the frame while the capture cadence is unset (G4); then add the expiry.
 */
export function computePlanHighlight(input: {
  readonly target: { readonly text: string; readonly frameId: FrameId; readonly quad: Quad };
  readonly ocr: OcrResult | null;
  readonly frame: Pick<FrameRef, 'frameId' | 'size' | 'mirrored'> | null;
  readonly transform: CoverTransform | null;
}): PlanHighlightResult {
  const { target, ocr, frame, transform } = input;
  if (ocr === null || frame === null || transform === null || frame.frameId !== ocr.frameId) {
    return { kind: 'not-in-view' };
  }
  let quad: Quad | null = null;
  if (ocr.frameId === target.frameId) {
    quad = target.quad;
  } else {
    const wanted = normalizeText(target.text);
    const same = ocr.lines.filter((l) => l.script !== 'unsupported' && normalizeText(l.text) === wanted);
    const only = same.length === 1 ? same[0] : undefined;
    if (only !== undefined) quad = only.quad;
  }
  if (quad === null) return { kind: 'not-in-view' };
  const viewQuad = frameQuadToView(quad, frame, transform);
  if (!finiteQuad(viewQuad)) return { kind: 'not-in-view' };
  return { kind: 'drawn', highlight: { frameId: ocr.frameId, viewQuad, label: target.text } };
}

/** Readable lines of a frame as tappable goals, placed in view space by geometry. */
export type GoalLine = {
  readonly index: number;
  readonly text: string;
  readonly source: 'en' | 'hi';
  readonly viewQuad: Quad;
};

/** Pure. Every readable line goes in the list. A line gets a box only when geometry gives it a finite place in the latest frame. */
export function buildGoalLines(
  ocr: OcrResult | null,
  frame: Pick<FrameRef, 'frameId' | 'size' | 'mirrored'> | null,
  transform: CoverTransform | null,
): { readonly list: readonly { readonly index: number; readonly text: string; readonly source: 'en' | 'hi' }[]; readonly boxes: readonly GoalLine[] } {
  if (ocr === null) return { list: [], boxes: [] };
  const list: { index: number; text: string; source: 'en' | 'hi' }[] = [];
  const boxes: GoalLine[] = [];
  ocr.lines.forEach((line, index) => {
    if (line.script === 'unsupported') return;
    const source = line.script === 'devanagari' ? 'hi' : 'en';
    list.push({ index, text: line.text, source });
    if (frame !== null && transform !== null && frame.frameId === ocr.frameId) {
      const viewQuad = frameQuadToView(line.quad, frame, transform);
      if (finiteQuad(viewQuad)) boxes.push({ index, text: line.text, source, viewQuad });
    }
  });
  return { list, boxes };
}

export type PlanViewModel =
  | { readonly kind: 'model-gate'; readonly planner: PlannerState }
  | { readonly kind: 'goal' }
  | { readonly kind: 'planning'; readonly goal: string }
  | {
      readonly kind: 'step';
      readonly stepId: string;
      readonly stepNumber: number;
      readonly instruction: string;
      readonly action: PlanAction;
      readonly enterHint: string | null;
      /** True when the step has no observable change: only Done advances it. */
      readonly manual: boolean;
      readonly canBack: boolean;
      readonly checkpointNotSeen: boolean;
    }
  | { readonly kind: 'proposed-finish' }
  | { readonly kind: 'paused' }
  | { readonly kind: 'cannot-plan'; readonly code: PlErrorCode }
  | { readonly kind: 'completed' };

/**
 * Pure. Maps state to the view. It never decides a step: advance, pause and cancel come from the reducer.
 * With no model file the goal picker is replaced by the model gate, so a goal is never taken for nothing.
 */
export function buildPlanView(state: PlanGuideState, planner: PlannerState): PlanViewModel {
  switch (state.status) {
    case 'idle':
    case 'cancelled':
      return planner.kind === 'missing' || planner.kind === 'downloading' || planner.kind === 'failed'
        ? { kind: 'model-gate', planner }
        : { kind: 'goal' };
    case 'planning':
      return { kind: 'planning', goal: state.goal ?? '' };
    case 'showing': {
      const step = state.step;
      if (step === null) return { kind: 'planning', goal: state.goal ?? '' };
      return {
        kind: 'step',
        stepId: step.id,
        stepNumber: state.done.length + 1,
        instruction: step.instruction,
        action: step.action,
        enterHint: step.enterHint,
        manual: step.expectation === 'manual',
        canBack: state.done.length > 0,
        checkpointNotSeen: state.error === 'GD_CHECKPOINT_NOT_SEEN',
      };
    }
    case 'proposed-finish':
      return { kind: 'proposed-finish' };
    case 'paused':
      return { kind: 'paused' };
    case 'cannot-plan': {
      const code = state.error;
      return { kind: 'cannot-plan', code: PL_ERROR_CODES.find((c) => c === code) ?? 'PL_CANNOT_PLAN' };
    }
    case 'completed':
      return { kind: 'completed' };
  }
}
