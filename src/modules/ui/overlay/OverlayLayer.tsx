import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Rect } from '../../geometry';
import type { Point } from '../../shared';
import type { ViewComponent } from '../explore/component-items';
import { TR_UI } from '../translate/error-map';
import { t } from '../../locale';
import { GlideView } from '../motion/motion';
import { colors, fontSize, lineHeight as lineHeights, radius, spacing } from '../theme';
import { TwoToneRing } from './TwoToneRing';
import type { OverlayItem } from './build-items';
import { isSingleRow } from './build-items';
import {
  LABEL_COLOURS,
  LABEL_FONT_SIZE_SP,
  LABEL_LINE_HEIGHT_FACTOR,
  LABEL_PADDING_DP,
  LOW_QUALITY_COLOURS,
  MIN_TOUCH_TARGET_DP,
  OUTLINE_WIDTH_DP,
} from './styles';

function labelTexts(item: OverlayItem) {
  const text = item.content.text ?? t('ocr.unsupported.marker');
  const marker = item.state.kind === 'translated' && !item.state.unchanged ? item.state.text : t(item.content.markerKey);
  const state = item.content.lowQuality ? `${t(item.content.markerKey)}. ${t('ocr.lowQuality.marker')}` : t(item.content.markerKey);
  return { text, marker, a11y: t('label.a11y', { text, state }) };
}

function colours(item: OverlayItem) {
  return item.content.lowQuality ? LOW_QUALITY_COLOURS : LABEL_COLOURS[item.state.kind];
}

/**
 * Draws Source_Outlines and Label boxes inside a clip container at the Visible
 * region (DD-7). Positions come from geometry through build-items; nothing here
 * converts coordinates beyond subtracting the container's origin.
 */
/** Explore mode: labels are drawn but not pressable. One tap layer reports view-space points, and geometry decides the hit. */
export type ExploreLayer = {
  readonly components: readonly ViewComponent[];
  readonly highlightId: string | null;
  readonly onTap: (point: Point) => void;
};

