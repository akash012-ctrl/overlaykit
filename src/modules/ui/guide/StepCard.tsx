import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { announce } from '../a11y/announcer';
import { StatusChip } from '../status/StatusChip';
import { colors, fontSize, radius, spacing } from '../theme';
import { GuideButton, Headline, Message, Note, Panel, guideStyles } from './parts';
import { SpeakSlot } from './SpeakSlot';
import type { PlanViewModel } from './plan-view-model';
import type { StepText } from './usePlanGuide';
import type { ReactNode } from 'react';

type Step = Extract<PlanViewModel, { kind: 'step' }>;

/**
 * One step. The "AI suggestion" badge and the "may be wrong" line are fixed: no setting hides them. Done is always
 * shown. The instruction is the largest text. Notes scroll; the buttons are pinned below them so a large font
 * or a long Hindi or Kannada line can never push Done or Stop out of reach. With no mark on the screen the card
 * says "Not in view" and draws nothing. The enter hint says what to enter, never a value.
 * The plan has no known length, so only "Step N" is shown, never "N of M".
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
        <Text accessibilityRole="header" style={styles.stepLabel}>
          {stepLabel}
        </Text>
        <Text style={styles.badge}>{t('guide.plan.aiLabel')}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Headline>{shown}</Headline>
        {text.kind === 'translated' ? <Note>{t('guide.plan.english', { text: step.instruction })}</Note> : null}
        {text.kind === 'failed' ? <Note>{t('guide.plan.translateFailed')}</Note> : null}
        {step.enterHint !== null ? <Note>{t('guide.plan.enterHint', { hint: step.enterHint })}</Note> : null}
        {notInView ? (
          <>
            <Message>{t('guide.plan.notInView')}</Message>
            <Note>{t('guide.plan.notInViewHelp')}</Note>
          </>
        ) : null}
        {step.checkpointNotSeen ? <Message>{t('guide.plan.notSeen')}</Message> : null}
      </ScrollView>
      {step.checkpointNotSeen || step.manual ? null : <StatusChip announceChange={false} busy={checking} text={checking ? t('guide.plan.reading') : t('guide.plan.waiting')} />}
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.done')} onPress={() => onDone(step.stepId)} />
        {step.canBack ? <GuideButton label={t('guide.back')} onPress={onBack} /> : null}
        {step.manual ? null : <GuideButton label={checking ? t('guide.plan.reading') : t('guide.plan.checkNow')} onPress={onCheck} />}
        {step.checkpointNotSeen ? <GuideButton label={t('guide.retry')} onPress={onRetry} /> : null}
        <View style={guideStyles.farEnd}>
          <GuideButton destructive label={t('guide.plan.stop')} onPress={onStop} />
        </View>
      </View>
      <Note>{t('guide.plan.mayBeWrong')}</Note>
      <SpeakSlot control={speakControl} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  stepLabel: { color: colors.text, fontSize: fontSize.body, fontWeight: '700', lineHeight: 24 },
  badge: {
    color: colors.text,
    fontSize: fontSize.note,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 10 },
});
