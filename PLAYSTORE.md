# Getting Chop the Greens onto Google Play

Everything here is done locally — no Expo account or paid build service needed.

## What you already have

Both artifacts are built, signed and verified — copies are in `dist-release/`:

| Thing | Where | Size |
|---|---|---|
| Phone APK (arm64, for sideloading) | `dist-release/chopthegreens-1.0.0-arm64.apk` | 49 MB |
| Play upload bundle | `dist-release/chopthegreens-1.0.0-play.aab` | 75 MB |
| Upload signing key | `credentials/chopthegreens-upload.keystore` | |
| Key password | `credentials/signing.properties` | |
| Store icon, 512×512 | `store/icon-512.png` | |
| Feature graphic, 1024×500 | `store/feature-graphic.png` | |
| Phone screenshots, ×7 | `store/screenshots/` (dark set in `dark-alternate/`) | |

Signed as `CN=Chop the Greens`, SHA-256 `13fed33b00b73a8f…`, `targetSdk 36` / `minSdk 24`.
Play currently requires targetSdk 35+, so this passes.

The AAB is 75 MB because it carries all four ABIs, but Play splits it per device — a Pixel
downloads roughly 25–30 MB, not 75.

### ⚠️ Back up `credentials/` right now

That folder is gitignored and exists nowhere else. Copy it into a password manager or
an encrypted drive **before** you do anything else. If you lose it you can still recover —
Play App Signing lets Google reset a lost *upload* key — but it's a support ticket and a
delay you don't want.

## Build commands

```bash
# one-time per shell
export ANDROID_HOME=$HOME/Android/Sdk

cd android

./gradlew bundleRelease      # AAB -> app/build/outputs/bundle/release/  (upload this to Play)
./gradlew assembleRelease    # APK -> app/build/outputs/apk/release/     (all 4 ABIs, ~104 MB)

# Slimmer APK for sideloading — real phones are all arm64, and dropping the
# x86/x86_64 emulator slices halves the size (104 MB -> 49 MB).
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

**Run those as two commands, not one.** Combining them —
`./gradlew bundleRelease assembleRelease -PreactNativeArchitectures=arm64-v8a` — applies
the architecture flag to *both* tasks, and the AAB comes out carrying arm64 only. Play
accepts it without complaint and then never serves it to a 32-bit device. Check before
you upload:

```bash
unzip -l dist-release/chopthegreens-1.0.0-play.aab \
  | grep -o 'base/lib/[a-z0-9_-]*' | sort -u
# arm64-v8a, armeabi-v7a, x86, x86_64
```

The first build takes ~25 minutes because Gradle downloads a 2 GB Android NDK to compile
React Native's C++. That's cached afterwards — later builds are well under a minute.

If you ever change `app.json`, icons, or add a native library, regenerate the native project
first — the signing setup survives it, because it's applied by `plugins/withReleaseSigning.js`:

```bash
npx expo prebuild --platform android --clean
```

## Installing the APK on your phone

**Cable:** `adb install -r android/app/build/outputs/apk/release/app-release.apk`

**No cable:** copy the `.apk` to the phone (Drive, email, USB), tap it, and allow
"install unknown apps" for whichever app you opened it from. Android will warn you the app
isn't from Play — expected for a self-signed build.

The APK is a universal build, so it runs on any phone but is larger than what Play will
serve. Play splits the AAB per-device, so your users download noticeably less.

## Play Console, step by step

1. **Account — already done.** You publish from an established Console account (QuotePulse,
   Bull88, Aurum). That matters: the "12 testers for 14 continuous days" gate applies to
   *newly created personal* developer accounts, so it should not apply here. You can move
   internal → closed → production at your own pace.
2. **Create app** — name `Chop the Greens`, English (US), *App*, *Free*. Category *Food & Drink*.
3. **Upload** the `.aab` under *Testing → Internal testing* first. Internal testing has no
   review delay, so it's the fastest way to check the real thing installs from Play.
4. Work through the tasks Play lists. The ones that need real thought are below.

### Store listing

| Field | Limit | Suggested |
|---|---|---|
| App name | 30 | `Chop the Greens` |
| Short description | 80 | `Vegetarian Indian recipes with hands-free cook mode and smart shopping lists.` |
| Full description | 4000 | Ready to paste, below |
| App icon | 512×512 PNG | `store/icon-512.png` |
| Feature graphic | 1024×500 PNG, no alpha | `store/feature-graphic.png` |
| Phone screenshots | 2–8; each side 320–3840px, ratio no taller than 2:1 | The seven in `store/screenshots/` |

Screenshots are the single biggest lever on install rate. Cook Mode and the aisle-grouped
shopping list are the two screens that show what the website can't do, so they're third and
fifth in the set — reorder them forward in Play Console if you'd rather lead with them.

These are real Pixel 8a captures of the signed release build with real data, in light
theme. A dark set is in `store/screenshots/dark-alternate/` if you'd rather; swap the whole
set rather than mixing. See `store/README.md`.

<details>
<summary>Full description — ready to paste</summary>

```
Cook vibrant vegetarian Indian food without the faff.

