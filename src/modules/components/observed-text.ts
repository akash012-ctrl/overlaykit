import type { OcrResult } from '../shared';
import type { MachineFixture } from './fixture-types';
import { tm01Fixture } from './fixtures/tm-01';
import { normalizeAnchorText } from './identify';
import { readableTexts } from './screen-match';

/** Counts for loss classification. Readable = Latin or Devanagari lines. */
export type ObservedText = { readonly readableLines: number; readonly anchorLines: number };

export function describeObservedText(ocr: OcrResult, fixture: MachineFixture = tm01Fixture): ObservedText {
  const anchors = new Set(fixture.identification.anchors.map((a) => normalizeAnchorText(a.text)));
  const texts = readableTexts(ocr);
  return { readableLines: texts.length, anchorLines: texts.filter((t) => anchors.has(t)).length };
}
