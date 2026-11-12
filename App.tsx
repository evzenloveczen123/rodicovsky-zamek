import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import FocusLock, { type InstalledApp, type LockStatus } from './modules/focus-lock';
import { AppPickerScreen } from './src/screens/AppPickerScreen';
import { LockedScreen } from './src/screens/LockedScreen';
import { LockOptionsScreen } from './src/screens/LockOptionsScreen';
import { ParentContactScreen } from './src/screens/ParentContactScreen';
import { ParentLockMenuScreen } from './src/screens/ParentLockMenuScreen';
import { ParentPanelScreen } from './src/screens/ParentPanelScreen';
import { PinPrompt } from './src/screens/PinPrompt';
import { SetupPinScreen } from './src/screens/SetupPinScreen';
import { UnlockedHomeScreen } from './src/screens/UnlockedHomeScreen';
import { colors, errorText } from './src/theme';

type Screen =
  | 'home'
  | 'enterPin' // parent PIN while unlocked
  | 'panel'
  | 'apps'
  | 'contact'
  | 'changePin'
  | 'lockOptions'
  | 'lockedPin' // parent PIN while locked
  | 'lockMenu';

/** Sub-screens of the parent panel; Back returns to the panel. */
const PANEL_CHILDREN: Screen[] = ['apps', 'contact', 'changePin', 'lockOptions'];

/** The parent stays "signed in" briefly so going to Android settings during setup doesn't ask again. */
const PARENT_SESSION_MS = 3 * 60 * 1000;

export default function App() {
  const [status, setStatus] = useState<LockStatus>(() => FocusLock.getStatus());
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [parentPin, setParentPin] = useState<string | null>(null);
  const [wasBlocked, setWasBlocked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const backgroundedAt = useRef(0);

  const refresh = useCallback(() => setStatus(FocusLock.getStatus()), []);

  const loadApps = useCallback(() => {
    if (!FocusLock.getStatus().supported) return;
    FocusLock.getLaunchableApps().then(setApps).catch(() => setApps([]));
  }, []);

  useEffect(loadApps, [loadApps]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const s = FocusLock.getStatus();
        setStatus(s);
        // The service brought us to the front because the child tried a blocked app.
        setWasBlocked(s.locked && Date.now() - s.lastBlockedAt < 5000);
        if (backgroundedAt.current && Date.now() - backgroundedAt.current > PARENT_SESSION_MS) {
          setParentPin(null);
          setScreen('home');
        }
        backgroundedAt.current = 0;
        loadApps();
      } else if (state === 'background') {
        backgroundedAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [loadApps]);

  // Back: sub-screen → panel → home. While locked, Back never leaves the lock screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status.locked) {
        setScreen('home');
        return true;
      }
      if (screen === 'home') return false;
      setScreen(PANEL_CHILDREN.includes(screen) ? 'panel' : 'home');
      return true;
    });
    return () => sub.remove();
  }, [screen, status.locked]);

  const openPanel = (pin: string) => {
    setParentPin(pin);
    setScreen('panel');
    refresh();
  };

  const leaveParent = () => {
    setParentPin(null);
    setScreen('home');
    refresh();
  };

  let content: React.ReactNode;
  let dark = false;

  if (!status.supported) {
    content = (
      <View style={styles.center}>
        <Text style={styles.title}>Zatím jen pro Android</Text>
        <Text style={styles.muted}>
          Verze pro iPhone se připravuje. Na iOS bude zámek fungovat přes Čas u obrazovky (Screen Time).
        </Text>
      </View>
    );
  } else if (!status.pinSet) {
    content = <SetupPinScreen onDone={openPanel} />;
  } else if (status.locked) {
    dark = true;
    if (screen === 'lockedPin') {
      content = (
        <PinPrompt
          dark
          title="Rodičovský PIN"
          subtitle="Pro vypnutí nebo prodloužení zámku"
          check={(p) => FocusLock.verifyPin(p)}
          onCancel={() => setScreen('home')}
          onSuccess={(p) => {
            setParentPin(p);
            setScreen('lockMenu');
            refresh();
          }}
        />
      );
    } else if (screen === 'lockMenu' && parentPin) {
      content = (
        <ParentLockMenuScreen
          status={status}
          pin={parentPin}
          onChanged={refresh}
          onBack={() => {
            setParentPin(null);
            setScreen('home');
          }}
          onUnlocked={() => {
            setWasBlocked(false);
            openPanel(parentPin);
          }}
        />
      );
    } else {
      content = (
        <LockedScreen
          status={status}
          apps={apps}
          wasBlocked={wasBlocked}
          onParent={() => setScreen('lockedPin')}
          onExpired={() => {
            setWasBlocked(false);
            setScreen('home');
            refresh();
          }}
        />
      );
    }
  } else if (parentPin && screen === 'apps') {
    const initial = status.allowedPackages.length ? status.allowedPackages : FocusLock.getSuggestedPackages();
    content = (
      <AppPickerScreen
        apps={apps}
        initial={initial}
        pin={parentPin}
        onCancel={() => setScreen('panel')}
        onDone={() => {
          refresh();
          setScreen('panel');
        }}
      />
    );
  } else if (parentPin && screen === 'contact') {
    content = (
      <ParentContactScreen
        status={status}
        pin={parentPin}
        onCancel={() => setScreen('panel')}
        onDone={() => {
          refresh();
          setScreen('panel');
        }}
      />
    );
  } else if (parentPin && screen === 'changePin') {
    content = (
      <SetupPinScreen
        currentPin={parentPin}
        onCancel={() => setScreen('panel')}
        onDone={(p) => {
          setParentPin(p);
          setScreen('panel');
        }}
      />
    );
  } else if (parentPin && screen === 'lockOptions') {
    content = (
      <LockOptionsScreen
        error={lockError}
        onCancel={() => {
          setLockError(null);
          setScreen('panel');
        }}
        onStart={(minutes, message) => {
          const r = FocusLock.lock(parentPin, minutes, message);
          if (r.ok) {
            setLockError(null);
            setParentPin(null);
            setWasBlocked(false);
            setScreen('home');
          } else {
            setLockError((r.error && errorText[r.error]) || 'Zámek se nepodařilo zapnout.');
          }
          refresh();
        }}
      />
    );
  } else if (parentPin && screen === 'panel') {
    content = (
      <ParentPanelScreen
        status={status}
        onLock={() => setScreen('lockOptions')}
        onPickApps={() => setScreen('apps')}
        onContact={() => setScreen('contact')}
        onChangePin={() => setScreen('changePin')}
        onClose={leaveParent}
      />
    );
  } else if (screen === 'enterPin') {
    content = (
      <PinPrompt
        title="Rodičovský PIN"
        check={(p) => FocusLock.verifyPin(p)}
        onCancel={() => setScreen('home')}
        onSuccess={openPanel}
      />
    );
  } else {
    content = <UnlockedHomeScreen onParent={() => setScreen('enterPin')} />;
  }

  return (
    <SafeAreaProvider>
      {dark ? (
        <LinearGradient colors={[colors.lockTop, colors.lockBottom]} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}
      <SafeAreaView style={styles.root}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 15, color: colors.muted, textAlign: 'center' },
});
