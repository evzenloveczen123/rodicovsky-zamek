import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { colors, formatClock, formatDuration } from '../theme';

type Props = {
  error: string | null;
  onStart: (minutes: number, message: string) => void;
  onCancel: () => void;
};

/** Minutes until 7:00 the next morning. */
function untilMorning() {
  const now = new Date();
  const t = new Date(now);
  t.setDate(now.getHours() < 7 ? now.getDate() : now.getDate() + 1);
  t.setHours(7, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 60000);
}

const DURATIONS: { label: string; minutes: () => number }[] = [
  { label: '15 min', minutes: () => 15 },
  { label: '30 min', minutes: () => 30 },
  { label: '1 hodina', minutes: () => 60 },
  { label: '2 hodiny', minutes: () => 120 },
  { label: '3 hodiny', minutes: () => 180 },
  { label: 'Do rána (7:00)', minutes: untilMorning },
  { label: 'Dokud nevypnu', minutes: () => 0 },
];

const PRESETS = ['Ukliď si pokoj 🧹', 'Uč se 📚', 'Čas jít spát 😴', 'Pomoz doma 🏠', 'Jdi ven ⚽'];

export function LockOptionsScreen({ error, onStart, onCancel }: Props) {
  const [durationIdx, setDurationIdx] = useState(2);
  const [message, setMessage] = useState('');
  const minutes = DURATIONS[durationIdx].minutes();

  const summary =
    minutes === 0
      ? 'Zámek vydrží, dokud ho nevypnete PINem.'
      : `Zámek se sám vypne v ${formatClock(Date.now() + minutes * 60000)} (za ${formatDuration(minutes)}).`;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Zamknout telefon</Text>
      <Text style={styles.subtitle}>Zvolte, jak dlouho bude zámek trvat, a případně napište vzkaz.</Text>

      <SectionTitle>Jak dlouho</SectionTitle>
      <Card>
        <View style={styles.chips}>
          {DURATIONS.map((d, i) => (
            <Chip key={d.label} label={d.label} active={i === durationIdx} onPress={() => setDurationIdx(i)} />
          ))}
        </View>
        <Text style={styles.summary}>⏱️ {summary}</Text>
      </Card>

      <SectionTitle>Vzkaz pro dítě (nepovinné)</SectionTitle>
      <Card>
        <View style={styles.chips}>
          {PRESETS.map((p) => (
            <Chip key={p} label={p} active={message === p} onPress={() => setMessage(message === p ? '' : p)} />
          ))}
        </View>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Nebo napište vlastní vzkaz…"
          placeholderTextColor={colors.faint}
          maxLength={200}
          multiline
          style={styles.input}
        />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button big variant="danger" icon="🔒" label="Zamknout teď" onPress={() => onStart(DURATIONS[durationIdx].minutes(), message)} />
      <Button variant="ghost" label="Zrušit" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { marginTop: 14, fontSize: 14, color: colors.muted },
  input: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, textAlign: 'center', fontWeight: '600' },
});
