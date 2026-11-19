import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { t } from '../../locale';
import { cleanKeyInput } from './live-view-model';
import type { LiveKeyPort } from './live-view-model';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';

type Saved = { readonly kind: 'unknown' } | { readonly kind: 'none' } | { readonly kind: 'saved'; readonly masked: string };

/**
 * Paste, replace or delete the user's own Google key (R17.1). The field is masked.
 * The key is held only while it is typed. After saving it is cleared and only the last four
 * characters stay in state. It is never logged, put in an error, or shown again (R17.2, R17.3).
 * Saving calls no Google endpoint (R17.5).
 */
export function LiveKeyScreen({
  keys,
  onChanged,
  onDone,
}: {
  keys: LiveKeyPort;
  /** Called after save (true) or delete (false). The parent ends any session and resets the planner on delete (R17.4). */
  onChanged: (hasKey: boolean) => void;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [saved, setSaved] = useState<Saved>({ kind: 'unknown' });
  const [failed, setFailed] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let alive = true;
    void keys.masked().then((r) => {
      if (!alive) return;
      if (r.ok) setSaved({ kind: 'saved', masked: r.value });
      else setSaved({ kind: 'none' });
    });
    return () => {
      alive = false;
    };
  }, [keys]);

  const cleaned = cleanKeyInput(typed);

  const save = async () => {
    setFailed(false);
    setDeleted(false);
    const r = await keys.set(cleaned);
    setTyped('');
    if (!r.ok) {
      setFailed(true);
      return;
    }
    const m = await keys.masked();
    setSaved(m.ok ? { kind: 'saved', masked: m.value } : { kind: 'none' });
    onChanged(true);
  };

  const remove = async () => {
    setFailed(false);
    const r = await keys.remove();
    if (!r.ok) {
      setFailed(true);
      return;
    }
    setTyped('');
    setSaved({ kind: 'none' });
    setDeleted(true);
    onChanged(false);
  };

  return (
    <Panel>
      <Text accessibilityRole="header" style={styles.title}>
        {t('live.key.title')}
      </Text>
      <Note>{t('live.key.explain')}</Note>
      {saved.kind === 'saved' ? <Message>{t('live.key.saved', { last4: saved.masked })}</Message> : null}
      {saved.kind === 'none' ? <Message>{t('live.key.none')}</Message> : null}
      {deleted ? <Message>{t('live.key.deleted')}</Message> : null}
      {failed ? <Message live="assertive">{t('live.key.failed')}</Message> : null}
      <TextInput
        accessibilityLabel={t('live.key.field')}
        value={typed}
        onChangeText={setTyped}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        contextMenuHidden
        spellCheck={false}
        style={styles.input}
      />
      <View style={guideStyles.row}>
        <GuideButton
          primary
          label={t(saved.kind === 'saved' ? 'live.key.replace' : 'live.key.save')}
          onPress={() => {
            if (cleaned !== '') void save();
          }}
        />
        {saved.kind === 'saved' ? <GuideButton label={t('live.key.delete')} onPress={() => void remove()} /> : null}
        <GuideButton label={t('live.key.done')} onPress={onDone} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 30 },
  input: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    backgroundColor: '#1C2530',
    fontSize: 16,
  },
});
