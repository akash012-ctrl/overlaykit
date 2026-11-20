import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { Icon } from '../icons/Icon';
import { Button } from '../parts';
import { colors, fontSize, lineHeight, radius, spacing } from '../theme';
import type { LiveBannerState } from './live-view-model';

/**
 * Shown for as long as a Live session is connecting or open, and not otherwise (R16.5).
 * Text, not colour alone. The Stop control is always in it and works while connecting.
 */
export function LiveBanner({ session, onStop }: { session: LiveBannerState; onStop: () => void }) {
  if (session === 'off') return null;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      {session === 'connecting' ? (
        <ActivityIndicator color={colors.text} importantForAccessibility="no-hide-descendants" />
      ) : (
        <Icon name="live" color={colors.text} />
      )}
      <Text style={styles.text}>{t(session === 'connecting' ? 'live.banner.connecting' : 'live.banner')}</Text>
      <Button icon="stop" label={t('live.stop')} onPress={onStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.dangerContainer,
  },
  text: { flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.body },
});
