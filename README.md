# Chop the Greens — mobile app

A cooking app for [chopthegreens.com](https://chopthegreens.com), built with Expo + React Native.
It reads Gari's live recipes straight from the blog, cleans them up, and turns them into
something you can actually cook from: hands-free Cook Mode, a merged shopping list, a
weekly meal plan, and offline saves.

Ships to both the App Store and Google Play from one codebase.

> **📍 [STATUS.md](STATUS.md) — what's done and what's left.** Start there.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) to run it on your phone. `npx expo start --web`
opens it in a browser if you'd rather look at it on a laptop.

No API keys, no backend, no build step — the app talks directly to the blog.

## What's in it

**Discover** — a daily pick plus rails for *Ready in 30*, *Instant Pot*, *Air Fryer*,
*Protein packed*, *Breakfast* and newest posts.

**Search** — instant search across every recipe (titles, ingredients, cuisines, equipment),
stackable filters, and four sort orders. Searching matches ingredients too, so "gochujang"
finds the corn ribs.

**Recipe** — parallax hero, prep/cook/total, a servings stepper that **rescales every
ingredient live** (`1 ½ cups` → `2 ¼ cups`, ranges and all), tap-to-tick ingredients,
step-by-step method with the blog's own step photos, nutrition, and equipment.

**Cook Mode** — full-screen, one step per swipe, text sized to read from across the bench,
and the screen is held awake so it never dims with flour on your hands. Each step shows only
the ingredients that step uses. When a step says "simmer for 8–10 minutes" the app offers a
one-tap **10:00 timer** that keeps counting if you leave the app and fires a notification when
it's done.

**Shopping list** — add any recipe (at your chosen serving size). Ingredients merge across
recipes — 2 tbsp oil here plus 1 tbsp there becomes `3 tbsp` — and group by supermarket aisle
so the list reads in walking order. Long-press to remove.

**Meal plan** — a rolling 7 days, add recipes to any day, then roll the whole week into the
shopping list in one tap.

**Saved** — bookmark anything; saves, list and plan all persist on-device.

**Backup, optional** — signing in with Google backs up your saves, shopping list and meal
plan to Firestore so they survive a new phone. It is off unless a Firebase project is
configured (`SYNC-SETUP.md`), and it is never a gate: every recipe and every feature works
signed out and offline. The app brings it up in exactly two places, both chosen so the
offer is true when it's made: a one-time snackbar the first time you save anything, and a
dismissible card on Saved / List / Plan once there's something on screen worth backing up.
Never on first launch — there's nothing to protect yet.

**Light & dark** — a three-way toggle (light / dark / follow-system) in the Discover header,
persisted. Two palettes share one token shape, so no component branches on the theme.
The brand lime stays lime on buttons in both modes; small text and icons switch to a deeper
green on light, because bright lime on white is about 1.5:1 contrast and unreadable.
Anything sitting on top of photography uses fixed tokens rather than theme colours.

**Video** — 97 recipes have a YouTube video. Tapping the poster plays it inline so the cook
stays in the recipe (embedded plays still count as views), and a "Watch on YouTube" row
deep-links to the YouTube app, which is what surfaces the subscribe button.

**Sharing & socials** — a share sheet on every recipe that links the blog post, plus
YouTube / Instagram / Pinterest / TikTok at the foot of Discover, below the content rather
than in the way of it.

## How it works

The blog runs WordPress with WP Recipe Maker, whose REST API is public and CORS-open, so the
app fetches all ~235 recipes in three requests and needs no server of its own:

```
GET https://chopthegreens.com/wp-json/wp/v2/wprm_recipe?per_page=100&page=N
```

Responses are normalised, cached to `AsyncStorage`, and re-validated in the background once
they're 12 hours old. The app paints instantly from cache on launch and works fully offline —
only new recipes need the network. Publishing a recipe on the blog makes it appear in the app;
there is nothing to sync.

```
src/api/        fetch, cache, and normalise the WP feed
src/lib/        amount maths, aisle mapping, facets, timers, tab-bar metrics,
                Firebase init, sync reconciliation (+ its unit tests)
src/store/      recipes provider + saved/list/plan (persisted) + auth/sync
src/theme/      palettes, ThemeProvider, useStyles
src/components/ cards, video player, account sheet, sign-in prompt, UI primitives
app/            expo-router screens (tabs, recipe, cook mode)
scripts/        icon set, feature graphic and screenshots — all from one logo
store/          Play listing assets, ready to upload (see store/README.md)
```

