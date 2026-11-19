import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import { getSpeechOutput } from '../../speech';
import { A11yButton } from '../a11y/A11yButton';

/** True when the device has a voice for the UI language. Re-checked on mount and on return to the foreground. No polling. */
function useVoice(): boolean {
  const [available, setAvailable] = useState(false);
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
  return available;
}

/**
 * Speaks the current Step's instruction, in the UI language, and nothing else.
 * Hidden when the device has no voice. It never advances the Guide (the reducer decides that).
 * Playback stops on a step change (the parent keys this by step), unmount (pause, cancel, complete,
 * mode change), a second tap, and moving to the background.
 */
export function SpeakControl({ text }: { text: string }) {
  const hasVoice = useVoice();
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        getSpeechOutput().stop();
        setSpeaking(false);
      }
    });
    return () => {
      sub.remove();
      getSpeechOutput().stop();
    };
  }, []);

  const onPress = useCallback(async () => {
    const speech = getSpeechOutput();
    if (speaking) {
      speech.stop();
      setSpeaking(false);
      return;
    }
    setFailed(false);
    setSpeaking(true);
    const result = await speech.speak(text, getUiLocale());
    setSpeaking(false);
    if (!result.ok && result.error === 'SP_FAILED') setFailed(true);
  }, [speaking, text]);

  if (!hasVoice) return null;
  return (
    <View style={styles.row}>
      <A11yButton
        label={speaking ? t('guide.speak.stop') : t('guide.speak')}
        onPress={() => void onPress()}
        style={styles.button}
        textStyle={styles.buttonText}
      />
      {failed ? (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {t('speech.failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  button: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#37474F' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 26 },
  note: { color: '#CFD8DC', fontSize: 14, lineHeight: 22 },
});
