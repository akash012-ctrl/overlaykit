import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import type { StringKey } from '../../locale';
import { announce } from '../a11y/announcer';
import { GUIDE_MODE_ENTRY } from '../guide';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';

export type Mode = 'translate' | 'explore' | 'guide';

const MODES: readonly { readonly id: Mode; readonly labelKey: StringKey }[] = [
  { id: 'translate', labelKey: 'mode.translate' },
  { id: 'explore', labelKey: 'mode.explore' },
  GUIDE_MODE_ENTRY,
];

/** Translate, Explore and Guide. All are disabled when the OCR engine is unavailable (R8.8). */
export function ModeSwitcher({ enabled, mode, onChange }: { enabled: boolean; mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {MODES.map((tab) => {
        const selected = tab.id === mode;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.labelKey)}
            accessibilityState={{ selected, disabled: !enabled }}
            disabled={!enabled}
            onPress={() => {
              if (selected) return;
              onChange(tab.id);
              announce(`mode:${tab.id}`, t(tab.labelKey));
            }}
            style={[styles.tab, selected && styles.selected, !enabled && styles.disabled]}
          >
            <Text style={styles.text}>
              {selected ? '\u2713 ' : ''}
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  tab: { minHeight: MIN_TOUCH_TARGET_DP, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 24, backgroundColor: '#1C2530' },
  selected: { backgroundColor: '#1565C0' },
  disabled: { opacity: 0.6 },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', lineHeight: 22 },
});
