# Chop the Greens — working notes

Expo / React Native app for [chopthegreens.com](https://chopthegreens.com), shipping to
Google Play. No backend: it reads the blog's WordPress + WP Recipe Maker REST API directly.

**Read `STATUS.md` first.** It is the source of truth for what's done, what's outstanding,
and what's mid-flight. Start every session there — in particular its **Pick up here**
section, which records anything deliberately left uncommitted.

## Orientation

| Path | What's in it |
|---|---|
| `app/` | expo-router screens — `(tabs)/`, `recipe/[id]`, `cook/[id]` |
| `src/api/` | fetch, cache, and normalise the WP feed (`normalize.ts` does real repair work) |
| `src/store/` | `recipes`, `user` (saves/list/plan), `auth` (optional Google sync) |
| `src/lib/` | amount maths, aisles, facets, timers, layout metrics, Firebase, sync merge |
| `src/components/` | cards, video, account sheet, the two sign-in prompts, UI primitives |
| `scripts/` | icons, feature graphic, screenshots — all from `assets/brand/logo.jpg` |
| `store/` | Play listing assets, ready to upload (see `store/README.md`) |
| `PLAYSTORE.md` | submission path, listing copy, Data Safety answers |
| `SYNC-SETUP.md` | the Firebase setup for Google sign-in, screen by screen |
| `PRIVACY.md` | privacy policy to host; contact is `sungari.001@gmail.com` |

## Checks

```bash
npx tsc --noEmit     # must stay clean
npm test             # 12 tests, sync reconciliation
npx expo-doctor      # 20/21 — the failure is upstream patch drift, see STATUS.md
```

## Rules that aren't obvious from the code

**Never hand-edit `android/` or `ios/`.** Both are gitignored and regenerated wholesale by
`npx expo prebuild --platform android --clean`. Native config comes from config plugins —
release signing is `plugins/withReleaseSigning.js`. An edit to `build.gradle` survives
exactly until the next prebuild.

**Build the AAB and the APK as separate Gradle invocations.**

```bash
cd android
./gradlew bundleRelease                                        # all four ABIs — upload this
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a  # slim sideload APK
```

Combining them applies the architecture flag to *both* tasks, and the AAB silently comes out
arm64-only — Play accepts it and then never serves a 32-bit device. Verify before uploading:
`unzip -l <aab> | grep -o 'base/lib/[a-z0-9_-]*' | sort -u` should list four.

**Pushing needs the `github-bull88` remote.** Already configured. The default SSH key
authenticates as `CoinTranscend`, which has read but not write on the `bull88protocol` org.

**Sync must never gate anything.** Browsing, searching, cooking, saving, the shopping list
and the meal plan all work signed out and offline, by design. Google sign-in is a backup,
offered in two places only — a one-time snackbar on the first save, and a dismissible card
on Saved / List / Plan once there's something to lose. Not on first launch: there's nothing
to protect yet. With `expo.extra` blank the whole feature is dormant and no UI renders.

**Don't add the native Firebase SDK, `google-services.json`, or `firebase-analytics`.** The
Firebase console pushes all three after you register an Android app. This project uses the
Firebase **JS** SDK with config from `app.json`, and `@react-native-google-signin` takes its
`webClientId` at runtime. The Android registration exists only to hold the SHA-1. Analytics
in particular would contradict the store listing, `PRIVACY.md` and the Data Safety answers,
all of which state there is none. `SYNC-SETUP.md` has the detail.

**Firebase config values are public identifiers, not secrets** — they ship inside every
APK. But GitHub secret scanning flags `AIzaSy…` anyway, and an *unrestricted* key is a real
exposure because it works against any billable API on the project. Restrict the key
(`SYNC-SETUP.md` step 8b) before committing one.

**Play screenshots must be no taller than 2:1.** The Pixel shoots 1080×2400 (2.22:1), so
captures are cropped to 1080×2160 — see `store/README.md`, which also has the adb recipe.

**The recipe and cook screens are siblings of `(tabs)`, not children.** Anything that has to
appear over them belongs in `app/_layout.tsx`, not `app/(tabs)/_layout.tsx`. This is why
`FirstSavePrompt` lives at the root.

## Driving the phone (Pixel 8a, adb)

Deep links work and are the reliable way to navigate:

```bash
adb shell am start -a android.intent.action.VIEW -d "chopthegreens://recipe/19677" com.chopthegreens.app
adb shell am start -a android.intent.action.VIEW -d "chopthegreens://cook/1857"    com.chopthegreens.app
```

Tab bar centres are at `y≈2260`: Discover 108, Search 324, Plan 540, List 756, Saved 972.
**The recipe screen has no tab bar** — tapping those coordinates there hits "Cook" instead,
which is an easy way to get lost. `adb shell am force-stop` then relaunch is the quickest
way back to a known state. `adb shell svc power stayon usb` stops the screen locking
mid-session; turn it off again afterwards.

Leave the phone as you found it — theme, screen timeout, and any data you changed.
