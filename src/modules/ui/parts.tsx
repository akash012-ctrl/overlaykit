import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { A11yButton } from './a11y/A11yButton';
import type { IconName } from './icons/Icon';
import { Icon } from './icons/Icon';
import { colors, fontSize, lineHeight, radius, size, spacing } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const LABEL_COLOR: Record<ButtonVariant, string> = {
  primary: colors.text,
  secondary: colors.text,
  ghost: colors.accentText,
  destructive: colors.dangerText,
};

/**
 * The styled button for every screen. Pills, 48 dp (56 for `lg`), labels wrap (Hindi and Kannada never truncate).
 * One primary per surface; destructive (Stop, Delete) is outlined and goes last in a row.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  size: buttonSize = 'md',
  stretch,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: 'md' | 'lg';
  stretch?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <A11yButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      icon={icon}
      iconColor={LABEL_COLOR[variant]}
      pressScale={variant === 'primary'}
      style={[
        styles.button,
        styles[variant],
        buttonSize === 'lg' && styles.large,
        stretch && styles.stretch,
        disabled && styles.disabled,
        style,
      ]}
      textStyle={[styles.buttonText, { color: LABEL_COLOR[variant] }]}
    />
  );
}

/** A Guide dock card over the camera. Shrinks when the dock is capped, so a ScrollView inside can scroll. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

/** A card on the Settings canvas. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

export function Title({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, center && styles.center]}>
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

/** Message text in a live region, so the state reaches Android accessibility services (QE-3). */
export function Message({ children, live = 'polite' }: { children: ReactNode; live?: 'polite' | 'assertive' }) {
  return (
    <Text accessibilityLiveRegion={live} style={styles.message}>
      {children}
    </Text>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

/** An icon followed by text, for notes, errors and settings rows. The text carries the meaning. */
export function IconRow({ icon, color = colors.accentText, children }: { icon: IconName; color?: string; children: ReactNode }) {
  return (
    <View style={styles.iconRow}>
      <View style={styles.iconRowGlyph}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

/**
 * One option in a list of choices, inside a Card with no padding. The selected row is tinted and shows a filled
 * radio icon: shape and fill, not colour alone. `label` is drawn; `a11yLabel` (when given) is what TalkBack says.
 */
export function RadioRow({
  label,
  a11yLabel,
  selected,
  onPress,
  first,
}: {
  label: string;
  a11yLabel?: string;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <A11yButton
      role="radio"
      selected={selected}
      label={label}
      a11yLabel={a11yLabel}
      onPress={onPress}
      icon={selected ? 'radioOn' : 'radioOff'}
      iconColor={selected ? colors.accentText : colors.textMuted}
      iconSize={size.iconLg}
      style={[styles.radioRow, !first && styles.radioDivider, selected && styles.radioSelected]}
      textStyle={styles.radioText}
    />
  );
}

/** A round tonal tile with one large icon, for state cards and empty states. */
export function IconTile({ icon, color = colors.accentText }: { icon: IconName; color?: string }) {
  return (
    <View style={styles.tile}>
      <Icon name={icon} size={size.iconXl} color={color} />
    </View>
  );
}

export const inputStyle = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
    lineHeight: 26,
    minHeight: size.touch,
  },
}).input;

export const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  /** Pushes Stop to the far end of a button row, away from Done. */
  farEnd: { marginLeft: 'auto' },
});

const styles = StyleSheet.create({
  button: {
    minHeight: size.touch,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.outline },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: spacing.md },
  destructive: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.dangerText },
  large: { minHeight: size.buttonLg },
  stretch: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: spacing.lg,
    gap: spacing.md,
    flexShrink: 1,
  },
  card: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: { color: colors.textMuted, fontSize: fontSize.note, lineHeight: lineHeight.note, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.title, lineHeight: lineHeight.title, fontWeight: '700' },
  center: { textAlign: 'center' },
  headline: { color: colors.text, fontSize: fontSize.headline, lineHeight: lineHeight.headline, fontWeight: '700' },
  message: { color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body },
  note: { color: colors.textMuted, fontSize: fontSize.note, lineHeight: lineHeight.note },
  iconRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconRowGlyph: { paddingTop: 3 },
  flex: { flex: 1, gap: spacing.xs },
  radioRow: { justifyContent: 'flex-start', minHeight: 56, paddingHorizontal: spacing.lg, gap: spacing.md },
  radioDivider: { borderTopWidth: 1, borderTopColor: colors.outline },
  radioSelected: { backgroundColor: colors.primaryContainer },
  radioText: { flex: 1, color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body },
  tile: {
    width: size.tile,
    height: size.tile,
    borderRadius: size.tile / 2,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
