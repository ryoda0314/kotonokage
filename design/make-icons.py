"""A stand-in icon until the maker chooses a picture (CONCEPT.md, デザイン): on the sisters' paper, a voice drawn as a
wave in ink, and its shadow a little behind in the accent. Writes public/icons (transparent corners; maskable on a
full square), src/app/icon.png, apple-icon.png and favicon.ico.
    python design/make-icons.py
"""
import math
import os

from PIL import Image, ImageDraw

PAPER = (252, 251, 248, 255)
INK = (23, 32, 51, 255)
ACCENT = (10, 100, 240, 150)
SCALE = 4


def wave(draw, x0, x1, y, amp, width, color, periods=1.5):
    # A round brush pressed along the curve: smooth at any width, round at both ends.
    r = width / 2
    steps = 1200
    for i in range(steps + 1):
        t = i / steps
        px = x0 + (x1 - x0) * t
        py = y - amp * math.sin(2 * math.pi * periods * t)
        draw.ellipse((px - r, py - r, px + r, py + r), fill=color)


def art(size, full_bleed, inset):
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    base = ImageDraw.Draw(img)
    if full_bleed:
        base.rectangle((0, 0, s, s), fill=PAPER)
    else:
        base.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=PAPER)
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    left, right = s * inset, s * (1 - inset)
    span = right - left
    wave(ImageDraw.Draw(shadow), left + span * 0.10, right, s * 0.60, span * 0.11, int(s * 0.065), ACCENT)
    img = Image.alpha_composite(img, shadow)
    wave(ImageDraw.Draw(img), left, right - span * 0.10, s * 0.43, span * 0.11, int(s * 0.07), INK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons = os.path.join(root, "public", "icons")
    app = os.path.join(root, "src", "app")
    os.makedirs(icons, exist_ok=True)
    art(192, False, 0.18).save(os.path.join(icons, "icon-192.png"))
    art(512, False, 0.18).save(os.path.join(icons, "icon-512.png"))
    art(512, True, 0.26).save(os.path.join(icons, "maskable-512.png"))
    art(512, False, 0.18).save(os.path.join(app, "icon.png"))
    art(180, True, 0.2).save(os.path.join(app, "apple-icon.png"))
    art(64, False, 0.14).save(os.path.join(app, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
