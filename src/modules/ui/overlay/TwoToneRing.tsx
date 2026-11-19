import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/** Ring thickness per tone in dp. Guide highlights and goal boxes use 3 (two tones: 6 dp in all). */
export const RING_WIDTH_DP = 3;

/**
 * A white ring with a near-black ring inside it. One of the two tones contrasts (3:1 or more) with any
 * camera image, which one yellow ring does not. Fills its positioned parent; draws no fill and takes no touches.
 * The parent must leave `2 * width` dp of room, or draw the ring on a box grown by that much.
 */
export function TwoToneRing({ width = RING_WIDTH_DP }: { width?: number }) {
  return (
    <View pointerEvents="none" style={[styles.outer, { borderWidth: width }]}>
      <View style={[styles.inner, { borderWidth: width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderColor: colors.ringLight },
  inner: { flex: 1, borderColor: colors.ringDark },
});
