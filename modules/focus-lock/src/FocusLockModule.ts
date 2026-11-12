import { NativeModule, requireNativeModule } from 'expo';

import type { InstalledApp, LockResult, LockStatus } from './FocusLock.types';

declare class FocusLockModule extends NativeModule<{}> {
  getStatus(): LockStatus;
  setPin(newPin: string, currentPin: string | null): LockResult;
  verifyPin(pin: string): LockResult;
  setAllowedPackages(packages: string[], pin: string): LockResult;
  /** durationMinutes = 0: until the parent unlocks with the PIN. */
  lock(pin: string, durationMinutes: number, message: string): LockResult;
  extendLock(pin: string, minutes: number): LockResult;
  setParentContact(name: string, phone: string, pin: string): LockResult;
  unlock(pin: string): LockResult;
  getLaunchableApps(): Promise<InstalledApp[]>;
  getSuggestedPackages(): string[];
  launchApp(packageName: string): boolean;
  openAccessibilitySettings(): void;
  openAppInfo(): void;
  requestDeviceAdmin(): void;
}

export default requireNativeModule<FocusLockModule>('FocusLock');
