import { View } from 'react-native';

import { t } from '../../locale';
import { GuideButton, Message, Panel, guideStyles } from './parts';

/** The planner proposed that the goal is done. Only the user's Yes completes it (P6). */
export function FinishPrompt({ onFinish, onNotYet, onStop }: { onFinish: () => void; onNotYet: () => void; onStop: () => void }) {
  return (
    <Panel>
      <Message>{t('guide.plan.finishAsk')}</Message>
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.plan.finish')} onPress={onFinish} />
        <GuideButton label={t('guide.plan.notYet')} onPress={onNotYet} />
        <GuideButton label={t('guide.plan.stop')} onPress={onStop} />
      </View>
    </Panel>
  );
}
