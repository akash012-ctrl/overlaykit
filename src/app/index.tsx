import { StyleSheet, Text, View } from 'react-native';

const MODES = ['Translate', 'Explore', 'Guide'] as const;

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OverlayKit</Text>
      <Text style={styles.subtitle}>Camera language assistant (placeholder)</Text>
      <View style={styles.modes}>
        {MODES.map((mode) => (
          <View key={mode} style={styles.chip}>
            <Text style={styles.chipText}>{mode}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F14', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#9AA7B4', fontSize: 16, marginTop: 8 },
  modes: { flexDirection: 'row', gap: 12, marginTop: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1C2530' },
  chipText: { color: '#E6EDF3', fontSize: 15 },
});
