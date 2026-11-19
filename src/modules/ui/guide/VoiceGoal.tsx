import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, TextInput, View } from 'react-native';

import { getUiLocale, t } from '../../locale';
import type { SpErrorCode } from '../../shared';
import { createSpeechInput } from '../../speech';
import { VOICE_ERROR_UI } from './error-map';
import { GuideButton, Message, Note, guideStyles } from './parts';

type Phase = 'idle' | 'disclosure' | 'listening' | 'edit';

/**
 * Voice goal (R2). The mic shows only when SpeechInput reports the UI language available. The audio
 * disclosure comes before the first microphone use (D-046). The text is editable and only Confirm
 * sets the goal. Voice sets the goal and nothing else: it never advances a step (D-042).
 * Listening stops on Stop, on leaving the foreground and on unmount.
 */
export function VoiceGoal({ onConfirm }: { onConfirm: (goal: string) => void }) {
  const input = useRef(createSpeechInput());
  const [available, setAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [disclosed, setDisclosed] = useState(false);
  const [text, setText] = useState('');
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
    if (res.ok) {
      setText(res.value);
      setPhase('edit');
    } else {
      setError(res.error);
      setPhase('idle');
    }
  }, [locale]);

  const onMic = () => {
    if (disclosed) void listen();
    else setPhase('disclosure');
  };

  const errorUi = error === null ? null : VOICE_ERROR_UI[error];
  const micHidden = !available || (errorUi?.hideMic ?? false);

  if (phase === 'disclosure') {
    return (
      <View style={styles.box}>
        <Note>{t('guide.voice.disclosure')}</Note>
        <View style={guideStyles.row}>
          <GuideButton
            primary
            label={t('guide.voice.disclosureOk')}
            onPress={() => {
              setDisclosed(true);
              void listen();
            }}
          />
          <GuideButton label={t('guide.plan.stop')} onPress={() => setPhase('idle')} />
        </View>
      </View>
    );
  }
  if (phase === 'listening') {
    return (
      <View style={styles.box}>
        <Message>{t('guide.voice.listening')}</Message>
        <GuideButton
          label={t('guide.voice.stopListening')}
          onPress={() => {
            ctrl.current?.abort();
            setPhase('idle');
          }}
        />
      </View>
    );
  }
  if (phase === 'edit') {
    return (
      <View style={styles.box}>
        <Note>{t('guide.voice.edit')}</Note>
        <TextInput
          accessibilityLabel={t('guide.voice.edit')}
          value={text}
          onChangeText={setText}
          multiline
          style={styles.input}
        />
        <View style={guideStyles.row}>
          <GuideButton primary label={t('guide.voice.confirm')} onPress={() => text.trim() !== '' && onConfirm(text.trim())} />
          <GuideButton label={t('guide.plan.stop')} onPress={() => setPhase('idle')} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      {errorUi !== null ? (
        <Message>
          {t(errorUi.messageKey, { language: t(`guide.voice.lang.${locale}`) })}
        </Message>
      ) : null}
      {!available && errorUi === null ? <Note>{t('guide.voice.err.SP_NOT_AVAILABLE')}</Note> : null}
      <View style={guideStyles.row}>
        {micHidden ? null : <GuideButton label={t('guide.voice.mic')} onPress={onMic} />}
        {errorUi?.actions.includes('openSettings') ? (
          <GuideButton label={t('guide.voice.openSettings')} onPress={() => void Linking.openSettings()} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  input: { backgroundColor: '#FFFFFF', color: '#0B0F14', fontSize: 16, lineHeight: 26, padding: 8, borderRadius: 8, minHeight: 48 },
});
