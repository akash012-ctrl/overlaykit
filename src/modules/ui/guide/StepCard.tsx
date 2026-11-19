import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { t } from '../../locale';
import { CheckpointPrompt } from './CheckpointPrompt';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';
import { SpeakSlot } from './SpeakSlot';
import type { GuideViewModel } from './view-model';
import type { ReactNode } from 'react';

type Step = Extract<GuideViewModel, { kind: 'step' }>;

/** One card per Step. Text comes from the fixture or t(). Nothing is translated at runtime (R18.4). */
export function StepCard({
  step,
  onDone,
  onRetry,
  onBack,
  speakControl,
}: {
  step: Step;
  onDone: (stepId: string) => void;
  onRetry: () => void;
  onBack: () => void;
  speakControl?: ReactNode;
}) {
  // Each new Step is announced (R13.14).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      t('guide.stepAnnounce', { n: step.stepNumber, total: step.stepCount, text: step.instruction }),
    );
  }, [step.stepId, step.stepNumber, step.stepCount, step.instruction]);

  return (
    <Panel>
      <Note>{step.workflowTitle}</Note>
      <Message>{t('guide.stepOf', { n: step.stepNumber, total: step.stepCount })}</Message>
      <Message>{step.instruction}</Message>
      {step.componentPrompt ? <Message>{step.componentPrompt}</Message> : null}
      {step.showDone ? null : <Note>{t('guide.waitingToSee', { text: step.expectedResult })}</Note>}
      {step.checkpointNotSeen ? (
        <CheckpointPrompt expectedResult={step.expectedResult} showBack={step.showBack} onRetry={onRetry} onBack={onBack} />
      ) : (
        <View style={guideStyles.row}>
          {step.showDone ? <GuideButton primary label={t('guide.done')} onPress={() => onDone(step.stepId)} /> : null}
          {step.showBack ? <GuideButton label={t('guide.back')} onPress={onBack} /> : null}
        </View>
      )}
      <SpeakSlot control={speakControl} />
    </Panel>
  );
}