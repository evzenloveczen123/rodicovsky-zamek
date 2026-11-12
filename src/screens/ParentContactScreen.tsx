import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import FocusLock, { type LockStatus } from '../../modules/focus-lock';
import { Button, Card } from '../components/ui';
import { colors, errorText } from '../theme';

type Props = { status: LockStatus; pin: string; onDone: () => void; onCancel: () => void };

export function ParentContactScreen({ status, pin, onDone, onCancel }: Props) {
  const [name, setName] = useState(status.parentName);
  const [phone, setPhone] = useState(status.parentPhone);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const r = FocusLock.setParentContact(name, phone, pin);
    if (r.ok) onDone();
    else setError((r.error && errorText[r.error]) || 'Uložení se nepovedlo.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Kontakt na rodiče</Text>
      <Text style={styles.subtitle}>
        Na obrazovce zámku se zobrazí velké tlačítko „Zavolat“, aby vás dítě mohlo kdykoliv kontaktovat.
      </Text>
      <Card style={{ gap: 6 }}>
        <Text style={styles.label}>Jak vám dítě říká</Text>
        <TextInput value={name} onChangeText={setName} placeholder="např. mámě, tátovi" placeholderTextColor={colors.faint} style={styles.input} maxLength={30} />
        <Text style={[styles.label, { marginTop: 10 }]}>Telefonní číslo</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+420 123 456 789"
          placeholderTextColor={colors.faint}
          keyboardType="phone-pad"
          style={styles.input}
          maxLength={20}
        />
        <Text style={styles.hint}>Nechte prázdné, pokud tlačítko nechcete.</Text>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button big label="Uložit" onPress={save} />
      <Button variant="ghost" label="Zrušit" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, padding: 12, fontSize: 17, color: colors.text },
  hint: { fontSize: 13, color: colors.faint, marginTop: 6 },
  error: { color: colors.danger, textAlign: 'center', fontWeight: '600' },
});
