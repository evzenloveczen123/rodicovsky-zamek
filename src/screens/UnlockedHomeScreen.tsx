import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/ui';
import { colors } from '../theme';

export function UnlockedHomeScreen({ onParent }: { onParent: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={{ fontSize: 56 }}>🔓</Text>
      </View>
      <Text style={styles.title}>Telefon je odemčený</Text>
      <Text style={styles.subtitle}>Vše funguje normálně. Zámek zapíná rodič svým PINem.</Text>
      <Button big icon="👤" label="Rodič" onPress={onParent} style={{ alignSelf: 'stretch', marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  logo: { width: 120, height: 120, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
