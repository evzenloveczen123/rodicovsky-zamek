export type LockStatus = {
  /** false on platforms where blocking isn't implemented yet (iOS). */
  supported: boolean;
  locked: boolean;
  pinSet: boolean;
  accessibilityEnabled: boolean;
  deviceAdminActive: boolean;
  allowedPackages: string[];
  /** When the service last closed a blocked app (ms since epoch), 0 if never. */
  lastBlockedAt: number;
  /** Throttle after too many wrong PINs. */
  retryAfterMs: number;
  /** End of a timed lock (ms since epoch); 0 = until the parent unlocks. */
  lockUntil: number;
  lockStartedAt: number;
  /** Note from the parent shown on the lock screen. */
  message: string;
  parentName: string;
  parentPhone: string;
  /** Blocked apps the child tried to open during the current/last lock. */
  attempts: Attempt[];
};

export type Attempt = {
  packageName: string;
  label: string;
  count: number;
  lastAt: number;
};

export type LockErrorCode =
  | 'invalid_pin'
  | 'wrong_pin'
  | 'locked'
  | 'no_pin'
  | 'accessibility_disabled'
  | 'device_admin_inactive'
  | 'not_locked';

export type LockResult = {
  ok: boolean;
  error: LockErrorCode | null;
  retryAfterMs: number;
};

export type InstalledApp = {
  packageName: string;
  label: string;
  /** data: URI with a PNG icon */
  icon: string;
  /** Dialer, SMS, keyboard, home screen… – allowed regardless of the selection. */
  alwaysAllowed: boolean;
  /** Detected as distracting – blocked while locked even if selected. */
  blockedReason: 'game' | 'video' | 'social' | null;
};
