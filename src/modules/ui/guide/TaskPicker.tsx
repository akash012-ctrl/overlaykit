import { View } from 'react-native';

import { t } from '../../locale';
import { GuideButton, Message, Note, Panel } from './parts';

export function TaskPicker({
  workflows,
  onPick,
  onDebugInvalid,
}: {
  workflows: readonly { readonly id: string; readonly title: string }[];
  onPick: (id: string) => void;
  /** Development builds only (R16.8). */
  onDebugInvalid: (() => void) | null;
}) {
  return (
    <Panel>
      <Message>{t('guide.pickTask')}</Message>
      <View style={{ gap: 8 }}>
        {workflows.map((w) => (
          <GuideButton key={w.id} label={w.title} onPress={() => onPick(w.id)} />
        ))}
        {onDebugInvalid ? <GuideButton label="DEBUG: load invalid workflow" onPress={onDebugInvalid} /> : null}
      </View>
      <Note>{t('guide.tm01Only')}</Note>
      <Note>{t('guide.tamperNote')}</Note>
      <Note>{t('guide.overlayNote')}</Note>
    </Panel>
  );
}