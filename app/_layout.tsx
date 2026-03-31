import { Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';

export default function RootLayout() {
  const { ready, error } = useAppBootstrap();

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <Text style={{ color: 'white' }}>Failed to initialize: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <Text style={{ color: 'white' }}>Preparing local cache…</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
