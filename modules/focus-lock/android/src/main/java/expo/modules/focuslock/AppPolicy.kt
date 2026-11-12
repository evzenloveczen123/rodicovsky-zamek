package expo.modules.focuslock

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.provider.Telephony
import android.telecom.TelecomManager
import android.view.inputmethod.InputMethodManager

/** Decides which packages may be in the foreground while the lock is on. */
object AppPolicy {
  /** Never allowed while locked – they would let the child switch the lock off or uninstall it. */
  val ALWAYS_BLOCKED = setOf(
    "com.android.settings",
    "com.samsung.android.settings",
    "com.miui.securitycenter",
    "com.android.packageinstaller",
    "com.google.android.packageinstaller",
    "com.samsung.android.packageinstaller",
    "com.miui.packageinstaller",
    "com.android.vending", // Play Store: new apps / uninstall
  )

  /** Needed for the phone to work at all, or for emergency calls. */
  private val SYSTEM_ALLOWED = setOf(
    "android",
    "com.android.systemui",
    "com.android.phone",
    "com.android.server.telecom",
    "com.android.emergency",
    "com.google.android.apps.safetyhub",
    "com.android.permissioncontroller",
    "com.google.android.permissioncontroller",
    "com.android.incallui",
    "com.samsung.android.incallui",
  )

  /** Suggested basic apps, preselected in the setup screen if installed. */
  private val SUGGESTED = listOf(
    "com.google.android.googlequicksearchbox",
    "com.android.chrome",
    "com.google.android.apps.maps",
    "com.google.android.contacts",
    "com.android.contacts",
    "com.samsung.android.app.contacts",
    "com.google.android.deskclock",
    "com.android.deskclock",
    "com.sec.android.app.clockpackage",
    "com.google.android.calculator",
    "com.android.calculator2",
    "com.sec.android.app.popupcalculator",
  )

  fun alwaysAllowed(context: Context): Set<String> {
    val result = HashSet(SYSTEM_ALLOWED)
    result.add(context.packageName)

    // Keyboards, otherwise SMS / search cannot be typed.
    (context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager)
      ?.enabledInputMethodList?.forEach { result.add(it.packageName) }

    defaultDialer(context)?.let { result.add(it) }
    defaultSms(context)?.let { result.add(it) }
    return result - ALWAYS_BLOCKED
  }

  /**
   * Home screen apps (on Xiaomi also the Recents screen). While locked they are replaced
   * by our lock screen, so the phone behaves like a kiosk.
   */
  fun launcherPackages(context: Context): Set<String> {
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return context.packageManager
      .queryIntentActivities(home, PackageManager.MATCH_ALL)
      .map { it.activityInfo.packageName }
      .filter { it != context.packageName }
      .toSet()
  }

  fun suggested(context: Context): List<String> {
    val installed = launchablePackages(context)
    return (listOfNotNull(defaultDialer(context), defaultSms(context)) + SUGGESTED)
      .filter { it in installed }
      .distinct()
  }

  fun isAllowed(context: Context, pkg: String, userAllowed: Set<String>): Boolean {
    if (pkg in ALWAYS_BLOCKED) return false
    if (pkg in alwaysAllowed(context)) return true
    return pkg in userAllowed && distractionReason(context, pkg) == null
  }

  fun launchablePackages(context: Context): Set<String> {
    val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return context.packageManager
      .queryIntentActivities(launcher, PackageManager.MATCH_ALL)
      .map { it.activityInfo.packageName }
      .toSet()
  }

