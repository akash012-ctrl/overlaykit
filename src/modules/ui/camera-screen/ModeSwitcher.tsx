import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import type { StringKey } from '../../locale';
import { RIPPLE } from '../a11y/A11yButton';
import { announce } from '../a11y/announcer';
import { GUIDE_MODE_ENTRY } from '../guide';
import type { IconName } from '../icons/Icon';
import { Icon } from '../icons/Icon';
import { colors, fontSize, radius, size, spacing } from '../theme';

export type Mode = 'translate' | 'explore' | 'guide';

const MODES: readonly { readonly id: Mode; readonly labelKey: StringKey; readonly icon: IconName }[] = [
  { id: 'translate', labelKey: 'mode.translate', icon: 'translate' },
  { id: 'explore', labelKey: 'mode.explore', icon: 'explore' },
  { ...GUIDE_MODE_ENTRY, icon: 'guide' },
];

/**
 * Translate, Explore and Guide as one segmented control. The selected segment is raised and filled, its label bolder:
 * shape and weight show the selection as well as colour. All are disabled when the OCR engine is unavailable (R8.8).
 */
export function ModeSwitcher({ enabled, mode, onChange }: { enabled: boolean; mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {MODES.map((tab) => {
        const selected = tab.id === mode;
        const tint = selected ? colors.text : colors.textMuted;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.labelKey)}
            accessibilityState={{ selected, disabled: !enabled }}
            disabled={!enabled}
            android_ripple={RIPPLE}
            onPress={() => {
              if (selected) return;
              onChange(tab.id);
              announce(`mode:${tab.id}`, t(tab.labelKey));
            }}
            style={[styles.segment, selected && styles.selected, !enabled && styles.disabled]}
          >
            <Icon name={tab.icon} size={size.icon} color={tint} />
            <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={[styles.text, { color: tint }, selected && styles.selectedText]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Equal segments whose labels may wrap to two lines, so long Hindi and Kannada labels or a large font do not overflow.
const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  segment: {
    flex: 1,
    minHeight: size.touch,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  selected: { backgroundColor: colors.primaryContainer, borderWidth: 1, borderColor: colors.outlineStrong },
  disabled: { opacity: 0.4 },
  text: { flexShrink: 1, fontSize: fontSize.note + 1, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  selectedText: { fontWeight: '700' },
});
