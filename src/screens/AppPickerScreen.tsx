import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import FocusLock, { type InstalledApp } from '../../modules/focus-lock';

const REASON: Record<string, string> = {
  game: 'Hra – při zámku vždy zablokováno',
  video: 'Videa – při zámku vždy zablokováno',
  social: 'Sociální síť – při zámku vždy zablokováno',
};
import { colors, errorText } from '../theme';

type Props = {
  apps: InstalledApp[] | null;
  initial: string[];
  pin: string;
  onDone: () => void;
  onCancel: () => void;
};

export function AppPickerScreen({ apps, initial, pin, onDone, onCancel }: Props) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);

  // Always-allowed first, choosable in the middle, always-blocked (games…) last.
  const rank = (a: InstalledApp) => (a.alwaysAllowed ? 0 : a.blockedReason ? 2 : 1);
  const sorted = useMemo(() => (apps ? [...apps].sort((a, b) => rank(a) - rank(b)) : null), [apps]);

  const toggle = (pkg: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(pkg)) n.delete(pkg);
      else n.add(pkg);
      return n;
    });

  const save = () => {
    const blocked = new Set(apps?.filter((a) => a.blockedReason).map((a) => a.packageName));
    const r = FocusLock.setAllowedPackages([...selected].filter((p) => !blocked.has(p)), pin);
    if (r.ok) onDone();
    else setError((r.error && errorText[r.error]) || 'Uložení se nepovedlo.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Co smí dítě používat?</Text>
      <Text style={styles.hint}>
        Klepnutím přepínáte mezi <Text style={{ color: colors.ok, fontWeight: '700' }}>Povoleno</Text> a{' '}
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Zablokováno</Text>. Hry, videa a sociální sítě jsou při zámku zablokované vždy a nejdou povolit, stejně jako Nastavení a Obchod Play.
      </Text>

      {sorted === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(a) => a.packageName}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const locked = item.alwaysAllowed || !!item.blockedReason;
            const on = item.alwaysAllowed || (!item.blockedReason && selected.has(item.packageName));
            return (
              <Pressable
                disabled={locked}
                onPress={() => toggle(item.packageName)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: locked }}
                style={styles.row}>
                <Image source={{ uri: item.icon }} style={styles.icon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.alwaysAllowed ? <Text style={styles.always}>Vždy povoleno (volání, SMS, systém)</Text> : null}
                  {item.blockedReason ? <Text style={styles.always}>{REASON[item.blockedReason]}</Text> : null}
                </View>
                <View style={[styles.pill, on ? styles.pillOn : styles.pillOff, locked && { opacity: 0.6 }]}>
                  <Text style={styles.pillText}>{on ? '✓ Povoleno' : '✕ Zablokováno'}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={[styles.btn, styles.secondary]}>
          <Text style={[styles.btnText, { color: colors.text }]}>Zrušit</Text>
        </Pressable>
        <Pressable onPress={save} style={styles.btn}>
          <Text style={styles.btnText}>Uložit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 12 },
  hint: { color: colors.muted, fontSize: 14, marginVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: { width: 40, height: 40 },
  label: { fontSize: 16, color: colors.text },
  always: { fontSize: 12, color: colors.muted },
  pill: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, minWidth: 116, alignItems: 'center' },
  pillOn: { backgroundColor: colors.ok },
  pillOff: { backgroundColor: colors.danger },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  btn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
