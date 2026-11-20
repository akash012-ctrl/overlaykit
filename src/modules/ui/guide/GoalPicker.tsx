import { ScrollView, StyleSheet, View } from 'react-native';

import type { Rect } from '../../geometry';
import { quadToRotatedBox } from '../../geometry';
import { getUiLocale, t } from '../../locale';
import type { SourceLocale } from '../../shared';
import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors } from '../theme';
import { StatusChip } from '../status/StatusChip';
import type { GoalLine } from './plan-view-model';
import { Button, Note, Panel, Title, rowStyles } from '../parts';
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
            iconOnly
            style={[
              styles.box,
              { left: centre.x - region.x - w / 2, top: centre.y - region.y - h / 2, width: w, height: h, transform: [{ rotate: `${angleRad}rad` }] },
            ]}
          >
            <CornerMarks />
          </A11yButton>
        );
      })}
    </View>
  );
}

/** Corner length and stroke, in dp. Two tones (white over near-black) keep 3:1 on any image. */
const CORNER = 12;
const STROKE = 3;
const EDGES = [
  { pos: { top: 0, left: 0 }, border: { borderTopWidth: STROKE, borderLeftWidth: STROKE } },
  { pos: { top: 0, right: 0 }, border: { borderTopWidth: STROKE, borderRightWidth: STROKE } },
  { pos: { bottom: 0, left: 0 }, border: { borderBottomWidth: STROKE, borderLeftWidth: STROKE } },
  { pos: { bottom: 0, right: 0 }, border: { borderBottomWidth: STROKE, borderRightWidth: STROKE } },
] as const;

/** Four corner brackets: marks a tappable line with far less ink than a full box. Takes no touches. */
function CornerMarks() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {EDGES.map((edge, i) => (
        <View key={i} style={[styles.cornerShadow, edge.pos, edge.border]}>
          <View style={[styles.corner, edge.border]} />
        </View>
      ))}
    </View>
  );
}

/**
 * Goal choice: the camera reads on its own (D-055), so the lines appear as chips to tap; or say the goal.
 * Nothing here plans or advances.
 */
export function GoalPicker({
  lines,
  onPick,
  onVoiceGoal,
}: {
  lines: Lines;
  onPick: (text: string, source: SourceLocale) => void;
  onVoiceGoal: (goal: string) => void;
}) {
  return (
    <Panel>
      <Title>{t('guide.plan.pickGoal')}</Title>
      <VoiceGoal onConfirm={onVoiceGoal} />
      {lines.length === 0 ? (
        <StatusChip busy icon="readScreen" text={t('guide.plan.reading')} announceChange={false} />
      ) : (
        <>
          <Note>{t('guide.plan.tapHint')}</Note>
          <ScrollView style={styles.list} contentContainerStyle={[rowStyles.row, styles.listContent]}>
            {lines.map((l) => (
              <Button key={l.index} label={l.text} onPress={() => onPick(l.text, l.source)} />
            ))}
          </ScrollView>
        </>
      )}
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
  box: { position: 'absolute', backgroundColor: 'transparent' },
  cornerShadow: { position: 'absolute', width: CORNER + 2, height: CORNER + 2, borderColor: colors.ringDark, margin: -1 },
  corner: { flex: 1, borderColor: colors.ringLight, margin: 1 },
  list: { maxHeight: 148 },
  listContent: { paddingBottom: 2 },
});
