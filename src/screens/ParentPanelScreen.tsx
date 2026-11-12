import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FocusLock, { type LockStatus } from '../../modules/focus-lock';
import { AttemptsList } from '../components/AttemptsList';
import { Button, Card, Row, SectionTitle } from '../components/ui';
import { colors, formatClock } from '../theme';

type Props = {
  status: LockStatus;
  onLock: () => void;
  onPickApps: () => void;
  onContact: () => void;
  onChangePin: () => void;
  onClose: () => void;
};

export function ParentPanelScreen({ status, onLock, onPickApps, onContact, onChangePin, onClose }: Props) {
  const ready = status.accessibilityEnabled && status.deviceAdminActive;
  const allowedCount = status.allowedPackages.length;
  const hadLock = status.lockStartedAt > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Nastavení rodiče</Text>
          <Text style={styles.title}>Telefon je odemčený</Text>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Zavřít" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {ready ? (
        <Card style={styles.hero}>
          <Text style={styles.heroEmoji}>🛡️</Text>
          <Text style={styles.heroTitle}>Vše připraveno</Text>
          <Text style={styles.heroText}>
            Po zamknutí půjdou otevřít jen povolené aplikace ({allowedCount}) a volání. Hry, videa a sociální sítě budou zablokované.
          </Text>
          <Button big variant="danger" icon="🔒" label="Zamknout telefon" onPress={onLock} style={{ alignSelf: 'stretch', marginTop: 16 }} />
        </Card>
      ) : (
        <SetupSteps status={status} />
      )}

      {hadLock ? (
        <>
          <SectionTitle>Poslední zámek · {formatClock(status.lockStartedAt)}</SectionTitle>
          <Card>
            <Text style={styles.cardHint}>Co se dítě pokusilo otevřít:</Text>
            <AttemptsList attempts={status.attempts} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Nastavení</SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="📱" title="Povolené aplikace" subtitle={`Vybráno: ${allowedCount}`} onPress={onPickApps} />
        <Divider />
        <Row
          icon="📞"
          title="Kontakt na rodiče"
          subtitle={status.parentPhone ? `${status.parentName || 'Rodič'} · ${status.parentPhone}` : 'Tlačítko „Zavolat“ na zámku'}
          onPress={onContact}
        />
        <Divider />
        <Row icon="🔑" title="Změnit PIN" onPress={onChangePin} />
      </Card>

      {ready ? (
        <>
          <SectionTitle>Ochrana</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            <Row icon="👁️" title="Hlídání aplikací" subtitle="Usnadnění přístupu" right={<Ok />} />
            <Divider />
            <Row icon="🧷" title="Ochrana proti odinstalování" subtitle="Správce zařízení" right={<Ok />} />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function SetupSteps({ status }: { status: LockStatus }) {
  const restrictedHint = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  return (
    <Card style={{ gap: 14 }}>
      <Text style={styles.heroTitle}>Dokončete nastavení</Text>
      <Text style={styles.cardHint}>Před prvním zamknutím je potřeba povolit dvě věci:</Text>

      <Step
        n={1}
        done={status.accessibilityEnabled}
        title="Hlídání aplikací"
        text="V Usnadnění přístupu → Stažené aplikace zapněte „Rodičovský zámek“."
        action="Otevřít Usnadnění přístupu"
        onPress={() => FocusLock.openAccessibilitySettings()}
      />
      {restrictedHint && !status.accessibilityEnabled ? (
        <Text style={styles.small}>
          Je volba zašedlá? Otevřete{' '}
          <Text style={styles.link} onPress={() => FocusLock.openAppInfo()}>
            Informace o aplikaci
          </Text>{' '}
          → ⋮ → „Povolit omezená nastavení“.
        </Text>
      ) : null}

      <Step
        n={2}
        done={status.deviceAdminActive}
        title="Ochrana proti odinstalování"
        text="Dokud je zapnutá, nejde aplikace smazat."
        action="Zapnout ochranu"
        onPress={() => FocusLock.requestDeviceAdmin()}
      />
    </Card>
  );
}

function Step(props: { n: number; done: boolean; title: string; text: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, props.done && { backgroundColor: colors.ok }]}>
        <Text style={styles.stepBadgeText}>{props.done ? '✓' : props.n}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.stepTitle}>{props.title}</Text>
        <Text style={styles.small}>{props.text}</Text>
        {!props.done ? (
          <Button variant="secondary" label={props.action} onPress={props.onPress} style={{ alignSelf: 'flex-start', paddingVertical: 10 }} />
        ) : null}
      </View>
    </View>
  );
}

const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 }} />;
const Ok = () => (
  <View style={styles.ok}>
    <Text style={styles.okText}>Zapnuto</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 4 },
  hello: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: colors.muted },
  hero: { alignItems: 'center' },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  heroText: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6 },
  cardHint: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  link: { color: colors.primary, fontWeight: '700' },
  step: { flexDirection: 'row', gap: 12 },
  stepBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: '#fff', fontWeight: '800' },
  stepTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  ok: { backgroundColor: colors.okSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  okText: { color: colors.ok, fontWeight: '700', fontSize: 12 },
});
