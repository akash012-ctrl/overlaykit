import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { MIN_TOUCH_TARGET_DP } from '../overlay/styles';

/** Spec A has only Translate (R18.3, CM-4). It is disabled when the OCR engine is unavailable (R8.8). */
export function ModeSwitcher({ enabled }: { enabled: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={t('mode.translate')}
        accessibilityState={{ selected: true, disabled: !enabled }}
        disabled={!enabled}
        style={[styles.tab, !enabled && styles.disabled]}
      >
        <Text style={styles.text}>● {t('mode.translate')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  tab: { minHeight: MIN_TOUCH_TARGET_DP, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 24, backgroundColor: '#1C2530' },
  disabled: { opacity: 0.6 },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', lineHeight: 22 },
});
