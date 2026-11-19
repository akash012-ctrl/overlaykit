import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';

export const PANEL_BACKGROUND = 'rgba(11,15,20,0.92)';

/** A button with a text label. At least 48 dp (native-ux), wraps long hi and kn labels, no fixed height. */
export function GuideButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <A11yButton
      label={label}
      onPress={onPress}
      style={[styles.button, primary ? styles.primary : styles.secondary]}
      textStyle={styles.buttonText}
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

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export const guideStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  panel: { backgroundColor: PANEL_BACKGROUND, padding: 12, gap: 10 },
  button: { minHeight: MIN_TOUCH_TARGET_DP, minWidth: MIN_TOUCH_TARGET_DP, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  primary: { backgroundColor: '#1565C0' },
  secondary: { backgroundColor: '#37474F' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 26 },
  message: { color: '#FFFFFF', fontSize: 16, lineHeight: 26 },
  note: { color: '#CFD8DC', fontSize: 14, lineHeight: 22 },
});