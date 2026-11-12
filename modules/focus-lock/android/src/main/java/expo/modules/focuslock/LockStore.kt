package expo.modules.focuslock

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * Persistent lock state shared by the JS module and the accessibility service.
 * The PIN is never stored – only a salted PBKDF2 hash.
 */
class LockStore(context: Context) {
  val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  /** Reading this ends a timed lock whose time is up. */
  val isLocked: Boolean
    get() {
      if (!prefs.getBoolean(KEY_LOCKED, false)) return false
      val until = lockUntil
      if (until > 0 && System.currentTimeMillis() >= until) {
        prefs.edit().putBoolean(KEY_LOCKED, false).commit()
        return false
      }
      return true
    }

  /** End of a timed lock (ms since epoch), 0 = until the parent unlocks it. */
  val lockUntil: Long
    get() = prefs.getLong(KEY_LOCK_UNTIL, 0L)

  val lockStartedAt: Long
    get() = prefs.getLong(KEY_LOCK_STARTED, 0L)

  /** Note from the parent shown on the lock screen. */
  val message: String
    get() = prefs.getString(KEY_MESSAGE, "") ?: ""

  fun startLock(durationMinutes: Int, message: String) {
    val now = System.currentTimeMillis()
    events.edit().remove(KEY_ATTEMPTS).commit()
    prefs.edit()
      .putLong(KEY_LOCK_STARTED, now)
      .putLong(KEY_LOCK_UNTIL, if (durationMinutes > 0) now + durationMinutes * 60_000L else 0L)
      .putString(KEY_MESSAGE, message.take(200))
      .putBoolean(KEY_LOCKED, true)
      .commit()
  }

  fun endLock() {
    prefs.edit().putBoolean(KEY_LOCKED, false).commit()
  }

  /** Adds time to a timed lock; an untimed lock stays untimed. */
  fun extendLock(minutes: Int) {
    val until = lockUntil
    if (until <= 0) return
    val base = maxOf(until, System.currentTimeMillis())
    prefs.edit().putLong(KEY_LOCK_UNTIL, base + minutes * 60_000L).commit()
  }

  var parentName: String
    get() = prefs.getString(KEY_PARENT_NAME, "") ?: ""
    set(value) { prefs.edit().putString(KEY_PARENT_NAME, value.take(30)).commit() }

  var parentPhone: String
    get() = prefs.getString(KEY_PARENT_PHONE, "") ?: ""
    set(value) { prefs.edit().putString(KEY_PARENT_PHONE, value.filter { it.isDigit() || it == '+' }.take(20)).commit() }

  // Separate file so writing it doesn't wake the service's state listener.
  private val events: SharedPreferences =
    context.applicationContext.getSharedPreferences(EVENTS_NAME, Context.MODE_PRIVATE)

  var lastBlockedAt: Long
    get() = events.getLong(KEY_LAST_BLOCKED, 0L)
    set(value) { events.edit().putLong(KEY_LAST_BLOCKED, value).apply() }

  data class Attempt(val packageName: String, val count: Int, val lastAt: Long)

  /** Blocked apps the child tried to open during the current/last lock. */
  fun recordAttempt(pkg: String) {
    val json = JSONObject(events.getString(KEY_ATTEMPTS, null) ?: "{}")
    val entry = json.optJSONArray(pkg)
    val count = (entry?.optInt(0) ?: 0) + 1
    json.put(pkg, JSONArray().put(count).put(System.currentTimeMillis()))
    events.edit().putString(KEY_ATTEMPTS, json.toString()).apply()
  }

  fun attempts(): List<Attempt> {
    val json = JSONObject(events.getString(KEY_ATTEMPTS, null) ?: "{}")
    return json.keys().asSequence().map { pkg ->
      val a = json.getJSONArray(pkg)
      Attempt(pkg, a.optInt(0), a.optLong(1))
    }.sortedByDescending { it.count }.toList()
  }

  val isPinSet: Boolean
    get() = prefs.contains(KEY_PIN_HASH)

  var allowedPackages: Set<String>
    get() = prefs.getStringSet(KEY_ALLOWED, emptySet())?.toSet() ?: emptySet()
    set(value) { prefs.edit().putStringSet(KEY_ALLOWED, HashSet(value)).commit() }

  data class PinResult(val ok: Boolean, val retryAfterMs: Long)

  /** Remaining throttle time after too many wrong PINs, or 0. */
  fun retryAfterMs(): Long {
    val until = prefs.getLong(KEY_THROTTLE_UNTIL, 0L)
    return (until - System.currentTimeMillis()).coerceAtLeast(0L)
  }

  fun verifyPin(pin: String): PinResult {
    val wait = retryAfterMs()
    if (wait > 0) return PinResult(false, wait)

    val salt = prefs.getString(KEY_PIN_SALT, null)
    val hash = prefs.getString(KEY_PIN_HASH, null)
    if (salt == null || hash == null) return PinResult(false, 0)

    val candidate = hash(pin, Base64.decode(salt, Base64.NO_WRAP))
    val ok = MessageDigest.isEqual(candidate, Base64.decode(hash, Base64.NO_WRAP))
    if (ok) {
      prefs.edit().putInt(KEY_FAILED, 0).putLong(KEY_THROTTLE_UNTIL, 0L).commit()
      return PinResult(true, 0)
    }

    val failed = prefs.getInt(KEY_FAILED, 0) + 1
    var throttle = 0L
    if (failed >= FREE_ATTEMPTS) {
      // 30 s, 60 s, 120 s ... capped at one hour.
      val exp = (failed - FREE_ATTEMPTS).coerceAtMost(7)
      throttle = (30_000L shl exp).coerceAtMost(3_600_000L)
    }
    prefs.edit()
      .putInt(KEY_FAILED, failed)
      .putLong(KEY_THROTTLE_UNTIL, if (throttle > 0) System.currentTimeMillis() + throttle else 0L)
      .commit()
    return PinResult(false, throttle)
  }

  fun storePin(pin: String) {
    val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
    prefs.edit()
      .putString(KEY_PIN_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
      .putString(KEY_PIN_HASH, Base64.encodeToString(hash(pin, salt), Base64.NO_WRAP))
      .putInt(KEY_FAILED, 0)
      .putLong(KEY_THROTTLE_UNTIL, 0L)
      .commit()
  }

  private fun hash(pin: String, salt: ByteArray): ByteArray {
    val spec = PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, 256)
    return try {
      SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
    } finally {
      spec.clearPassword()
    }
  }

  companion object {
    const val PREFS_NAME = "focus_lock_state"
    private const val EVENTS_NAME = "focus_lock_events"
    private const val KEY_LAST_BLOCKED = "last_blocked_at"
    private const val KEY_ATTEMPTS = "attempts"
    private const val KEY_LOCK_UNTIL = "lock_until"
    private const val KEY_LOCK_STARTED = "lock_started"
    private const val KEY_MESSAGE = "message"
    private const val KEY_PARENT_NAME = "parent_name"
    private const val KEY_PARENT_PHONE = "parent_phone"
    const val KEY_LOCKED = "locked"
    const val KEY_ALLOWED = "allowed_packages"
    private const val KEY_PIN_HASH = "pin_hash"
    private const val KEY_PIN_SALT = "pin_salt"
    private const val KEY_FAILED = "failed_attempts"
    private const val KEY_THROTTLE_UNTIL = "throttle_until"
    private const val ITERATIONS = 20_000
    private const val FREE_ATTEMPTS = 5

    fun isValidPin(pin: String) = pin.length in 4..8 && pin.all { it in '0'..'9' }
  }
}
