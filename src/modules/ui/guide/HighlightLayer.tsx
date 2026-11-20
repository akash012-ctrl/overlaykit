import { StyleSheet, Text, View } from 'react-native';

import type { Rect } from '../../geometry';
import { placeLabels, quadToRotatedBox } from '../../geometry';
import { t } from '../../locale';
import { Icon } from '../icons/Icon';
import { GlideView, PulseView } from '../motion/motion';
import { LABEL_FONT_SIZE_SP, LABEL_LINE_HEIGHT_FACTOR, LABEL_PADDING_DP } from '../overlay/styles';
import { colors, radius, spacing } from '../theme';
import type { PlanHighlight } from './plan-view-model';

/** Ring thickness per tone, in dp: the target colour outside, near-black inside, so one tone shows on any image. */
const RING_DP = 3;
const RING_TOTAL_DP = 2 * RING_DP;
/** Rough average glyph width as a fraction of the font size, for the label box estimate. */
const GLYPH_WIDTH_FACTOR = 0.62;
const ICON_DP = 16;

/**
 * The next-step mark: a two-tone ring on the target, drawn on the image at the quad geometry gave, and a label
 * naming it. It glides to the target's new place on each read and breathes unless reduced motion is on.
 * It is a 2D mark on the latest frame, not tracking and not AR (R18.8). Positions come from geometry.
 */
export function HighlightLayer({ highlight, region }: { highlight: PlanHighlight | null; region: Rect | null }) {
  if (highlight === null || region === null) return null;
  const { centre, width, height, angleRad } = quadToRotatedBox(highlight.viewQuad);
  const text = highlight.label;
  const pad = LABEL_PADDING_DP + 2;
  const labelHeight = LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR + 2 * pad;
  const labelWidth = Math.min(region.width, text.length * LABEL_FONT_SIZE_SP * GLYPH_WIDTH_FACTOR + ICON_DP + 3 * pad);
  const placement = placeLabels(
    [{ id: highlight.frameId, quad: highlight.viewQuad, size: { width: labelWidth, height: labelHeight } }],
    region,
  )[0];
  const a11y = t('guide.highlightLabel', { component: text });

  return (
    <View pointerEvents="none" style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]}>
      <GlideView
        key="target"
        pointerEvents="none"
        style={[
          styles.ringHost,
          {
            left: centre.x - region.x - width / 2 - RING_TOTAL_DP,
            top: centre.y - region.y - height / 2 - RING_TOTAL_DP,
            width: width + 2 * RING_TOTAL_DP,
            height: height + 2 * RING_TOTAL_DP,
            transform: [{ rotate: `${angleRad}rad` }],
          },
        ]}
      >
        <View accessible accessibilityLabel={a11y} style={StyleSheet.absoluteFill}>
          <PulseView style={StyleSheet.absoluteFill}>
            <View style={styles.outer}>
              <View style={styles.inner} />
            </View>
          </PulseView>
        </View>
      </GlideView>
      {placement?.kind === 'placed' ? (
        <GlideView
          key="target-label"
          pointerEvents="none"
          style={[
            styles.label,
            { left: placement.box.x - region.x, top: placement.box.y - region.y, width: placement.box.width, minHeight: placement.box.height, padding: pad },
          ]}
        >
          <Icon name="next" size={ICON_DP} color={colors.target} />
          <Text numberOfLines={1} style={styles.labelText}>
            {text}
          </Text>
        </GlideView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  ringHost: { position: 'absolute' },
  outer: { flex: 1, borderWidth: RING_DP, borderColor: colors.target, borderRadius: radius.md },
  inner: { flex: 1, borderWidth: RING_DP, borderColor: colors.ringDark, borderRadius: radius.md - RING_DP },
  label: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.ringDark,
    borderWidth: 1,
    borderColor: colors.target,
    borderRadius: radius.sm,
  },
  labelText: {
    flexShrink: 1,
    color: colors.target,
    fontSize: LABEL_FONT_SIZE_SP,
    lineHeight: LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR,
    fontWeight: '700',
  },
});
