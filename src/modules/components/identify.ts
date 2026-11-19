import type { MachineMatch, OcrResult, Point } from '../shared';
import { matchLayout } from '../geometry';
import type { ObservedAnchor } from '../geometry';
import type { MachineFixtureB } from './fixture-types';
import { ROTATION_TOLERANCE_RAD } from './thresholds';
import { validateFixture } from './validate-fixture';

/** NFC, trim, collapse whitespace, lower-case (R18.8). */
export function normalizeAnchorText(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function centreOf(quad: readonly Point[]): Point {
  return {
    x: quad.reduce((s, p) => s + p.x, 0) / quad.length,
    y: quad.reduce((s, p) => s + p.y, 0) / quad.length,
  };
}

/**
 * Never throws, no network, no translation. Equal input gives equal output.
 * A single text never verifies: the validator requires minAnchors >= 2.
 */
export function identifyMachine(fixture: MachineFixtureB, ocr: OcrResult): MachineMatch {
  const none: MachineMatch = { status: 'none', frameId: ocr.frameId, code: 'MCH_NOT_VERIFIED' };
  if (validateFixture(fixture).length > 0) return none;

  const { anchors, minAnchors, minScore } = fixture.identification;
  const template = anchors.map((a, i) => ({ key: String(i), pos: a.pos }));
  const wanted = anchors.map((a) => normalizeAnchorText(a.text));

  const observed: ObservedAnchor[] = [];
  for (const line of ocr.lines) {
    if (line.script === 'unsupported') continue;
    const text = normalizeAnchorText(line.text);
    wanted.forEach((w, i) => {
      if (w === text) observed.push({ key: String(i), pos: centreOf(line.quad) });
    });
  }
  if (observed.length === 0) return none;

  const result = matchLayout(observed, template, minAnchors, ROTATION_TOLERANCE_RAD);
  const matchedAnchors = new Set(observed.map((o) => o.key)).size;
  if (
    result.kind === 'fit' &&
    result.matched.length >= minAnchors &&
    result.score >= minScore &&
    ocr.qualityFlag !== 'OCR_LOW_QUALITY'
  ) {
    return {
      status: 'verified',
      machineId: fixture.id,
      frameId: ocr.frameId,
      fit: result.fit,
      score: result.score,
      matchedAnchors: result.matched.length,
    };
  }
  return { status: 'ambiguous', frameId: ocr.frameId, code: 'MCH_AMBIGUOUS', matchedAnchors };
}
