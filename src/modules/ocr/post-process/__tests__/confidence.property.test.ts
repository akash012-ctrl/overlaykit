import * as fc from 'fast-check';

import { normalizeConfidence } from '../confidence';

describe('confidence properties', () => {
  // Feature: camera-ocr-geometry, Property 11: Confidence is on 0..1 or absent
  it('is undefined for null, non-finite values or no scale, and otherwise in 0..1', () => {
    fc.assert(
      fc.property(fc.oneof(fc.double(), fc.constant(null)), fc.constantFrom('unit', 'percent', 'none'), (raw, scale) => {
        const value = normalizeConfidence(raw, scale);
        if (raw === null || !Number.isFinite(raw) || scale === 'none') {
          expect(value).toBeUndefined();
          return;
        }
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        // Numeric equality, not Object.is: -0 comes back as +0, which is the same confidence.
        if (scale === 'unit' && raw >= 0 && raw <= 1) expect(value === raw).toBe(true);
        if (scale === 'percent' && raw >= 0 && raw <= 100) expect(value === raw / 100).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});
