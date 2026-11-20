import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import { getSpeechOutput } from '../../speech';
import { A11yButton } from '../a11y/A11yButton';
import { colors, fontSize, lineHeight, radius, size } from '../theme';

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
 * Speaks the current Step's instruction, in the UI language, and nothing else. With `autoPlay` it reads the step
 * once as soon as a voice is known to exist (D-055), so the user can keep their eyes on the machine.
 * Hidden when the device has no voice. It never advances the Guide (the reducer decides that).
 * Playback stops on a step change (the parent keys this by step), unmount (pause, cancel, complete,
 * mode change), a second tap, and moving to the background.
 */
export function SpeakControl({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const hasVoice = useVoice();
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  const played = useRef(false);

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

  const speak = useCallback(async () => {
    setFailed(false);
    setSpeaking(true);
    const result = await getSpeechOutput().speak(text, getUiLocale());
    setSpeaking(false);
    if (!result.ok && result.error === 'SP_FAILED') setFailed(true);
  }, [text]);

  useEffect(() => {
    if (!autoPlay || !hasVoice || played.current) return;
    played.current = true;
    void speak();
  }, [autoPlay, hasVoice, speak]);

  const onPress = useCallback(() => {
    if (speaking) {
      getSpeechOutput().stop();
      setSpeaking(false);
      return;
    }
    void speak();
  }, [speaking, speak]);

  if (!hasVoice) return null;
  return (
    <View style={styles.row}>
      {failed ? (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {t('speech.failed')}
        </Text>
      ) : null}
      <A11yButton
        label={speaking ? t('guide.speak.stop') : t('guide.speak')}
        onPress={onPress}
        icon={speaking ? 'stop' : 'speak'}
        iconColor={colors.accentText}
        iconSize={size.iconLg}
        iconOnly
        style={[styles.button, speaking && styles.active]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: { width: size.touch, height: size.touch, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  active: { backgroundColor: colors.primaryContainer },
  note: { color: colors.textMuted, fontSize: fontSize.note, lineHeight: lineHeight.note, flexShrink: 1 },
});
