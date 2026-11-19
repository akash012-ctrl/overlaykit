import { ScrollView, View } from 'react-native';

import type { StringKey } from '../../locale';
import { t } from '../../locale';
import type { DownloadFailure, ModelStatus, PlannerState } from '../../planner';
import { PLAN_ERROR_UI } from './error-map';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';
import type { Models } from './useModels';

/** The by-hand steps for the small model. Shown inside the gate and when the planner file is missing. */
export function ModelSteps() {
  return (
    <>
      <Message>{t('guide.model.sideload.title')}</Message>
      <Note>{t('guide.model.sideload.what')}</Note>
      <Note>{t('guide.model.sideload.step1')}</Note>
      <Note>{t('guide.model.sideload.step2')}</Note>
      <Note>{t('guide.model.sideload.step3')}</Note>
    </>
  );
}

const FAILURE_KEY: Readonly<Record<DownloadFailure, StringKey>> = {
  NO_URL: 'guide.model.fail.failed',
  BAD_URL: 'guide.model.fail.failed',
  BUSY: 'guide.model.fail.failed',
  OFFLINE: 'guide.model.fail.offline',
  NO_SPACE: 'guide.model.fail.noSpace',
  HTTP: 'guide.model.fail.http',
  SIZE_MISMATCH: 'guide.model.fail.mismatch',
  HASH_MISMATCH: 'guide.model.fail.mismatch',
  CANCELLED: 'guide.model.cancelled',
  FAILED: 'guide.model.fail.failed',
};

const mb = (bytes: number): number => Math.round(bytes / 1_000_000);

function invalidKey(s: ModelStatus): StringKey | null {
  if (s.kind !== 'invalid') return null;
  return s.reason === 'size' ? 'guide.model.invalid.size' : 'guide.model.invalid.checksum';
}

/**
 * Shown instead of the goal picker while no planner file can run. Nothing downloads until the user taps Download.
 * The big model downloads in the app; the small one is put on the phone by hand. The Wi-Fi line is text only.
 */
export function ModelGate({
  planner,
  models,
  onTranslate,
  onExplore,
}: {
  planner: PlannerState;
  models: Models;
  onTranslate: () => void;
  onExplore: () => void;
}) {
  const { big, small } = models;
  const downloading = big.kind === 'downloading' ? big : null;
  const bigInvalid = invalidKey(big);
  const smallInvalid = invalidKey(small);
  return (
    <ScrollView style={{ flexShrink: 1 }}>
      <Panel>
        {!models.available ? (
          <Message>{t('guide.model.noNative')}</Message>
        ) : (
          <>
            <Message>{t('guide.model.title')}</Message>
            <Note>{t('guide.model.size')}</Note>
            {downloading !== null ? (
              <>
                <Message>
                  {t('guide.model.progress', {
                    percent: downloading.totalBytes > 0 ? Math.floor((downloading.receivedBytes / downloading.totalBytes) * 100) : 0,
                    received: mb(downloading.receivedBytes),
                    total: mb(downloading.totalBytes),
                  })}
                </Message>
                <GuideButton label={t('guide.model.cancel')} onPress={models.cancel} />
              </>
            ) : (
              <>
                <Note>{t('guide.model.wifi')}</Note>
                {bigInvalid !== null ? <Message>{t(bigInvalid)}</Message> : null}
                {models.failure !== null ? <Message>{t(FAILURE_KEY[models.failure])}</Message> : null}
                <GuideButton primary label={t('guide.model.download')} onPress={models.download} />
              </>
            )}
            {planner.kind === 'failed' ? <Message>{t(PLAN_ERROR_UI[planner.code].messageKey, { reason: '' })}</Message> : null}
            <ModelSteps />
            {smallInvalid !== null ? <Message>{t(smallInvalid)}</Message> : null}
            <GuideButton label={t('guide.model.check')} onPress={models.recheck} />
          </>
        )}
        <View style={guideStyles.row}>
          <GuideButton label={t('guide.translate')} onPress={onTranslate} />
          <GuideButton label={t('guide.explore')} onPress={onExplore} />
        </View>
      </Panel>
    </ScrollView>
  );
}
