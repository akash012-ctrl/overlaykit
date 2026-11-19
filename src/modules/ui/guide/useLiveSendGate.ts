import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { liveSendAllowed } from './live-view-model';
import type { LiveGateInput, LiveBannerState } from './live-view-model';

/**
 * The ui send gate (R16.5, R16.6). The returned flag is true only while consent, choice, key, a
 * pressed Start and the foreground all hold. The Guide wiring must pass frames and audio to the
 * Live adapter only while it is true. When the app leaves the foreground the session is stopped
 * through `onStop` (idempotent), so nothing is sent from the background and nothing resumes on its own.
 */
export function useLiveSendGate(gate: LiveGateInput, session: LiveBannerState, onStop: () => void): boolean {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setForeground(active);
      if (!active) onStop();
    });
    return () => sub.remove();
  }, [onStop]);
  return liveSendAllowed({ ...gate, session, foreground });
}
