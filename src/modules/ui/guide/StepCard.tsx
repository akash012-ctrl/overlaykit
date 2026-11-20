import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { announce } from '../a11y/announcer';
import { Icon } from '../icons/Icon';
import { Button, Headline, IconRow, Message, Note, Panel, Title, rowStyles } from '../parts';
import { StatusChip } from '../status/StatusChip';
import { colors, fontSize, lineHeight, radius, spacing } from '../theme';
import type { PlanViewModel } from './plan-view-model';
import { SpeakSlot } from './SpeakSlot';
import type { StepText } from './usePlanGuide';

type Step = Extract<PlanViewModel, { kind: 'step' }>;

/**
 * One step. The "AI suggestion" badge and the "may be wrong" line are fixed: no setting hides them. Done is always
 * shown. The instruction is the largest text. Notes scroll; the buttons are pinned below them so a large font
 * or a long Hindi or Kannada line can never push Done or Stop out of reach. With no mark on the screen the card
 * says "Not in view" and draws nothing. The enter hint says what to enter, never a value.
 * The plan has no known length, so only "Step N" is shown, never "N of M".
 * While the camera reads on its own (D-055) the step advances when it sees the expected change; Done is for steps
 * the camera cannot check.
 */
export function StepCard({
  step,
  text,
  notInView,
  onDone,
  onBack,
  onRetry,
  onCheck,
  onStop,
  checking,
  speakControl,
}: {
  step: Step;
  text: StepText;
  notInView: boolean;
  onDone: (stepId: string) => void;
  onBack: () => void;
  onRetry: () => void;
  onCheck: () => void;
  onStop: () => void;
  checking: boolean;
  speakControl?: ReactNode;
}) {
  const shown = text.kind === 'translated' ? text.text : step.instruction;
  const stepLabel = t('guide.plan.stepN', { n: step.stepNumber });
  const header = `${stepLabel}. ${t('guide.plan.aiLabel')}`;
  useEffect(() => {
    announce(`step:${step.stepId}`, `${header}. ${shown}`);
  }, [step.stepId, header, shown]);

  return (
    <Panel>
      <View style={styles.header}>
        <Title>{stepLabel}</Title>
        <View style={styles.badge}>
          <Icon name="ai" size={14} color={colors.accentText} />
          <Text style={styles.badgeText}>{t('guide.plan.aiLabel')}</Text>
        </View>
        <View style={styles.speak}>
          <SpeakSlot control={speakControl} />
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Headline>{shown}</Headline>
        {text.kind === 'translated' ? <Note>{t('guide.plan.english', { text: step.instruction })}</Note> : null}
        {text.kind === 'failed' ? <Note>{t('guide.plan.translateFailed')}</Note> : null}
        {step.enterHint !== null ? <Note>{t('guide.plan.enterHint', { hint: step.enterHint })}</Note> : null}
        {notInView ? (
          <IconRow icon="look" color={colors.target}>
            <Message>{t('guide.plan.notInView')}</Message>
            <Note>{t('guide.plan.notInViewHelp')}</Note>
          </IconRow>
        ) : null}
        {step.checkpointNotSeen ? <Message>{t('guide.plan.notSeen')}</Message> : null}
      </ScrollView>
      {step.checkpointNotSeen || step.manual ? null : (
        <StatusChip announceChange={false} busy={checking} icon="look" text={checking ? t('guide.plan.reading') : t('guide.plan.waiting')} />
      )}
      <View style={rowStyles.row}>
        <Button variant="primary" icon="done" label={t('guide.done')} onPress={() => onDone(step.stepId)} />
        {step.canBack ? <Button icon="back" label={t('guide.back')} onPress={onBack} /> : null}
        {step.checkpointNotSeen ? <Button icon="retry" label={t('guide.retry')} onPress={onRetry} /> : null}
        {step.manual || !step.checkpointNotSeen ? null : (
          <Button icon="look" label={checking ? t('guide.plan.reading') : t('guide.plan.checkNow')} onPress={onCheck} />
        )}
        <View style={rowStyles.farEnd}>
          <Button variant="destructive" icon="stop" label={t('guide.plan.stop')} onPress={onStop} />
        </View>
      </View>
      <IconRow icon="info" color={colors.textMuted}>
        <Note>{t('guide.plan.mayBeWrong')}</Note>
      </IconRow>
    </Panel>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
  },
  badgeText: { color: colors.text, fontSize: fontSize.note, lineHeight: lineHeight.note },
  speak: { marginLeft: 'auto' },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: spacing.sm },
});
