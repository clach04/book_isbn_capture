"""Rasterize icons/icon.svg to icons/icon-192.png and icons/icon-512.png.

Usage: python rasterize_icon.py [SIZE ...]   (default: 192 512)
Requires Pillow (pip install Pillow); the SVG source must exist next to it.

The source art is flat geometry (rects, rx corners) so it is drawn
directly here instead of parsing SVG: simpler and dependency-light.
"""
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "icons", "icon.svg")
BLUE = (37, 99, 235, 255)    # #2563eb
WHITE = (255, 255, 255, 255)

# Barcode bars in SVG user units (x, width); y/h are fixed.
BARS = [
    (168, 10), (186, 6), (200, 14), (222, 6), (236, 10),
    (254, 6), (268, 14), (290, 6), (304, 10), (322, 6), (336, 8),
]
BAR_TOP, BAR_H = 196, 120


def _rounded_rect(d, box, radius, fill):
    x0, y0, x1, y1 = box
    d.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    d.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    for cx, cy, start in ((x0 + radius, y0 + radius, 180),
                          (x1 - radius, y0 + radius, 270),
                          (x1 - radius, y1 - radius, 0),
                          (x0 + radius, y1 - radius, 90)):
        d.pieslice([cx - radius, cy - radius, cx + radius, cy + radius],
                   start, start + 90, fill=fill)


def render(size):
    s = size / 512.0

    def sc(v):
        return round(v * s)

    img = Image.new("RGBA", (size, size), BLUE)
    d = ImageDraw.Draw(img)
    _rounded_rect(d, (sc(120), sc(120), sc(392), sc(392)), sc(28), WHITE)
    for x, w in BARS:
        d.rectangle([sc(x), sc(BAR_TOP), sc(x + w), sc(BAR_TOP + BAR_H)], fill=BLUE)
    return img


def main(sizes):
    assert os.path.exists(SRC), "missing source: %s" % SRC
    out_dir = os.path.join(HERE, "icons")
    for size in sizes:
        path = os.path.join(out_dir, "icon-%d.png" % size)
        render(size).save(path)
        print("wrote %s (%d bytes)" % (path, os.path.getsize(path)))


if __name__ == "__main__":
    args = [int(a) for a in sys.argv[1:]] or [192, 512]
    main(args)
