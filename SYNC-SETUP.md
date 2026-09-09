# Turning on Google sign-in & sync

The code is written and wired. What's missing is a Firebase project, which only you can
create — it needs your Google account.

**Until you fill in the config below, sync stays completely off:** no account button and no
back-up prompts appear anywhere, nothing hits the network beyond fetching recipes, and the
app behaves exactly as it does today. That's deliberate, so a missing key can never stop
someone cooking.

Budget about 20 minutes. All of it is free at your scale.

---

## Status — configured as of 9 September 2026

All seven values are in `app.json` and `syncEnabled` is now **true**. Project
`chop-the-greens` (`50714944335`).

| Done | |
|---|---|
| ✅ | Web app registered; its config is in `app.json` (`appId` ends `:web:`) |
| ✅ | Android app registered, SHA-1 added — `certificate_hash` in `google-services.json` verified against `credentials/chopthegreens-upload.keystore` |
| ✅ | Google sign-in enabled; `oauth_client` now carries a `client_type: 1` (Android) and `client_type: 3` (Web) entry |
| ✅ | `googleWebClientId` = the `client_type: 3` value |

| Still open | |
|---|---|
| ⏳ | **Firestore database + rules** (step 6). Sign-in works without it; the *backup* then fails with `permission-denied` and the account sheet shows "Sync problem". |
| ⏳ | **API key restriction** (step 8b). Do this before the config is committed. |

The walkthrough below is kept for the next project, and because the traps in it are
worth not rediscovering.

---

## What you'll need to hand

| | |
|---|---|
| Android package name | `com.chopthegreens.app` |
| Upload key SHA-1 | `40:7F:CE:59:A0:3E:4B:B0:C1:70:CF:F8:42:7F:12:F7:7D:DA:94:A7` |

Re-read that fingerprint any time with:

```bash
keytool -list -v -keystore credentials/chopthegreens-upload.keystore \
  -storepass "$(grep CTG_STORE_PASSWORD credentials/signing.properties | cut -d= -f2)" | grep SHA1
```

## 1. Create the Firebase project

