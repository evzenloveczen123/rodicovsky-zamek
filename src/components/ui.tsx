import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary' | 'ghost' | 'light';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style, big }: ButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        big && styles.big,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.btnText, big && styles.bigText, { color: v.fg }]}>
          {icon ? `${icon}  ` : ''}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  secondary: { bg: colors.card, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  light: { bg: 'rgba(255,255,255,0.12)', fg: '#fff', border: 'rgba(255,255,255,0.22)' },
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ icon, title, subtitle, right, onPress }: {
  icon: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={styles.rowIcon}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chev}>›</Text> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  big: { paddingVertical: 18, borderRadius: radius.lg },
  btnText: { fontSize: 16, fontWeight: '700' },
  bigText: { fontSize: 18 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, ...shadow },
  section: { fontSize: 13, fontWeight: '700', color: colors.faint, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 26, color: colors.faint, marginTop: -2 },
});
