import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors, fontSize, radius, spacing } from '../theme';

export const PANEL_BACKGROUND = colors.panel;

/**
 * A button with a text label. At least 48 dp (native-ux), wraps long hi and kn labels, no fixed height.
 * Three looks: primary (filled blue), secondary (grey), destructive (outlined, light-red text, for Stop).
 */
export function GuideButton({
  label,
  onPress,
  primary,
  destructive,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <A11yButton
      label={label}
      onPress={onPress}
      style={[styles.button, destructive ? styles.destructive : primary ? styles.primary : styles.secondary]}
      textStyle={destructive ? styles.destructiveText : styles.buttonText}
    />
  );
}

/** Message text in a live region, so the state reaches Android accessibility services (QE-3). */
export function Message({ children, live = 'polite' }: { children: ReactNode; live?: 'polite' | 'assertive' }) {
  return (
    <Text accessibilityLiveRegion={live} style={styles.message}>
      {children}
    </Text>
  );
}

/** The one thing to do now: the largest text on the card. */
export function Headline({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.headline}>
      {children}
    </Text>
  );
}

/** A panel shrinks when the dock is capped, so a ScrollView inside it can scroll and the buttons stay visible. */
export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export const guideStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  /** Pushes Stop to the far end of a button row, away from Done. */
  farEnd: { marginLeft: 'auto' },
});

const styles = StyleSheet.create({
  panel: { backgroundColor: PANEL_BACKGROUND, padding: spacing.md, gap: 10, flexShrink: 1 },
  button: { minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.neutral },
  destructive: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.dangerText },
  buttonText: { color: colors.text, fontSize: fontSize.body, fontWeight: '600', lineHeight: 26 },
  destructiveText: { color: colors.dangerText, fontSize: fontSize.body, fontWeight: '700', lineHeight: 26 },
  message: { color: colors.text, fontSize: fontSize.body, lineHeight: 26 },
  headline: { color: colors.text, fontSize: fontSize.headline, fontWeight: '700', lineHeight: 34 },
  note: { color: colors.textMuted, fontSize: fontSize.note, lineHeight: 22 },
});
