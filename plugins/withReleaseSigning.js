// Signs release builds with the project's own key when these environment variables
// are set (the release workflow sets them from GitHub Secrets):
//   ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD (optional)
// Without them the release build falls back to the debug key, so forks and PR builds still work.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// rodicovsky-zamek: release signing';

const SIGNING_CONFIG = `
        release {
            ${MARKER}
            def ksFile = System.getenv('ANDROID_KEYSTORE_FILE')
            if (ksFile) {
                storeFile file(ksFile)
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: System.getenv('ANDROID_KEYSTORE_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    // Add a `release` signing config next to the generated `debug` one.
    src = src.replace(/signingConfigs\s*\{\s*\n(\s*)debug\s*\{[^}]*\}/, (m) => m + SIGNING_CONFIG);

    // Use it for release builds when a keystore was provided.
    src = src.replace(
      /(release\s*\{\s*\n(?:\s*\/\/[^\n]*\n)*\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig System.getenv('ANDROID_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );

    if (!src.includes(MARKER) || !src.includes('signingConfigs.release')) {
      throw new Error('withReleaseSigning: android/app/build.gradle has an unexpected layout');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
