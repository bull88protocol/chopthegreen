# Play Store listing assets

Everything Play Console asks you to upload, ready to go. None of it is bundled into the
app — it lives here rather than in `assets/` precisely so it can't be.

| File | Size | Where it goes in Play Console |
|---|---|---|
| `icon-512.png` | 512×512 | *Main store listing → App icon* |
| `feature-graphic.png` | 1024×500 | *Main store listing → Feature graphic* |
| `screenshots/*.png` (7 of them) | 1080×2160 | *Main store listing → Phone screenshots* |

Listing copy — app name, short and full description — is in `PLAYSTORE.md`, not here.

## Regenerating

All three come from one source file, `assets/brand/logo.jpg`:

```bash
python3 scripts/make-icons.py assets/brand/logo.jpg   # app icons + icon-512.png
python3 scripts/make-feature-graphic.py               # feature-graphic.png
python3 scripts/make-screenshots.py                   # screenshots/ (needs Chrome)
```

`make-screenshots.py` is the fallback path — it exports the web build, seeds a plausible
shopping list and a few saved recipes into it, serves it, and drives headless Chrome over
six routes. Use it when no phone is attached. **The screenshots currently in this folder
are real device captures**, which are better; see below.

Note that it writes straight into `screenshots/`, so move the device sets aside first or
it'll sit alongside them.

## Two constraints worth not rediscovering

**Screenshots are 2:1 and nothing taller.** Play rejects phone screenshots more than twice
as tall as they are wide, and a real phone is over that line — the Pixel 8a shoots
1080×2400, which is 2.22:1. The captures here are cropped to **1080×2160** by dropping the
status bar off the top and a slice of the gesture area off the bottom, which also gets rid
of the clock and notification icons. Each side must also land between 320px and 3840px.

**The feature graphic has no alpha channel.** Play requires 24-bit PNG or JPEG there. The
script saves RGB for that reason; don't "improve" it to RGBA.

## About the screenshots

The seven in `screenshots/` are the ones to upload. They were captured on a **Pixel 8a**
running the signed release build, with real recipe data, a real shopping list and a real
meal plan — not mockups, not seeded web renders.

**Light theme was chosen** because the food photography carries more on the off-white
cards, which suits the brand better than the moodier dark treatment. A dark feature graphic
over light screenshots is a normal pairing, not an inconsistency.

`screenshots/dark-alternate/` holds the same seven screens in dark theme, in case you want
to switch. If you do, swap the whole set — a listing that alternates themes looks like a
bug.

They were taken with sync unconfigured, so the Discover header has no account button. Once
`SYNC-SETUP.md` is finished that button appears — a 34px circle in the top-right of one
screenshot. Not worth recapturing for on its own.

To retake any single screen:

```bash
adb exec-out screencap -p > /tmp/shot.png
python3 -c "from PIL import Image; Image.open('/tmp/shot.png').crop((0,140,1080,2300)).save('store/screenshots/1-discover.png')"
```

The app's URL scheme makes navigation scriptable, which is how these were driven:

```bash
adb shell am start -a android.intent.action.VIEW -d "chopthegreens://recipe/19677" com.chopthegreens.app
adb shell am start -a android.intent.action.VIEW -d "chopthegreens://cook/1857" com.chopthegreens.app
```
