import { View } from 'react-native';

import { t } from '../../locale';
import type { PlErrorCode } from '../../shared';
import { PLAN_ERROR_UI } from './error-map';
import { ModelSteps } from './ModelGate';
import type { ButtonVariant } from '../parts';
import { Button, IconRow, Message, Note, Panel, rowStyles } from '../parts';
import type { IconName } from '../icons/Icon';
import { colors } from '../theme';

type Action = 'retry' | 'translate' | 'explore' | 'stop' | 'key';
const ICON: Readonly<Record<Action, IconName>> = { retry: 'retry', translate: 'translate', explore: 'explore', stop: 'stop', key: 'key' };
/** First action is the main one; Stop is destructive; Translate and Explore are a quiet way out (the switcher offers them too). */
function variantFor(a: Action, index: number): ButtonVariant {
  if (a === 'stop') return 'destructive';
  if (a === 'translate' || a === 'explore') return 'ghost';
  return index === 0 ? 'primary' : 'secondary';
}

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
          <IconRow icon="error" color={colors.dangerText}>
            <Message live={ui.liveRegion}>{t(key, { reason: reason ?? '' })}</Message>
          </IconRow>
          {hasReason ? <Note>{t('guide.plan.aiLabel')}</Note> : null}
        </>
      )}
      <View style={rowStyles.row}>
        {ui.actions.map((a, i) =>
          a === 'setup' || (a === 'key' && onOpenKey === undefined) ? null : (
            <Button key={a} variant={variantFor(a, i)} icon={ICON[a]} label={t(label[a])} onPress={run[a] ?? onStop} />
          ),
        )}
      </View>
    </Panel>
  );
}
