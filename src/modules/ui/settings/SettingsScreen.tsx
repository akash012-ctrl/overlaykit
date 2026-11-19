import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { PlannerSettings, liveKeys } from '../guide';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
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
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.header}>
          <A11yButton
            label={t('settings.close')}
            onPress={() => router.back()}
            style={styles.button}
            textStyle={styles.buttonText}
          />
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
            style={styles.button}
            textStyle={styles.buttonText}
          />
        )}

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('settings.limits.title')}
          </Text>
          <Text style={styles.body}>{t('settings.limits.body2')}</Text>
        </View>
      </ScrollView>
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
  root: { flex: 1, backgroundColor: '#0B0F14' },
  content: { paddingHorizontal: 16, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 30 },
  section: { gap: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 26 },
  body: { color: '#E6EAF0', fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: MIN_TOUCH_TARGET_DP,
    minWidth: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#1C2530',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
