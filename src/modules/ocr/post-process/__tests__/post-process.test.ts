import type { RawOcrLine } from '../..';
import type { FrameRef } from '../../../shared';
import type { EngineTraits, OcrThresholds } from '../post-process';
import { postProcess } from '../post-process';

// Hand-built raw lines (task 5.3). No recorded OCR snapshot exists yet; task
// 15.2 adds the snapshot-based tests and Properties 9 and 10.

const FRAME: FrameRef = {
  frameId: 'still-7',
  capturedAtMs: 1234.5,
  size: { width: 3000, height: 4000 },
  source: 'still',
  mirrored: false,
  pixels: { kind: 'file', uri: 'file:///cache/overlaykit-stills/still-7.jpg' },
};

const ENGINE: EngineTraits = { supportedScripts: ['latin', 'devanagari'], confidenceScale: 'percent' };

// Thresholds chosen for this test only. The real values are set by the G1a
// spike and recorded in docs/DECISIONS.md (OQ-5).
const T: OcrThresholds = {
  zeroAreaEpsilonPx2: 1e-3,
  lowQuality: { minTotalChars: 4, minMeanConfidence: 0.5, minMedianLineHeightPx: 10 },
  unsupported: { maxLineConfidence: null, minSymbolFraction: 0.6, minMinorityScriptFraction: 0.4, languages: ['kn'] },
};

function raw(text: string, top: number, fields: Partial<RawOcrLine> = {}): RawOcrLine {
  return {
    text,
    corners: [
      { x: 100, y: top },
      { x: 900, y: top },
      { x: 900, y: top + 80 },
      { x: 100, y: top + 80 },
    ],
    box: null,
    confidence: 90,
    language: null,
    ...fields,
  };
}

function okValue(result: ReturnType<typeof postProcess>) {
  if (!result.ok) throw new Error(`expected an OcrResult, got ${result.error}`);
  return result.value;
}

describe('postProcess', () => {
  it('copies frameId and capturedAtMs from the frame and uses its size as the image size', () => {
    const result = okValue(postProcess([raw('TICKETS', 100)], FRAME, ENGINE, T));
    expect(result.frameId).toBe('still-7');
    expect(result.capturedAtMs).toBe(1234.5);
    expect(result.imageSize).toEqual({ width: 3000, height: 4000 });
  });

  it('gives each readable line its script, quad and 0..1 confidence, in input order', () => {
    const result = okValue(postProcess([raw('TICKETS', 100), raw('टिकट', 300, { confidence: 75 })], FRAME, ENGINE, T));
    expect(result.lines).toEqual([
      { script: 'latin', text: 'TICKETS', quad: raw('TICKETS', 100).corners, confidence: 0.9 },
      { script: 'devanagari', text: 'टिकट', quad: raw('टिकट', 300).corners, confidence: 0.75 },
    ]);
    expect(result.excludedLineCount).toBe(0);
    expect(result.qualityFlag).toBeUndefined();
  });

  it('NFC-normalizes and trims the text', () => {
    const result = okValue(postProcess([raw('  Cafe\u0301 \n', 100)], FRAME, ENGINE, T));
    expect(result.lines[0]).toMatchObject({ script: 'latin', text: 'Caf\u00e9' });
  });

  it('leaves the confidence absent when the engine gives none', () => {
    const noScale = postProcess([raw('TICKETS', 100)], FRAME, { ...ENGINE, confidenceScale: 'none' }, T);
    const nullValue = postProcess([raw('TICKETS', 100, { confidence: null })], FRAME, ENGINE, T);
    expect(okValue(noScale).lines[0]).not.toHaveProperty('confidence');
    expect(okValue(nullValue).lines[0]).not.toHaveProperty('confidence');
  });

  it('turns a Kannada line into an UnsupportedLine with no text', () => {
    const result = okValue(postProcess([raw('ಟಿಕೆಟ್', 100), raw('EXIT', 300)], FRAME, ENGINE, T));
    expect(result.lines[0]).toEqual({
      script: 'unsupported',
      code: 'OCR_UNSUPPORTED_SCRIPT',
      quad: raw('ಟಿಕೆಟ್', 100).corners,
      confidence: 0.9,
    });
    expect(result.lines[0]).not.toHaveProperty('text');
    expect(result.lines[1]).toMatchObject({ script: 'latin', text: 'EXIT' });
  });

  it('uses the engine-reported language as an input to the Unsupported-script rule', () => {
    const result = okValue(postProcess([raw('WAEIL', 100, { language: 'kn' }), raw('EXIT', 300)], FRAME, ENGINE, T));
    expect(result.lines[0].script).toBe('unsupported');
  });

  it('excludes and counts lines with a non-finite corner, zero area, no geometry or empty text', () => {
    const nanCorner = raw('NAN', 200, {
      corners: [{ x: Number.NaN, y: 200 }, { x: 900, y: 200 }, { x: 900, y: 280 }, { x: 100, y: 280 }],
    });
    const collinear = raw('LINE', 400, {
      corners: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }],
    });
    const noGeometry = raw('NONE', 500, { corners: null, box: null });
    const blank = raw('   ', 600);
    const result = okValue(
      postProcess([raw('FIRST', 100), nanCorner, collinear, noGeometry, blank, raw('LAST', 700)], FRAME, ENGINE, T),
    );
    expect(result.lines.map((l) => (l.script === 'unsupported' ? null : l.text))).toEqual(['FIRST', 'LAST']);
    expect(result.excludedLineCount).toBe(4);
  });

  it('builds the quad from the box when the engine gives no corners', () => {
    const result = okValue(
      postProcess([raw('TICKETS', 0, { corners: null, box: { left: 10, top: 20, right: 310, bottom: 70 } })], FRAME, ENGINE, T),
    );
    expect(result.lines[0].quad).toEqual([
      { x: 10, y: 20 },
      { x: 310, y: 20 },
      { x: 310, y: 70 },
      { x: 10, y: 70 },
    ]);
  });

  it('returns OCR_NO_TEXT for no lines, and when every line is excluded', () => {
    expect(postProcess([], FRAME, ENGINE, T)).toEqual({ ok: false, error: 'OCR_NO_TEXT' });
    expect(postProcess([raw('', 100), raw('X', 200, { corners: null })], FRAME, ENGINE, T)).toEqual({
      ok: false,
      error: 'OCR_NO_TEXT',
    });
  });

  it('attaches OCR_LOW_QUALITY without dropping or changing any line', () => {
    const lines = [raw('TICKETS', 100, { confidence: 30 }), raw('EXIT', 300, { confidence: 40 })];
    const flagged = okValue(postProcess(lines, FRAME, ENGINE, T)); // mean 0.35, below 0.5
    const strictless = okValue(
      postProcess(lines, FRAME, ENGINE, { ...T, lowQuality: { ...T.lowQuality, minMeanConfidence: 0.3 } }),
    );
    expect(flagged.qualityFlag).toBe('OCR_LOW_QUALITY');
    expect(strictless.qualityFlag).toBeUndefined();
    expect(flagged.lines).toEqual(strictless.lines);
    expect(flagged.excludedLineCount).toBe(strictless.excludedLineCount);
  });

  it('does not set the quality flag when every line is unsupported', () => {
    const result = okValue(postProcess([raw('ಟಿಕೆಟ್', 100, { confidence: 5 })], FRAME, ENGINE, T));
    expect(result.lines.every((l) => l.script === 'unsupported')).toBe(true);
    expect(result.qualityFlag).toBeUndefined();
  });
});
