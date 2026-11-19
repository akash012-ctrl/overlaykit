import { useEffect } from 'react';
import { View } from 'react-native';

import { t } from '../../locale';
import { announce } from '../a11y/announcer';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';
import { SpeakSlot } from './SpeakSlot';
import type { PlanViewModel } from './plan-view-model';
import type { StepText } from './usePlanGuide';
import type { ReactNode } from 'react';

type Step = Extract<PlanViewModel, { kind: 'step' }>;

/**
 * One step. The "AI suggestion" label and the warning are fixed: no setting hides them. Done is always
 * shown. With no mark on the screen the card says "Not in view" and draws nothing. The enter hint says
 * what to enter, never a value.
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
  const header = `${t('guide.plan.stepN', { n: step.stepNumber })}. ${t('guide.plan.aiLabel')}`;
  useEffect(() => {
    announce(`step:${step.stepId}`, `${header}. ${shown}`);
  }, [step.stepId, header, shown]);

  return (
    <Panel>
      <Note>{header}</Note>
      <Message>{shown}</Message>
      {text.kind === 'translated' ? <Note>{t('guide.plan.english', { text: step.instruction })}</Note> : null}
      {text.kind === 'failed' ? <Note>{t('guide.plan.translateFailed')}</Note> : null}
      {step.enterHint !== null ? <Note>{t('guide.plan.enterHint', { hint: step.enterHint })}</Note> : null}
      <Note>{t('guide.plan.mayBeWrong')}</Note>
      {notInView ? (
        <>
          <Message>{t('guide.plan.notInView')}</Message>
          <Note>{t('guide.plan.notInViewHelp')}</Note>
        </>
      ) : (
        <Note>{t('guide.overlayNote')}</Note>
      )}
      {step.checkpointNotSeen ? (
        <Message>{t('guide.plan.notSeen')}</Message>
      ) : step.manual ? null : (
        <Note>{t('guide.plan.waiting')}</Note>
      )}
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.done')} onPress={() => onDone(step.stepId)} />
        {step.manual ? null : <GuideButton label={checking ? t('guide.plan.reading') : t('guide.plan.checkNow')} onPress={onCheck} />}
        {step.checkpointNotSeen ? <GuideButton label={t('guide.retry')} onPress={onRetry} /> : null}
        {step.canBack ? <GuideButton label={t('guide.back')} onPress={onBack} /> : null}
        <GuideButton label={t('guide.plan.stop')} onPress={onStop} />
      </View>
      <SpeakSlot control={speakControl} />
    </Panel>
  );
}
