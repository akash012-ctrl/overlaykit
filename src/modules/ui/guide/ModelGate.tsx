import { View } from 'react-native';

import { t } from '../../locale';
import type { PlannerState } from '../../planner';
import { PLAN_ERROR_UI } from './error-map';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';

/** What to do when the planner file is missing. The app never downloads it (D-048). */
export function ModelSteps() {
  return (
    <>
      <Message>{t('guide.plan.model.title')}</Message>
      <Note>{t('guide.plan.model.what')}</Note>
      <Note>{t('guide.plan.model.step1')}</Note>
      <Note>{t('guide.plan.model.step2')}</Note>
      <Note>{t('guide.plan.model.step3')}</Note>
    </>
  );
}

/** Shown instead of the goal picker while the planner cannot run. A plain state, never a crash. */
export function ModelGate({
  planner,
  onTranslate,
  onExplore,
}: {
  planner: PlannerState;
  onTranslate: () => void;
  onExplore: () => void;
}) {
  return (
    <Panel>
      {planner.kind === 'missing' ? <ModelSteps /> : null}
      {planner.kind === 'downloading' ? (
        <Message>
          {t('guide.plan.model.copying', {
            percent: planner.totalBytes > 0 ? Math.floor((planner.receivedBytes / planner.totalBytes) * 100) : 0,
          })}
        </Message>
      ) : null}
      {planner.kind === 'failed' ? <Message>{t(PLAN_ERROR_UI[planner.code].messageKey, { reason: '' })}</Message> : null}
      {planner.kind === 'loading' ? <Message>{t('guide.plan.model.loading')}</Message> : null}
      <View style={guideStyles.row}>
        <GuideButton primary label={t('guide.translate')} onPress={onTranslate} />
        <GuideButton label={t('guide.explore')} onPress={onExplore} />
      </View>
    </Panel>
  );
}
