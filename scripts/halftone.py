"""Print a photo as a two-colour halftone, like a newspaper photo.

Made the Home page's terminal photo prints (src/assets/home/
photo-daewoo-terminal-halftone-{light,dark}.png). Run it again only if the
photo changes. It is a one-off tool, not part of the site; it needs Python 3
and Pillow (pip install pillow).

Usage, from the project folder:
  python3 scripts/halftone.py light   # label black dots on kraft
  python3 scripts/halftone.py dark    # kraft dots on label black
"""
import math
import sys

from PIL import Image, ImageDraw, ImageOps

SOURCE = 'src/assets/home/photo-daewoo-terminal.webp'
OUTPUT = 'src/assets/home/photo-daewoo-terminal-halftone-{}.png'
INK, PAPER = (0x1C, 0x1A, 0x17), (0xE2, 0xD3, 0xB6)  # --color-ink, --color-paper (light theme)
CELL = 6        # dot spacing in pixels
CURVE = 1.2     # above 1 keeps the mid-tones lighter, so detail survives
ANGLE = 45      # screen angle, as in print
SMOOTH = 4      # draw at 4x size, then shrink, for round dots


def halftone(mode):
    photo = Image.open(SOURCE).convert('L')
    photo = ImageOps.autocontrast(photo, cutoff=1)
    if mode == 'dark':
        # On a dark page the dots are pale, so they must stand for the light
        # parts of the photo; otherwise the print reads as a negative.
        photo = ImageOps.invert(photo)
        dot, ground = PAPER, INK
    else:
        dot, ground = INK, PAPER

    width, height = photo.size
    turned = photo.rotate(ANGLE, expand=True, fillcolor=255)
    tw, th = turned.size
    pixels = turned.load()
    mask = Image.new('L', (tw * SMOOTH, th * SMOOTH), 0)
    draw = ImageDraw.Draw(mask)
    for y in range(0, th, CELL):
        for x in range(0, tw, CELL):
            # How much ink this cell needs (0 = none, 1 = solid)
            samples = [pixels[xx, yy] for yy in range(y, min(y + CELL, th), 2)
                       for xx in range(x, min(x + CELL, tw), 2)]
            ink = 1 - sum(samples) / len(samples) / 255
            ink = (max(0.0, ink - 0.06) / 0.94) ** CURVE
            radius = CELL * 0.74 * math.sqrt(ink) * SMOOTH
            if radius > 0.3 * SMOOTH:
                cx, cy = (x + CELL / 2) * SMOOTH, (y + CELL / 2) * SMOOTH
                draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)

    mask = mask.resize((tw, th), Image.LANCZOS).rotate(-ANGLE, fillcolor=0)
    mw, mh = mask.size
    left, top = (mw - width) // 2, (mh - height) // 2
    mask = mask.crop((left, top, left + width, top + height))
    printed = Image.composite(Image.new('RGB', (width, height), dot),
                              Image.new('RGB', (width, height), ground), mask)
    # Four colours (ink, paper and two edge tones) keep the file small.
    printed.quantize(4).save(OUTPUT.format(mode), optimize=True)
    print('Saved', OUTPUT.format(mode))


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ('light', 'dark'):
        sys.exit(__doc__)
    halftone(sys.argv[1])
