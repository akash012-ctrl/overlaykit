import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_ROUTE_TABLE, t } from '../../locale';
import { A11yButton } from '../a11y/A11yButton';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';
import { privacyBodyKey } from '../translate/gate';

/**
 * The privacy note. First launch shows it with "I understand" (acknowledge); Settings reopens it
 * with the same button, which only closes it. The text follows the route table.
 */
export function PrivacyNote({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.card} accessibilityViewIsModal>
      <Text accessibilityRole="header" style={styles.title}>
        {t('privacy.title')}
      </Text>
      <Text style={styles.body}>{t(privacyBodyKey(DEFAULT_ROUTE_TABLE))}</Text>
      <A11yButton label={t('privacy.accept')} onPress={onDone} style={styles.button} textStyle={styles.buttonText} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1C2530', borderRadius: 12, padding: 16, gap: 12 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 26 },
  body: { color: '#E6EAF0', fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: MIN_TOUCH_TARGET_DP,
    minWidth: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#2F6FEB',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
