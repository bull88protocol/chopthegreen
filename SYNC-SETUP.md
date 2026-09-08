# Turning on Google sign-in & sync

The code is written and wired. What's missing is a Firebase project, which only you can
create — it needs your Google account.

**Until you fill in the config below, sync stays completely off:** no account button and no
back-up prompts appear anywhere, nothing hits the network beyond fetching recipes, and the
app behaves exactly as it does today. That's deliberate, so a missing key can never stop
someone cooking.

Budget about 20 minutes. All of it is free at your scale.

---

## Where this stands (8 September 2026)

You've created the project and registered the Android app. From the
`google-services.json` you sent, these are already in `app.json` and correct:

| | |
|---|---|
| Project ID | `chopthegreens` |
| Project number / sender ID | `236481132144` |
| Web API key | `AIzaSyAkJE60gl0aCFCtIwQZWXpnco7h5rXygvM` |
| Storage bucket | `chopthegreens.firebasestorage.app` |

**Three things are still missing, and sync stays off until they're done.** The giveaway is
that `oauth_client` in your `google-services.json` is an empty array — that field only
fills in once Google sign-in is enabled *and* a SHA-1 is registered.

| # | Missing | Where it comes from | Goes into |
|---|---|---|---|
| A | **Web client ID** | Step 3 — enabling Google sign-in auto-creates it | `extra.googleWebClientId` |
| B | **Web app ID** | Step 2b — registering a Web app (`</>`) | `extra.firebaseAppId` |
| C | **SHA-1 registered** | Step 2a — paste the fingerprint onto the Android app | Firebase console only |
| D | **Firestore + rules** | Step 4 | Firebase console only |

Send me A and B and I'll fill them in and rebuild. C and D don't produce a value — they
just have to be true, or sign-in fails at runtime.

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

## 2. Register *two* apps — Android and Web

This is the step that trips people up, and it's worth being precise about, because the two
registrations do completely different jobs. You need both.

### 2a. Android app — done, but add the SHA-1

**Add app → Android** (you've done this):

- **Package name:** `com.chopthegreens.app`
- **SHA-1 certificate fingerprint:** `40:7F:CE:59:A0:3E:4B:B0:C1:70:CF:F8:42:7F:12:F7:7D:DA:94:A7`

If you skipped the fingerprint at creation, add it now: **Project settings → Your apps →**
the Android app **→ Add fingerprint**. Without it, Google sign-in returns
`DEVELOPER_ERROR` on the device no matter what else is right.

You do **not** need `google-services.json` itself. This app talks to Firebase through the
**JS SDK**, not the native one, so nothing reads that file — which is exactly why the
Android app alone isn't enough.

### 2b. Web app — this is the one that's missing

**Add app → Web** (the `</>` icon). Call it anything; skip Firebase Hosting.

The JS SDK wants a *web* app ID. The `mobilesdk_app_id` in your `google-services.json`
(`1:236481132144:android:cdfc595e…`) is an **Android** app ID — the `:android:` in the
middle is the tell. Handing that to the JS SDK is the kind of mismatch that works right up
until Firestore asks the Installations service for a token and gets refused. Register the
Web app and use the `1:236481132144:web:…` ID it gives you.

> **Important, after your first Play upload.** Play App Signing re-signs your app with
> *Google's* key, so the SHA-1 users actually run under is different from your upload key.
> Sign-in will fail on Play-installed builds until you add it: Play Console →
> **Test and release → Setup → App signing** → copy the **App signing key certificate**
> SHA-1 → paste it into Firebase → Project settings → Your Android app → **Add fingerprint**.
> Keep both fingerprints registered — the upload one covers sideloaded builds.

## 3. Enable Google sign-in

**Build → Authentication → Get started → Sign-in method → Google → Enable.** Set a support
email and save.

## 4. Create the database

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

## 5. Collect the config

**Project settings (gear) → General**:

- Scroll to **Your apps → the Web app from step 2b → SDK setup and configuration →
  Config**. That panel only exists for a Web app, which is why step 2b matters. Everything
  there but `appId` is already in `app.json`; **`appId` is the one to copy** — it should
  start `1:236481132144:web:`.
- Under **Your apps**, find the **Web client ID** (it looks like
  `1234567890-abc123.apps.googleusercontent.com`). If there isn't one, open
  [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
  for the same project; enabling Google sign-in in step 3 creates a
  *Web client (auto created by Google Service)* — that's the one.

**Use the Web client ID, not the Android one.** This trips everybody up: the native
sign-in library needs the *web* client to mint an ID token that Firebase will accept. An
Android client ID here produces a `DEVELOPER_ERROR` at sign-in.

## 6. Paste into `app.json`

```json
"extra": {
  "firebaseApiKey": "AIza…",
  "firebaseAuthDomain": "chop-the-greens.firebaseapp.com",
  "firebaseProjectId": "chop-the-greens",
  "firebaseStorageBucket": "chop-the-greens.appspot.com",
  "firebaseMessagingSenderId": "1234567890",
  "firebaseAppId": "1:1234567890:android:abcdef",
  "googleWebClientId": "1234567890-abc123.apps.googleusercontent.com"
}
```

These are **not secrets** — Firebase web config values are public identifiers, and your data
is protected by the rules in step 4, not by hiding them. Committing them is normal and fine.

## 7. Rebuild

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

## 8. Test it

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
