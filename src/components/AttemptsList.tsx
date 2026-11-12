import { StyleSheet, Text, View } from 'react-native';

import type { Attempt } from '../../modules/focus-lock';
import { colors, formatClock } from '../theme';

export function AttemptsList({ attempts, dark }: { attempts: Attempt[]; dark?: boolean }) {
  const fg = dark ? '#fff' : colors.text;
  const muted = dark ? colors.lockMuted : colors.muted;
  if (attempts.length === 0) {
    return <Text style={[styles.empty, { color: muted }]}>Žádné pokusy 👍</Text>;
  }
  return (
    <View>
      {attempts.slice(0, 8).map((a) => (
        <View key={a.packageName} style={[styles.row, { borderColor: dark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
          <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
            {a.label}
          </Text>
          <Text style={[styles.meta, { color: muted }]}>naposledy {formatClock(a.lastAt)}</Text>
          <View style={styles.count}>
            <Text style={styles.countText}>{a.count}×</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  count: { backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, minWidth: 40, alignItems: 'center' },
  countText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
