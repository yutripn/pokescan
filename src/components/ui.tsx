import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

export const colors = {
  bg: '#070b10',
  surface: '#111823',
  surface2: '#1a2533',
  text: '#f2f6fb',
  textMuted: '#9cb0c6',
  success: '#25b46b',
  accent: '#4ea8ff',
  warning: '#f2a846'
};

export const spacing = { xs: 6, sm: 10, md: 14, lg: 18 };

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
};

export const AppButton = ({ label, onPress, variant = 'secondary', style }: ButtonProps) => (
  <Pressable onPress={onPress} style={[styles.btn, variant === 'primary' && styles.btnPrimary, variant === 'ghost' && styles.btnGhost, style]}>
    <Text style={styles.btnText}>{label}</Text>
  </Pressable>
);

export const Pill = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'accent' | 'success' | 'warning' }) => (
  <View style={[styles.pill, tone === 'accent' && styles.pillAccent, tone === 'success' && styles.pillSuccess, tone === 'warning' && styles.pillWarning]}>
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.surface2, borderRadius: 14, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.success },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#314258' },
  btnText: { color: colors.text, fontWeight: '700' },
  pill: { backgroundColor: '#223245', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillAccent: { backgroundColor: '#1f4a72' },
  pillSuccess: { backgroundColor: '#1f5a3b' },
  pillWarning: { backgroundColor: '#65472a' },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '600' }
});
