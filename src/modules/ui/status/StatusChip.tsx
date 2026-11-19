import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { announce } from '../a11y/announcer';
import { colors, fontSize, radius, spacing } from '../theme';

/**
 * One line that says what the app is doing: reading, listening, thinking, streaming, waiting.
 * The text carries the state. The spinner (`busy`) is extra and is hidden from TalkBack.
 * The text is announced once when it changes. Text sits on a near-opaque backing, never on the video.
 */
export function StatusChip({
  text,
  busy = false,
  announceChange = true,
}: {
  text: string;
  busy?: boolean;
  /** False where another announcement already covers the change (the step card announces the step itself). */
  announceChange?: boolean;
}) {
  useEffect(() => {
    if (announceChange) announce(`status:${text}`, text);
  }, [text, announceChange]);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} style={styles.chip}>
      {busy ? <ActivityIndicator color={colors.text} importantForAccessibility="no-hide-descendants" /> : null}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    flexShrink: 1,
  },
  text: { flexShrink: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '600', lineHeight: 24 },
});
