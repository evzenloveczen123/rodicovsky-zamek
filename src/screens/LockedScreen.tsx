import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FocusLock, { type InstalledApp, type LockStatus } from '../../modules/focus-lock';
import { CountdownRing } from '../components/CountdownRing';
import { colors, formatClock, formatCountdown } from '../theme';

type Props = {
  status: LockStatus;
  apps: InstalledApp[] | null;
  wasBlocked: boolean;
  onParent: () => void;
  /** Timed lock ran out – App re-reads the status. */
  onExpired: () => void;
};

/** What the child sees while the lock is on. */
export function LockedScreen({ status, apps, wasBlocked, onParent, onExpired }: Props) {
  const [now, setNow] = useState(Date.now());
  const timed = status.lockUntil > 0;
  const remaining = status.lockUntil - now;

  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timed]);

  useEffect(() => {
    if (timed && remaining <= 0) onExpired();
  }, [timed, remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible =
    apps?.filter((a) => a.alwaysAllowed || (status.allowedPackages.includes(a.packageName) && !a.blockedReason)) ?? null;
  const total = Math.max(1, status.lockUntil - status.lockStartedAt);
  const who = status.parentName || 'rodiči';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.badge}>🔒 Zámek je zapnutý</Text>

      <View style={styles.hero}>
        {timed ? (
          <CountdownRing
            size={230}
            progress={remaining / total}
            title={formatCountdown(remaining)}
            subtitle={`konec v ${formatClock(status.lockUntil)}`}
          />
        ) : (
          <View style={styles.bigLock}>
            <Text style={{ fontSize: 76 }}>🔒</Text>
            <Text style={styles.untilParent}>Dokud ho rodič nevypne</Text>
          </View>
        )}
      </View>

      {wasBlocked ? (
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>🚫 Tuhle aplikaci teď nejde otevřít.</Text>
        </View>
      ) : null}

      {!status.accessibilityEnabled ? (
        <Text style={styles.warning}>
          ⚠️ Hlídání aplikací bylo vypnuto. Rodič: zapněte znovu službu „Rodičovský zámek“ v Usnadnění přístupu.
        </Text>
      ) : null}

      {status.message ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>💬 Vzkaz od {status.parentName || 'rodiče'}</Text>
          <Text style={styles.message}>{status.message}</Text>
        </View>
      ) : null}

      {status.parentPhone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${status.parentPhone}`)}
          style={({ pressed }) => [styles.call, pressed && { opacity: 0.8 }]}>
          <Text style={styles.callText}>📞  Zavolat {who}</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Můžeš používat</Text>
        {visible === null ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.grid}>
            {visible.map((item) => (
              <Pressable
                key={item.packageName}
                onPress={() => FocusLock.launchApp(item.packageName)}
                style={({ pressed }) => [styles.app, pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] }]}>
                <Image source={{ uri: item.icon }} style={styles.icon} />
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable onPress={onParent} style={({ pressed }) => [styles.parent, pressed && { opacity: 0.6 }]}>
        <Text style={styles.parentText}>👤  Rodič</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  badge: {
    alignSelf: 'center',
    color: colors.lockText,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    fontWeight: '700',
    marginTop: 8,
    overflow: 'hidden',
  },
  hero: { alignItems: 'center', marginVertical: 8 },
  bigLock: { alignItems: 'center', paddingVertical: 20 },
  untilParent: { color: colors.lockMuted, fontSize: 16, marginTop: 6 },
  blocked: { backgroundColor: 'rgba(229,72,77,0.22)', borderRadius: 14, padding: 12 },
  blockedText: { color: '#FFD7D8', fontWeight: '700', textAlign: 'center', fontSize: 15 },
  warning: { color: '#FFD27A', backgroundColor: 'rgba(245,165,36,0.18)', borderRadius: 14, padding: 12, fontSize: 14 },
  card: { backgroundColor: colors.lockCard, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardLabel: { color: colors.lockMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  message: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
  call: { backgroundColor: '#22C55E', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  callText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  app: { width: '25%', alignItems: 'center', paddingVertical: 10 },
  icon: { width: 54, height: 54 },
  label: { color: '#fff', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 2 },
  parent: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  parentText: { color: colors.lockMuted, fontSize: 15, fontWeight: '600' },
});
