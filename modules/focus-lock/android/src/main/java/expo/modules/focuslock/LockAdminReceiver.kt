package expo.modules.focuslock

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Device admin: Android refuses to uninstall an app while it is an active admin.
 * Deactivating it happens in Settings, which is blocked while the lock is on.
 */
class LockAdminReceiver : DeviceAdminReceiver() {
  override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
    context.getString(R.string.focus_lock_admin_disable_warning)
}
