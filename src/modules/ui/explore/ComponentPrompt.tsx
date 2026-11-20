import { StyleSheet, Text } from 'react-native';

import { t } from '../../locale';
import { colors, fontSize, lineHeight } from '../theme';

/** "Point the camera at the [component]" for CMP_NOT_VISIBLE. Spec C reuses it for Guide steps. */
export function ComponentPrompt({ name }: { name: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.text}>
      {t('explore.pointAt', { component: name })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.text, fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: '600' },
});
