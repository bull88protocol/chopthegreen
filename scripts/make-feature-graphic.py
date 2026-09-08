#!/usr/bin/env python3
"""
Build the Play Store feature graphic — 1024x500, the one asset Play won't
publish a listing without.

    python3 scripts/make-feature-graphic.py

Writes store/feature-graphic.png (24-bit, no alpha, as Play requires).

Play crops this banner differently across its surfaces, so everything that has
to survive stays inside a generous margin and nothing meaningful touches an
edge. Type is set in the app's own two faces so the listing and the app look
like the same product.
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'store' / 'feature-graphic.png'
LOGO = ROOT / 'assets' / 'brand' / 'logo.jpg'

W, H = 1024, 500
MARGIN = 64

DISPLAY = ROOT / 'node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'
BODY_SEMI = ROOT / 'node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'
BODY = ROOT / 'node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'

INK = (244, 247, 242)        # colors.text (dark)
LIME = (196, 245, 66)        # BRAND
SOFT = (169, 179, 172)       # colors.textSoft
TOP = (26, 39, 31)           # a shade above the badge ring
BOTTOM = (16, 24, 19)


def background():
    """Vertical gradient plus a soft lime bloom behind the badge."""
    bg = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(
            round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)))

    # Radial glow, drawn on its own layer and screened in so it stays subtle.
    glow = Image.new('L', (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy, r = 300, H // 2, 330
    for i in range(r, 0, -3):
        gd.ellipse([cx - i, cy - i, cx + i, cy + i],
                   fill=int(26 * (1 - i / r) ** 2))
    bg = Image.composite(Image.new('RGB', (W, H), LIME), bg, glow)
    return bg


def badge(size):
    """The logo, cropped out of its cream field and scaled."""
    from importlib import import_module
    import sys
    sys.path.insert(0, str(ROOT / 'scripts'))
    art = import_module('make-icons'.replace('-', '_')) if False else None
    # Inline rather than importing: make-icons.py isn't an importable name.
    im = Image.open(LOGO).convert('RGBA')
    px = im.load()
    bgc = px[0, 0][:3]
    from collections import deque
    w, h = im.size
    near = lambda c: all(abs(c[i] - bgc[i]) <= 34 for i in range(3))
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
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near(px[nx, ny][:3]):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    im = im.crop(im.getbbox())
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return sq.resize((size, size), Image.LANCZOS)


def main():
    img = background()
    d = ImageDraw.Draw(img)

    mark = badge(356)
    img.paste(mark, (MARGIN + 8, (H - mark.height) // 2), mark)

    x = MARGIN + 8 + mark.width + 56
    title = ImageFont.truetype(str(DISPLAY), 68)
    tag = ImageFont.truetype(str(BODY_SEMI), 25)
    sub = ImageFont.truetype(str(BODY), 22)

    # The badge's optical centre is the page's; the text block hangs off it.
    d.text((x, 152), 'Chop the', font=title, fill=INK)
    d.text((x, 222), 'Greens', font=title, fill=INK)
    d.text((x, 310), 'HEALTHY · SIMPLE · GUILT-FREE', font=tag, fill=LIME)
    # Flat RGB here: PIL drops the alpha channel on an RGB canvas, and a
    # 4-tuple silently becomes pure white — far too hard for this palette.
    d.line([(x, 352), (x + 296, 352)], fill=(58, 76, 64), width=2)
    d.text((x, 372), '200+ recipes · Cook Mode · shopping list', font=sub, fill=SOFT)

    OUT.parent.mkdir(exist_ok=True)
    img.save(OUT)
    print(f'wrote {OUT.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  mode={img.mode}')


if __name__ == '__main__':
    main()
