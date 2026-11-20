import { View } from 'react-native';

import { t } from '../../locale';
import { colors } from '../theme';
import { Button, IconRow, IconTile, Message, Panel, Title, rowStyles } from '../parts';

/** GD_MACHINE_LOST. No mark. Resumes only when a later reading shows the screen again. */
export function PausedView({ onCheck, onStop, checking }: { onCheck: () => void; onStop: () => void; checking: boolean }) {
  return (
    <Panel>
      <IconRow icon="look" color={colors.target}>
        <Message>{t('guide.plan.lost')}</Message>
      </IconRow>
      <View style={rowStyles.row}>
        <Button variant="primary" icon="look" label={checking ? t('guide.plan.reading') : t('guide.plan.checkNow')} onPress={onCheck} />
        <View style={rowStyles.farEnd}>
          <Button variant="destructive" icon="stop" label={t('guide.plan.stop')} onPress={onStop} />
        </View>
      </View>
    </Panel>
  );
}

export function CompletionView({ onAgain }: { onAgain: () => void }) {
  return (
    <Panel>
      <IconTile icon="finished" />
      <Title center>{t('guide.plan.completed')}</Title>
      <Button variant="primary" size="lg" stretch icon="retry" label={t('guide.startAgain')} onPress={onAgain} />
    </Panel>
  );
}
