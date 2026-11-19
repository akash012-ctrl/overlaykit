import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';

/**
 * The one touchable for plain text buttons: role "button", a label in the UI language,
 * and a 48 dp minimum target. Callers pass an already translated label.
 */
export function A11yButton({
  label,
  onPress,
  disabled,
  style,
  textStyle,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Extra drawing inside the button, for example an outline ring. */
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.target, style]}
    >
      <Text style={textStyle}>{label}</Text>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, justifyContent: 'center', alignItems: 'center' },
});
