import { t } from '../../locale';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';
import { View } from 'react-native';

/** GD_UNSUPPORTED, and the "no workflow valid" case: no Step, no Highlight (R5.4, R5.5, R4.10). */
export function RefusalView({
  messageKey,
  onTranslate,
  onExplore,
}: {
  messageKey: 'guide.refusal' | 'guide.unavailable';
  onTranslate: () => void;
  onExplore: () => void;
}) {
  return (
    <Panel>
      <Message>{t(messageKey)}</Message>
      <Note>{t('guide.tm01Only')}</Note>
      <Note>{t('guide.tamperNote')}</Note>
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.translate')} onPress={onTranslate} />
        <GuideButton label={t('guide.explore')} onPress={onExplore} />
      </View>
    </Panel>
  );
}