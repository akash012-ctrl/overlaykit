import { t } from '../../locale';
import { StatusChip } from '../status/StatusChip';
import { GuideButton, Message, Note, Panel } from './parts';
import type { StepText } from './usePlanGuide';

/** Shown while the planner works. The goal is shown in the user's language, with the original text. Stop cancels the call. */
export function PlanningView({
  goal,
  goalText,
  onStop,
}: {
  goal: string;
  goalText: StepText;
  onStop: () => void;
}) {
  return (
    <Panel>
      <Message>{t('guide.plan.goal', { goal: goalText.kind === 'translated' ? goalText.text : goal })}</Message>
      {goalText.kind === 'translated' ? <Note>{t('guide.plan.goalOriginal', { text: goal })}</Note> : null}
      {goalText.kind === 'failed' ? <Note>{t('guide.plan.translateFailed')}</Note> : null}
      <StatusChip busy text={t('guide.plan.planning')} />
      <GuideButton destructive label={t('guide.plan.stop')} onPress={onStop} />
    </Panel>
  );
}
