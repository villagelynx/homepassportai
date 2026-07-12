#!/usr/bin/env python3
"""Sharpen brand header and app icons without changing artwork.

Uses the original brand-header-debug.png master (same lockup as production) and
exports @1x/@2x/@3x PNGs. Does not modify house card or landing phone images.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"

BRAND_SIZES = [
    ("brand-header.png", (557, 113)),
    ("brand-header@2x.png", (1114, 226)),
    ("brand-header@3x.png", (1671, 339)),
]


def trim_transparent(img: Image.Image, pad: int = 2) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def remove_near_white_background(img: Image.Image, threshold: int = 248) -> Image.Image:
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                data[x, y] = (r, g, b, 0)
    return rgba


def remove_dark_fringe(img: Image.Image, threshold: int = 40) -> Image.Image:
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a == 0:
                continue
            if r <= threshold and g <= threshold and b <= threshold:
                data[x, y] = (r, g, b, 0)
    return rgba


def resize_sharp(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.Resampling.LANCZOS)


def load_brand_master() -> Image.Image:
    debug = ICONS / "brand-header-debug.png"
    original = ICONS / "brand-header.png"
    source = debug if debug.is_file() else original
    img = Image.open(source).convert("RGBA")
    if source == debug:
        img = remove_near_white_background(img)
    else:
        img = remove_dark_fringe(img)
    img = trim_transparent(img, pad=4)
    return img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))


def export_brand_header_pngs() -> None:
    master = load_brand_master()
    for name, size in BRAND_SIZES:
        out = ICONS / name
        resize_sharp(master, size).save(out, optimize=True)
        print(f"wrote {out} ({size[0]}x{size[1]})")


def rasterize_svg(svg_path: Path, out_path: Path, max_edge: int) -> None:
    tmp_dir = ROOT / ".asset-cache"
    tmp_dir.mkdir(exist_ok=True)
    subprocess.run(
        ["qlmanage", "-t", f"-s{max_edge}", "-o", str(tmp_dir), str(svg_path)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    generated = tmp_dir / f"{svg_path.name}.png"
    if not generated.is_file():
        raise RuntimeError(f"Could not rasterize {svg_path}")
    Image.open(generated).convert("RGBA").save(out_path, optimize=True)
    generated.unlink(missing_ok=True)


def export_icon_pngs() -> None:
    svg = ICONS / "icon.svg"
    specs = [
        ("icon-192.png", 192),
        ("icon-384.png", 384),
        ("icon-512.png", 512),
        ("icon-1024.png", 1024),
        ("apple-touch-icon.png", 180),
        ("apple-touch-icon@2x.png", 360),
    ]
    for name, edge in specs:
        out = ICONS / name
        rasterize_svg(svg, out, edge)
        print(f"wrote {out}")


def main() -> None:
    export_brand_header_pngs()
    print("Done. House card and landing phone images are left unchanged.")


if __name__ == "__main__":
    main()
