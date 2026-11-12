package expo.modules.focuslock

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class FocusLockModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw CodedException("ERR_NO_CONTEXT", "React context is not available", null)

  private val store get() = LockStore(context)

  override fun definition() = ModuleDefinition {
    Name("FocusLock")

    // While locked, leaving the app (Recents button, Home, opening an allowed app) closes it
    // and removes its card from Recents, so there is nothing for the child to swipe away.
    // Blocking itself lives in the accessibility service and keeps running.
    OnActivityEntersBackground {
      if (store.isLocked) appContext.currentActivity?.finishAndRemoveTask()
    }

    Function("getStatus") {
      val s = store
      syncRecents(s.isLocked)
      mapOf(
        "supported" to true,
        "locked" to s.isLocked,
        "pinSet" to s.isPinSet,
        "accessibilityEnabled" to isAccessibilityEnabled(),
        "deviceAdminActive" to isDeviceAdminActive(),
        "allowedPackages" to s.allowedPackages.toList(),
        "lastBlockedAt" to s.lastBlockedAt,
        "retryAfterMs" to s.retryAfterMs(),
        "lockUntil" to s.lockUntil,
        "lockStartedAt" to s.lockStartedAt,
        "message" to s.message,
        "parentName" to s.parentName,
        "parentPhone" to s.parentPhone,
        "attempts" to s.attempts().map {
          mapOf(
            "packageName" to it.packageName,
            "label" to appLabel(it.packageName),
            "count" to it.count,
            "lastAt" to it.lastAt,
          )
        },
      )
    }

    Function("setParentContact") { name: String, phone: String, pin: String ->
      val s = store
      if (s.isLocked) return@Function result(false, "locked")
      val check = s.verifyPin(pin)
      if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      s.parentName = name.trim()
      s.parentPhone = phone
      result(true)
    }

    Function("extendLock") { pin: String, minutes: Int ->
      val s = store
      if (!s.isLocked) return@Function result(false, "not_locked")
      val check = s.verifyPin(pin)
      if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      s.extendLock(minutes.coerceIn(1, 24 * 60))
      result(true)
    }

    // First-time setup, or changing the PIN (requires the current one, only while unlocked).
    Function("setPin") { newPin: String, currentPin: String? ->
      val s = store
      if (!LockStore.isValidPin(newPin)) return@Function result(false, "invalid_pin")
      if (s.isPinSet) {
        if (s.isLocked) return@Function result(false, "locked")
        val check = s.verifyPin(currentPin ?: "")
        if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      }
      s.storePin(newPin)
      result(true)
    }

    Function("verifyPin") { pin: String ->
      val check = store.verifyPin(pin)
      result(check.ok, if (check.ok) null else "wrong_pin", check.retryAfterMs)
    }

    Function("setAllowedPackages") { packages: List<String>, pin: String ->
      val s = store
      if (s.isLocked) return@Function result(false, "locked")
      val check = s.verifyPin(pin)
      if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      s.allowedPackages = packages
        .filter { it !in AppPolicy.ALWAYS_BLOCKED && AppPolicy.distractionReason(context, it) == null }
        .toSet()
      result(true)
    }

    // durationMinutes = 0: until the parent unlocks with the PIN.
    Function("lock") { pin: String, durationMinutes: Int, message: String ->
      val s = store
      if (!s.isPinSet) return@Function result(false, "no_pin")
      if (!isAccessibilityEnabled()) return@Function result(false, "accessibility_disabled")
      if (!isDeviceAdminActive()) return@Function result(false, "device_admin_inactive")
      val check = s.verifyPin(pin)
      if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      s.startLock(durationMinutes.coerceIn(0, 7 * 24 * 60), message.trim())
      syncRecents(true)
      result(true)
    }

    Function("unlock") { pin: String ->
      val s = store
      val check = s.verifyPin(pin)
      if (!check.ok) return@Function result(false, "wrong_pin", check.retryAfterMs)
      s.endLock()
      syncRecents(false)
      result(true)
    }

    AsyncFunction("getLaunchableApps") {
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val always = AppPolicy.alwaysAllowed(context)
      pm.queryIntentActivities(launcher, PackageManager.MATCH_ALL)
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != context.packageName }
        .filter { it.activityInfo.packageName !in AppPolicy.ALWAYS_BLOCKED }
        .map {
          val pkg = it.activityInfo.packageName
          mapOf(
            "packageName" to pkg,
            "label" to it.loadLabel(pm).toString(),
            "icon" to iconBase64(it.loadIcon(pm)),
            // Dialer, SMS, keyboard... are always allowed and cannot be unticked.
            "alwaysAllowed" to (pkg in always),
            // Games, video, social apps: always blocked, cannot be ticked.
            "blockedReason" to (if (pkg in always) null else AppPolicy.distractionReason(context, pkg)?.code),
          )
        }
        .sortedBy { (it["label"] as String).lowercase() }
    }

    Function("getSuggestedPackages") {
      AppPolicy.suggested(context)
    }

    Function("launchApp") { packageName: String ->
      val s = store
      if (s.isLocked && !AppPolicy.isAllowed(context, packageName, s.allowedPackages)) return@Function false
      val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return@Function false
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }

    Function("openAccessibilitySettings") {
      startSettings(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }

    // Android 13+: sideloaded apps must first get "Allow restricted settings" in App info.
    Function("openAppInfo") {
      startSettings(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(android.net.Uri.parse("package:${context.packageName}"))
      )
    }

    Function("requestDeviceAdmin") {
      val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
        .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent())
        .putExtra(
          DevicePolicyManager.EXTRA_ADD_EXPLANATION,
          context.getString(R.string.focus_lock_admin_explanation)
        )
      startSettings(intent)
    }
  }

  private fun startSettings(intent: Intent) {
    if (store.isLocked) return
    val activity = appContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  /**
   * While locked the app is hidden from the Recents screen, so the child has nothing
   * to swipe away (on Xiaomi/HyperOS swiping can force-stop the app, which makes
   * Android switch the accessibility service off).
   */
  private fun syncRecents(locked: Boolean) {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    am.appTasks.forEach { task ->
      try {
        task.setExcludeFromRecents(locked)
      } catch (_: IllegalArgumentException) {
        // Task finished in the meantime.
      }
    }
  }

  private fun result(ok: Boolean, error: String? = null, retryAfterMs: Long = 0L) =
    mapOf("ok" to ok, "error" to error, "retryAfterMs" to retryAfterMs)

  private fun adminComponent() = ComponentName(context, LockAdminReceiver::class.java)

  private fun isDeviceAdminActive(): Boolean {
    val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    return dpm.isAdminActive(adminComponent())
  }

  private fun isAccessibilityEnabled(): Boolean {
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val me = ComponentName(context, LockAccessibilityService::class.java)
    return enabled.split(':').any {
      ComponentName.unflattenFromString(it) == me
    }
  }

  private fun appLabel(pkg: String): String = try {
    val pm = context.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
  } catch (_: PackageManager.NameNotFoundException) {
    pkg
  }

  private fun iconBase64(drawable: android.graphics.drawable.Drawable): String {
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(Canvas(bitmap))
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }
}
