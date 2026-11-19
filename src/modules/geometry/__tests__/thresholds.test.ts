import { ROUND_TRIP_TOLERANCE_PX } from '..';

describe('ROUND_TRIP_TOLERANCE_PX', () => {
  it('is pinned to the proposed 1e-6 px', () => {
    expect(ROUND_TRIP_TOLERANCE_PX).toBe(1e-6);
  });

  it('is far below one pixel, so a wrong scale or offset of even 0.001 px fails the round-trip property', () => {
    expect(ROUND_TRIP_TOLERANCE_PX).toBeLessThan(1e-3);
    expect(ROUND_TRIP_TOLERANCE_PX).toBeGreaterThan(1e-10); // above the measured error of about 4e-12 px
  });
});