  private fun defaultDialer(context: Context): String? =
    (context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage

  private fun defaultSms(context: Context): String? =
    Telephony.Sms.getDefaultSmsPackage(context)

  // ---- Distracting apps: blocked while locked even if the parent ticked them. ----

  enum class Distraction(val code: String) { GAME("game"), VIDEO("video"), SOCIAL("social") }

  private val DISTRACTING_PACKAGES = mapOf(
    "com.google.android.youtube" to Distraction.VIDEO,
    "com.google.android.apps.youtube.kids" to Distraction.VIDEO,
    "com.google.android.apps.youtube.music" to Distraction.VIDEO,
    "com.netflix.mediaclient" to Distraction.VIDEO,
    "tv.twitch.android.app" to Distraction.VIDEO,
    "com.disney.disneyplus" to Distraction.VIDEO,
    "com.hbo.hbonow" to Distraction.VIDEO,
    "com.amazon.avod.thirdpartyclient" to Distraction.VIDEO,
    "com.zhiliaoapp.musically" to Distraction.SOCIAL, // TikTok
    "com.ss.android.ugc.trill" to Distraction.SOCIAL, // TikTok
    "com.instagram.android" to Distraction.SOCIAL,
    "com.instagram.barcelona" to Distraction.SOCIAL, // Threads
    "com.facebook.katana" to Distraction.SOCIAL,
    "com.facebook.lite" to Distraction.SOCIAL,
    "com.snapchat.android" to Distraction.SOCIAL,
    "com.twitter.android" to Distraction.SOCIAL,
    "com.reddit.frontpage" to Distraction.SOCIAL,
    "com.pinterest" to Distraction.SOCIAL,
    "com.discord" to Distraction.SOCIAL,
    "com.bereal.ft" to Distraction.SOCIAL,
    "com.google.android.play.games" to Distraction.GAME,
  )

  /** Package prefixes of game publishers. */
  private val GAME_PUBLISHERS = listOf(
    "com.supercell.", "com.king.", "com.rovio.", "com.roblox.", "com.mojang.", "com.miniclip.",
    "com.ea.", "com.gameloft.", "com.innersloth.", "com.kiloo.", "com.outfit7.", "com.halfbrick.",
    "com.imangi.", "com.tencent.ig", "com.dts.freefire", "com.mobile.legends", "com.activision.",
    "com.epicgames.", "com.playrix.", "com.zynga.", "com.voodoo.", "com.ketchapp.", "com.sybo.",
    "com.nianticlabs.", "com.miHoYo.", "com.HoYoverse.", "com.garena.game", "com.pubg.",
    "com.netease.", "com.lilithgames.", "com.moonactive.", "com.scopely.", "com.playtika.",
    "com.ubisoft.", "com.squareenix.", "com.nintendo.", "com.bandainamcoent.", "com.tinyco.",
    "com.fingersoft.", "com.ironsource.", "com.yodo1.", "com.azurgames.", "com.saygames.",
  )

  /** Launcher activity class names typical for game engines. */
  private val GAME_ENGINE_ACTIVITY = Regex(
    "^(UnityPlayer\\w*|\\w*Unreal\\w*|\\w*UE4\\w*|Cocos\\w*|Godot\\w*|GameActivity|GameApp|AppActivity|NativeActivity|\\w*Titan\\w*)$",
  )

  private val GAME_ENGINE_LIBS = listOf(
    "libunity.so", "libil2cpp.so", "libUE4.so", "libUnreal.so", "libcocos2djs.so", "libcocos2dcpp.so",
    "libcocos.so", "libgodot_android.so", "libgdx.so", "libdefold.so", "libg.so", // libg.so = Supercell
  )

  private val distractionCache = java.util.concurrent.ConcurrentHashMap<String, Any>()
  private object NotDistracting

  fun distractionReason(context: Context, pkg: String): Distraction? {
    if (pkg == context.packageName || pkg in SYSTEM_ALLOWED) return null
    val cached = distractionCache.getOrPut(pkg) { detect(context, pkg) ?: NotDistracting }
    return cached as? Distraction
  }

  private fun detect(context: Context, pkg: String): Distraction? {
    DISTRACTING_PACKAGES[pkg]?.let { return it }
    if (GAME_PUBLISHERS.any { pkg.startsWith(it, ignoreCase = true) }) return Distraction.GAME

    val pm = context.packageManager
    val info = try {
      pm.getApplicationInfo(pkg, 0)
    } catch (_: PackageManager.NameNotFoundException) {
      return null
    }

    when (info.category) {
      ApplicationInfo.CATEGORY_GAME -> return Distraction.GAME
      ApplicationInfo.CATEGORY_VIDEO -> return Distraction.VIDEO
      ApplicationInfo.CATEGORY_SOCIAL -> return Distraction.SOCIAL
    }
    @Suppress("DEPRECATION")
    if (info.flags and ApplicationInfo.FLAG_IS_GAME != 0) return Distraction.GAME

    // System apps (dialer, camera, clock…) are never treated as games by the heuristics below.
    if (info.flags and ApplicationInfo.FLAG_SYSTEM != 0) return null

    val launchActivity = pm.getLaunchIntentForPackage(pkg)?.component?.className ?: ""
    if (GAME_ENGINE_ACTIVITY.containsMatchIn(launchActivity.substringAfterLast('.'))) return Distraction.GAME

    val libDir = info.nativeLibraryDir?.let { java.io.File(it) }
    val libs = try { libDir?.list()?.toSet() } catch (_: SecurityException) { null } ?: emptySet()
    if (GAME_ENGINE_LIBS.any { it in libs }) return Distraction.GAME

    return null
  }

  fun clearDistractionCache() = distractionCache.clear()
}
