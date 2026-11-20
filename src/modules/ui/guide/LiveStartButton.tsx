import { t } from '../../locale';
import { liveStartBlock } from './live-view-model';
import type { LiveGateInput } from './live-view-model';
import { Button, IconRow, Message, Panel } from '../parts';

/**
 * The only way to open a Live session (R16.4). When a precondition is missing it shows why
 * instead of a button. Opening Guide or picking a goal never starts anything.
 */
export function LiveStartButton({ gate, onStart }: { gate: LiveGateInput; onStart: () => void }) {
  const block = liveStartBlock(gate);
  if (block === null) return <Button variant="primary" size="lg" stretch icon="live" label={t('live.start')} onPress={onStart} />;
  return (
    <Panel>
      <IconRow icon="info">
        <Message>{t(block === 'needKey' ? 'live.start.needKey' : block === 'needConsent' ? 'live.start.needConsent' : 'live.start.notChosen')}</Message>
      </IconRow>
    </Panel>
  );
}
