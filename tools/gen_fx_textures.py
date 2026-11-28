"""Generates the pre-composited orb textures used by the Blue/Red particles.

The Java mod draws each orb with three Photon layers (outer glow, sphere body
and inner light). A Bedrock particle effect has a single texture, so the
layers are baked into one image: one particle per frame instead of three
keeps weak phones fast. Colors come from gojo_base_blue.json and
gojo_red_enhanced_repulsion_v3_v5based.json (BLUE_01..03 / RED_01..03).

Run: python3 -I tools/gen_fx_textures.py
"""
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "packs", "JJK_RP", "textures", "jjk", "fx")
SIZE = 128

# name: (halo rgb, halo alpha, body rgb, body radius, inner rgb, inner alpha, inner radius)
# Radii are fractions of the half-width of the texture (1.0 = edge).
ORBS = {
    "blue_orb": ((18, 111, 255), 0.62, (22, 129, 255), 0.66, (191, 235, 255), 0.95, 0.30),
    "red_orb": ((253, 83, 105), 0.66, (229, 26, 73), 0.64, (255, 156, 170), 0.92, 0.24),
}


def over(dst, src):
    """Composites straight-alpha RGBA (0..1 floats) `src` over `dst`."""
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    oa = sa + da * (1 - sa)
    if oa <= 1e-6:
        return (0.0, 0.0, 0.0, 0.0)
    mix = lambda s, d: (s * sa + d * da * (1 - sa)) / oa  # noqa: E731
    return (mix(sr, dr), mix(sg, dg), mix(sb, db), oa)


def smooth(edge0, edge1, x):
    t = min(1.0, max(0.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def orb_pixel(r, spec):
    """Color of the orb at normalized radius r (0 center, 1 edge)."""
    halo_rgb, halo_a, body_rgb, body_r, inner_rgb, inner_a, inner_r = spec
    px = (0.0, 0.0, 0.0, 0.0)
    halo = halo_a * (1 - smooth(0.0, 1.0, r)) ** 1.6
    px = over(px, (*[c / 255 for c in halo_rgb], halo))
    body = 1 - smooth(body_r * 0.86, body_r, r)
    rim = smooth(body_r * 0.55, body_r * 0.9, r) * 0.25  # brighter limb, like the Java sphere shader
    px = over(px, (*[min(1.0, c / 255 + rim) for c in body_rgb], body))
    inner = inner_a * (1 - smooth(0.0, inner_r, r)) ** 1.3
    return over(px, (*[c / 255 for c in inner_rgb], inner))


def make_orb(spec):
    img = Image.new("RGBA", (SIZE, SIZE))
    half = SIZE / 2
    pixels = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r = math.hypot(x + 0.5 - half, y + 0.5 - half) / half
            pixels[x, y] = tuple(round(c * 255) for c in orb_pixel(r, spec))
    return img


def make_streak(width=64, height=16):
    """White streak along X for "lookat_direction" particles (X follows the motion)."""
    img = Image.new("RGBA", (width, height))
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            u = abs((x + 0.5) / width * 2 - 1)  # 0 middle .. 1 tips
            v = abs((y + 0.5) / height * 2 - 1)
            a = (1 - smooth(0.25, 1.0, u)) * math.exp(-((v / 0.42) ** 2))
            pixels[x, y] = (255, 255, 255, round(min(1.0, a * 1.08) * 255))
    return img


def main(out_dir=OUT):
    os.makedirs(out_dir, exist_ok=True)
    for name, spec in ORBS.items():
        make_orb(spec).save(os.path.join(out_dir, name + ".png"))
        print("[fx] wrote", name)
    make_streak().save(os.path.join(out_dir, "streak_h.png"))
    print("[fx] wrote streak_h")


if __name__ == "__main__":
    main(*sys.argv[1:])
