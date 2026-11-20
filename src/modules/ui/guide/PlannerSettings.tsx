import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t, useLocaleSettings } from '../../locale';
import { LIVE_CONSENT_VERSION, hasValidConsent, resolvePlannerSelection } from './live-view-model';
import type { LiveKeyPort } from './live-view-model';
import { LiveConsentScreen } from './LiveConsentScreen';
import { LiveKeyScreen } from './LiveKeyScreen';
import { Button, Card, Note, RadioRow, SectionLabel, rowStyles } from '../parts';
import { spacing } from '../theme';

type Sub = 'none' | 'key' | 'consent';

/**
 * Settings: the planner choice (R15.1), the Google key (R17) and the Gemini Live notice (R16.2).
 * The saved choice stays 'on-device' unless the user picks Gemini Live with a key and consent in place.
 * Deleting the key sets the choice back to 'on-device' and calls `onKeyDeleted` so the parent ends any session (R17.4).
 */
export function PlannerSettings({ keys, onKeyDeleted }: { keys: LiveKeyPort; onKeyDeleted: () => void }) {
  const s = useLocaleSettings();
  const [sub, setSub] = useState<Sub>('none');
  const [hasKey, setHasKey] = useState(false);
  /** Set when the user picked Gemini Live and was sent to add a key or accept first. */
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    void keys.masked().then((r) => {
      if (alive) setHasKey(r.ok);
    });
    return () => {
      alive = false;
    };
  }, [keys]);

  const choose = useCallback(
    (want: 'on-device' | 'gemini-live') => {
      const next = resolvePlannerSelection(want, { consent: s.liveConsent, hasKey });
      if (next.kind === 'set') {
        setPending(false);
        void s.setPlannerChoice(next.choice);
      } else {
        setPending(want === 'gemini-live');
        setSub(next.kind === 'open-key' ? 'key' : 'consent');
      }
    },
    [s, hasKey],
  );

  const afterKey = () => {
    setSub('none');
    if (pending && hasKey) choose('gemini-live');
  };

  if (sub === 'key') {
    return (
      <LiveKeyScreen
        keys={keys}
        onChanged={(has) => {
          setHasKey(has);
          if (!has) {
            setPending(false);
            void s.setPlannerChoice('on-device');
            onKeyDeleted();
          }
        }}
        onDone={() => {
          if (pending && hasKey && !hasValidConsent(s.liveConsent)) setSub('consent');
          else afterKey();
        }}
      />
    );
  }

  if (sub === 'consent') {
    return (
      <LiveConsentScreen
        onAccept={() => {
          void s.setLiveConsent({ version: LIVE_CONSENT_VERSION }).then(() => {
            setSub('none');
            if (pending) void s.setPlannerChoice('gemini-live');
            setPending(false);
          });
        }}
        onDecline={() => {
          // Declining sends nothing, stores no consent and leaves the planner on this phone (R16.2).
          setPending(false);
          setSub('none');
          void s.setLiveConsent(null);
          void s.setPlannerChoice('on-device');
        }}
      />
    );
  }

  const live = s.plannerChoice === 'gemini-live';
  const onDevice = t('settings.planner.onDevice');
  const liveName = t('settings.planner.live');
  return (
    <View style={styles.section}>
      <SectionLabel>{t('settings.planner.title')}</SectionLabel>
      <Card style={styles.list}>
        <RadioRow
          first
          label={onDevice}
          a11yLabel={live ? onDevice : t('settings.planner.selected', { name: onDevice })}
          selected={!live}
          onPress={() => choose('on-device')}
        />
        <RadioRow
          label={liveName}
          a11yLabel={live ? t('settings.planner.selected', { name: liveName }) : liveName}
          selected={live}
          onPress={() => choose('gemini-live')}
        />
      </Card>
      <Note>{t('settings.planner.liveNote')}</Note>
      <View style={rowStyles.row}>
        <Button icon="key" label={t('live.key.title')} onPress={() => setSub('key')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  list: { padding: 0, gap: 0 },
});
