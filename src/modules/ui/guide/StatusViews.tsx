import { t } from '../../locale';
import { GUIDE_ERROR_UI } from './error-map';
import { GuideButton, Message, Panel } from './parts';

export function LookingView() {
  return (
    <Panel>
      <Message>{t('guide.looking')}</Message>
    </Panel>
  );
}

/** GD_MACHINE_LOST. No Highlight. Resumes only through a verified observation (R10.7). */
export function PausedView() {
  const ui = GUIDE_ERROR_UI.GD_MACHINE_LOST;
  return (
    <Panel>
      <Message live={ui.liveRegion}>{t(ui.messageKey)}</Message>
    </Panel>
  );
}

/** GD_MACHINE_CHANGED. Start again sends `reset` (R10.9, R10.10). */
export function CancelledView({ onStartAgain }: { onStartAgain: () => void }) {
  const ui = GUIDE_ERROR_UI.GD_MACHINE_CHANGED;
  return (
    <Panel>
      <Message live={ui.liveRegion}>{t(ui.messageKey)}</Message>
      <GuideButton primary label={t('guide.startAgain')} onPress={onStartAgain} />
    </Panel>
  );
}

export function CompletionView({ workflowTitle, onBackToTasks }: { workflowTitle: string; onBackToTasks: () => void }) {
  return (
    <Panel>
      <Message>{workflowTitle}</Message>
      <Message>{t('guide.completed')}</Message>
      <GuideButton primary label={t('guide.backToTasks')} onPress={onBackToTasks} />
    </Panel>
  );
}