export function OverlayLayer({
  items,
  region,
  explore,
  onRetry,
  live = false,
}: {
  items: readonly OverlayItem[];
  region: Rect | null;
  /** Live frames show lens chips only (D-054); a held still shows every label with its state. */
  live?: boolean;
  explore?: ExploreLayer;
  onRetry?: (id: string) => void;
}) {
  const [open, setOpen] = useState<OverlayItem | null>(null);
  if (!region) return null;
  const lineHeight = LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR;

  if (live) {
    return (
      <View pointerEvents="box-none" style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]}>
        {explore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mode.explore')}
            onPress={(e) => explore.onTap({ x: e.nativeEvent.locationX + region.x, y: e.nativeEvent.locationY + region.y })}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View pointerEvents={explore ? 'none' : 'box-none'} style={StyleSheet.absoluteFill}>
          {lensChips(items, region).map((chip) => (
            <GlideView
              key={chip.key}
              pointerEvents="box-none"
              style={[styles.lensHost, { left: chip.left, top: chip.top, width: chip.width, height: chip.height, transform: [{ rotate: `${chip.angleRad}rad` }] }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={labelTexts(chip.item).a11y}
                hitSlop={{ top: chip.slop, bottom: chip.slop }}
                onPress={() => setOpen(chip.item)}
                style={styles.lens}
              >
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.lensText}>
                  {chip.text}
                </Text>
              </Pressable>
            </GlideView>
          ))}
        </View>
        <LabelDetailSheet item={open} onClose={() => setOpen(null)} onRetry={onRetry} />
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]}
    >
      {explore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mode.explore')}
          onPress={(e) => explore.onTap({ x: e.nativeEvent.locationX + region.x, y: e.nativeEvent.locationY + region.y })}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View pointerEvents={explore ? 'none' : 'box-none'} style={StyleSheet.absoluteFill}>
      {items.map((item) => {
        const { centre, width, height, angleRad } = item.outline;
        const outline = (
          <View
            key={`${item.id}-outline`}
            pointerEvents={item.label.kind === 'unplaced' ? 'auto' : 'none'}
            style={[
              styles.outline,
              {
                left: centre.x - region.x - width / 2,
                top: centre.y - region.y - height / 2,
                width,
                height,
                transform: [{ rotate: `${angleRad}rad` }],
              },
            ]}
          >
            <TwoToneRing width={OUTLINE_WIDTH_DP} />
          </View>
        );
        if (item.label.kind === 'unplaced' && isSingleRow(item.state) && !item.content.lowQuality) {
          // No free spot beside the line: the translation is drawn over the line itself, like a lens (D-054).
          const { marker, a11y } = labelTexts(item);
          const pair = colours(item);
          const w = Math.min(region.width, Math.max(width, marker.length * LABEL_FONT_SIZE_SP * 0.56 + 4 * LABEL_PADDING_DP));
          const h = Math.max(height, lineHeight + LABEL_PADDING_DP);
          const slopY = Math.max(0, (MIN_TOUCH_TARGET_DP - h) / 2);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              hitSlop={{ top: slopY, bottom: slopY }}
              onPress={() => setOpen(item)}
              style={[
                styles.label,
                styles.inPlace,
                {
                  left: centre.x - region.x - w / 2,
                  top: centre.y - region.y - h / 2,
                  width: w,
                  height: h,
                  backgroundColor: pair.backing,
                  transform: [{ rotate: `${angleRad}rad` }],
                },
              ]}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, styles.translation, { color: pair.text, lineHeight }]}>
                {marker}
              </Text>
            </Pressable>
          );
        }
        if (item.label.kind === 'unplaced') {
          const { a11y } = labelTexts(item);
          const slopX = Math.max(0, (MIN_TOUCH_TARGET_DP - width) / 2);
          const slopY = Math.max(0, (MIN_TOUCH_TARGET_DP - height) / 2);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              hitSlop={{ left: slopX, right: slopX, top: slopY, bottom: slopY }}
              onPress={() => setOpen(item)}
              style={[
                styles.outline,
                {
                  left: centre.x - region.x - width / 2,
                  top: centre.y - region.y - height / 2,
                  width,
                  height,
                  transform: [{ rotate: `${angleRad}rad` }],
                },
              ]}
            >
              <TwoToneRing width={OUTLINE_WIDTH_DP} />
            </Pressable>
          );
        }
        const box = item.label.box;
        const { text, marker, a11y } = labelTexts(item);
        const pair = colours(item);
        return [
          outline,
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            onPress={() => setOpen(item)}
            style={[
              styles.label,
              {
                left: box.x - region.x,
                top: box.y - region.y,
                width: box.width,
                minHeight: box.height,
                backgroundColor: pair.backing,
              },
            ]}
          >
            {isSingleRow(item.state) && !item.content.lowQuality ? (
              // The translation is the label: the source text is right beside it in the picture (D-054).
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, styles.translation, { color: pair.text, lineHeight }]}>
                {marker}
              </Text>
            ) : (
              <>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, { color: pair.text, lineHeight }]}>
                  {text}
                </Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, { color: pair.text, lineHeight }]}>
                  {item.content.lowQuality ? `⚠ ${marker}` : `● ${marker}`}
                </Text>
              </>
            )}
          </Pressable>,
        ];
      })}
      </View>
      {explore?.components.map((c) => (
        <View
          key={`component-${c.id}`}
          accessible
          accessibilityLabel={c.id}
          pointerEvents="none"
          style={[
            styles.componentOutline,
            {
              left: c.outline.centre.x - region.x - c.outline.width / 2,
              top: c.outline.centre.y - region.y - c.outline.height / 2,
              width: c.outline.width,
              height: c.outline.height,
              transform: [{ rotate: `${c.outline.angleRad}rad` }],
            },
          ]}
        >
          <TwoToneRing width={c.id === explore.highlightId ? 4 : 3} />
        </View>
      ))}
      <LabelDetailSheet item={open} onClose={() => setOpen(null)} onRetry={onRetry} />
    </View>
  );
}

