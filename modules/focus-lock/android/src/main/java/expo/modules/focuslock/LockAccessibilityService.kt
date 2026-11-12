package expo.modules.focuslock

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

/**
 * Runs as a system-bound service, independent of the app's UI: swiping the app away
 * from Recents does not stop it, and Android restarts it after a reboot.
 * When the lock is on the phone works like a kiosk: the home screen, Recents and every
 * app that isn't allowed are immediately covered by our lock screen.
 */
class LockAccessibilityService : AccessibilityService() {
  private lateinit var store: LockStore
  private var locked = false
  private var userAllowed: Set<String> = emptySet()
  private var alwaysAllowed: Set<String> = emptySet()
  private var launchers: Set<String> = emptySet()
  private var lastBlockAt = 0L
  private val handler = Handler(Looper.getMainLooper())
  // Re-reads the state when a timed lock runs out (isLocked flips to false by itself).
  private val expiryCheck = Runnable { reload() }

  // Kept as a field: SharedPreferences only holds listeners weakly.
  private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> reload() }

  override fun onServiceConnected() {
    super.onServiceConnected()
    store = LockStore(this)
    store.prefs.registerOnSharedPreferenceChangeListener(prefsListener)
    reload()
  }

  private fun reload() {
    locked = store.isLocked
    userAllowed = store.allowedPackages
    // Recomputed on each state change so a newly set default dialer/keyboard is respected.
    alwaysAllowed = AppPolicy.alwaysAllowed(this)
    launchers = AppPolicy.launcherPackages(this)
    AppPolicy.clearDistractionCache() // apps may have been installed/updated since

    handler.removeCallbacks(expiryCheck)
    val until = store.lockUntil
    if (locked && until > 0) {
      handler.postDelayed(expiryCheck, (until - System.currentTimeMillis()).coerceAtLeast(0) + 500)
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (!locked || event == null) return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return

    // Home screen / Recents: show the lock screen instead (no "blocked app" message).
    if (pkg in launchers) {
      if (debounced()) showLockScreen(blockedPkg = null)
      return
    }

    val allowed = pkg !in AppPolicy.ALWAYS_BLOCKED &&
      (pkg in alwaysAllowed || (pkg in userAllowed && AppPolicy.distractionReason(this, pkg) == null))
    if (allowed) return

    // Only react to real app screens. Overlays and floating windows (e.g. Xiaomi Game Turbo,
    // chat bubbles, toasts) also fire window events but don't mean the app is in front.
    val cls = event.className?.toString() ?: return
    if (!isActivity(pkg, cls)) return

    if (debounced()) showLockScreen(blockedPkg = pkg)
  }

  /** One screen change fires several events in a row; react once. */
  private fun debounced(): Boolean {
    val now = System.currentTimeMillis()
    if (now - lastBlockAt < 300) return false
    lastBlockAt = now
    return true
  }

  private val activityCache = HashMap<String, Boolean>()

  private fun isActivity(pkg: String, cls: String): Boolean =
    activityCache.getOrPut("$pkg/$cls") {
      try {
        packageManager.getActivityInfo(ComponentName(pkg, cls), 0)
        true
      } catch (_: PackageManager.NameNotFoundException) {
        false
      }
    }

  /** Accessibility services are exempt from background-activity-start limits. */
  private fun showLockScreen(blockedPkg: String?) {
    val blocked = blockedPkg != null
    if (blockedPkg != null) {
      store.lastBlockedAt = System.currentTimeMillis()
      store.recordAttempt(blockedPkg)
    }
    packageManager.getLaunchIntentForPackage(packageName)?.let { intent ->
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
      intent.putExtra(EXTRA_BLOCKED, blocked)
      startActivity(intent)
    }
  }

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    handler.removeCallbacks(expiryCheck)
    if (::store.isInitialized) store.prefs.unregisterOnSharedPreferenceChangeListener(prefsListener)
    super.onDestroy()
  }

  companion object {
    const val EXTRA_BLOCKED = "focus_lock_blocked"
  }
}
