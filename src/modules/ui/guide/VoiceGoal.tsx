import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import type { SpErrorCode } from '../../shared';
import { createSpeechInput } from '../../speech';
import { A11yButton } from '../a11y/A11yButton';
import { PulseView } from '../motion/motion';
import { Button, Message, Note, rowStyles } from '../parts';
import { colors, fontSize, lineHeight, radius, size, spacing } from '../theme';
import { VOICE_ERROR_UI } from './error-map';

type Phase = 'idle' | 'disclosure' | 'listening';

/**
 * Voice goal (R2). The mic shows only when SpeechInput reports the UI language available. The audio
 * disclosure comes before the first microphone use (D-046). What the recognizer heard becomes the goal at once
 * (D-055); the planning card shows it and its Stop undoes it. Voice sets the goal and nothing else: it never
 * advances a step (D-042). Listening stops on Stop, on leaving the foreground and on unmount.
 */
export function VoiceGoal({ onConfirm }: { onConfirm: (goal: string) => void }) {
  const input = useRef(createSpeechInput());
  const [available, setAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [disclosed, setDisclosed] = useState(false);
  const [error, setError] = useState<SpErrorCode | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const locale = getUiLocale();

  // Re-checked on mount and on return to the foreground. No polling.
  useEffect(() => {
    let alive = true;
    const check = () =>
      void input.current.isAvailable(locale).then((ok) => {
        if (alive) setAvailable(ok);
      });
    check();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
      else {
        ctrl.current?.abort();
        setPhase((p) => (p === 'listening' ? 'idle' : p));
      }
    });
    return () => {
      alive = false;
      sub.remove();
      ctrl.current?.abort();
    };
  }, [locale]);

  const listen = useCallback(async () => {
    const c = new AbortController();
    ctrl.current = c;
    setError(null);
    setPhase('listening');
    const res = await input.current.listen(locale, c.signal);
    if (c.signal.aborted) return; // the user stopped, or the app left the foreground
    setPhase('idle');
    if (res.ok && res.value.trim() !== '') onConfirm(res.value.trim());
    else if (!res.ok) setError(res.error);
  }, [locale, onConfirm]);

  const onMic = () => {
    if (phase === 'listening') {
      ctrl.current?.abort();
      setPhase('idle');
    } else if (disclosed) void listen();
    else setPhase('disclosure');
  };

  const errorUi = error === null ? null : VOICE_ERROR_UI[error];
  const micHidden = !available || (errorUi?.hideMic ?? false);

  if (phase === 'disclosure') {
    return (
      <View style={styles.inset}>
        <Note>{t('guide.voice.disclosure')}</Note>
        <View style={rowStyles.row}>
          <Button
            variant="primary"
            icon="mic"
            label={t('guide.voice.disclosureOk')}
            onPress={() => {
              setDisclosed(true);
              void listen();
            }}
          />
          <Button icon="close" label={t('guide.plan.stop')} onPress={() => setPhase('idle')} />
        </View>
      </View>
    );
  }

  const listening = phase === 'listening';
  return (
    <View style={styles.box}>
      {errorUi !== null ? <Message>{t(errorUi.messageKey, { language: t(`guide.voice.lang.${locale}`) })}</Message> : null}
      {!available && errorUi === null ? <Note>{t('guide.voice.err.SP_NOT_AVAILABLE')}</Note> : null}
      {micHidden ? null : (
        <View style={styles.orbRow}>
          <PulseView kind="scale" active={listening}>
            <A11yButton
              label={listening ? t('guide.voice.stopListening') : t('guide.voice.mic')}
              onPress={onMic}
              icon={listening ? 'stopListening' : 'mic'}
              iconSize={size.iconXl}
              iconOnly
              pressScale
              style={[styles.orb, listening && styles.orbListening]}
            />
          </PulseView>
          <Text accessibilityLiveRegion="polite" style={styles.orbLabel}>
            {listening ? t('guide.voice.listening') : t('guide.voice.mic')}
          </Text>
        </View>
      )}
      {errorUi?.actions.includes('openSettings') ? (
        <Button icon="settings" label={t('guide.voice.openSettings')} onPress={() => void Linking.openSettings()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  inset: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  orbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orb: {
    width: size.orb,
    height: size.orb,
    borderRadius: size.orb / 2,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
  },
  orbListening: { backgroundColor: colors.dangerContainer },
  orbLabel: { flex: 1, color: colors.text, fontSize: fontSize.title, lineHeight: lineHeight.title, fontWeight: '600' },
});
