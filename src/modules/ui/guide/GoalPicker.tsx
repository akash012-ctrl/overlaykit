import { ScrollView, StyleSheet, View } from 'react-native';

import type { Rect } from '../../geometry';
import { quadToRotatedBox } from '../../geometry';
import { getUiLocale, t } from '../../locale';
import type { SourceLocale } from '../../shared';
import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { TwoToneRing } from '../overlay/TwoToneRing';
import { StatusChip } from '../status/StatusChip';
import type { GoalLine } from './plan-view-model';
import { GuideButton, Message, Note, Panel } from './parts';
import { VoiceGoal } from './VoiceGoal';

type Lines = readonly { readonly index: number; readonly text: string; readonly source: SourceLocale }[];

/**
 * Tappable boxes over the text the camera read, placed by `geometry`. At least 48 dp each. They stay where
 * the text was in the last reading, so a moved camera needs a new reading. The list in the panel does the same for TalkBack.
 */
export function GoalBoxes({
  boxes,
  region,
  onPick,
}: {
  boxes: readonly GoalLine[];
  region: Rect | null;
  onPick: (text: string, source: SourceLocale) => void;
}) {
  if (region === null) return null;
  return (
    <View style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]} pointerEvents="box-none">
      {boxes.map((b) => {
        const { centre, width, height, angleRad } = quadToRotatedBox(b.viewQuad);
        const w = Math.max(width, MIN_TOUCH_TARGET_DP);
        const h = Math.max(height, MIN_TOUCH_TARGET_DP);
        return (
          <A11yButton
            key={b.index}
            label={b.text}
            onPress={() => onPick(b.text, b.source)}
            textStyle={styles.hiddenText}
            style={[
              styles.box,
              { left: centre.x - region.x - w / 2, top: centre.y - region.y - h / 2, width: w, height: h, transform: [{ rotate: `${angleRad}rad` }] },
            ]}
          >
            <TwoToneRing width={2} />
          </A11yButton>
        );
      })}
    </View>
  );
}

/** Goal choice: read the screen, tap a line, or say it. Nothing here plans or advances. */
export function GoalPicker({
  lines,
  reading,
  onRead,
  onPick,
  onVoiceGoal,
}: {
  lines: Lines;
  reading: boolean;
  onRead: () => void;
  onPick: (text: string, source: SourceLocale) => void;
  onVoiceGoal: (goal: string) => void;
}) {
  return (
    <Panel>
      <Message>{t('guide.plan.pickGoal')}</Message>
      {reading ? <StatusChip busy text={t('guide.plan.reading')} /> : null}
      <GuideButton primary label={reading ? t('guide.plan.reading') : t('guide.plan.readScreen')} onPress={onRead} />
      {lines.length === 0 ? (
        <Note>{t('guide.plan.noLines')}</Note>
      ) : (
        <>
          <Note>{t('guide.plan.tapHint')}</Note>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {lines.map((l) => (
              <GuideButton key={l.index} label={l.text} onPress={() => onPick(l.text, l.source)} />
            ))}
          </ScrollView>
        </>
      )}
      <VoiceGoal onConfirm={onVoiceGoal} />
    </Panel>
  );
}

/** The goal's source language for the translation provider. Voice in Kannada has none, so it is not translated. */
export function voiceGoalSource(): SourceLocale | null {
  const locale = getUiLocale();
  return locale === 'kn' ? null : locale;
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  box: { position: 'absolute', backgroundColor: 'rgba(11,15,20,0.15)' },
  // The box shows only an outline. The line text is the accessibility label, so it is drawn invisible.
  hiddenText: { color: 'transparent', fontSize: 14 },
  list: { maxHeight: 140 },
  listContent: { gap: 8 },
});
