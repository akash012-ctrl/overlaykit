import type { OcrResult, ProposedStep } from '../../shared';
import { SCENE_OVERLAP_MIN } from './constants';
import { normalizeText } from './normalize';
import type { Expectation, ExpectationResult } from './types';

function lineSet(ocr: OcrResult): Set<string> {
  const set = new Set<string>();
  for (const line of ocr.lines) if (line.script !== 'unsupported') set.add(normalizeText(line.text));
  return set;
}

function unique(texts: readonly string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    const n = normalizeText(t);
    if (n !== '') out.add(n);
  }
  return [...out];
}

/**
 * Diffed against the planning frame (DD-4): `appear` keeps only text that was not there,
 * `disappear` keeps only text that was. Both empty means `manual`.
 */
export function buildExpectation(step: ProposedStep, planningFrame: OcrResult): Expectation {
  const before = lineSet(planningFrame);
  const appear = unique(step.appear).filter((t) => !before.has(t));
  const disappear = unique(step.disappear).filter((t) => before.has(t));
  return appear.length === 0 && disappear.length === 0 ? 'manual' : { appear, disappear };
}

/** `met` only if every appear line is present and every disappear line is absent. */
export function evaluateExpectation(exp: Expectation, ocr: OcrResult): ExpectationResult {
  if (exp === 'manual' || ocr.qualityFlag === 'OCR_LOW_QUALITY') return 'cannot-tell';
  const now = lineSet(ocr);
  const met = exp.appear.every((t) => now.has(t)) && exp.disappear.every((t) => !now.has(t));
  return met ? 'met' : 'not-met';
}

/** Fraction (0..1) of the baseline lines still seen in `ocr`. NaN when the baseline has no text. */
export function sceneOverlap(baselineLines: readonly string[], ocr: OcrResult): number {
  const base = unique(baselineLines);
  if (base.length === 0) return Number.NaN;
  const now = lineSet(ocr);
  return base.filter((t) => now.has(t)).length / base.length;
}

/** `cannot-tell` while SCENE_OVERLAP_MIN is unset (NaN) or the overlap is unknown: loss never fires. */
export function sceneVisible(
  baselineLines: readonly string[],
  ocr: OcrResult,
): 'seen' | 'lost' | 'cannot-tell' {
  const overlap = sceneOverlap(baselineLines, ocr);
  if (Number.isNaN(overlap) || Number.isNaN(SCENE_OVERLAP_MIN)) return 'cannot-tell';
  return overlap >= SCENE_OVERLAP_MIN ? 'seen' : 'lost';
}
