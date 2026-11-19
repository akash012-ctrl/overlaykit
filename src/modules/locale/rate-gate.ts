import type { MonotonicClock } from '../shared';

export type RateGate = {
  isOpen(): boolean;
  closeFor(ms: number): void;
  /** Milliseconds until the gate opens, or null when open. */
  retryAfterMs(): number | null;
};

export function createRateGate(clock: MonotonicClock): RateGate {
  let openAt = 0;
  return {
    isOpen: () => clock() >= openAt,
    closeFor(ms) {
      if (Number.isFinite(ms) && ms > 0) openAt = clock() + ms;
    },
    retryAfterMs() {
      const left = openAt - clock();
      return left > 0 ? left : null;
    },
  };
}
