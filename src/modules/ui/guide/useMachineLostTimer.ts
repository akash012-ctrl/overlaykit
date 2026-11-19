import { useCallback, useEffect, useRef } from 'react';

/**
 * Holds only a timer. Fires `onLost` once per quiet period: after `restart()` and `timeoutMs` with no
 * further `restart()`. It decides nothing and never sends an event that advances a Step (R10.2, R14.8).
 * `active` false (not running, or app in the background) stops it. An unusable timeout never fires.
 * shortcut: fires once per quiet period, so a second loss without a verified frame in between sends
 * no second event. Upgrade if G4 shows a paused Guide needs repeated loss checks.
 */
export function useMachineLostTimer(active: boolean, timeoutMs: number, onLost: () => void): () => void {
  const handle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lost = useRef(onLost);
  useEffect(() => {
    lost.current = onLost;
  });

  const stop = useCallback(() => {
    if (handle.current !== null) clearTimeout(handle.current);
    handle.current = null;
  }, []);

  const restart = useCallback(() => {
    stop();
    if (!active || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return;
    handle.current = setTimeout(() => {
      handle.current = null;
      lost.current();
    }, timeoutMs);
  }, [active, timeoutMs, stop]);

  useEffect(() => {
    restart();
    return stop;
  }, [restart, stop]);

  return restart;
}
