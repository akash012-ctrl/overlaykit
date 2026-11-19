import { normalizeConfidence } from '../confidence';

describe('normalizeConfidence', () => {
  it('keeps a unit-scale value that is already in 0..1', () => {
    expect(normalizeConfidence(0, 'unit')).toBe(0);
    expect(normalizeConfidence(0.83, 'unit')).toBe(0.83);
    expect(normalizeConfidence(1, 'unit')).toBe(1);
  });

  it('divides a percent-scale value by 100', () => {
    expect(normalizeConfidence(83, 'percent')).toBeCloseTo(0.83, 12);
    expect(normalizeConfidence(100, 'percent')).toBe(1);
    expect(normalizeConfidence(0, 'percent')).toBe(0);
  });

  it('clamps values outside the scale', () => {
    expect(normalizeConfidence(1.2, 'unit')).toBe(1);
    expect(normalizeConfidence(-0.1, 'unit')).toBe(0);
    expect(normalizeConfidence(150, 'percent')).toBe(1);
    expect(normalizeConfidence(-5, 'percent')).toBe(0);
  });

  it.each([
    ['null', null],
    ['NaN', Number.NaN],
    ['+Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('is absent for %s', (_label, value) => {
    expect(normalizeConfidence(value, 'unit')).toBeUndefined();
    expect(normalizeConfidence(value, 'percent')).toBeUndefined();
  });

  it('is absent when the engine has no confidence scale', () => {
    expect(normalizeConfidence(0.9, 'none')).toBeUndefined();
  });
});
