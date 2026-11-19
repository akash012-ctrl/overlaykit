// The only file that imports the OCR binding (D-036).
import OverlaykitOcr, { type NativeLine } from '../../../../modules/overlaykit-ocr';

import type { Point } from '../../shared';
import type { OcrEngine } from '../engine';
import type { RawOcrLine } from '../types';

type Box = { left: number; top: number; right: number; bottom: number };

function boxOf(line: NativeLine): Box | null {
  if (line.box) return line.box;
  if (!line.corners || line.corners.length === 0) return null;
  const xs = line.corners.map((p) => p.x);
  const ys = line.corners.map((p) => p.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function intersectionOverUnion(a: Box, b: Box): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  const area = (r: Box) => (r.right - r.left) * (r.bottom - r.top);
  return inter / (area(a) + area(b) - inter);
}

const DEVANAGARI = /[\u0900-\u097F]/u;
const LATIN = /[A-Za-z\u00C0-\u024F]/u;

/** Lines from both recognizers that overlap this much are the same text read twice. */
export const RECOGNIZER_MERGE_MIN_IOU = 0.5;

/**
 * Merges the Latin and Devanagari recognizers' lines (design.md, "Two
 * recognizers"). When a Latin line and a Devanagari line overlap, the one
 * whose recognizer matches its own text's script is kept.
 */
export function mergeRecognizers(lines: readonly NativeLine[]): NativeLine[] {
  const latin = lines.filter((l) => l.recognizer === 'latin');
  const devanagari = lines.filter((l) => l.recognizer === 'devanagari');
  const dropped = new Set<NativeLine>();
  for (const d of devanagari) {
    const db = boxOf(d);
    if (!db) continue;
    for (const l of latin) {
      const lb = boxOf(l);
      if (!lb || dropped.has(l) || intersectionOverUnion(db, lb) < RECOGNIZER_MERGE_MIN_IOU) continue;
      // The Devanagari model also reads Latin, so a Devanagari read of Latin text loses.
      if (DEVANAGARI.test(d.text) && !LATIN.test(d.text)) dropped.add(l);
      else dropped.add(d);
    }
  }
  return lines.filter((l) => !dropped.has(l));
}

/**
 * ML Kit's corners run clockwise from the top-left of the text, which is the
 * shared Quad order (top start, top end, bottom end, bottom start).
 */
export function toRawLine(line: NativeLine): RawOcrLine {
  const corners: Point[] | null = line.corners && line.corners.length === 4 ? line.corners.map((p) => ({ x: p.x, y: p.y })) : null;
  return {
    text: line.text,
    corners,
    box: line.box,
    confidence: Number.isFinite(line.confidence) ? line.confidence : null,
    language: line.language && line.language !== 'und' ? line.language : null,
  };
}

export const mlKitEngine: OcrEngine = {
  id: 'mlkit-text-recognition-v2@16.0.1 (bundled latin + devanagari)',
  supportedScripts: ['latin', 'devanagari'],
  confidenceScale: 'unit',
  load: () => OverlaykitOcr.load(),
  async readStill(uri) {
    const result = await OverlaykitOcr.recognizeStill(uri);
    return mergeRecognizers(result.lines).map(toRawLine);
  },
};
