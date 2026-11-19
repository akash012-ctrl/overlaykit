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
  onOpenKey,
}: {
  code: PlErrorCode;
  reason: string | null;
  onRetry: () => void;
  onTranslate: () => void;
  onExplore: () => void;
  onStop: () => void;
  /** Opens the Google key screen. Without it the key button is not shown. */
  onOpenKey?: () => void;
}) {
  const ui = PLAN_ERROR_UI[code];
  const hasReason = code === 'PL_CANNOT_PLAN' && reason !== null && reason.trim() !== '';
  const key = code === 'PL_CANNOT_PLAN' && !hasReason ? 'guide.plan.err.PL_CANNOT_PLAN_NO_REASON' : ui.messageKey;
  const run = { retry: onRetry, translate: onTranslate, explore: onExplore, stop: onStop, key: onOpenKey } as const;
  const label = { retry: 'guide.retry', translate: 'guide.translate', explore: 'guide.explore', stop: 'guide.plan.stop', key: 'guide.plan.openKey' } as const;
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
          a === 'setup' || (a === 'key' && onOpenKey === undefined) ? null : (
            <GuideButton key={a} primary={i === 0} destructive={a === 'stop'} label={t(label[a])} onPress={run[a] ?? onStop} />
          ),
        )}
      </View>
    </Panel>
  );
}
