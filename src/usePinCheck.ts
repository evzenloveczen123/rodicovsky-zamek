import { useState } from 'react';

import type { LockResult } from '../modules/focus-lock';
import { errorText } from './theme';

/** Shared error / throttle handling for any native call that checks the parent PIN. */
export function usePinCheck() {
  const [error, setError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState(0);
  // Bumped on every failure so PinPad clears the typed digits even if the message repeats.
  const [attempt, setAttempt] = useState(0);

  const handle = (r: LockResult) => {
    if (r.ok) {
      setError(null);
      setBlockedUntil(0);
      return true;
    }
    setAttempt((a) => a + 1);
    setError((r.error && errorText[r.error]) || 'Něco se nepovedlo.');
    setBlockedUntil(r.retryAfterMs > 0 ? Date.now() + r.retryAfterMs : 0);
    return false;
  };

  const fail = (message: string) => {
    setAttempt((a) => a + 1);
    setError(message);
  };

  const reset = () => {
    setError(null);
    setBlockedUntil(0);
  };

  return { error, blockedUntil, attempt, handle, fail, reset };
}
