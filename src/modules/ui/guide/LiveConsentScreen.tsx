import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '../../locale';
import { GuideButton, Message, Note, Panel, guideStyles } from './parts';

/**
 * The Gemini Live notice (R16.3). Plain words, in the UI language. Nothing is sent from here.
 * Accept stores the consent; decline stores nothing and the planner stays on this phone.
 */
export function LiveConsentScreen({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <Panel>
      <ScrollView style={styles.scroll}>
        <View style={styles.body}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('live.consent.title')}
          </Text>
          <Message>{t('live.consent.who')}</Message>
          <Message>{t('live.consent.sent')}</Message>
          <Message>{t('live.consent.back')}</Message>
          <Message>{t('live.consent.nocontrol')}</Message>
          <Message>{t('live.consent.free')}</Message>
          <Message>{t('live.consent.local')}</Message>
          <Note>{t('live.consent.off')}</Note>
        </View>
      </ScrollView>
      <View style={guideStyles.row}>
        <GuideButton primary label={t('live.consent.accept')} onPress={onAccept} />
        <GuideButton label={t('live.consent.decline')} onPress={onDecline} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  body: { gap: 10 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 30 },
});
