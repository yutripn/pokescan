import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { dbRepo } from '@/db/database';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <Pressable style={styles.row} onPress={() => Alert.alert('Auto-add', 'Wire to persisted setting in app_settings table')}><Text style={styles.label}>Auto-add behavior</Text></Pressable>
      <Pressable style={styles.row} onPress={() => Alert.alert('Confidence threshold', 'Adjust in app settings model')}><Text style={styles.label}>Confidence threshold</Text></Pressable>
      <Pressable style={styles.row} onPress={() => Alert.alert('Haptics/Sound', 'Toggle haptic feedback in scan loop')}><Text style={styles.label}>Haptics/Sound</Text></Pressable>
      <Pressable style={styles.row} onPress={() => Alert.alert('Manage cache', 'Use Sets tab cache controls for MVP')}><Text style={styles.label}>Manage cached set data</Text></Pressable>
      <Pressable style={styles.row} onPress={() => dbRepo.clearHistory()}><Text style={styles.label}>Clear scan history</Text></Pressable>
      <Pressable style={styles.row} onPress={() => Alert.alert('Mock Mode', 'Enabled in this MVP for deterministic testing')}><Text style={styles.label}>Mock/sample mode</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16, gap: 10 },
  heading: { color: 'white', fontSize: 22, fontWeight: '700' },
  row: { backgroundColor: '#232323', borderRadius: 12, padding: 14 },
  label: { color: 'white' }
});
