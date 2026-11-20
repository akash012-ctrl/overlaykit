import { COLOR_PAIRS, MIN_TEXT_CONTRAST, contrastRatio, parseColor } from '../contrast';

describe('theme contrast', () => {
  it.each(COLOR_PAIRS.map((p) => [p.name, p] as const))('%s is at least 4.5:1', (_name, pair) => {
    expect(contrastRatio(pair.text, pair.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('composites rgba tokens over the backdrop', () => {
    expect(parseColor('rgba(0,0,0,0.5)', [255, 255, 255])).toEqual([128, 128, 128]);
    expect(parseColor('#1F63D8')).toEqual([31, 99, 216]);
  });
});
