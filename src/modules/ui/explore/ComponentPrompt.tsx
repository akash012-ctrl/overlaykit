import { StyleSheet, Text } from 'react-native';

import { t } from '../../locale';

/** "Point the camera at the [component]" for CMP_NOT_VISIBLE. Spec C reuses it for Guide steps. */
export function ComponentPrompt({ name }: { name: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.text}>
      {t('explore.pointAt', { component: name })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, fontWeight: '600' },
});
