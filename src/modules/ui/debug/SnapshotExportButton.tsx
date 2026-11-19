// OVERLAYKIT_DEBUG_ONLY: loaded only behind __DEV__ (R21.1, R21.6). Developer-facing English text.
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { getSnapshotWriter } from '../../capture';
import { getOcrDebugTools } from '../../ocr';
import type { OcrServiceWithDebug } from '../../ocr';
import type { FrameRef, OcrResult } from '../../shared';
import type { OverlayLayout } from '../overlay/build-items';
import { buildSnapshot, serializeSnapshot } from './snapshot';

export function SnapshotExportButton(props: {
  frame: FrameRef;
  result: OcrResult | null;
  layout: OverlayLayout;
  ocr: unknown;
}) {
  const [status, setStatus] = useState('Export OCR snapshot');
  const onPress = async () => {
    const tools = 'rawLinesFor' in (props.ocr as object) ? getOcrDebugTools(props.ocr as OcrServiceWithDebug) : null;
    const writer = getSnapshotWriter();
    if (!tools || !writer || props.frame.pixels.kind !== 'file') return setStatus('Export unavailable');
    const { frame, result, layout } = props;
    const constants = Platform.constants as { Model?: string; Manufacturer?: string };
    const written = await writer.write({
      frameId: frame.frameId,
      stillUri: props.frame.pixels.uri,
      buildJson: (photo) =>
        serializeSnapshot(
          buildSnapshot({
            frame,
            result,
            rawLines: tools.rawLinesFor(frame.frameId) ?? [],
            layout,
            engine: tools.engineInfo(),
            device: {
              model: constants.Model ?? 'unknown',
              manufacturer: constants.Manufacturer ?? 'unknown',
              androidApiLevel: typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version),
            },
            exportedAt: new Date().toISOString(),
            photo,
          }),
        ),
    });
    setStatus(written.ok ? `Saved ${written.value.jsonUri.split('/').pop()}` : 'Export failed');
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={status} onPress={() => void onPress()} style={styles.button}>
      <Text style={styles.text}>{status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#4A148C', borderRadius: 8 },
  text: { color: '#FFFFFF', fontSize: 14 },
});

/** Release-bundle search marker (R21.6). */
export const DEBUG_MARKER_SNAPSHOTEXPORTBUTTON = 'OVERLAYKIT_DEBUG_ONLY';
