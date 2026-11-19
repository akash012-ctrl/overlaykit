import { StyleSheet, Text, View } from 'react-native';

import type { Rect } from '../../geometry';
import { placeLabels, quadToRotatedBox } from '../../geometry';
import { LABEL_FONT_SIZE_SP, LABEL_LINE_HEIGHT_FACTOR, LABEL_PADDING_DP, OUTLINE_WIDTH_DP } from '../overlay/styles';
import { t } from '../../locale';
import type { HighlightModel } from './highlight-model';

/** Two-tone outline: one tone contrasts on any background (R12.8). Checked on device screenshots, not by a test. */
const OUTLINE_LIGHT = '#FFFFFF';
const OUTLINE_DARK = '#0B0F14';
const LABEL_BACKING = '#0B0F14';
const LABEL_TEXT = '#FFFFFF';
/** Rough average glyph width as a fraction of the font size, for the label box estimate. */
const GLYPH_WIDTH_FACTOR = 0.7;

/**
 * A 2D mark drawn on the image at the quad geometry gave. It is not tracking and not AR (R18.8).
 * Positions come from geometry; nothing here converts coordinates beyond subtracting the clip origin.
 */
export function HighlightLayer({
  highlight,
  region,
}: {
  highlight: HighlightModel | null;
  region: Rect | null;
}) {
  if (highlight === null || region === null) return null;
  const { centre, width, height, angleRad } = quadToRotatedBox(highlight.viewQuad);
  const text = highlight.label;
  const pad = LABEL_PADDING_DP;
  const labelHeight = LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR + 2 * pad;
  const labelWidth = Math.min(region.width, text.length * LABEL_FONT_SIZE_SP * GLYPH_WIDTH_FACTOR + 2 * pad);
  const placement = placeLabels(
    [{ id: highlight.componentId, quad: highlight.viewQuad, size: { width: labelWidth, height: labelHeight } }],
    region,
  )[0];
  const a11y = t('guide.highlightLabel', { component: text });

  return (
    <View
      pointerEvents="none"
      style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]}
    >
      <View
        accessible
        accessibilityLabel={a11y}
        style={[
          styles.outerOutline,
          {
            left: centre.x - region.x - width / 2 - OUTLINE_WIDTH_DP,
            top: centre.y - region.y - height / 2 - OUTLINE_WIDTH_DP,
            width: width + 2 * OUTLINE_WIDTH_DP,
            height: height + 2 * OUTLINE_WIDTH_DP,
            transform: [{ rotate: `${angleRad}rad` }],
          },
        ]}
      >
        <View style={styles.innerOutline} />
      </View>
      {placement?.kind === 'placed' ? (
        <View
          style={[
            styles.label,
            {
              left: placement.box.x - region.x,
              top: placement.box.y - region.y,
              width: placement.box.width,
              minHeight: placement.box.height,
              padding: pad,
            },
          ]}
        >
          <Text style={styles.labelText}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  outerOutline: { position: 'absolute', borderWidth: OUTLINE_WIDTH_DP, borderColor: OUTLINE_LIGHT },
  innerOutline: { flex: 1, borderWidth: OUTLINE_WIDTH_DP, borderColor: OUTLINE_DARK },
  label: { position: 'absolute', backgroundColor: LABEL_BACKING, borderWidth: 1, borderColor: OUTLINE_LIGHT },
  labelText: { color: LABEL_TEXT, fontSize: LABEL_FONT_SIZE_SP, lineHeight: LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR },
});
