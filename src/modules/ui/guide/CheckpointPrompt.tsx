import { View } from 'react-native';

import { t } from '../../locale';
import { GuideButton, Message, guideStyles } from './parts';

/** GD_CHECKPOINT_NOT_SEEN: Retry and Back, never an automatic skip (R13.5 to R13.8). */
export function CheckpointPrompt({
  expectedResult,
  showBack,
  onRetry,
  onBack,
}: {
  expectedResult: string;
  showBack: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <Message>{t('guide.notSeen', { text: expectedResult })}</Message>
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.retry')} onPress={onRetry} />
        {showBack ? <GuideButton label={t('guide.back')} onPress={onBack} /> : null}
      </View>
    </>
  );
}