import { View } from 'react-native';

import { t } from '../../locale';
import { GuideButton, Message, Panel, guideStyles } from './parts';

/** GD_MACHINE_LOST. No mark. Resumes only when a later reading shows the screen again. */
export function PausedView({ onCheck, onStop, checking }: { onCheck: () => void; onStop: () => void; checking: boolean }) {
  return (
    <Panel>
      <Message>{t('guide.plan.lost')}</Message>
      <View style={guideStyles.row}>
        <GuideButton primary label={checking ? t('guide.plan.reading') : t('guide.plan.checkNow')} onPress={onCheck} />
        <GuideButton label={t('guide.plan.stop')} onPress={onStop} />
      </View>
    </Panel>
  );
}

export function CompletionView({ onAgain }: { onAgain: () => void }) {
  return (
    <Panel>
      <Message>{t('guide.plan.completed')}</Message>
      <GuideButton primary label={t('guide.startAgain')} onPress={onAgain} />
    </Panel>
  );
}
