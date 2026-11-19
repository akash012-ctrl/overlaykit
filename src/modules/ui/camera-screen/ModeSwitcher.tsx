import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import type { StringKey } from '../../locale';
import { announce } from '../a11y/announcer';
import { GUIDE_MODE_ENTRY } from '../guide';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors, fontSize, radius, spacing } from '../theme';

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
            <Text numberOfLines={2} style={styles.text}>
              {selected ? '\u2713 ' : ''}
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Equal-width tabs that may wrap to two lines, so long Hindi and Kannada labels or a large font do not overflow.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, minHeight: MIN_TOUCH_TARGET_DP, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.surfaceRaised },
  selected: { backgroundColor: colors.primary },
  disabled: { opacity: 0.6 },
  text: { color: colors.text, fontSize: fontSize.note + 1, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
});
