import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { announce } from '../a11y/announcer';
import type { IconName } from '../icons/Icon';
import { Icon } from '../icons/Icon';
import { FadeInView } from '../motion/motion';
import { colors, fontSize, lineHeight, radius, spacing } from '../theme';

/**
 * One line that says what the app is doing: reading, listening, thinking, streaming, waiting.
 * The text carries the state. The spinner and icon are extra and hidden from TalkBack.
 * The text is announced once when it changes and cross-fades. It sits on a near-opaque backing, never on the video.
 */
export function StatusChip({
  text,
  busy = false,
  icon,
  announceChange = true,
}: {
  text: string;
  busy?: boolean;
  icon?: IconName;
  /** False where another announcement already covers the change (the step card announces the step itself). */
  announceChange?: boolean;
}) {
  useEffect(() => {
    if (announceChange) announce(`status:${text}`, text);
  }, [text, announceChange]);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} style={styles.chip}>
      {busy ? <ActivityIndicator size="small" color={colors.accentText} importantForAccessibility="no-hide-descendants" /> : null}
      {!busy && icon ? <Icon name={icon} size={18} color={colors.accentText} /> : null}
      <FadeInView key={text} style={styles.textWrap}>
        <Text style={styles.text}>{text}</Text>
      </FadeInView>
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
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceHigh,
    flexShrink: 1,
  },
  textWrap: { flexShrink: 1 },
  text: { color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: '600' },
});
