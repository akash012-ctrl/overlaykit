import type { UnsupportedLineInput, UnsupportedScriptThresholds } from '../unsupported-rule';
import { isUnsupportedLine, minorityScriptFraction, symbolFraction } from '../unsupported-rule';

// Thresholds chosen for this test only. The real values are set by the G1a
// spike from CARD-KN captures and recorded in docs/DECISIONS.md (OQ-5).
const T: UnsupportedScriptThresholds = {
  maxLineConfidence: 0.6,
  minSymbolFraction: 0.5,
  minMinorityScriptFraction: 0.3,
  languages: ['kn', 'ta'],
};

function line(text: string, fields: Partial<UnsupportedLineInput> = {}): UnsupportedLineInput {
  return { text, confidence: undefined, language: null, supportedScripts: ['latin', 'devanagari'], ...fields };
}

describe('symbolFraction and minorityScriptFraction', () => {
  it('counts symbols over non-whitespace code points, with digits not counted as symbols', () => {
    expect(symbolFraction('A#')).toBe(0.5);
    expect(symbolFraction('20')).toBe(0);
    expect(symbolFraction('₹ 20')).toBeCloseTo(1 / 3, 12);
    expect(symbolFraction('   ')).toBe(0);
  });

  it('is the smaller script count over the Latin plus Devanagari count', () => {
    expect(minorityScriptFraction('AAAAAAAकखग')).toBeCloseTo(0.3, 12);
    expect(minorityScriptFraction('Ticket')).toBe(0);
    expect(minorityScriptFraction('20')).toBe(0);
  });
});

describe('isUnsupportedLine', () => {
  it('is false for plain English and Hindi lines', () => {
    expect(isUnsupportedLine(line('Buy ticket'), T)).toBe(false);
    expect(isUnsupportedLine(line('टिकट खरीदें'), T)).toBe(false);
  });

  it('is true when the text is classified unsupported', () => {
    expect(isUnsupportedLine(line('ಟಿಕೆಟ್ ಖರೀದಿಸಿ'), T)).toBe(true);
  });

  it('is true for a script the engine does not declare', () => {
    expect(isUnsupportedLine(line('टिकट', { supportedScripts: ['latin'] }), T)).toBe(true);
    expect(isUnsupportedLine(line('टिकट', { supportedScripts: ['latin', 'devanagari'] }), T)).toBe(false);
  });

  it.each([
    ['kn', true],
    ['kn-IN', true],
    ['KN', true],
    ['ta', true],
    ['und', false],
    ['en', false],
    ['hi', false],
  ])('engine language %s gives %s', (language, expected) => {
    expect(isUnsupportedLine(line('Buy ticket', { language }), T)).toBe(expected);
  });

  describe('garble check: symbol fraction', () => {
    it('is unsupported at the threshold and supported below it', () => {
      expect(isUnsupportedLine(line('A#'), T)).toBe(true); // 1 of 2 = 0.5
      expect(isUnsupportedLine(line('AB#'), T)).toBe(false); // 1 of 3 ≈ 0.33
    });

    it('is off when its threshold is null', () => {
      expect(isUnsupportedLine(line('A#'), { ...T, minSymbolFraction: null })).toBe(false);
    });
  });

  describe('garble check: minority-script fraction', () => {
    it('is unsupported at the threshold and supported below it', () => {
      expect(isUnsupportedLine(line('AAAAAAAकखग'), T)).toBe(true); // 3 of 10 = 0.3
      expect(isUnsupportedLine(line('AAAAAAAAकख'), T)).toBe(false); // 2 of 10 = 0.2
    });

    it('is off when its threshold is null', () => {
      expect(isUnsupportedLine(line('AAAAAAAकखग'), { ...T, minMinorityScriptFraction: null })).toBe(false);
    });
  });

  describe('garble check: line confidence', () => {
    it('counts a garbled line only below the confidence threshold', () => {
      expect(isUnsupportedLine(line('A#', { confidence: 0.59 }), T)).toBe(true);
      expect(isUnsupportedLine(line('A#', { confidence: 0.6 }), T)).toBe(false);
    });

    it('counts a garbled line when the engine gives no confidence', () => {
      expect(isUnsupportedLine(line('A#', { confidence: undefined }), T)).toBe(true);
    });

    it('has no confidence condition when its threshold is null', () => {
      expect(isUnsupportedLine(line('A#', { confidence: 0.99 }), { ...T, maxLineConfidence: null })).toBe(true);
    });

    it('does not make a clean line unsupported at low confidence', () => {
      expect(isUnsupportedLine(line('Buy ticket', { confidence: 0.1 }), T)).toBe(false);
    });
  });
});