/** Chip height on the live image: one text row, never smaller than the line it covers. */
const LENS_FONT_SP = 15;
const LENS_ROW = Math.round(LENS_FONT_SP * 1.4);

/**
 * Lens chips for a live frame: one per translated line, drawn over that line and sized to the translation.
 * Keyed by the translated text (and its repeat count), so a chip glides to the line's new place on the next frame.
 */
export function lensChips(items: readonly OverlayItem[], region: Rect) {
  const seen = new Map<string, number>();
  return items.flatMap((item) => {
    if (!isSingleRow(item.state)) return [];
    const text = item.state.text;
    const n = (seen.get(text) ?? 0) + 1;
    seen.set(text, n);
    const { centre, width, height, angleRad } = item.outline;
    const w = Math.min(region.width, Math.max(width, text.length * LENS_FONT_SP * 0.56 + 2 * spacing.md));
    const h = Math.max(height, LENS_ROW + 2 * spacing.xs);
    return [{
      key: `${text}#${n}`,
      item,
      text,
      left: centre.x - region.x - w / 2,
      top: centre.y - region.y - h / 2,
      width: w,
      height: h,
      angleRad,
      slop: Math.max(0, (MIN_TOUCH_TARGET_DP - h) / 2),
    }];
  });
}

/** Full text and state of one label, with wrapping and no fixed height (R19.4). */
export function LabelDetailSheet({ item, onClose, onRetry }: { item: OverlayItem | null; onClose: () => void; onRetry?: (id: string) => void }) {
  if (!item) return null;
  const { text, marker } = labelTexts(item);
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} importantForAccessibility="no" />
          <Text style={styles.sheetText}>{text}</Text>
          <Text style={styles.sheetMarker}>{marker}</Text>
          {item.content.lowQuality ? <Text style={styles.sheetMarker}>{t('ocr.lowQuality.marker')}</Text> : null}
          {item.state.kind === 'failed' && onRetry && (TR_UI[item.state.code].control === 'retry' || TR_UI[item.state.code].control === 'auto-retry') ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('label.retry')}
              onPress={() => {
                onRetry(item.id);
                onClose();
              }}
              style={styles.sheetButton}
            >
              <Text style={styles.sheetButtonText}>{t('label.retry')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('action.closeSheet')}
            onPress={onClose}
            style={styles.sheetButton}
          >
            <Text style={styles.sheetButtonText}>{t('action.closeSheet')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  outline: { position: 'absolute' },
  componentOutline: { position: 'absolute' },
  label: { position: 'absolute', paddingHorizontal: LABEL_PADDING_DP + 2, paddingVertical: LABEL_PADDING_DP, borderRadius: 8, justifyContent: 'center' },
  labelText: { fontSize: LABEL_FONT_SIZE_SP, fontWeight: '600' },
  translation: { fontWeight: '700' },
  inPlace: { paddingVertical: 0, borderWidth: 1, borderColor: colors.ringLight },
  lensHost: { position: 'absolute' },
  lens: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.lens,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
  },
  lensText: { color: colors.text, fontSize: LENS_FONT_SP, lineHeight: LENS_ROW, fontWeight: '600', textAlign: 'center' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: colors.outlineStrong },
  sheetText: { color: colors.text, fontSize: fontSize.title + 2, lineHeight: 32, fontWeight: '600' },
  sheetMarker: { color: colors.textMuted, fontSize: fontSize.body, lineHeight: lineHeights.body },
  sheetButton: { minHeight: MIN_TOUCH_TARGET_DP, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.outline },
  sheetButtonText: { color: colors.text, fontSize: fontSize.body, fontWeight: '600' },
});
