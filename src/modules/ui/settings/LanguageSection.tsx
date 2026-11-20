import { StyleSheet, View } from 'react-native';

import { t } from '../../locale';
import type { LocaleCode } from '../../shared';
import { Card, Note, RadioRow, SectionLabel } from '../parts';
import { spacing } from '../theme';

const OPTIONS = [
  { code: 'en', labelKey: 'settings.language.en' },
  { code: 'hi', labelKey: 'settings.language.hi' },
  { code: 'kn', labelKey: 'settings.language.kn' },
] as const;

/** English, Hindi and Kannada, each written in its own script. */
export function LanguageSection({ selected, onSelect }: { selected: LocaleCode; onSelect: (code: LocaleCode) => void }) {
  return (
    <View style={styles.section}>
      <SectionLabel>{t('settings.language.title')}</SectionLabel>
      <Note>{t('settings.language.hint')}</Note>
      <Card style={styles.list}>
        {OPTIONS.map(({ code, labelKey }, index) => {
          const label = t(labelKey);
          return (
            <RadioRow
              key={code}
              first={index === 0}
              label={label}
              a11yLabel={t('settings.language.a11y', { language: label })}
              selected={code === selected}
              onPress={() => onSelect(code)}
            />
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  list: { padding: 0, gap: 0 },
});
