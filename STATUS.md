# Chop the Greens — project status

**Single source of truth for what's done and what's left.** Update this file when state
changes. Last updated: **9 September 2026** (v5.2 — Firestore live and sync verified end to
end; one release blocker left, and it isn't code).

- **What it is:** an Expo / React Native cooking app for
  [chopthegreens.com](https://chopthegreens.com), shipping to Google Play.
- **Where:** `/home/sun/chop_the_green` → [bull88protocol/chopthegreen](https://github.com/bull88protocol/chopthegreen) on `main`.
  Pushes use the `github-bull88` SSH alias (`~/.ssh/bull88_deploy`); the default key
  authenticates as `CoinTranscend`, which has read but **not** write on that org.
- **Goal:** Google Play release.

---

## ▶ Pick up here

**State as of 9 September 2026.** Working tree is clean *except* for one deliberate
hold; `main` is pushed to
[bull88protocol/chopthegreen](https://github.com/bull88protocol/chopthegreen).

### One file is uncommitted on purpose

`app.json` carries the live Firebase config, including the API key. It is **modified but
not committed**, waiting on the key being restricted in Google Cloud Console
(`SYNC-SETUP.md` step 8b). GitHub secret scanning already flagged the *previous* project's
key, and committing an unrestricted one walks straight back into that.

```bash
git status --short      # expect exactly: ` M app.json`
git diff app.json       # the seven expo.extra values
```

**If the key has been restricted since:** commit and push it, nothing else needed.
**If not:** leave it alone. The build works from the working tree regardless.

### Nothing is blocking a release any more

The privacy policy is **live** at

> https://chopthegreens.com/privacy-policy-chop-the-greens/

Verified 9 September 2026: publicly reachable without a login, names the app, describes the
Google sign-in data and the Firestore backup, and carries the *"Deleting your data"*
section. That one URL satisfies **both** Play fields — *Policy → App content → Privacy
policy* **and** the account-deletion URL that answering "OAuth" on Data Safety triggers.

Code, icons, screenshots, feature graphic, signed artifacts, listing copy, Data Safety
answers and the policy are all done. What's left is Play Console work and one tidy-up.

> The contact address renders through Cloudflare's email obfuscation, so it reads
> "[email protected]" to anything without JavaScript and decodes to
> `sungari.001@gmail.com` in a real browser. Reviewers use a browser, so this is fine — but
> if you want it readable to everything, turn off Scrape Shield for that page.

### Sync is verified end to end (9 September 2026)

Sunny created the Firestore database, published the rules (`SYNC-SETUP.md` step 6), and
tested sync on hardware: **sign-in completes and the backup works.** That closes the last
open path in the feature — earlier passes could only get as far as the Google account
picker, because completing it binds a real identity and writes a real document, which
wasn't a call to make unprompted.

So the account sheet no longer reads "Sync problem", and the `permission-denied` failure
mode described in older notes is gone.

### Device state

A real Google account was signed in on the Pixel during that test, so a `users/<uid>`
document now exists in Firestore and the device is no longer in the signed-out state
earlier notes describe. Otherwise as found: light theme, screen timeout restored, shopping
list cleared (on request), and four recipes saved — Paneer Butter Masala (1857), Paneer
Tikka Bowls (19677), Air Fryer Corn Ribs (12541), Eggless Banana Bread (6776). The
installed build is current. See `CLAUDE.md` for how to drive it over adb.

### If you change app code

Rebuild both artifacts and restage them, as two separate Gradle invocations — the reason is
in `CLAUDE.md`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
cd android && ./gradlew bundleRelease && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
cd .. && cp android/app/build/outputs/bundle/release/app-release.aab dist-release/chopthegreens-1.0.0-play.aab
cp android/app/build/outputs/apk/release/app-release.apk dist-release/chopthegreens-1.0.0-arm64.apk
```

---

## ⏳ What's left

Seven of the ten items are closed. The three that remain are yours — a file copy, a
Console setting and the upload itself. Nothing is blocked on code, assets or docs.

| # | Task | Why it's blocking | Who |
|---|---|---|---|
| 1 | **Back up `credentials/`** | Holds the Play upload key. Gitignored, exists nowhere else. | You |
| ~~2~~ | ~~Drop in the real logo~~ | **Done** — `assets/brand/logo.jpg`, icons regenerated from it. | ✅ |
| ~~3~~ | ~~Feature graphic, 1024×500~~ | **Done** — `store/feature-graphic.png`, built by `scripts/make-feature-graphic.py`. | ✅ |
| ~~4~~ | ~~2–8 phone screenshots~~ | **Done** — 7 captured on the Pixel 8a. Light set in `store/screenshots/`, dark in `dark-alternate/`. | ✅ |
| ~~5~~ | ~~Host the privacy policy~~ | **Done** — live at [chopthegreens.com/privacy-policy-chop-the-greens/](https://chopthegreens.com/privacy-policy-chop-the-greens/), verified reachable. Serves as both the privacy policy URL and the account-deletion URL. | ✅ |
| 6 | **Create the app in Play Console** | Upload `dist-release/chopthegreens-1.0.0-play.aab` to Internal testing. Everything it asks for now exists — see `PLAYSTORE.md`. | You |
| ~~7~~ | ~~Commit the repo~~ | **Done** — initial commit `b4abb26`, 79 files, pushed to `bull88protocol/chopthegreen`. `credentials/`, `dist-release/` and `android/` stay ignored. | ✅ |
| ~~8~~ | ~~Re-verify on the Pixel~~ | **Done** — installed and screenshotted on hardware. | ✅ |
| ~~9~~ | ~~Finish Firebase~~ | **Done** — project `chop-the-greens`, all seven values wired, `syncEnabled` **true**, SHA-1 verified, Firestore created with rules published, and sign-in + backup tested on hardware. | ✅ |
| 10 | **Restrict the API key** | `SYNC-SETUP.md` step 8b. Not a release blocker — it's what's holding `app.json` uncommitted. | You |

**Sync is on and working as of 9 September 2026.** That changed two things outside the
code, both now handled in `PLAYSTORE.md`: the Play **Data Safety** form takes the "collects
data" answers, and the full description's closing line no longer claims "No account…" —
that draft is corrected in place and can be pasted whole. If you'd rather ship v1 without
accounts after all, blanking `extra` in `app.json` reverts every bit of it — no code
change, no migration — and the old closing line becomes true again.

### Settled decisions

- **Signing key — keep the dedicated one.** A single Play developer account publishes any
  number of apps, and each app gets its *own* signing key; keys are per-app, not
  per-account. So `credentials/chopthegreens-upload.keystore` works fine alongside Aurum88
  on the same account, and keeps the two apps isolated. No change needed. (Reusing the
  Aurum/Bull88 key would also be valid — swap steps are in `PLAYSTORE.md`.)
- **Videos open in-app first, YouTube second.** Tapping the poster plays an embedded player
  so the cook stays in the recipe; embedded plays still count as YouTube views. A separate
  "Watch on YouTube" row deep-links to the YouTube app, which is what puts the subscribe
  button in front of them.
- **Two blog recipes have no ingredient list** and are filtered out rather than shown as
  empty cards. Best fixed on the blog.
- **iOS** is untouched. The codebase is cross-platform, but building it needs a Mac with
  Xcode, or EAS Build.

---

## ✅ What's done

### The app (~2,930 lines, TypeScript)

| Feature | Detail |
|---|---|
| Discover | Daily pick + rails: Ready in 30, Instant Pot, Air Fryer, Protein packed, Breakfast, newest |
| Search | Titles + ingredients + cuisine + equipment; stackable filters; 4 sort orders |
| Recipe | Parallax hero, servings stepper that rescales all amounts live, tap-to-tick ingredients, step photos, nutrition, equipment |
| Cook Mode | Full-screen, one step per swipe, screen kept awake, per-step ingredients, auto-detected timers that survive backgrounding + fire notifications |
| Shopping list | Merges amounts across recipes, groups by supermarket aisle |
| Meal plan | Rolling 7 days → whole week into the shopping list |
| Saved | On-device, offline |
| Themes | Light / dark / follow-system, toggled from the Discover header, persisted |
| Video | 97 recipes have a YouTube video: poster → in-app player, plus a deep link out to the YouTube app |
| Social | YouTube / Instagram / Pinterest / TikTok at the foot of Discover; per-recipe share sheet links the blog post |
| Sync | *Optional* Google sign-in backs up saves/list/plan to Firestore. Off unless configured — see `SYNC-SETUP.md` |
| Sign-in prompts | A dismissible card on Saved / List / Plan, shown only when there's something to lose. Nothing is ever gated behind an account |

### v5.3 — privacy policy published (9 September 2026)

Hosted at [chopthegreens.com/privacy-policy-chop-the-greens/](https://chopthegreens.com/privacy-policy-chop-the-greens/) and verified: HTTP 200, no login, names the app, and covers the sign-in
data, the Firestore backup and deletion. The **last release blocker is closed** — nothing
outstanding now needs code or assets.

Docs updated from the placeholder `chopthegreens.com/app-privacy/` to the real path.

### v5.2 — Firestore live, sync verified (9 September 2026)

Sunny created the Firestore database and published the rules, then signed in and tested
sync on the Pixel. Sign-in completes and the backup writes — the one path that had never
been exercised end to end, because finishing it binds a real Google identity.

The listing copy was corrected at the same time: the full description in `PLAYSTORE.md`
ended "No account. No ads. No tracking.", which sync made false, and the fix used to sit as
a warning *below* the draft where a copy-paste would miss it. The draft now carries the
correct ending inline.

That left one release blocker, hosting `PRIVACY.md` — closed the same day, see v5.3 — and
one tidy-up, restricting the API key, which is what keeps `app.json` out of a commit.

### v5.1 — sign-in prompt at the first save (9 September 2026)

**Asked:** should a pop-up on first open invite people to sync, with a "Not now"?

Argued against and not built. On first launch there is no list, no plan and nothing saved,
so "back up your recipes" is a pitch about protecting something that doesn't exist — the
offer reads as the app wanting an account for its own sake, on the one screen that has to
sell the app. "Not now" softens the ask but the cost is the interruption, not the
dismissal. The account button is already in the Discover header from first launch for
anyone who wants it.

The instinct was right about the gap, though — just not its location. **The first save** is
the first moment the pitch is true, and saving was completely silent: bookmark from a
recipe or a card and nothing happened, so the prompt was only met later on the Saved tab,
if ever.

`src/components/FirstSavePrompt.tsx` fills that. A snackbar slides up the first time
anything is saved — *"Saved to this phone. Sign in to back it up."* — with a Sign in action
and a dismiss. Auto-hides after 6s, never returns. Chosen over a modal so it stays
ignorable.

- Lives in the **root** layout, not the tabs layout: saving happens from the recipe screen,
  which is a sibling route rather than a child of the tabs.
- Fires on a 0 → 1 transition in `saved`, with the previous count seeded *after* the store
  hydrates — otherwise an existing user's saves read as a fresh save on every cold start.
- Gated on `status === 'signedOut'` rather than `!user`, because during the cold-start auth
  restore the status is `working` and the user is still null.
- Honours the same dismissal key as `SyncNudge`, so saying no once silences both.

Verified on the Pixel: fired on the first save, cleared itself after 6s, stayed silent for
the next three saves, and did not appear on a cold start with four recipes already saved.

### v5 — verified on the phone (8 September 2026)

Installed the signed release build on the **Pixel 8a** and drove it over adb. This is the
first pass where the app was actually *looked at* on hardware rather than just confirmed
to be running.

- **The icon fix is real.** The launcher shows the full-bleed badge with no black tile, and
  the ring text is legible at drawer size. Confirmed against the actual launcher, not a
  simulated mask.
- **Deep links work.** `chopthegreens://recipe/<id>` and `chopthegreens://cook/<id>` both
  resolve, which is what the per-recipe share sheet depends on.
- **Timer auto-detection works on device.** Opening Paneer Butter Masala in Cook Mode
  offers a *Start 20:00 timer* on step 1, parsed from "Soak cashews in water for 15-20
  minutes".
- **Screenshots are now real captures**, replacing the web renders — 7 screens × both
  themes, with genuine recipe data, a real aisle-grouped shopping list and a 3-meal plan.
  Cropped 1080×2400 → **1080×2160** to clear Play's 2:1 ceiling, which also drops the
  status bar. Light was chosen for the listing (`store/screenshots/`) because the food
  photography carries more on the off-white cards; the dark set is kept in
  `dark-alternate/`.

The phone was left as found: shopping list cleared on request, theme back to light, screen
timeout restored.

### GitHub flagged the Firebase API key (8 September 2026)

Secret scanning emailed about a *Google API Key* in `app.json` at `b4abb26`. Worth writing
down what that alert does and doesn't mean, because it will happen again.

A Firebase web API key is a public identifier by design — it ships inside every copy of the
app, and Google documents committing it as normal. Anyone with the APK has it. Data is
protected by the Firestore rules, not by the key being unknown.

**The alert is still worth acting on, though**, and the reason isn't Firestore. `AIzaSy…`
is a *Google Cloud* key, not a Firebase-specific one: unrestricted, it works against any
API enabled on that project, and some of them bill per request. That's the real exposure.
`SYNC-SETUP.md` step 8b now covers restricting it to the three APIs this app actually uses,
which should be done before the next key is committed.

In this instance the key belongs to the abandoned `chopthegreens` project, so deleting that
project makes it inert regardless.

### Firebase, half-wired (8 September 2026)

The `chopthegreens` project exists and its non-secret keys are in `app.json` — API key,
project ID, sender ID, storage bucket, auth domain. `syncEnabled` is still **false**,
deliberately, because two values are missing.

The diagnostic worth remembering: `oauth_client` was an **empty array** in the supplied
`google-services.json`. That field only populates once Google sign-in is enabled *and* a
SHA-1 is registered, so an empty one says both are outstanding.

The other trap, now fixed in `SYNC-SETUP.md`: the supplied `mobilesdk_app_id` is an
**Android** app ID (`1:236481132144:android:…`). This app uses the Firebase **JS** SDK,
which wants a *web* app ID. The old doc said to register an Android app and then sent you
to a config panel that only exists for a Web app — so it needs both registrations, and now
says so.

### v4 — full-bleed icon & sign-in prompts (8 September 2026)

**Reported:** the app icon showed a black background instead of the logo.

Reproduced, and it was two compounding problems rather than a colour choice:

1. **The source's margin was being scaled as if it were art.** `logo.jpg` is a circular
   badge sitting in a cream field — the badge is only ~82% of the image width. The icon
   script scaled the *whole* file to 88%, so the badge ended up at 72% of the canvas with
   tile colour filling the rest. It now flood-fills the field away, crops to the artwork's
   bounding box, and scales that.
2. **The foreground sat inside Android's mask instead of meeting it.** Adaptive icons show
   only the centre 72dp of a 108dp layer; the art was drawn at 62%, so ~24% of the visible
   circle was background. It's now drawn at exactly 2/3, which is that mask.

The tile is also no longer `#0A0D0B`. It's `#2A3E32`, sampled from the badge's own outer
ring, so the artwork's edge and the tile behind it are the same colour: under a circular
mask no background is visible at all, and under a squircle the corners read as part of the
mark rather than as a frame. Net effect — the logo is ~2.4× bigger in the launcher and the
ring text is legible at 64px, where before it wasn't.

The **themed (monochrome) icon** was a solid white disc, because it was built from the
badge's alpha channel and the badge is a filled circle. It's now built from the artwork's
*light* areas, so it tints to the ring lettering, chef's hat and coat — a recognisable mark
instead of a blob.

**Sign-in prompts** (`src/components/SyncNudge.tsx`). Browsing was already completely open
and stays that way; what was missing was any mention of an account at the moment it would
help. A dismissible card now appears on **Saved**, **List** and **Plan** — never on
Discover, Search, Recipe or Cook Mode — and only when three things hold:

- the build has Firebase config (otherwise sync doesn't exist and the card can't appear);
- nobody is signed in; and
- **there is something on the screen to lose.** Offering to back up an empty list is noise,
  and the ask lands better once you'd be annoyed to lose what's there.

Tapping it opens the existing account sheet; dismissing it is permanent, and the account
button in the Discover header stays as the way back in. No feature moved behind a login.

**Store assets.** The two remaining listing blockers are built and reproducible:
`scripts/make-feature-graphic.py` (1024×500, set in the app's own two typefaces) and
`scripts/make-screenshots.py` (six phone screenshots at 824×1648).

> The first pass of these was headless-Chrome renders of the web build. They've since been
> **replaced with real Pixel 8a captures** — see v5.

### v3 — optional Google sign-in (6 September 2026)

Built and wired, **dormant until you add a Firebase project** (`SYNC-SETUP.md`). With no
config the account button doesn't render and nothing touches the network — verified.

- Local-first: the cloud is a backup, never a gate. No feature sits behind a login.
- First sign-in on a device **unions** local and remote so linking can't drop data;
  afterwards it's last-write-wins by `updatedAt`, because union-merging every load
  resurrects deletions. 12 unit tests cover this — `npm test`.
- Signing out leaves local data alone.
- Considered and rejected: storing sync data in the user's own Google Drive
  (`appDataFolder`) — no backend, no bills — because `drive.appdata` is a Google
  *sensitive scope* requiring OAuth app verification, which can take weeks and would
  block launch. Basic email/profile scopes need no verification.
- **This changes your Play Data Safety answers and privacy policy** if you enable it.
  Both documents now cover each case; `PRIVACY.md` says which sections to delete if you
  ship without sync.

### v3.2 — Search filter chips clipped (6 September 2026)

**Reported:** the filter chips on Search ("Under 30 min", "Instant Pot") were sliced off
along the bottom. Reproduced on device and fixed.

The chip row is a horizontal ScrollView inside a flex column, so without a constraint it
expands and pushes the results off screen. I'd stopped that with `maxHeight: 46` — a
guess at the chip height, and one that clips the moment a chip renders taller, which is
exactly what happens at larger system font sizes. Replaced with
`flexGrow: 0, flexShrink: 0`, which stops the row expanding while letting it size to its
own content, so it cannot clip at any font scale. No other fixed-height rows remain.

### v3.1 — video playback fix (6 September 2026)

**Reported:** tapping play showed *"This video is unavailable — Error code: 152 - 4"*.
Reproduced on device, fixed, and re-verified playing inline on the Pixel.

Two causes, both needed fixing:

1. **Bad embedding origin.** The player was loaded with `baseUrl: 'https://www.youtube.com'`,
   so the embed claimed YouTube itself as the embedding site. That's self-referential and
   YouTube refuses it. It now presents `https://chopthegreens.com` — which is accurate,
   since these videos are genuinely embedded on the blog, and it's the domain YouTube
   expects to see.
2. **Android WebView's user agent.** The default UA carries a `wv` token, and YouTube
   serves "Video unavailable" to it. The player now sends a plain Chrome UA on Android.

Also added: `youtube-nocookie.com` (no tracking cookies until playback), an explicit
`origin` parameter, and an `onError`/`onHttpError` fallback so a genuinely un-embeddable
video drops back to the poster with "Watch on YouTube" instead of stranding YouTube's
error card on screen.

### v2 changes (6 September 2026)

- **Fixed: tab bar overlapped the Android gesture bar.** The bar had a fixed 64px height and
  ignored `insets.bottom`. Android 15 (targetSdk 35+) forces edge-to-edge, so the gesture
  pill sat *inside* the window and on top of the tab labels. Height is now
  `TAB_BAR_BASE + insets.bottom` (`src/lib/layout.ts`), and every screen pads its scroll
  content from the same hook instead of hand-tuned magic numbers.
- **Fixed: blur fell back badly off-iOS.** `BlurView` renders as plain transparency on web
  and is inconsistent across Android OEMs, so card text ghosted through the tab bar. Only
  iOS gets real blur now; everything else gets an opaque fill.
- **Fixed: `video_id` was useless.** The feed sets it to `"0"` on every record; the real
  reference is in `video_embed`, across four different formats. `parseYouTube()` handles all
  four — 97/97 parse, including one vertical Short that gets a 9:16 player.
- **Fixed: "18 rotiss".** Serving units from the blog are often already plural, and
  `pluralize()` was suffixing them regardless.
- **Fixed: unreadable nav buttons in light mode.** Back/share/save float over the hero photo
  but used `c.text`, which is near-black on light — so dark icons on a dark chip. Anything
  sitting on photography now uses the fixed `PHOTO_SCRIM` tokens instead of theme colours.

### Data layer

Reads the blog's WordPress + WP Recipe Maker REST API directly — **no backend, no API keys,
nothing to sync**. Publishing on the blog makes a recipe appear in the app.

```
GET https://chopthegreens.com/wp-json/wp/v2/wprm_recipe?per_page=100&page=N
```

Public and CORS-open. ~236 recipes in 3 requests, cached to AsyncStorage, revalidated after
12h, fully offline-capable.

The feed is hand-authored and needed real repair (all counts from a full 235-record audit —
details in `README.md`): 26 broken `total_time` values, 86 CAPS-LOCK titles, 50 SEO title
tails, messy taxonomies (31 cuisines → 19), raw WPRM shortcodes and HTML entities in step
text. Result: zero residual tags/shortcodes/entities.

Facets come from **equipment and nutrition**, not the noisy keyword taxonomy.

### Build & release

- Icon set built from the real site badge (`assets/brand/logo.jpg`) via
  `python3 scripts/make-icons.py assets/brand/logo.jpg`. The script flood-fills the flat
  JPEG background away from the edges inward, so the circular badge gets real transparency
  while cream areas *inside* the art (lettering, chef's hat) survive; then crops to the
  artwork and scales it to exactly the 2/3 of the canvas Android's adaptive mask reveals.
  `--bg cream` (or any `#RRGGBB`) switches the tile off the default badge green — if you
  change it, change `expo.android.adaptiveIcon.backgroundColor` in `app.json` to match.
- **Remaining trade-off:** the ring text ("HEALTHY · SIMPLE · GUILT-FREE") holds up at 64px
  now that the badge fills the icon, but it's still small text on a launcher icon and it
  will go soft on a very dense grid. Inherent to using a text-bearing badge as an app icon;
  brand recognition was judged the priority. To optimise for the smallest sizes instead,
  crop the source to just the chef-and-veg medallion and re-run the script.
- Signing wired via `plugins/withReleaseSigning.js`, an Expo config plugin — **not** a hand
  edit to `android/`, which `prebuild` regenerates. Falls back to debug signing when
  `credentials/` is absent, so a fresh clone still builds.
- `tsc --noEmit` clean, `npm test` 12/12, iOS + Android + web bundles all build.
- `expo-doctor` is **20/21** as of 8 Sep. The one failure is upstream patch drift that
  appeared after this build was cut — `expo` 57.0.20 installed vs `~57.0.21` expected, and
  `expo-router` 57.0.19 vs `~57.0.20`. Nothing in the app depends on either patch, and
  re-cutting a tested, signed AAB for it before launch is the worse trade. Run
  `npx expo install --check` when you next need to rebuild anyway.

### Verified on real hardware

Installed and launched on a **Pixel 8a** over USB, and as of v5 **visually confirmed** —
every tab, a recipe, Cook Mode and the launcher icon, in both themes. Earlier passes only
confirmed the process stayed alive with no `FATAL EXCEPTION` in logcat, because the phone
was locked and bypassing that wasn't on the table.

---

## Artifacts

In `dist-release/` (gitignored):

| File | Size | Use |
|---|---|---|
| `chopthegreens-1.0.0-arm64.apk` | 49 MB | Sideload / share |
| `chopthegreens-1.0.0-play.aab` | 75 MB | **Upload to Play** |

Signed `CN=Chop the Greens`, SHA-256 `13fed33b00b73a8fd255be0e37fd1b1a0f7a05d6ea38a91a15958daa8c9b33dc`.
`targetSdk 36 / minSdk 24` — clears Play's targetSdk-35+ rule. `versionCode 1`.

The universal APK is ~104 MB because x86/x86_64 are emulator-only slices; the arm64 build is
half that. The AAB keeps all four because Play splits per device (~25–30 MB actual download).

> Build the two separately. `./gradlew bundleRelease assembleRelease -PreactNativeArchitectures=arm64-v8a`
> applies that flag to **both** tasks, and the resulting AAB carries arm64 only — Play then
> silently refuses to serve any 32-bit device. Run `bundleRelease` with no architecture
> flag, then `assembleRelease` with it. Verify before uploading:
> `unzip -l <aab> | grep -o 'base/lib/[a-z0-9_-]*' | sort -u` should list all four.

Store artwork is versioned in `store/` (see `store/README.md`) — it isn't bundled into the
app, only uploaded to Play Console.

## Commands

```bash
npx expo start                                  # dev, scan with Expo Go
npm test                                        # sync reconciliation unit tests
npx tsc --noEmit                                # typecheck

export ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --platform android --clean    # regenerate android/ (signing survives)
cd android
./gradlew bundleRelease                                        # Play AAB — all four ABIs
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a # slim phone APK

adb install -r dist-release/chopthegreens-1.0.0-arm64.apk
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs <file>
```

Store assets, all regenerable from `assets/brand/logo.jpg`:

```bash
python3 scripts/make-icons.py assets/brand/logo.jpg   # app icons + store/icon-512.png
python3 scripts/make-feature-graphic.py               # store/feature-graphic.png
python3 scripts/make-screenshots.py                   # store/screenshots/*.png
```

**Releasing an update:** bump `expo.android.versionCode` *and* `expo.version` in `app.json`
(Play rejects a repeated versionCode), then `prebuild` + `bundleRelease`.

## Gotchas worth remembering

- **First Android build takes ~25 min** — Gradle downloads a 2 GB NDK to compile React
  Native's C++. It writes to `~/Android/Sdk/ndk`, *not* `~/.gradle/caches`, so a quiet cache
  dir does **not** mean the build is stalled. (I misread this once and killed a healthy
  build.) Cached now; rebuilds are ~30s.
- This project uses `~/Android/Sdk`, deliberately independent of the
  `option_android/.tools/android-sdk` your other apps use.
- `/home/sunny` is a **different Unix user** and unreadable from this account. The gold
  folder is `/home/sun/gold`.

## Docs

| File | Contents |
|---|---|
| `CLAUDE.md` | Conventions and the rules that aren't obvious from the code — read with this file |
| `README.md` | Architecture, the data-cleaning table, build instructions |
| `PLAYSTORE.md` | Full Play submission path, store listing copy, data-safety answers |
| `PRIVACY.md` | Privacy policy — the source for what's published at [chopthegreens.com/privacy-policy-chop-the-greens/](https://chopthegreens.com/privacy-policy-chop-the-greens/) |
| `SYNC-SETUP.md` | Firebase setup for Google sign-in — mostly done; Firestore + key restriction remain |
| `store/README.md` | What each listing asset is and which Play field it goes in |
| `STATUS.md` | This file — what's done, what's left |
