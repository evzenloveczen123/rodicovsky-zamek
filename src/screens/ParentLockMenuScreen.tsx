import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import FocusLock, { type LockStatus } from '../../modules/focus-lock';
import { AttemptsList } from '../components/AttemptsList';
import { Button } from '../components/ui';
import { colors, errorText, formatClock, formatCountdown } from '../theme';

type Props = {
  status: LockStatus;
  pin: string;
  onUnlocked: () => void;
  onChanged: () => void;
  onBack: () => void;
};

/** Parent options while the lock is on (after entering the PIN). */
export function ParentLockMenuScreen({ status, pin, onUnlocked, onChanged, onBack }: Props) {
  const [error, setError] = useState<string | null>(null);
  const timed = status.lockUntil > 0;

  const extend = (m: number) => {
    const r = FocusLock.extendLock(pin, m);
    if (r.ok) onChanged();
    else setError((r.error && errorText[r.error]) || 'Nepovedlo se.');
  };

  const unlock = () => {
    const r = FocusLock.unlock(pin);
    if (r.ok) onUnlocked();
    else setError((r.error && errorText[r.error]) || 'Nepovedlo se.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rodič</Text>
      <Text style={styles.subtitle}>
        {timed
          ? `Zbývá ${formatCountdown(status.lockUntil - Date.now())} – konec v ${formatClock(status.lockUntil)}.`
          : 'Zámek trvá, dokud ho nevypnete.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Pokusy o zakázané aplikace</Text>
        <AttemptsList attempts={status.attempts} dark />
      </View>

      {timed ? (
        <View style={styles.row}>
          <Button variant="light" label="+15 min" onPress={() => extend(15)} style={{ flex: 1 }} />
          <Button variant="light" label="+1 hodina" onPress={() => extend(60)} style={{ flex: 1 }} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button big variant="danger" icon="🔓" label="Vypnout zámek" onPress={unlock} />
      <Button variant="light" label="Zpět na zámek" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 16, color: colors.lockMuted },
  card: { backgroundColor: colors.lockCard, borderRadius: 22, padding: 16 },
  cardLabel: { color: colors.lockMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  error: { color: '#FFB4B6', textAlign: 'center', fontWeight: '600' },
});
