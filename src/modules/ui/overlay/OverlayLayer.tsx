import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Rect } from '../../geometry';
import { t } from '../../locale';
import type { OverlayItem } from './build-items';
import {
  LABEL_COLOURS,
  LABEL_FONT_SIZE_SP,
  LABEL_LINE_HEIGHT_FACTOR,
  LABEL_PADDING_DP,
  LOW_QUALITY_COLOURS,
  MIN_TOUCH_TARGET_DP,
  OUTLINE_COLOUR,
  OUTLINE_WIDTH_DP,
} from './styles';

function labelTexts(item: OverlayItem) {
  const text = item.content.text ?? t('ocr.unsupported.marker');
  const marker = item.state.kind === 'translated' ? item.state.text : t(item.content.markerKey);
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
export function OverlayLayer({ items, region }: { items: readonly OverlayItem[]; region: Rect | null }) {
  const [open, setOpen] = useState<OverlayItem | null>(null);
  if (!region) return null;
  const lineHeight = LABEL_FONT_SIZE_SP * LABEL_LINE_HEIGHT_FACTOR;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.clip, { left: region.x, top: region.y, width: region.width, height: region.height }]}
    >
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
          />
        );
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
            />
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
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, { color: pair.text, lineHeight }]}>
              {text}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.labelText, { color: pair.text, lineHeight }]}>
              {item.content.lowQuality ? `⚠ ${marker}` : `● ${marker}`}
            </Text>
          </Pressable>,
        ];
      })}
      <LabelDetailSheet item={open} onClose={() => setOpen(null)} />
    </View>
  );
}

/** Full text and state of one label, with wrapping and no fixed height (R19.4). */
export function LabelDetailSheet({ item, onClose }: { item: OverlayItem | null; onClose: () => void }) {
  if (!item) return null;
  const { text, marker } = labelTexts(item);
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetText}>{text}</Text>
          <Text style={styles.sheetMarker}>{marker}</Text>
          {item.content.lowQuality ? <Text style={styles.sheetMarker}>{t('ocr.lowQuality.marker')}</Text> : null}
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
  outline: { position: 'absolute', borderWidth: OUTLINE_WIDTH_DP, borderColor: OUTLINE_COLOUR, borderRadius: 2 },
  label: { position: 'absolute', paddingHorizontal: LABEL_PADDING_DP, paddingVertical: LABEL_PADDING_DP, borderRadius: 4 },
  labelText: { fontSize: LABEL_FONT_SIZE_SP, fontWeight: '600' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#11161C', padding: 20, gap: 12 },
  sheetText: { color: '#FFFFFF', fontSize: 20, lineHeight: 32 },
  sheetMarker: { color: '#D9E3EE', fontSize: 16, lineHeight: 26 },
  sheetButton: { minHeight: MIN_TOUCH_TARGET_DP, alignItems: 'center', justifyContent: 'center', backgroundColor: '#37474F', borderRadius: 8 },
  sheetButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