`npm test` runs the sync reconciliation tests — the only logic here subtle enough to be
worth pinning down, since getting it wrong either drops saves or resurrects deletions.

### Icons

`python3 scripts/make-icons.py assets/brand/logo.jpg` writes every variant iOS, Android and
Play need, from the one source badge.

Two details do most of the work. The source is a circular badge on a flat cream field, so
the script flood-fills that field away from the edges inward — preserving the cream
*inside* the art, the lettering and the chef's hat — and then **crops to the artwork**,
because scaling the source whole leaves the badge at ~72% of the icon with tile colour
around it. And the Android foreground is drawn at exactly **2/3** of its canvas, which is
the centre 72dp of the 108dp layer that adaptive masks actually reveal, so the badge meets
the mask instead of floating inside it.

The tile behind it defaults to `#2A3E32`, sampled from the badge's own outer ring, so under
a circular mask there is no visible background at all. `--bg cream`, or any `#RRGGBB`,
changes it — keep `expo.android.adaptiveIcon.backgroundColor` in `app.json` in step.

The themed (monochrome) layer is built from the artwork's light areas rather than its alpha
channel; the badge is a filled disc, so alpha alone would tint to a featureless blob.

### The data needed real cleaning

The feed is hand-authored, so `src/api/normalize.ts` repairs it before the UI sees it. Each of
these was found by auditing all 235 records, and the counts are from that audit:

| Problem in the feed | What the app does |
|---|---|
| 26 recipes have `total_time` missing or **less than** prep + cook (one says 3 minutes for a 30-minute recipe) | Recomputes total from the parts |
| 86 titles are typed in CAPS LOCK | Title-cased, so the feed doesn't shout |
| 50 titles carry SEO tails — `Delhi Style Chole Recipe (Punjabi Chole Masala)` | Trimmed for display; full text still feeds search |
| Taxonomies are inconsistent — `Desset`, `veagan`, `Brunch,`, `lunch, dinner,`, `Instant Pot2`, `Drinks` vs `Drinks/ Beverages` | Split, de-typo'd, title-cased, de-duplicated: 31 cuisine terms → 19, 30 courses → 20 |
| Step text contains raw WPRM shortcodes, some with broken HTML-escaped tags nested inside | Unwrapped to the ingredient label |
| Rendered HTML and `&#x27;`-style entities throughout | Stripped and decoded |

After normalisation: zero residual tags, shortcodes or entities across all 235 recipes.

Facets are derived from **equipment and nutrition**, not the keyword taxonomy, because the
keywords are far too noisy to filter on — that's how *Instant Pot* (133), *Air Fryer* (32)
and *High protein* (protein ≥ 15 g/serving) stay accurate.

Two recipes with no ingredient list are filtered out rather than rendered as empty cards.

## Building an Android app

The native project is generated on demand and signed by a local config plugin, so a release
build needs no Expo account and no cloud service:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --platform android --clean   # regenerate android/
cd android
./gradlew assembleRelease                      # APK, for sideloading
./gradlew bundleRelease                        # AAB, for Play
```

Signing is applied by `plugins/withReleaseSigning.js`, which reads
`credentials/signing.properties` and survives every `prebuild --clean`. That folder is
gitignored and holds the Play upload key — **back it up**. Without it the build still
succeeds, falling back to debug signing, so a fresh clone is never blocked.

See **[PLAYSTORE.md](PLAYSTORE.md)** for the full Play submission path and
**[PRIVACY.md](PRIVACY.md)** for the policy Play requires you to host.

iOS needs a Mac with Xcode (`npx expo prebuild --platform ios`), or EAS Build.

## Notes

- Icons in `assets/` are generated by a script — see the note in PLAYSTORE.md if you want
  to swap in artwork from a designer.
- Requires no login. Ratings shown are the blog's; the app doesn't post back to it.
- Timers use local notifications, so the OS asks for permission the first time you start one.
- Nutrition is shown exactly as published on the blog.