Chop the Greens brings the whole recipe collection from chopthegreens.com to your phone —
paneer, dal, chana, Instant Pot dinners, air fryer snacks, breakfasts and desserts — with
the tools you actually want while you're cooking.

HANDS-FREE COOK MODE
One step per swipe, text big enough to read from across the kitchen, and the screen stays
awake so it never dims mid-recipe. Each step shows just the ingredients it needs. When a
step says "simmer for 8-10 minutes", tap once to start a timer that keeps running even if
you leave the app.

SMART SHOPPING LIST
Add any recipe and the ingredients merge automatically — 2 tbsp of oil from one recipe plus
1 tbsp from another becomes 3 tbsp. Everything groups by supermarket aisle so the list reads
in the order you actually walk the shop.

SCALE ANY RECIPE
Cooking for two instead of four? Change the servings and every quantity rescales, fractions
and all.

PLAN YOUR WEEK
Drop recipes onto the next seven days, then turn the whole week into one shopping list.

WORKS OFFLINE
Recipes are saved to your phone, so your kitchen's dead spot doesn't matter.

No ads. No tracking. Signing in is optional — it only backs up your own saved recipes,
shopping list and meal plan, and every feature works without it.
```
</details>

The block above is complete and ready to paste — no edits needed.

**Don't restore the old closing line.** It used to read "No account. No ads. No tracking.",
which sync made false. Play treats listing copy as a claim it can hold you to, so the
ending keeps the two claims that are still absolutely true and describes the account as
what it is — optional, and a backup rather than a gate. If you ever ship without sync by
blanking `extra` in `app.json`, "No account." becomes true again and can go back.

### Privacy policy — done

**Live at https://chopthegreens.com/privacy-policy-chop-the-greens/**

Paste it into *Policy → App content → Privacy policy*. `PRIVACY.md` in this repo is the
source text — edit there and re-publish if it ever changes.

The same URL also answers the **account-deletion requirement** further down this page, so
it goes into two Play fields, not one.

### Data safety form

**Sync is now configured** (project `chop-the-greens`), so the app *does* offer an
account and the second table below is the one that applies. Play holds you to these
answers, so they have to describe what you actually ship — if you later blank `extra` in
`app.json` to ship without sync, switch back to the first table.

<details>
<summary>If you ship <em>without</em> sync (<code>extra</code> blank) — the simple case</summary>

- **Does your app collect or share user data?** → **No**
- Saves, shopping list and meal plan never leave the device. No accounts, no analytics,
  no ad SDKs.
- **Encrypted in transit?** → Yes (HTTPS).

</details>

**Shipping with sync configured — this is your case:**

First, the *Data collection and security* screen:

| Question | Answer | Why |
|---|---|---|
| Collects or shares required user data types? | **Yes** | Google name/email/photo, plus saves, list and plan in Firestore |
| All user data encrypted in transit? | **Yes** | Every URL in the app and all 3,743 in the live feed are `https`; the release manifest sets no `usesCleartextTraffic` and ships no network-security config, so Android 9+ blocks plaintext outright. Firebase Auth and Firestore are TLS. |
| Methods of account creation | **OAuth** — and nothing else | Google Sign-In is OAuth 2.0. There is no password path in the app: no `createUserWithEmail`, no `signInWithEmail`, no password field. All three "Username and…" options and "Other" are wrong. |

> **Answering OAuth triggers Play's account-deletion requirement.** You'll be asked for a
> URL where users can request deletion of their account and data — an in-app route alone
> doesn't satisfy it. The published policy answers this: its *"Deleting your data"* section
> names the contact address, so
> **https://chopthegreens.com/privacy-policy-chop-the-greens/**
> goes in both the privacy policy field and the deletion-request field.

Then the per-data-type table:

| Question | Answer |
|---|---|
| Collects or shares user data? | **Yes** (only for users who choose to sign in) |
| Personal info → Name | Collected, not shared. Purpose: *App functionality, Account management* |
| Personal info → Email address | Collected, not shared. Same purposes |
| Photos → profile picture | Collected, not shared. *App functionality* |
| App activity → Other user-generated content (saved recipes, list, plan) | Collected, not shared. *App functionality* |
| Is collection **optional**? | **Yes** — tick "Users can choose whether this data is collected" |
| Encrypted in transit? | Yes |
| Can users request deletion? | **Yes** — `sungari.001@gmail.com`, and the policy URL above as the deletion URL |

Do **not** tick anything under Location, Contacts, Messages, or Financial info — the app
requests only basic profile and email scopes and touches none of that.

Also relevant: Play requires an in-app **account deletion** route for apps with sign-in. A
contact email in the privacy policy satisfies this today, but adding an in-app "delete my
data" button is the more durable answer if you keep sync long-term.

### Health apps declaration — answer "no health features"

The tempting box is *Health and fitness → Nutrition and weight management*, because every
recipe carries a nutrition panel. Google defines that category as:

> Tools for tracking dietary intake, planning meals, managing diets, and supporting weight
> loss or weight management goals.

Every verb there is about acting on **the user's own** health data, and this app holds none
of it — no intake log, no daily or weekly totals, no dietary goals, no weight, height or
age. The nutrition tab is a passive reproduction of the nine per-serving values the blog
published, labelled in the UI *"Per {serving}, as published."* The app computes nothing and
stores nothing. That makes it a recipe attribute like cook time or equipment, not a tool.

**The arguable part is "planning meals",** since there's a Plan tab. Functionally it
schedules recipes to build a shopping list: no nutritional targets, no calorie budget, and
the card shows cook time, not calories. Grocery planning, not diet planning. With the app
in *Food & Drink* rather than *Health & Fitness*, "no health features" is accurate.

**Don't over-declare as a precaution.** Ticking the box routes you to step 2, regional
requirements, and pulls the app under the Health Content and Services policy — which can
require a *"not a medical device"* disclaimer in the store description plus regional
attestations. Those are live obligations you'd then have to meet. The declaration is
editable later if Google ever disagrees.

**Revisit this answer if the app ever gains** calorie totals, intake logging, dietary goals,
or anything weight-related. Any one of them flips it. Equally, keep *outcome* claims out of
the listing — the current copy sells cooking, not health results, which is what keeps this
clean. ("HEALTHY · SIMPLE · GUILT-FREE" on the icon badge is brand text, not a claim.)

### Content rating

Fill in the questionnaire — a recipe app rates **Everyone** in every region. Takes two minutes.

### Other declarations Play will ask for

- **Ads** — none.
- **Target audience** — 13+ (avoids the extra Families-policy requirements; the app isn't
  aimed at children).
- **Government app / financial features** — no to both.
- **Health apps declaration** — **"My app does not have any health features."** Everyone has
  to complete this form, including to certify *no* features, so it can't be skipped. The
  reasoning is in *Health apps declaration* above; read it before changing the answer.
- **Notifications** — the app posts local cook timers only. There is no server push, so
  there's nothing to declare beyond the permission itself.

## Releasing updates

Every upload needs a higher `versionCode`. It lives in `android/app/build.gradle`, but that
file is regenerated, so set it in `app.json` instead and let prebuild carry it through:

```json
"android": { "versionCode": 2 }
```

Bump `expo.version` (the user-visible `1.0.1`) at the same time.

## Realistic timeline

Your account is established, so the long pole is review, not onboarding:

| | |
|---|---|
| Internal testing track | same day, no review |
| Production review | typically a few days for a new app listing |

Nothing is blocked on assets, code, sync or the privacy policy any more — all four are
done. What's left is yours: back up `credentials/`, restrict the API key
(`SYNC-SETUP.md` step 8b), and create the app in Console.

## On signing: this app has its own key

Your Aurum runbook documents deliberately reusing one upload key across apps, which Play
fully allows. This project instead has its **own** upload key
(`credentials/chopthegreens-upload.keystore`), so it stays self-contained — a lost or
rotated key here cannot affect Bull88, Aurum or QuotePulse.

If you'd rather stay on the one shared upload key, **copy it in** rather than pointing at
it, so this project still builds standalone (the same independence rule your own runbook
uses):

1. Copy the shared `.jks` into `credentials/`.
2. In `credentials/signing.properties`, set `CTG_STORE_FILE` to that filename, `CTG_KEY_ALIAS`
   to its alias, and both password fields to its passwords.
3. Rebuild: `npx expo prebuild --platform android --clean && (cd android && ./gradlew bundleRelease)`

Either way, register whichever key you use as the upload key when you create the app in Play
Console, and let Google manage the app signing key (Play App Signing).

Confirm what actually signed a build, the same way your other apps do:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
```
