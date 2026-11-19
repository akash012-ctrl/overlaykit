import { contrastRatio } from '../contrast';
import {
  LABEL_COLOURS,
  LABEL_FONT_SIZE_SP,
  LABEL_LINE_HEIGHT_FACTOR,
  LABEL_PADDING_DP,
  LOW_QUALITY_COLOURS,
  MIN_TOUCH_TARGET_DP,
  OUTLINE_WIDTH_DP,
} from '../styles';

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 9);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    // #767676 on white is the usual "just passes AA" grey (4.54:1); #777777 just fails (4.48:1).
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('does not depend on the order of the colours', () => {
    expect(contrastRatio('#1B5E20', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#1B5E20'));
  });

  it('is NaN for anything that is not #RRGGBB', () => {
    expect(contrastRatio('white', '#000000')).toBeNaN();
    expect(contrastRatio('#FFF', '#000000')).toBeNaN();
  });
});

describe('overlay styles', () => {
  it.each(Object.entries(LABEL_COLOURS))('the %s label pair has contrast of at least 4.5:1 (R19.1)', (_state, pair) => {
    expect(contrastRatio(pair.text, pair.backing)).toBeGreaterThanOrEqual(4.5);
  });

  it('the low-quality pair has contrast of at least 4.5:1 (R8.5)', () => {
    expect(contrastRatio(LOW_QUALITY_COLOURS.text, LOW_QUALITY_COLOURS.backing)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses a different backing for low quality than for any label state', () => {
    for (const pair of Object.values(LABEL_COLOURS)) {
      expect(LOW_QUALITY_COLOURS.backing).not.toBe(pair.backing);
    }
  });

  it('pins the label font size at 14 sp, the smallest allowed (R19.2)', () => {
    expect(LABEL_FONT_SIZE_SP).toBe(14);
  });

  it('pins the touch target at 48 dp (R19.6)', () => {
    expect(MIN_TOUCH_TARGET_DP).toBe(48);
  });

  it('pins the proposed layout values', () => {
    expect(LABEL_LINE_HEIGHT_FACTOR).toBe(1.5);
    expect(LABEL_PADDING_DP).toBe(4);
    expect(OUTLINE_WIDTH_DP).toBe(2);
  });
});
