// The only file that imports expo-symbols (D-052, lint VENDOR_OWNERS).
import { SymbolView } from 'expo-symbols';

import { colors, size as sizes } from '../theme';

/** One Material Symbol per meaning across the app. Add a meaning here before using a new glyph. */
const ICONS = {
  settings: 'settings',
  close: 'close',
  back: 'arrow_back',
  translate: 'translate',
  explore: 'touch_app',
  guide: 'assistant_navigation',
  mic: 'mic',
  stopListening: 'stop_circle',
  speak: 'volume_up',
  stop: 'stop',
  done: 'check',
  look: 'visibility',
  retry: 'refresh',
  download: 'download',
  readScreen: 'document_scanner',
  ai: 'auto_awesome',
  privacy: 'shield',
  info: 'info',
  voice: 'record_voice_over',
  radioOn: 'radio_button_checked',
  radioOff: 'radio_button_unchecked',
  chevron: 'chevron_right',
  cameraOff: 'no_photography',
  error: 'error',
  key: 'key',
  delete: 'delete',
  live: 'podcasts',
  finished: 'done_all',
  next: 'arrow_forward',
  hold: 'pause',
} as const;

export type IconName = keyof typeof ICONS;

/** Decorative: hidden from TalkBack. The button or row that holds it carries the words. */
export function Icon({ name, size = sizes.icon, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return (
    <SymbolView
      name={{ android: ICONS[name] }}
      size={size}
      tintColor={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

