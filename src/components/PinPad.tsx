import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, waitText } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  error?: string | null;
  /** Throttle end as a timestamp (ms), or 0. */
  blockedUntil?: number;
  /** Change it to clear the typed digits (e.g. after a wrong PIN). */
  resetKey?: number;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
  dark?: boolean;
  submitLabel?: string;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'cancel', '0', 'del'];

export function PinPad({ title, subtitle, error, blockedUntil = 0, resetKey = 0, onSubmit, onCancel, dark, submitLabel = 'Potvrdit' }: Props) {
  const [pin, setPin] = useState('');
  const [now, setNow] = useState(Date.now());
  const blocked = blockedUntil > now;

  useEffect(() => {
    if (!blocked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [blocked]);

  useEffect(() => {
    setPin('');
  }, [resetKey, title]);

  const fg = dark ? '#FFFFFF' : colors.text;
  const keyBg = dark ? 'rgba(255,255,255,0.10)' : colors.card;

  const press = (k: string) => {
    if (blocked) return;
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (k === 'cancel') return onCancel?.();
    setPin((p) => (p.length < 8 ? p + k : p));
  };

  const canSubmit = !blocked && pin.length >= 4;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: fg }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: dark ? colors.lockMuted : colors.muted }]}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: dark ? colors.lockMuted : colors.faint },
              i < pin.length && { backgroundColor: dark ? colors.accent : colors.primary, borderColor: 'transparent', transform: [{ scale: 1.15 }] },
            ]}
          />
        ))}
      </View>

      <Text style={styles.error}>{blocked ? waitText(blockedUntil - now) : error ?? ' '}</Text>

      <View style={styles.grid}>
        {KEYS.map((k) => {
          if (k === 'cancel' && !onCancel) return <View key={k} style={styles.cell} />;
          const isDigit = k.length === 1;
          const label = k === 'del' ? '⌫' : k === 'cancel' ? 'Zpět' : k;
          return (
            <View key={k} style={styles.cell}>
              <Pressable
                accessibilityLabel={k === 'del' ? 'Smazat' : label}
                onPress={() => press(k)}
                style={({ pressed }) => [
                  styles.key,
                  isDigit && { backgroundColor: keyBg },
                  isDigit && !dark && styles.keyShadow,
                  pressed && { opacity: 0.55, transform: [{ scale: 0.94 }] },
                ]}>
                <Text style={[isDigit ? styles.keyText : styles.keySmall, { color: fg }]}>{label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={() => onSubmit(pin)}
        style={({ pressed }) => [
          styles.ok,
          { backgroundColor: dark ? colors.accent : colors.primary },
          !canSubmit && { opacity: 0.35 },
          pressed && { opacity: 0.8 },
        ]}>
        <Text style={[styles.okText, { color: dark ? colors.lockTop : '#fff' }]}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 16, marginTop: 28, minHeight: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { color: colors.danger, marginTop: 14, minHeight: 20, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 288, marginTop: 6 },
  cell: { width: 96, height: 84, alignItems: 'center', justifyContent: 'center' },
  key: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  keyShadow: { shadowColor: '#1B1D3A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  keyText: { fontSize: 30, fontWeight: '600' },
  keySmall: { fontSize: 16, fontWeight: '600' },
  ok: { marginTop: 14, paddingVertical: 15, width: 240, alignItems: 'center', borderRadius: 18 },
  okText: { fontSize: 17, fontWeight: '800' },
});
