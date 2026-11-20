import { ScrollView, StyleSheet, View } from 'react-native';

import { t } from '../../locale';
import { Button, Card, Message, Note, Title, rowStyles } from '../parts';
import { spacing } from '../theme';

/**
 * The Gemini Live notice (R16.3). Plain words, in the UI language. Nothing is sent from here.
 * Accept stores the consent; decline stores nothing and the planner stays on this phone.
 */
export function LiveConsentScreen({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <Card>
      <ScrollView style={styles.scroll}>
        <View style={styles.body}>
          <Title>{t('live.consent.title')}</Title>
          <Message>{t('live.consent.who')}</Message>
          <Message>{t('live.consent.sent')}</Message>
          <Message>{t('live.consent.back')}</Message>
          <Message>{t('live.consent.nocontrol')}</Message>
          <Message>{t('live.consent.free')}</Message>
          <Message>{t('live.consent.local')}</Message>
          <Note>{t('live.consent.off')}</Note>
        </View>
      </ScrollView>
      <View style={rowStyles.row}>
        <Button variant="primary" label={t('live.consent.accept')} onPress={onAccept} />
        <Button label={t('live.consent.decline')} onPress={onDecline} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  body: { gap: spacing.md },
});
