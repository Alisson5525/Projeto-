"""Builds resource-pack assets from the extracted Java mod jar.

Usage: python3 -I tools/prepare_assets.py <extracted_jar_dir> [step ...]
Steps: icons (default: all)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "packs", "JJK_BP")
RP = os.path.join(ROOT, "packs", "JJK_RP")


def jar_asset(jar: str, *parts: str) -> str:
    return os.path.join(jar, "assets", "jujutsukaisen", *parts)


def make_icon(jar: str, out: str) -> None:
    """Pack icon: the Six Eyes sprite upscaled on a dark cursed-energy glow."""
    size = 256
    icon = Image.new("RGBA", (size, size), (9, 12, 20, 255))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((28, 28, size - 28, size - 28), fill=(40, 170, 220, 150))
    icon.alpha_composite(glow.filter(ImageFilter.GaussianBlur(26)))
    eye = Image.open(jar_asset(jar, "textures", "item", "six_eyes.png")).convert("RGBA")
    eye = eye.resize((192, 192), Image.NEAREST)
    icon.alpha_composite(eye, (32, 32))
    icon.save(out)


def step_icons(jar: str) -> None:
    for pack in (BP, RP):
        make_icon(jar, os.path.join(pack, "pack_icon.png"))
    print("[assets] pack icons")


STEPS = {"icons": step_icons}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    jar = argv[1]
    for name in argv[2:] or list(STEPS):
        STEPS[name](jar)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
