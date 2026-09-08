/**
 * Wires the release build to credentials/chopthegreens-upload.keystore.
 *
 * The android/ folder is generated (and gitignored), so hand-editing
 * build.gradle would be wiped by the next `expo prebuild --clean`. Doing it as
 * a config plugin means every regenerated project is signed correctly.
 *
 * Credentials live in credentials/signing.properties, which is NOT committed.
 * Without that file the build still works and falls back to debug signing, so
 * a fresh clone can build something runnable without the release key.
 */
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SIGNING_BLOCK = `
    signingConfigs {
        release {
            def props = new Properties()
            def propsFile = rootProject.file('signing.properties')
            if (propsFile.exists()) {
                propsFile.withInputStream { props.load(it) }
                storeFile rootProject.file(props['CTG_STORE_FILE'])
                storePassword props['CTG_STORE_PASSWORD']
                keyAlias props['CTG_KEY_ALIAS']
                keyPassword props['CTG_KEY_PASSWORD']
            }
        }
    }
`;

function patchBuildGradle(contents) {
  if (contents.includes('CTG_STORE_FILE')) return contents;

  // Insert our signingConfigs block right after `android {`.
  let out = contents.replace(/android\s*\{/, (m) => `${m}\n${SIGNING_BLOCK}`);

  // Point the release buildType at it, but only when the key is actually
  // present -- otherwise keep debug signing so the build never hard-fails.
  out = out.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    `$1signingConfig rootProject.file('signing.properties').exists() ? signingConfigs.release : signingConfigs.debug`,
  );
  return out;
}

/** Copy the keystore + properties into android/ where Gradle expects them. */
const withCopiedCredentials = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'credentials');
      const dest = path.join(cfg.modRequest.platformProjectRoot);
      const props = path.join(src, 'signing.properties');
      if (fs.existsSync(props)) {
        fs.copyFileSync(props, path.join(dest, 'signing.properties'));
        const keystore = fs
          .readFileSync(props, 'utf8')
          .match(/CTG_STORE_FILE=(.+)/)?.[1]
          ?.trim();
        if (keystore && fs.existsSync(path.join(src, keystore))) {
          fs.copyFileSync(path.join(src, keystore), path.join(dest, keystore));
        }
      }
      return cfg;
    },
  ]);

module.exports = function withReleaseSigning(config) {
  config = withCopiedCredentials(config);
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
