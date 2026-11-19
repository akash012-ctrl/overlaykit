import { StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import type { LiveBannerState } from './live-view-model';
import { GuideButton } from './parts';

/**
 * Shown for as long as a Live session is connecting or open, and not otherwise (R16.5).
 * Text, not colour alone. The Stop control is always in it and works while connecting.
 */
export function LiveBanner({ session, onStop }: { session: LiveBannerState; onStop: () => void }) {
  if (session === 'off') return null;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{t(session === 'connecting' ? 'live.banner.connecting' : 'live.banner')}</Text>
      <GuideButton primary label={t('live.stop')} onPress={onStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#7F1D1D',
  },
  text: { flexShrink: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 26 },
});
