import type { LocateResult, MachineService } from '../../components';
import type { GuideState } from '../../guide';
import { currentStep } from '../../guide';
import type { CoverTransform } from '../../geometry';
import { frameQuadToView } from '../../geometry';
import type { FrameId, FrameRef, LocaleCode, MachineMatch, OcrResult, Quad } from '../../shared';
import { t } from '../../locale';

export type HighlightModel = {
  /** frameId of the Located component (R12.3). */
  readonly frameId: FrameId;
  readonly componentId: string;
  /** From geometry only (R12.2). */
  readonly viewQuad: Quad;
  /** Component name in the UI language, authored. */
  readonly label: string;
};

export type HighlightResult = {
  readonly highlight: HighlightModel | null;
  /** "Point the camera at the [component]" for CMP_NOT_VISIBLE, else null (R12.5). */
  readonly componentPrompt: string | null;
};

export type HighlightInput = {
  readonly state: GuideState;
  readonly match: MachineMatch | null;
  readonly ocr: OcrResult | null;
  readonly frame: Pick<FrameRef, 'frameId' | 'size' | 'mirrored'> | null;
  readonly transform: CoverTransform | null;
  readonly machine: Pick<MachineService, 'locateComponents' | 'componentName'>;
  readonly locale: LocaleCode;
};

const NONE: HighlightResult = { highlight: null, componentPrompt: null };

const finiteQuad = (q: Quad): boolean => q.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

/**
 * Pure. Recomputed on every render from state and the latest frame, so the previous Highlight goes
 * in the same render as a Step change (R12.10). Only the current Step's target is considered (R12.4).
 * `locateComponents` returns nothing unless the match is `verified` (R12.6, R12.7).
 */
export function computeHighlight(input: HighlightInput): HighlightResult {
  const { state, match, ocr, frame, transform, machine, locale } = input;
  if (state.status !== 'running' || match === null || ocr === null || frame === null || transform === null) return NONE;
  if (frame.frameId !== ocr.frameId) return NONE;
  const step = currentStep(state);
  if (step === null) return NONE;
  const located: LocateResult = machine.locateComponents(match, ocr);
  const name = machine.componentName(step.targetComponentId, locale);
  if (!name.ok) return NONE; // no authored name in this language: show nothing rather than guess
  const target = located.located.find((c) => c.id === step.targetComponentId);
  if (target !== undefined) {
    if (target.frameId !== ocr.frameId) return NONE;
    const viewQuad = frameQuadToView(target.quad, frame, transform);
    if (!finiteQuad(viewQuad)) return NONE;
    return {
      highlight: { frameId: target.frameId, componentId: target.id, viewQuad, label: name.value },
      componentPrompt: null,
    };
  }
  if (located.notVisible.some((n) => n.componentId === step.targetComponentId)) {
    return { highlight: null, componentPrompt: t('guide.pointCameraAt', { component: name.value }) };
  }
  return NONE;
}
