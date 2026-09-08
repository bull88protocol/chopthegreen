#!/usr/bin/env python3
"""
Capture the Play Store phone screenshots.

    python3 scripts/make-screenshots.py [--skip-export]

Exports the web build, serves it, and drives headless Chrome over the six
screens Play shows. Output lands in store/screenshots/ at 824x1648 — exactly
2:1, because Play rejects phone screenshots taller than twice their width, and
a stock 412x915 phone viewport (2.22:1) is over that line.

These are renders of the real app at phone dimensions, not mockups: the same
components, data and fonts the device runs. They are, however, the *web*
build — blur falls back to an opaque fill off iOS, so the tab bar reads
slightly flatter than on the phone. If you have the Pixel to hand, screenshots
taken on-device are still the better ones to ship:

    adb exec-out screencap -p > store/screenshots/1-discover.png

Requires google-chrome (or chromium) on PATH.
"""
import argparse
import http.server
import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / '.screenshot-build'
OUT = ROOT / 'store' / 'screenshots'

# Phone viewport in CSS px, doubled by the device scale factor below.
VIEWPORT = (412, 824)
SCALE = 2

# Route -> file stem. Ordered as they should appear in the listing: the first
# two are what most people ever see.
SHOTS = [
    ('/', '1-discover'),
    ('/recipe/22089', '2-recipe'),
    ('/cook/22089', '3-cook'),
    ('/search', '4-search'),
    ('/list', '5-list'),
    ('/saved', '6-saved'),
]

CHROME = ('google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser')


def demo_state():
    """
    Plausible saved data, injected before the bundle boots.

    A shopping list and a Saved tab are empty on a fresh install, and an empty
    state is a poor advert for a shopping list.
    """
    now = int(time.time() * 1000)
    today = time.strftime('%Y-%m-%d')
    tomorrow = time.strftime('%Y-%m-%d', time.localtime(time.time() + 86400))
    part = lambda rid, name, amt, unit: {
        'recipeId': rid, 'recipeName': name, 'amount': amt, 'unit': unit}
    return {
        'ctg.theme.v1': 'dark',
        'ctg.updatedAt.v1': str(now),
        'ctg.saved.v1': json.dumps([22089, 12541, 6774]),
        'ctg.plan.v1': json.dumps({today: [22089], tomorrow: [12541]}),
        'ctg.list.v1': json.dumps([
            {'key': 'cori', 'label': 'Fresh coriander', 'aisle': 'Produce', 'checked': False,
             'parts': [part(6774, 'Roasted Corn', '1', 'bunch')]},
            {'key': 'corn', 'label': 'Sweetcorn cobs', 'aisle': 'Produce', 'checked': False,
             'parts': [part(12541, 'Air Fryer Corn Ribs', '4', '')]},
            {'key': 'tofu', 'label': 'Firm tofu', 'aisle': 'Dairy & Chilled', 'checked': False,
             'parts': [part(22089, 'High Protein Tofu Roti', '400', 'g')]},
            {'key': 'garam', 'label': 'Garam masala', 'aisle': 'Spices & Masala', 'checked': True,
             'parts': [part(6774, 'Roasted Corn', '1', 'tsp')]},
            {'key': 'atta', 'label': 'Whole wheat flour', 'aisle': 'Grains, Dal & Flour',
             'checked': False, 'parts': [part(22089, 'High Protein Tofu Roti', '2', 'cup')]},
            {'key': 'goch', 'label': 'Gochujang', 'aisle': 'Cans, Jars & Sauces', 'checked': True,
             'parts': [part(12541, 'Air Fryer Corn Ribs', '2', 'tbsp')]},
        ]),
    }


def seed(index_html):
    """AsyncStorage is plain localStorage on web, so this is all it takes."""
    html = index_html.read_text()
    if 'ctg.saved.v1' in html:
        return
    script = '<script>try{' + ''.join(
        f'localStorage.setItem({json.dumps(k)},{json.dumps(v)});'
        for k, v in demo_state().items()) + '}catch(e){}</script>'
    index_html.write_text(html.replace('</head>', script + '</head>'))


def serve(root, port):
    """Static server with an SPA fallback — the router owns every path."""
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(root), **k)

        def do_GET(self):
            path = self.path.split('?')[0].lstrip('/')
            if path and not os.path.isfile(os.path.join(root, path)):
                self.path = '/index.html'
            return super().do_GET()

        def log_message(self, *a):
            pass

    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip-export', action='store_true',
                    help='reuse the previous .screenshot-build/')
    args = ap.parse_args()

    chrome = next((c for c in CHROME if shutil.which(c)), None)
    if not chrome:
        sys.exit(f"none of {CHROME} found on PATH")

    if not args.skip_export or not (BUILD / 'index.html').exists():
        if BUILD.exists():
            shutil.rmtree(BUILD)
        print('exporting web build…')
        subprocess.run(['npx', 'expo', 'export', '--platform', 'web',
                        '--output-dir', str(BUILD), '--clear'],
                       cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

    seed(BUILD / 'index.html')
    port = free_port()
    serve(BUILD, port)
    OUT.mkdir(parents=True, exist_ok=True)

    for route, stem in SHOTS:
        dest = OUT / f'{stem}.png'
        subprocess.run([
            chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', f'--window-size={VIEWPORT[0]},{VIEWPORT[1]}',
            f'--force-device-scale-factor={SCALE}',
            # Recipes are fetched from the live blog; give the request room.
            '--virtual-time-budget=26000',
            f'--screenshot={dest}', f'http://127.0.0.1:{port}{route}',
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f'  {dest.relative_to(ROOT)}  {VIEWPORT[0]*SCALE}x{VIEWPORT[1]*SCALE}')

    print(f'\n{len(SHOTS)} screenshots in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
