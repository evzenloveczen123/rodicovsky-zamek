import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import FocusLock from '../../modules/focus-lock';
import { PinPad } from '../components/PinPad';
import { colors, errorText } from '../theme';

type Props = {
  onDone: (pin: string) => void;
  /** When changing an existing PIN. */
  currentPin?: string;
  onCancel?: () => void;
};

export function SetupPinScreen({ onDone, currentPin, onCancel }: Props) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const submit = (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError('PINy se neshodují, zkuste to znovu.');
      setAttempt((a) => a + 1);
      return;
    }
    const r = FocusLock.setPin(pin, currentPin ?? null);
    if (!r.ok) {
      setFirst(null);
      setError((r.error && errorText[r.error]) || 'PIN se nepodařilo uložit.');
      setAttempt((a) => a + 1);
      return;
    }
    onDone(pin);
  };

  return (
    <View style={styles.container}>
      {!currentPin ? (
        <View style={styles.logo}>
          <Text style={{ fontSize: 44 }}>🛡️</Text>
        </View>
      ) : null}
      <Text style={styles.intro}>
        {currentPin
          ? 'Zadejte nový rodičovský PIN (4–8 číslic).'
          : 'Vítejte! Nejdřív si rodič nastaví PIN (4–8 číslic). Tímto PINem se bude zámek zapínat i vypínat. Dítěti ho neprozrazujte.'}
      </Text>
      <PinPad
        title={first === null ? 'Nastavte rodičovský PIN' : 'Zadejte PIN ještě jednou'}
        error={error}
        resetKey={attempt}
        onSubmit={submit}
        onCancel={first !== null ? () => setFirst(null) : onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  logo: { alignSelf: 'center', width: 84, height: 84, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  intro: { color: colors.muted, fontSize: 15, textAlign: 'center', marginHorizontal: 28, marginBottom: 24, lineHeight: 21 },
});
