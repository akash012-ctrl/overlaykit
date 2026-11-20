import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { StringKey } from '../../locale';
import { t } from '../../locale';
import type { DownloadFailure, ModelStatus, PlannerState } from '../../planner';
import { StatusChip } from '../status/StatusChip';
import { colors, radius, spacing } from '../theme';
import { PLAN_ERROR_UI } from './error-map';
import { Button, IconRow, Message, Note, Panel, Title, rowStyles } from '../parts';
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
  const [showSmall, setShowSmall] = useState(false);
  const downloading = big.kind === 'downloading' ? big : null;
  const percent = downloading !== null && downloading.totalBytes > 0 ? Math.floor((downloading.receivedBytes / downloading.totalBytes) * 100) : 0;
  const bigInvalid = invalidKey(big);
  const smallInvalid = invalidKey(small);
  return (
    <ScrollView style={{ flexShrink: 1 }}>
      <Panel>
        {!models.available ? (
          <Message>{t('guide.model.noNative')}</Message>
        ) : (
          <>
            <Title>{t('guide.model.title')}</Title>
            <IconRow icon="info" color={colors.textMuted}>
              <Note>{t('guide.model.size')}</Note>
            </IconRow>
            {downloading !== null ? (
              <>
                <StatusChip
                  busy
                  text={t('guide.model.progress', {
                    percent,
                    received: mb(downloading.receivedBytes),
                    total: mb(downloading.totalBytes),
                  })}
                />
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${percent}%` }]} />
                </View>
                <Button icon="close" label={t('guide.model.cancel')} onPress={models.cancel} />
              </>
            ) : (
              <>
                <Note>{t('guide.model.wifi')}</Note>
                {bigInvalid !== null ? <Message>{t(bigInvalid)}</Message> : null}
                {models.failure !== null ? <Message>{t(FAILURE_KEY[models.failure])}</Message> : null}
                <Button variant="primary" size="lg" stretch icon="download" label={t('guide.model.download')} onPress={models.download} />
              </>
            )}
            {planner.kind === 'failed' ? <Message>{t(PLAN_ERROR_UI[planner.code].messageKey, { reason: '' })}</Message> : null}
            {smallInvalid !== null ? <Message>{t(smallInvalid)}</Message> : null}
            {showSmall ? (
              <View style={styles.inset}>
                <ModelSteps />
                <Button icon="retry" label={t('guide.model.check')} onPress={models.recheck} />
              </View>
            ) : (
              <Button variant="ghost" label={t('guide.model.sideload.title')} onPress={() => setShowSmall(true)} />
            )}
          </>
        )}
        <View style={rowStyles.row}>
          <Button variant="ghost" icon="translate" label={t('guide.translate')} onPress={onTranslate} />
          <Button variant="ghost" icon="explore" label={t('guide.explore')} onPress={onExplore} />
        </View>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  inset: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
});
