import { View } from 'react-native';

import { t } from '../../locale';
import { Button, Panel, Title, rowStyles } from '../parts';

/** The planner proposed that the goal is done. Only the user's Yes completes it (P6). */
export function FinishPrompt({ onFinish, onNotYet, onStop }: { onFinish: () => void; onNotYet: () => void; onStop: () => void }) {
  return (
    <Panel>
      <Title>{t('guide.plan.finishAsk')}</Title>
      <View style={rowStyles.row}>
        <Button variant="primary" icon="done" label={t('guide.plan.finish')} onPress={onFinish} />
        <Button label={t('guide.plan.notYet')} onPress={onNotYet} />
        <View style={rowStyles.farEnd}>
          <Button variant="destructive" icon="stop" label={t('guide.plan.stop')} onPress={onStop} />
        </View>
      </View>
    </Panel>
  );
}
