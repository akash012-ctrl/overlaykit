import { ScrollView, StyleSheet, View } from 'react-native';

import { t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { FadeInView } from '../motion/motion';
import { Button, Message, Note, Title } from '../parts';
import { colors, radius, size, spacing } from '../theme';
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
 * Explore answers in a card above the mode switcher, within one tap and with no navigation (R22.5). An authored
 * explanation is labelled as written by the OverlayKit team. Anything else shows the label's own translation and
 * state, and says the app does not explain what a part does (R23).
 */
export function ExplorePanel({ view, list, prompt, onRequest, onClose }: Props) {
  const showsSomething = view.kind !== 'nothing' || prompt !== null || list.length > 0;
  if (!showsSomething) return null;
  const lines = view.kind === 'label-translation' ? labelLines(view.content) : [];
  const heading = view.kind === 'explanation' ? view.name : (lines[0] ?? null);
  return (
    <FadeInView style={styles.card}>
      {heading !== null ? (
        <View style={styles.header}>
          <View style={styles.flex}>
            <Title>{heading}</Title>
          </View>
          {view.kind !== 'nothing' || prompt ? (
            <A11yButton label={t('action.closeSheet')} onPress={onClose} icon="close" iconOnly style={styles.close} />
          ) : null}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        {view.kind === 'explanation' ? (
          <>
            <Message>{view.text}</Message>
            <Note>{t('explore.authored')}</Note>
          </>
        ) : null}
        {view.kind === 'explanation-failed' ? <Message>{t('explore.explanationMissing')}</Message> : null}
        {view.kind === 'label-translation' ? (
          <>
            {lines.slice(1).map((line, i) => (
              <Note key={i}>{line}</Note>
            ))}
            {view.note ? <Note>{t('explore.translationOnly')}</Note> : null}
            {view.hint ? <Note>{t('explore.moveToShow')}</Note> : null}
          </>
        ) : null}
        {prompt ? <ComponentPrompt name={prompt.name} /> : null}
        {list.length > 0 ? (
          <View style={styles.list}>
            <Note>{t('explore.components')}</Note>
            {list.map((c) => (
              <Button key={c.id} icon="chevron" label={c.name} onPress={() => onRequest(c.id)} stretch />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    maxHeight: 280,
    paddingTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.xs },
  flex: { flex: 1 },
  close: { width: size.touch, height: size.touch, borderRadius: size.touch / 2 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  list: { gap: spacing.sm },
});
