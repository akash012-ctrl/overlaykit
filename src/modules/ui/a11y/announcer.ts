import { AccessibilityInfo } from 'react-native';

let lastKey: string | null = null;

/**
 * The only caller of announceForAccessibility. The same key twice in a row announces once
 * (mode:<mode>, step:<stepId>, guide:<status>), so a re-render never repeats a message.
 */
export function announce(key: string, message: string): void {
  if (key === lastKey) return;
  lastKey = key;
  AccessibilityInfo.announceForAccessibility(message);
}

/** Forget the last key, for example when Guide closes, so reopening announces again. */
export function resetAnnouncer(): void {
  lastKey = null;
}
