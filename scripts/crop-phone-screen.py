#!/usr/bin/env python3
"""Crop the phone screen from the HomePassportAI promo flyer."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image

SOURCE = Path(
    "/Users/robertexellsr/.cursor/projects/Users-robertexellsr-Documents-weather-predict-web/assets/homepassportaicover-d989d4ed-949f-429f-930e-00d94e5f68d3.png"
)
OUT_DIR = Path("/Users/robertexellsr/Documents/homepassport-ai/images")
OUT_SCREEN = OUT_DIR / "landing-phone-screen.png"
OUT_DEVICE = OUT_DIR / "landing-phone-device.png"

# Portrait flyer (682×1024): tight crop on phone only (pixel-tuned).
SCREEN_BOX = (286 / 682, 240 / 1024, 518 / 682, 732 / 1024)
DEVICE_BOX = (272 / 682, 286 / 1024, 531 / 682, 696 / 1024)


def crop_box(img: Image.Image, box):
    w, h = img.size
    left = int(box[0] * w)
    top = int(box[1] * h)
    right = int(box[2] * w)
    bottom = int(box[3] * h)
    return img.crop((left, top, right, bottom)), (left, top, right, bottom)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(SOURCE).convert("RGBA")
    w, h = img.size
    print(f"source={SOURCE}")
    print(f"source_size={w}x{h}")

    screen, screen_coords = crop_box(img, SCREEN_BOX)
    device, device_coords = crop_box(img, DEVICE_BOX)

    screen.save(OUT_SCREEN)
    device.save(OUT_DEVICE)

    print(f"screen_coords={screen_coords}")
    print(f"screen_out={OUT_SCREEN} size={screen.size[0]}x{screen.size[1]}")
    print(f"device_coords={device_coords}")
    print(f"device_out={OUT_DEVICE} size={device.size[0]}x{device.size[1]}")


if __name__ == "__main__":
    main()
