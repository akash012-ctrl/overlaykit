import * as fc from 'fast-check';

import type { FrameRef } from '../../../shared';
import type { OcrThresholds } from '../post-process';
import { postProcess } from '../post-process';
import { classifyScript } from '../script';

// Generated strings test the code-point classifier itself (design.md, Open
// design point 9). They are not OCR output.

type Range = readonly [number, number];
const fromRanges = (ranges: readonly Range[]) =>
  fc.oneof(...ranges.map(([min, max]) => fc.integer({ min, max }))).map((cp) => String.fromCodePoint(cp));

const latinLetter = fromRanges([
  [0x41, 0x5a],
  [0x61, 0x7a],
  [0xc0, 0xd6],
  [0xd8, 0xf6],
  [0xf8, 0x24f],
  [0x1e00, 0x1eff],
]);
const devanagari = fromRanges([
  [0x900, 0x97f],
  [0xa8e0, 0xa8ff],
  [0x1cd0, 0x1cff],
]);
const neutral = fromRanges([
  [0x20, 0x40],
  [0x5b, 0x60],
  [0x7b, 0x7e],
  [0xa0, 0xbf],
  [0xd7, 0xd7],
  [0xf7, 0xf7],
  [0x2000, 0x206f],
  [0x20a0, 0x20cf],
  [0x2190, 0x21ff],
]);
const kannada = fromRanges([[0xc80, 0xcff]]);

const mix = (parts: fc.Arbitrary<string[]>[]) =>
  fc.tuple(...parts).chain((arrays) => {
    const all = arrays.flat();
    return fc.shuffledSubarray(all, { minLength: all.length }).map((chars) => chars.join(''));
  });

const FRAME: FrameRef = {
  frameId: 'still-1',
  capturedAtMs: 0,
  size: { width: 1000, height: 1000 },
  source: 'still',
  mirrored: false,
  pixels: { kind: 'file', uri: 'file:///cache/overlaykit-stills/still-1.jpg' },
};

// Every garble sub-check off and no language list: only classifyScript decides.
const THRESHOLDS: OcrThresholds = {
  zeroAreaEpsilonPx2: 1e-3,
  lowQuality: { minTotalChars: 0, minMeanConfidence: 0, minMedianLineHeightPx: 0 },
  unsupported: { maxLineConfidence: null, minSymbolFraction: null, minMinorityScriptFraction: null, languages: [] },
};

describe('script classification properties', () => {
  // Feature: camera-ocr-geometry, Property 12: Script classification follows the code-point classes
  it('is latin for Latin letters with neutral characters', () => {
    const text = mix([fc.array(latinLetter, { minLength: 1, maxLength: 20 }), fc.array(neutral, { maxLength: 20 })]);
    fc.assert(fc.property(text, (t) => expect(classifyScript(t)).toBe('latin')), { numRuns: 300 });
  });

  it('is latin for neutral characters only', () => {
    fc.assert(
      fc.property(fc.array(neutral, { maxLength: 20 }).map((a) => a.join('')), (t) => expect(classifyScript(t)).toBe('latin')),
      { numRuns: 200 },
    );
  });

  it('is devanagari for Devanagari with neutral characters', () => {
    const text = mix([fc.array(devanagari, { minLength: 1, maxLength: 20 }), fc.array(neutral, { maxLength: 20 })]);
    fc.assert(fc.property(text, (t) => expect(classifyScript(t)).toBe('devanagari')), { numRuns: 300 });
  });

  // postProcess classifies the NFC form of the text, and NFC can change the
  // counts: क़ (U+0958) becomes क + ़ (U+0915 U+093C). So the postProcess check
  // compares with classifyScript of the normalized text (found by this property).
  it('is unsupported when other code points outnumber Latin and Devanagari, and postProcess drops the text', () => {
    const counts = fc.record({ latin: fc.nat(6), deva: fc.nat(6), extra: fc.integer({ min: 1, max: 8 }) });
    const text = counts.chain(({ latin, deva, extra }) =>
      mix([
        fc.array(latinLetter, { minLength: latin, maxLength: latin }),
        fc.array(devanagari, { minLength: deva, maxLength: deva }),
        fc.array(kannada, { minLength: latin + deva + extra, maxLength: latin + deva + extra }),
        fc.array(neutral, { maxLength: 6 }),
      ]),
    );
    fc.assert(
      fc.property(text, (t) => {
        expect(classifyScript(t)).toBe('unsupported');
        const corners = [
          { x: 10, y: 10 },
          { x: 500, y: 10 },
          { x: 500, y: 60 },
          { x: 10, y: 60 },
        ];
        const result = postProcess(
          [{ text: t, corners, box: null, confidence: null, language: null }],
          FRAME,
          { supportedScripts: ['latin', 'devanagari'], confidenceScale: 'none' },
          THRESHOLDS,
        );
        const normalized = t.normalize('NFC').trim();
        const script = classifyScript(normalized);
        const line =
          script === 'unsupported'
            ? { script, code: 'OCR_UNSUPPORTED_SCRIPT', quad: corners }
            : { script, text: normalized, quad: corners };
        expect(result).toEqual({
          ok: true,
          value: { frameId: 'still-1', capturedAtMs: 0, imageSize: FRAME.size, lines: [line], excludedLineCount: 0 },
        });
      }),
      { numRuns: 300 },
    );
  });
});
