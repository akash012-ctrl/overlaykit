import { t } from '../../locale';
import { Button, Message, Note, Panel, rowStyles } from '../parts';
import { StatusChip } from '../status/StatusChip';
import type { StepText } from './usePlanGuide';
import { View } from 'react-native';

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
      <View style={rowStyles.row}>
        <StatusChip busy text={t('guide.plan.planning')} />
        <View style={rowStyles.farEnd}>
          <Button variant="destructive" icon="stop" label={t('guide.plan.stop')} onPress={onStop} />
        </View>
      </View>
    </Panel>
  );
}