[console.firebase.google.com](https://console.firebase.google.com) → **Add project** →
name it `chop-the-greens`. Google Analytics is optional; skip it unless you want it.

## 2. Why you register the app twice

The single most confusing part of this, so it's worth 30 seconds up front. You register
**two** apps in one Firebase project, and they do unrelated jobs:

- The **Web app** exists purely to hand you a config block. This app talks to Firebase
  through the **JS SDK**, so a web app ID is what it wants. Registering only an Android app
  leaves you with an ID like `1:…:android:…`, which the JS SDK will take and then fail on
  later when Firestore asks the Installations service for a token.
- The **Android app** exists purely to hold the **SHA-1 fingerprint**. That's what lets
  Google's native sign-in sheet trust your APK. Nothing reads its
  `google-services.json` — you can download it or not, it makes no difference.

You need both. Do the Web one first; it's the one that unblocks me.

## 3. Register the Web app — do this one first

Project overview → **Add app** → the **`</>`** (web) icon.

| Field | What to put |
|---|---|
| App nickname | Anything. `Chop the Greens` is fine — it's only a console label. |
| Also set up Firebase Hosting | **Leave unchecked.** You're not hosting anything. |

Click **Register app**. The next screen ("Add Firebase SDK") shows a code block containing:

```js
const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "…firebaseapp.com",
  projectId: "…",
  storageBucket: "…firebasestorage.app",
  messagingSenderId: "…",
  appId: "1:…:web:…"
};
```

**Copy that whole block** — it's six of the seven values. Ignore the `npm install` and
`import` lines; the app already has the SDK. Then **Continue to console**.

You can get this back any time from **⚙ Project settings → General → Your apps → the web
app → SDK setup and configuration → Config**.

## 4. Register the Android app — this is where the SHA-1 goes

**Add app** again → the **Android** icon.

| Field | What to put |
|---|---|
| Android package name | `com.chopthegreens.app` — must match exactly, it's not editable later |
| App nickname | Optional |
| Debug signing certificate SHA-1 | `40:7F:CE:59:A0:3E:4B:B0:C1:70:CF:F8:42:7F:12:F7:7D:DA:94:A7` |

Despite the word "Debug" on that field, paste the upload-key SHA-1 above. Firebase just
stores fingerprints; it doesn't care which build they came from.

Click **Register app**, then click straight through **Download google-services.json**,
**Add Firebase SDK** and **Next steps** — none of it applies here. Nothing breaks if you
download the file; it simply isn't used.

**The console often doesn't ask for the SHA-1 during registration** — the field is hidden
or collapsed in the current flow. That's fine, but it does mean you have to go back for it:
**⚙ Project settings → General → Your apps →** the Android app **→ Add fingerprint**.

You can tell whether it landed by re-downloading `google-services.json` and looking at
`oauth_client`. While it reads `[]`, either the fingerprint or Google sign-in (step 5) is
still missing, and sign-in will fail on the phone with `DEVELOPER_ERROR`.

### ⛔ Ignore the Gradle instructions Firebase shows you next

After registering the Android app, the console walks you through adding the
`com.google.gms.google-services` plugin, `google-services.json`, and a
`firebase-analytics` dependency to `build.gradle`. **Do none of it.** Three reasons, each
sufficient on its own:

1. **Nothing here would read it.** This app talks to Firebase through the **JS SDK** with
   the config in `app.json`, and signs in through `@react-native-google-signin`, which takes
   its `webClientId` at runtime from that same config. There is no native Firebase SDK in
   this project to consume `google-services.json`. The signed release builds and runs today
   without the file — verified.
2. **`android/` is generated, so the edit wouldn't survive.** `npx expo prebuild --clean`
   deletes and regenerates the whole directory. Native config in this project comes from
   config plugins (`plugins/withReleaseSigning.js`, and the google-signin plugin in
   `app.json`), never from hand-edited Gradle files. That rule is what keeps release signing
   working across rebuilds.
3. **It would add analytics.** The snippet's one concrete dependency is
   `firebase-analytics`. Your store listing says "No tracking", `PRIVACY.md` says there is
   no analytics, and the Data Safety form is answered accordingly. Adding it would make all
   three false.

The Android app registration exists for exactly one reason: to hold the SHA-1. Register it,
add the fingerprint, close the tab.

> **If you ever build for iOS**, revisit this. The google-signin plugin is declared in
> `app.json` with no options, which selects its Firebase path — on iOS that path expects a
> `GoogleService-Info.plist`. Either add one, or switch the entry to the options form and
> pass `iosUrlScheme`. Android is unaffected either way.

### A second API key now exists

Registering the Android app auto-created an **Android key** alongside the **Browser key**
from step 3. They're different values. `app.json` uses the *browser* one; nothing in this
project uses the Android one. When you do step 8b, restrict both — or leave the Android key
restricted to nothing at all, since no code here calls it.

> **After your first Play upload, come back and add a second fingerprint.** Play App
> Signing re-signs your app with *Google's* key, so the SHA-1 your users actually run under
> isn't your upload key. Play Console → **Test and release → Setup → App signing** → copy
> the **App signing key certificate** SHA-1 → add it here too. Keep both: the upload one
> covers builds you sideload yourself. Sign-in works in your testing and then mysteriously
> fails for everyone installing from Play if you skip this.

## 5. Enable Google sign-in — this is what mints the last value

**Build → Authentication → Get started → Sign-in method → Google → Enable.**

Set a **project public-facing name** (users see this on the Google consent sheet — put
`Chop the Greens`, not the project ID) and pick a **support email**, then **Save**.

Now reopen that same **Google** row and expand **Web SDK configuration**. The
**Web client ID** sitting there is the seventh value — it's the one thing you can't get
from the config block in step 3.

**It must be the *web* client ID, not the Android one.** The native sign-in library uses
the web client to mint an ID token that Firebase will accept; an Android client ID here
produces `DEVELOPER_ERROR` at sign-in, which is an unhelpfully generic thing to debug.

## 6. Create the database

**Build → Firestore Database → Create database.** Pick a region near your readers
(`us-east1` is a reasonable default) and start in **production mode** — the rules below
replace the defaults.

Then **Rules**, paste this, and publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A signed-in person can read and write exactly one document: their own.
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

That is the whole security model, and it matters — without it, anyone could read everyone's
lists. Don't leave the database in test mode.

## 7. If you lost any of it

Nothing here is one-shot; every value can be re-read.

- **The six config values** — ⚙ **Project settings → General → Your apps →** the web app
  **→ SDK setup and configuration → Config**.
- **The Web client ID** — **Authentication → Sign-in method → Google → Web SDK
  configuration**. Or, if that section is somehow empty,
  [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
  on the same project: enabling Google sign-in creates an OAuth client literally named
  *Web client (auto created by Google Service)*.

## 8. Paste into `app.json`

The keys are already there and blank. Fill in all seven — the app checks four of them and
stays switched off if any is empty.

```json
"extra": {
  "firebaseApiKey": "AIza…",
  "firebaseAuthDomain": "chop-the-greens.firebaseapp.com",
  "firebaseProjectId": "chop-the-greens",
  "firebaseStorageBucket": "chop-the-greens.firebasestorage.app",
  "firebaseMessagingSenderId": "236481132144",
  "firebaseAppId": "1:236481132144:web:abcdef123456",
  "googleWebClientId": "236481132144-abc123.apps.googleusercontent.com"
}
```

Note `:web:` in `firebaseAppId`. If yours says `:android:` you've copied it from
`google-services.json` instead of the web app's config — go back to step 3.

These are **not secrets** in the usual sense — Firebase web config values are public
identifiers that ship inside every copy of the app, and your data is protected by the rules
in step 6, not by hiding them. Google documents this explicitly. Committing them is normal.

**But restrict the API key first — see the next step.** GitHub's secret scanner will email
you about `AIzaSy…` regardless, because it pattern-matches Google API keys and can't tell a
Firebase config key from a billable Maps key. More importantly, the alert is pointing at
something real if the key is left unrestricted.

## 8b. Restrict the API key — 2 minutes, do not skip

An `AIzaSy…` key is a *Google Cloud* API key, not a Firebase-specific one. Left
unrestricted, it works against **any API enabled on that project**, and some of those bill
per request. That, not Firestore access, is the actual exposure when the key is public.

[Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
→ the auto-created **Browser key (auto created by Firebase)** → **Edit**:

- **API restrictions** → *Restrict key* → tick only what this app uses:
  **Identity Toolkit API**, **Token Service API**, **Cloud Firestore API**.
- Leave **Application restrictions** as *None*. The native sign-in library and the JS SDK
  don't send an HTTP referrer or an Android package signature the way a browser or the
  native Firebase SDK would, so an Android or referrer restriction here breaks sign-in.
  The API restriction above is the one that carries the weight.

**Save.** The key is now useless for anything but the three APIs this app legitimately
calls, all of which are guarded by your Firestore rules and by Google's own auth. At that
point the GitHub alert is genuinely safe to dismiss.

## 9. Rebuild

```bash
export ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Two bits of UI appear as soon as the config is present, and not before:

- the **account button** in the Discover header, and
- a dismissible **"back this up" card** on Saved, List and Plan — shown only when you're
  signed out and there's actually something on that screen to lose. Tapping it opens the
  same account sheet.

Nothing else changes. No feature moves behind the login.

## 10. Test it

1. Sign in, save a couple of recipes, add something to the shopping list.
2. Check Firestore → `users/<your-uid>` — you should see `saved`, `list`, `plan`, `updatedAt`.
3. Uninstall, reinstall, sign in again: everything should come back.

---

## How the sync behaves

- **Local-first.** Every action writes to the phone immediately; the cloud is a backup.
  The app is fully usable signed-out and offline — browsing, searching, cooking, saving,
  the shopping list and the meal plan all work with no account, by design.
- **First sign-in on a device merges** local and cloud data (union), so linking an account
  can never silently discard what was already on either side.
- **After that, newest wins.** Each device stamps `updatedAt` on every edit and pushes a
  debounced write 1.5s later; on launch it pulls and takes whichever side is newer.
- **Why not always merge?** Union-merging every load resurrects deletions — clear a ticked
  item on one phone and the other's stale copy puts it straight back. Last-write-wins makes
  deletions stick. The rules are unit-tested in `src/lib/__tests__/merge.test.ts` (`npm test`).
- **Signing out leaves local data alone.** Nobody should lose a shopping list they're
  standing in a shop with.

### Known limitation

Two devices edited *while both offline* reconcile to the newer one; the older device's
changes to the same data are lost. Fixing that properly needs per-field timestamps or
CRDTs, which is a lot of machinery for a recipe app used by one person on one or two
phones. Worth revisiting only if users actually report it.

## Costs

Firestore's free tier is 1 GiB stored, 50k reads and 20k writes per day. Each user is one
small document written at most every couple of seconds while they're actively editing.
You would need thousands of daily active users to approach the free limits.

## If you'd rather not do any of this

Leave `extra` blank and ship. The app works exactly as it does now — on-device only, with
neither the account button nor the back-up cards rendering — and your Play Data Safety form
stays at "collects no data", which is the simplest possible submission. You can switch sync
on in a later release without breaking anyone.

Shipping without sync also means the store listing needs no edits: the full description in
`PLAYSTORE.md` closes on "No account. No ads. No tracking.", which is exactly true. That
line is the one thing to rewrite on the day you *do* turn sign-in on — `PLAYSTORE.md` has
the replacement wording.
