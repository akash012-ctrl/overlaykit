import type { Quad, ReadableLine } from '../../../shared';
import type { LowQualityThresholds } from '../low-quality-rule';
import { isLowQuality } from '../low-quality-rule';

// Thresholds chosen for this test only. The real values are set by the G1a
// spike from TM-01 captures at L3 and recorded in docs/DECISIONS.md (OQ-5).
const T: LowQualityThresholds = { minTotalChars: 6, minMeanConfidence: 0.5, minMedianLineHeightPx: 20 };

function box(top: number, height: number): Quad {
  return [
    { x: 0, y: top },
    { x: 200, y: top },
    { x: 200, y: top + height },
    { x: 0, y: top + height },
  ];
}

function line(text: string, fields: { height?: number; confidence?: number } = {}): ReadableLine {
  const base = { script: 'latin' as const, text, quad: box(0, fields.height ?? 40) };
  return fields.confidence === undefined ? base : { ...base, confidence: fields.confidence };
}

describe('isLowQuality', () => {
  it('is false with no readable line, because the unsupported state applies', () => {
    expect(isLowQuality([], true, T)).toBe(false);
    expect(isLowQuality([], false, T)).toBe(false);
  });

  describe('total character count', () => {
    it('is low quality below the minimum and not at it', () => {
      expect(isLowQuality([line('ABCDE', { confidence: 0.9 })], true, T)).toBe(true); // 5 characters
      expect(isLowQuality([line('ABC DEF', { confidence: 0.9 })], true, T)).toBe(false); // 6, the space doesn't count
    });

    it('applies on the heuristic path too', () => {
      expect(isLowQuality([line('ABCDE')], false, T)).toBe(true);
      expect(isLowQuality([line('ABCDEF')], false, T)).toBe(false);
    });
  });

  describe('with engine confidence (R9.2)', () => {
    it('is low quality when the mean confidence is below the minimum and not at it', () => {
      expect(isLowQuality([line('TICKETS', { confidence: 0.4 }), line('EXIT', { confidence: 0.58 })], true, T)).toBe(true); // mean 0.49
      expect(isLowQuality([line('TICKETS', { confidence: 0.4 }), line('EXIT', { confidence: 0.6 })], true, T)).toBe(false); // mean 0.5
    });

    it('averages only the lines that have a confidence', () => {
      expect(isLowQuality([line('TICKETS', { confidence: 0.9 }), line('EXIT')], true, T)).toBe(false);
    });

    it('ignores line height when confidence decides', () => {
      expect(isLowQuality([line('TICKETS', { confidence: 0.9, height: 5 })], true, T)).toBe(false);
    });

    it('falls back to the line-height heuristic when no line has a confidence', () => {
      expect(isLowQuality([line('TICKETS', { height: 5 })], true, T)).toBe(true);
    });
  });

  describe('without engine confidence (R9.3 heuristic)', () => {
    it('is low quality when the median line height is below the minimum and not at it', () => {
      expect(isLowQuality([line('TICKETS', { height: 19.9 })], false, T)).toBe(true);
      expect(isLowQuality([line('TICKETS', { height: 20 })], false, T)).toBe(false);
    });

    it('uses the mean of the two middle heights for an even line count', () => {
      const lines = [line('ONE', { height: 10 }), line('TWO', { height: 19 }), line('THREE', { height: 21 }), line('FOUR', { height: 60 })];
      expect(isLowQuality(lines, false, T)).toBe(false); // median (19 + 21) / 2 = 20
      const lower = [line('ONE', { height: 10 }), line('TWO', { height: 18 }), line('THREE', { height: 21 }), line('FOUR', { height: 60 })];
      expect(isLowQuality(lower, false, T)).toBe(true); // median 19.5
    });

    it('ignores confidence values when the engine has no confidence scale', () => {
      expect(isLowQuality([line('TICKETS', { confidence: 0.1, height: 40 })], false, T)).toBe(false);
    });
  });
});
