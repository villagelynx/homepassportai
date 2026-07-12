#!/usr/bin/env python3
"""Render crisp @2x/@3x PNGs from SVG and clean up key raster hero assets."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageFilter
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
IMAGES = ROOT / "images"


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
    img = Image.open(generated).convert("RGBA")
    img.save(out_path, optimize=True)
    generated.unlink(missing_ok=True)


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


def defringe_alpha(img: Image.Image, cutoff: int = 28) -> Image.Image:
    rgba = img.convert("RGBA")
    r, g, b, a = rgba.split()
    rgb = Image.merge("RGB", (r, g, b))
    clean_alpha = a.point(lambda px: 255 if px >= cutoff else 0)
    return Image.merge("RGBA", (*rgb.split(), clean_alpha))


def resize_sharp(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.Resampling.LANCZOS)


def export_brand_header_pngs() -> None:
    svg = ICONS / "brand-header.svg"
    specs = [
        ("brand-header.png", 720),
        ("brand-header@2x.png", 1440),
        ("brand-header@3x.png", 2160),
    ]
    for name, edge in specs:
        out = ICONS / name
        rasterize_svg(svg, out, edge)
        img = Image.open(out).convert("RGBA")
        img = remove_near_white_background(img, threshold=250)
        img = trim_transparent(img, pad=4)
        img.save(out, optimize=True)
        print(f"wrote {out} ({img.size[0]}x{img.size[1]})")


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


def remove_near_black_background(img: Image.Image, threshold: int = 32) -> Image.Image:
    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                data[x, y] = (r, g, b, 0)
    return rgba


def export_house_pngs() -> None:
    source = IMAGES / "home-card-house-only.png"
    if not source.is_file():
        source = IMAGES / "home-card-house-white.png"
    img = Image.open(source).convert("RGBA")
    img = remove_near_black_background(img, threshold=36)
    img = trim_transparent(img, pad=6)
    img = defringe_alpha(img, cutoff=24)

    aspect = img.width / img.height
    base_h = 173
    base_w = max(1, round(base_h * aspect))
    sizes = [
        ("home-card-house-white.png", (base_w, base_h)),
        ("home-card-house-white@2x.png", (base_w * 2, base_h * 2)),
        ("home-card-house-white@3x.png", (base_w * 3, base_h * 3)),
    ]
    for name, size in sizes:
        out = IMAGES / name
        resized = resize_sharp(img, size)
        resized.save(out, optimize=True)
        print(f"wrote {out} ({size[0]}x{size[1]})")


def export_phone_pngs() -> None:
    source = IMAGES / "landing-phone-straight.png"
    if not source.is_file():
        return
    img = Image.open(source).convert("RGBA")
    specs = [
        ("landing-phone-straight.png", 464),
        ("landing-phone-straight@2x.png", 928),
    ]
    for name, width in specs:
        ratio = width / img.width
        height = max(1, round(img.height * ratio))
        out = IMAGES / name
        resize_sharp(img, (width, height)).save(out, optimize=True)
        print(f"wrote {out} ({width}x{height})")


def main() -> None:
    export_brand_header_pngs()
    export_icon_pngs()
    export_house_pngs()
    export_phone_pngs()
    print("Done.")


if __name__ == "__main__":
    main()
