import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import { getSpeechOutput } from '../../speech';
import { Card, IconRow, SectionLabel } from '../parts';
import { colors, fontSize, lineHeight, spacing } from '../theme';

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
      <SectionLabel>{t('settings.voice.title')}</SectionLabel>
      {available === null ? null : (
        <Card>
          <IconRow icon="voice">
            <Text style={styles.body}>{t(available ? 'settings.voice.available' : 'settings.voice.missing')}</Text>
          </IconRow>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  body: { color: colors.textBody, fontSize: fontSize.body, lineHeight: lineHeight.body },
});
