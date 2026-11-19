import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import { getSpeechOutput } from '../../speech';

/** Says whether Speak is on. Re-checked when the section appears and on return to the foreground. */
export function VoiceSection() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      void getSpeechOutput()
        .hasVoice(getUiLocale())
        .then((has) => {
          if (alive) setAvailable(has);
        });
    check();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('settings.voice.title')}
      </Text>
      {available === null ? null : (
        <Text style={styles.body}>{t(available ? 'settings.voice.available' : 'settings.voice.missing')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 26 },
  body: { color: '#E6EAF0', fontSize: 16, lineHeight: 24 },
});
