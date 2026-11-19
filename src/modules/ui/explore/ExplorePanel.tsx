import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors } from '../theme';
import { TR_UI } from '../translate/error-map';
import type { LabelContent } from '../translate/label-model';
import { ComponentPrompt } from './ComponentPrompt';
import type { ExploreView } from './explore-model';

type Props = {
  readonly view: ExploreView;
  /** Components of a verified machine, by authored name. Empty otherwise. */
  readonly list: readonly { readonly id: string; readonly name: string }[];
  readonly prompt: { readonly name: string } | null;
  readonly onRequest: (componentId: string) => void;
  readonly onClose: () => void;
};

function labelLines(content: LabelContent | null): readonly string[] {
  if (!content || content.state === 'unsupported') return [t('ocr.unsupported.marker')];
  switch (content.state) {
    case 'pending':
      return [content.recognizedText, t(content.reason === 'downloading-language-data' ? 'tr.downloading' : 'label.pending')];
    case 'translated':
      return content.origin === 'provider' ? [content.text, t('label.translated')] : [content.text, t('label.unchanged')];
    case 'failed':
      return [content.recognizedText, t(TR_UI[content.code].key)];
  }
}

/**
 * Explore answers in a bottom panel, within one tap and with no navigation (R22.5). An authored
 * explanation is labelled as written by the OverlayKit team. Anything else shows the label's own
 * translation and state, and says the app does not explain what a part does (R23).
 */
export function ExplorePanel({ view, list, prompt, onRequest, onClose }: Props) {
  const showsSomething = view.kind !== 'nothing' || prompt !== null || list.length > 0;
  if (!showsSomething) return null;
  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.content}>
        {view.kind === 'explanation' ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {view.name}
            </Text>
            <Text style={styles.body}>{view.text}</Text>
            <Text style={styles.note}>{t('explore.authored')}</Text>
          </>
        ) : null}
        {view.kind === 'explanation-failed' ? <Text style={styles.body}>{t('explore.explanationMissing')}</Text> : null}
        {view.kind === 'label-translation' ? (
          <>
            {labelLines(view.content).map((line, i) => (
              <Text key={i} style={i === 0 ? styles.body : styles.note}>
                {line}
              </Text>
            ))}
            {view.note ? <Text style={styles.note}>{t('explore.translationOnly')}</Text> : null}
            {view.hint ? <Text style={styles.note}>{t('explore.moveToShow')}</Text> : null}
          </>
        ) : null}
        {prompt ? <ComponentPrompt name={prompt.name} /> : null}
        {list.length > 0 ? (
          <View style={styles.list}>
            <Text accessibilityRole="header" style={styles.note}>
              {t('explore.components')}
            </Text>
            {list.map((c) => (
              <A11yButton key={c.id} label={c.name} onPress={() => onRequest(c.id)} style={styles.button} textStyle={styles.buttonText} />
            ))}
          </View>
        ) : null}
        {view.kind !== 'nothing' || prompt ? (
          <A11yButton label={t('action.closeSheet')} onPress={onClose} style={styles.button} textStyle={styles.buttonText} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: 12, maxHeight: 280 },
  content: { padding: 16, gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 26 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  note: { color: colors.textSoft, fontSize: 14, lineHeight: 22 },
  list: { gap: 8 },
  button: {
    minHeight: MIN_TOUCH_TARGET_DP,
    minWidth: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.neutral,
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
