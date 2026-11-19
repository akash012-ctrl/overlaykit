import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import type { LocaleCode } from '../../shared';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors } from '../theme';

const OPTIONS = [
  { code: 'en', labelKey: 'settings.language.en' },
  { code: 'hi', labelKey: 'settings.language.hi' },
  { code: 'kn', labelKey: 'settings.language.kn' },
] as const;

/** English, Hindi and Kannada, each written in its own script. */
export function LanguageSection({ selected, onSelect }: { selected: LocaleCode; onSelect: (code: LocaleCode) => void }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('settings.language.title')}
      </Text>
      <Text style={styles.hint}>{t('settings.language.hint')}</Text>
      {OPTIONS.map(({ code, labelKey }) => {
        const label = t(labelKey);
        const isSelected = code === selected;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={t('settings.language.a11y', { language: label })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(code)}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <Text style={styles.rowText}>
              {isSelected ? '● ' : '○ '}
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 26 },
  hint: { color: colors.textHint, fontSize: 14, lineHeight: 20 },
  row: {
    minHeight: MIN_TOUCH_TARGET_DP,
    minWidth: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  rowSelected: { borderWidth: 2, borderColor: colors.accent },
  rowText: { color: colors.text, fontSize: 16, lineHeight: 24 },
});
