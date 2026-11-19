import { View } from 'react-native';

import { t } from '../../locale';
import type { PlErrorCode } from '../../shared';
import { PLAN_ERROR_UI } from './error-map';
import { ModelSteps } from './ModelGate';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';

/** One state per PL_* code, with the buttons the error table lists. `reason` is the model's own words, shown as AI text. */
export function CannotPlanView({
  code,
  reason,
  onRetry,
  onTranslate,
  onExplore,
  onStop,
}: {
  code: PlErrorCode;
  reason: string | null;
  onRetry: () => void;
  onTranslate: () => void;
  onExplore: () => void;
  onStop: () => void;
}) {
  const ui = PLAN_ERROR_UI[code];
  const hasReason = code === 'PL_CANNOT_PLAN' && reason !== null && reason.trim() !== '';
  const key = code === 'PL_CANNOT_PLAN' && !hasReason ? 'guide.plan.err.PL_CANNOT_PLAN_NO_REASON' : ui.messageKey;
  const run = { retry: onRetry, translate: onTranslate, explore: onExplore, stop: onStop } as const;
  const label = { retry: 'guide.retry', translate: 'guide.translate', explore: 'guide.explore', stop: 'guide.plan.stop' } as const;
  return (
    <Panel>
      {ui.actions.includes('setup') ? (
        <ModelSteps />
      ) : (
        <>
          <Message live={ui.liveRegion}>{t(key, { reason: reason ?? '' })}</Message>
          {hasReason ? <Note>{t('guide.plan.aiLabel')}</Note> : null}
        </>
      )}
      <View style={guideStyles.row}>
        {ui.actions.map((a, i) =>
          a === 'setup' ? null : <GuideButton key={a} primary={i === 0} label={t(label[a])} onPress={run[a]} />,
        )}
      </View>
    </Panel>
  );
}
