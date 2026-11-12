import { StyleSheet, View } from 'react-native';

import type { LockResult } from '../../modules/focus-lock';
import { PinPad } from '../components/PinPad';
import { usePinCheck } from '../usePinCheck';

type Props = {
  title: string;
  subtitle?: string;
  dark?: boolean;
  /** Native call that checks the PIN (verify / lock / unlock). */
  check: (pin: string) => LockResult;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
};

export function PinPrompt({ title, subtitle, dark, check, onSuccess, onCancel }: Props) {
  const pin = usePinCheck();
  return (
    <View style={styles.container}>
      <PinPad
        title={title}
        subtitle={subtitle}
        dark={dark}
        error={pin.error}
        blockedUntil={pin.blockedUntil}
        resetKey={pin.attempt}
        onCancel={onCancel}
        onSubmit={(p) => {
          if (pin.handle(check(p))) onSuccess(p);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center' } });
