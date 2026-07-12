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


def export_brand_header_options() -> None:
    """Export HD PNG previews from vector header options (for email/fallback)."""
    options = [
        ("brand-header-option-a.svg", "brand-header-option-a.png"),
        ("brand-header-option-b.svg", "brand-header-option-b.png"),
        ("brand-header-option-c.svg", "brand-header-option-c.png"),
        ("brand-header-option-d.svg", "brand-header-option-d.png"),
        ("brand-header-option-e.svg", "brand-header-option-e.png"),
        ("brand-header-option-f.svg", "brand-header-option-f.png"),
        ("brand-header-option-g.svg", "brand-header-option-g.png"),
        ("brand-header-option-h.svg", "brand-header-option-h.png"),
        ("brand-header-option-i.svg", "brand-header-option-i.png"),
        ("brand-header-option-j.svg", "brand-header-option-j.png"),
        ("brand-header-option-k.svg", "brand-header-option-k.png"),
        ("brand-header-option-l.svg", "brand-header-option-l.png"),
    ]
    for svg_name, png_name in options:
        svg = ICONS / svg_name
        if not svg.is_file():
            continue
        out = ICONS / png_name
        rasterize_svg(svg, out, 2160)
        img = Image.open(out).convert("RGBA")
        img = remove_near_white_background(img)
        img = trim_transparent(img, pad=6)
        img.save(out, optimize=True)
        print(f"wrote {out} ({img.size[0]}x{img.size[1]})")


def _is_near_black(r: int, g: int, b: int, a: int) -> bool:
    return a > 0 and r < 35 and g < 35 and b < 35


def _remove_exterior_black(img: Image.Image) -> Image.Image:
    """Remove only outer black background; keep interior black for white fill."""
    from collections import deque

    rgba = img.convert("RGBA")
    data = rgba.load()
    w, h = rgba.size
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not seen[y][x] and _is_near_black(*data[x, y]):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        data[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and _is_near_black(*data[nx, ny]):
                seen[ny][nx] = True
                q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if _is_near_black(r, g, b, a):
                data[x, y] = (255, 255, 255, 255)

    return rgba


def export_brand_app_icons() -> None:
    """Build header mark + opaque white app icons from brand-mark-source.png."""
    source = ICONS / "brand-mark-source.png"
    if not source.is_file():
        source = ICONS / "brand-mark.png"
    if not source.is_file():
        return

    img = _remove_exterior_black(Image.open(source))
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        img = img.crop(bbox)

    mark = img.copy()
    max_edge = max(mark.size)
    if max_edge > 512:
        scale = 512 / max_edge
        mark = mark.resize(
            (int(mark.width * scale), int(mark.height * scale)),
            Image.Resampling.LANCZOS,
        )
    mark.save(ICONS / "brand-mark.png", optimize=True)
    print(f"wrote {ICONS / 'brand-mark.png'} ({mark.size[0]}x{mark.size[1]})")

    def square_icon(
        im: Image.Image,
        size: int,
        pad_ratio: float = 0.1,
        bg: tuple[int, int, int, int] = (255, 255, 255, 255),
    ) -> Image.Image:
        canvas = Image.new("RGBA", (size, size), bg)
        pad = int(size * pad_ratio)
        inner = size - pad * 2
        scale = min(inner / im.width, inner / im.height)
        nw, nh = int(im.width * scale), int(im.height * scale)
        resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
        ox = (size - nw) // 2
        oy = (size - nh) // 2
        canvas.paste(resized, (ox, oy), resized)
        return canvas

    for name, size in [
        ("apple-touch-icon.png", 180),
        ("apple-touch-icon@2x.png", 360),
        ("icon-192.png", 192),
        ("icon-384.png", 384),
        ("icon-512.png", 512),
        ("icon-1024.png", 1024),
    ]:
        out = ICONS / name
        square_icon(img, size).save(out, optimize=True)
        print(f"wrote {out} ({size}x{size})")


def main() -> None:
    export_brand_app_icons()
    export_brand_header_options()
    print("Done. Brand mark + app icons exported from brand-mark-source.png.")


if __name__ == "__main__":
    main()
