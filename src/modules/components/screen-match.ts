import type { OcrResult } from '../shared';
import type { MachineFixture } from './fixture-types';
import { tm01Fixture } from './fixtures/tm-01';
import { normalizeAnchorText } from './identify';
import { SCREEN_MARGIN, SCREEN_MIN_TEXTS } from './thresholds';

export type ScreenMatch =
  | { readonly kind: 'matched'; readonly screenId: string; readonly frameId: string }
  | { readonly kind: 'cannot-tell'; readonly frameId: string };

/** Normalized texts of the Latin and Devanagari lines. OCR text is data only. */
export function readableTexts(ocr: OcrResult): string[] {
  const out: string[] = [];
  for (const line of ocr.lines) {
    if (line.script !== 'unsupported') out.push(normalizeAnchorText(line.text));
  }
  return out;
}

/**
 * Pure, deterministic, never throws. `cannot-tell` for no candidate, a tie, OCR_LOW_QUALITY,
 * or unset thresholds (safe direction).
 */
export function matchScreen(
  ocr: OcrResult,
  fixture: MachineFixture = tm01Fixture,
  minTexts: number | undefined = SCREEN_MIN_TEXTS,
  margin: number | undefined = SCREEN_MARGIN,
): ScreenMatch {
  const cannot: ScreenMatch = { kind: 'cannot-tell', frameId: ocr.frameId };
  if (ocr.qualityFlag === 'OCR_LOW_QUALITY') return cannot;
  if (
    minTexts === undefined || margin === undefined ||
    !Number.isFinite(minTexts) || !Number.isFinite(margin)
  ) {
    return cannot;
  }
  const seen = new Set(readableTexts(ocr));
  const scored = fixture.screens
    .map((s) => ({
      id: s.id,
      count: new Set(s.identifyingTexts.map(normalizeAnchorText).filter((t) => seen.has(t))).size,
    }))
    .filter((s) => s.count >= minTexts && s.count > 0)
    .sort((a, b) => b.count - a.count);
  const best = scored[0];
  if (best === undefined) return cannot;
  const second = scored[1];
  if (second !== undefined && best.count - second.count < margin) return cannot;
  return { kind: 'matched', screenId: best.id, frameId: ocr.frameId };
}
