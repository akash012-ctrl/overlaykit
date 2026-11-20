import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_ROUTE_TABLE, t } from '../../locale';
import { Button, Card, IconTile } from '../parts';
import { colors, fontSize, lineHeight, spacing } from '../theme';
import { privacyBodyKey } from '../translate/gate';

/**
 * The privacy note. First launch shows it with "I understand" (acknowledge); Settings reopens it
 * with the same button, which only closes it. The text follows the route table.
 */
export function PrivacyNote({ onDone }: { onDone: () => void }) {
  return (
    <View accessibilityViewIsModal>
      <Card style={styles.card}>
        <IconTile icon="privacy" />
        <Text accessibilityRole="header" style={styles.title}>
          {t('privacy.title')}
        </Text>
        <Text style={styles.body}>{t(privacyBodyKey(DEFAULT_ROUTE_TABLE))}</Text>
        <Button variant="primary" size="lg" stretch label={t('privacy.accept')} onPress={onDone} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, paddingVertical: spacing.xl },
  title: { color: colors.text, fontSize: fontSize.screenTitle, lineHeight: lineHeight.screenTitle, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.textBody, fontSize: fontSize.body, lineHeight: lineHeight.body },
});
