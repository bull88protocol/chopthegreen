#!/usr/bin/env python3
"""
Generate the full app icon set from one source image.

    python3 scripts/make-icons.py assets/brand/logo.jpg [--bg green|cream|#RRGGBB]

The source is the site badge: a circular logo sitting on a flat cream field.
Two things have to happen for that to work as an app icon.

1. **Crop to the artwork.** The badge is only ~82% of the source's width; the
   rest is cream margin. Scaling the whole source leaves the badge floating in
   a thick ring of tile colour — which is what "the icon has a black
   background" meant. We flood-fill the flat field away, crop to what's left,
   and scale *that*.

2. **Fill the mask.** Android shows only the centre 72dp of a 108dp adaptive
   icon, so the foreground is drawn at exactly 2/3 of the canvas: the badge
   then meets the mask edge on every launcher shape, with no ring of tile
   showing through on a circle mask at all.

The tile colour defaults to the badge's own outer-ring green, so the badge
edge and the tile are the same colour and the icon reads as one solid mark
rather than a logo pasted onto a square.

Writes into assets/:
    icon.png                    1024  iOS + store (no alpha; Apple rejects it)
    android-icon-foreground.png  512  adaptive foreground, fills the mask
    android-icon-background.png  512  adaptive background (flat tile colour)
    android-icon-monochrome.png  432  themed-icon silhouette (Android 13+)
    splash-icon.png             1024  transparent, drawn at 180pt on the splash
    favicon.png                   64  web tab icon
    ../store/icon-512.png        512  Play Console listing icon (no alpha)
"""
import sys, pathlib
from collections import deque
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets'
# Play listing artwork lives outside assets/ — it's shop-window material,
# not something the app ever loads.
STORE = ROOT / 'store'

# Sampled from the badge's outer ring, so the artwork's edge and the tile it
# sits on are the same colour. Keep `TILE` in step with app.json ->
# expo.android.adaptiveIcon.backgroundColor.
TILES = {
    'green': (42, 62, 50, 255),      # #2A3E32 — the badge's own ring
    'cream': (254, 250, 247, 255),   # #FEFAF7 — the field the logo ships on
}

# Android masks adaptive icons to varying shapes, but every mask is inscribed
# in the centre 72dp of the 108dp layer. Drawing the art at exactly that
# fraction makes it meet the mask edge instead of floating inside it.
ADAPTIVE_VISIBLE = 2 / 3


def cutout_background(im, tol=34):
    """
    Make a flat outer background transparent.

    Logos are often supplied as JPEG on solid white/cream, which would render
    as an opaque tile and get chopped by Android's adaptive mask. We flood-fill
    inward from the edges rather than colour-keying globally, so pale areas
    *inside* the artwork (cream lettering, a white chef's hat) are preserved.
    """
    w, h = im.size
    px = im.load()
    bg = px[0, 0][:3]

    def near(c):
        return all(abs(c[i] - bg[i]) <= tol for i in range(3))

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near(px[x, y][:3]):
                q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if near(px[x, y][:3]):
                q.append((x, y)); seen[y * w + x] = 1

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                if near(px[nx, ny][:3]):
                    seen[ny * w + nx] = 1
                    q.append((nx, ny))
    return im


def load(path):
    """Return the artwork alone, cropped to its bounds and centred in a square."""
    im = Image.open(path).convert('RGBA')
    # A source with no alpha at all is almost always a JPEG export on a flat
    # ground; lift it so the artwork can sit on our own background.
    if im.getchannel('A').getextrema()[0] == 255:
        im = cutout_background(im)

    # Crop to the artwork. Without this the source's own margin becomes tile
    # colour in every output, shrinking the mark by a fifth.
    box = im.getbbox()
    if box:
        im = im.crop(box)

    # Square it by the longer side. The badge is a couple of percent wider than
    # it is tall; padding rather than stretching keeps the art undistorted, and
    # the sliver of tile that leaves top and bottom is the ring colour anyway.
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return sq


def fitted(src, size, scale):
    """Source scaled to `scale` of a `size` canvas, centred, transparent around."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = max(1, int(round(size * scale)))
    art = src.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(art, (off, off), art)
    return canvas


def on_tile(layer, size, tile):
    out = Image.new('RGBA', (size, size), tile)
    out.alpha_composite(layer)
    return out


def rounded(size, tile, ratio=0.225):
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1],
                                        radius=int(size * 4 * ratio), fill=255)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    img.paste(tile, (0, 0), m.resize((size, size), Image.LANCZOS))
    return img


def monochrome(src, size):
    """
    Themed-icon layer (Android 13+): the system tints this and uses its alpha
    as the shape. The badge's own alpha is a filled disc, which would tint to a
    featureless blob — so the ink is taken from the artwork's *light* areas
    instead (ring lettering, chef's hat and coat), which still reads as the logo.
    """
    fg = fitted(src, size, ADAPTIVE_VISIBLE)
    px = fg.load()
    ink = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ipx = ink.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            # Ramp across the gap between the mid greens and the cream.
            t = (lum - 0.62) / 0.20
            t = 0.0 if t < 0 else 1.0 if t > 1 else t
            if t > 0:
                ipx[x, y] = (255, 255, 255, int(round(255 * t * (a / 255))))
    return ink


def main():
    args = [a for a in sys.argv[1:]]
    tile_name = 'green'
    if '--bg' in args:
        i = args.index('--bg')
        tile_name = args[i + 1]
        del args[i:i + 2]
    if not args:
        sys.exit(__doc__)
    if tile_name in TILES:
        tile = TILES[tile_name]
    elif tile_name.startswith('#') and len(tile_name) == 7:
        tile = (*(int(tile_name[i:i + 2], 16) for i in (1, 3, 5)), 255)
    else:
        sys.exit(f"--bg must be one of {sorted(TILES)} or #RRGGBB, got {tile_name!r}")

    src = load(args[0])
    if min(src.size) < 512:
        print(f"warning: artwork is only {src.width}px; 1024px+ recommended")

    # Store icons are masked to a rounded square, and every such mask contains
    # the inscribed circle — so the badge can run nearly edge to edge.
    on_tile(fitted(src, 1024, 0.98), 1024, tile).convert('RGB').save(OUT / 'icon.png')
    STORE.mkdir(exist_ok=True)
    on_tile(fitted(src, 512, 0.98), 512, tile).convert('RGB').save(STORE / 'icon-512.png')

    fitted(src, 512, ADAPTIVE_VISIBLE).save(OUT / 'android-icon-foreground.png')
    Image.new('RGBA', (512, 512), tile).save(OUT / 'android-icon-background.png')
    monochrome(src, 432).save(OUT / 'android-icon-monochrome.png')

    # Splash art is transparent — it's drawn at 180pt on the splash colour.
    fitted(src, 1024, 0.98).save(OUT / 'splash-icon.png')

    fav = rounded(64, tile)
    fav.alpha_composite(fitted(src, 64, 0.82))
    fav.save(OUT / 'favicon.png')

    hexed = '#%02X%02X%02X' % tile[:3]
    print("wrote:", ", ".join(sorted(p.name for p in OUT.glob('*.png'))),
          "+ store/icon-512.png")
    print(f"tile colour: {hexed}  "
          f"(app.json -> expo.android.adaptiveIcon.backgroundColor must match)")
    print("\nNext: npx expo prebuild --platform android --clean && "
          "(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)")


if __name__ == '__main__':
    main()
