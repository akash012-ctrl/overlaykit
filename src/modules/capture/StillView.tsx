import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import type { FrameRef, Size } from '../shared';

export type StillViewProps = {
  readonly frame: FrameRef;
  readonly onLayout: (viewSize: Size) => void;
  readonly style?: StyleProp<ImageStyle>;
};

/** React Native Image with resizeMode "cover": the scaling the geometry module assumes (R3.10). */
export function StillView({ frame, onLayout, style }: StillViewProps) {
  if (frame.pixels.kind !== 'file') return null;
  return (
    <Image
      source={{ uri: frame.pixels.uri }}
      resizeMode="cover"
      style={[StyleSheet.absoluteFill, style]}
      onLayout={(event) => onLayout({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      accessibilityIgnoresInvertColors
      importantForAccessibility="no"
    />
  );
}
