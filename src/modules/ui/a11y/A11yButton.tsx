import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { IconName } from '../icons/Icon';
import { Icon } from '../icons/Icon';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { colors, size, spacing } from '../theme';

/** Android ripple shared by every touchable. */
export const RIPPLE = { color: 'rgba(255,255,255,0.16)', foreground: true } as const;

/**
 * The one touchable: role "button", a label in the UI language, a 48 dp minimum target, ripple and a pressed state.
 * Callers pass an already translated label. With `iconOnly` the label is spoken but not drawn.
 */
export function A11yButton({
  label,
  onPress,
  disabled,
  style,
  textStyle,
  children,
  icon,
  iconColor = colors.text,
  iconSize = size.icon,
  iconOnly,
  pressScale,
  trailing,
  role = 'button',
  selected,
  a11yLabel,
}: {
  label: string;
  /** What TalkBack says when it should differ from the drawn label. */
  a11yLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Extra drawing inside the button, for example an outline ring. */
  children?: ReactNode;
  icon?: IconName;
  iconColor?: string;
  iconSize?: number;
  iconOnly?: boolean;
  /** Shrinks slightly while pressed: primary actions and the shutter. */
  pressScale?: boolean;
  /** Drawn after the label, for example a chevron on a row. */
  trailing?: ReactNode;
  /** 'radio' for one choice of several (with `selected`). */
  role?: 'button' | 'radio';
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={role === 'radio' ? { disabled: !!disabled, selected: !!selected } : { disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ ...RIPPLE, borderless: !!iconOnly }}
      style={({ pressed }) => [styles.target, style, pressed && pressScale ? styles.pressed : null]}
    >
      {icon ? <Icon name={icon} size={iconSize} color={iconColor} /> : null}
      {iconOnly ? null : <Text style={textStyle}>{label}</Text>}
      {trailing}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: MIN_TOUCH_TARGET_DP,
    minWidth: MIN_TOUCH_TARGET_DP,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
