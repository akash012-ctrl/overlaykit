import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { PlannerSettings, liveKeys } from '../guide';
import { Icon } from '../icons/Icon';
import { Card, IconRow, SectionLabel } from '../parts';
import { colors, fontSize, lineHeight, radius, size, spacing } from '../theme';
import { LanguageSection } from './LanguageSection';
import { PrivacyNote } from './PrivacyNote';
import { useSettings } from './useSettings';
import { VoiceSection } from './VoiceSection';

// shortcut: no OpenRouter key section. Key storage is DEFERRED by D-030. Add OpenRouterKeySection when it is reversed.
function Screen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settings = useSettings();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={styles.header}>
          <A11yButton label={t('settings.close')} onPress={() => router.back()} icon="back" iconSize={size.iconLg} iconOnly style={styles.back} />
          <Text accessibilityRole="header" style={styles.title}>
            {t('settings.title')}
          </Text>
        </View>

        <LanguageSection selected={settings.targetLocale} onSelect={(code) => void settings.setTargetLocale(code)} />

        <VoiceSection />

        {/* Settings is its own route, so no Live session is open here to end when the key is deleted (R17.4). */}
        <PlannerSettings keys={liveKeys} onKeyDeleted={() => undefined} />

        {privacyOpen ? (
          <PrivacyNote onDone={() => setPrivacyOpen(false)} />
        ) : (
          <A11yButton
            label={t('settings.privacy.open')}
            onPress={() => setPrivacyOpen(true)}
            icon="privacy"
            iconColor={colors.accentText}
            iconSize={size.iconLg}
            style={styles.row}
            textStyle={styles.rowText}
            trailing={<Icon name="chevron" color={colors.textMuted} />}
          />
        )}

        <View style={styles.section}>
          <SectionLabel>{t('settings.limits.title')}</SectionLabel>
          <Card>
            <IconRow icon="info">
              <Text style={styles.body}>{t('settings.limits.body2')}</Text>
            </IconRow>
          </Card>
        </View>
      </ScrollView>
      {/* Content scrolls under a solid strip, not under the status icons. */}
      <View style={[styles.statusStrip, { height: insets.top }]} />
    </View>
  );
}

export function SettingsScreen() {
  return (
    <SafeAreaProvider>
      <Screen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  statusStrip: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: size.touch, height: size.touch, borderRadius: size.touch / 2, backgroundColor: colors.surfaceRaised },
  title: { color: colors.text, fontSize: fontSize.screenTitle, lineHeight: lineHeight.screenTitle, fontWeight: '700' },
  section: { gap: spacing.sm },
  body: { color: colors.textBody, fontSize: fontSize.body, lineHeight: lineHeight.body },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: '600' },
});
