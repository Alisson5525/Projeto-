"""Generates the Unlimited Void visuals for the resource pack.

* Barrier shell (jjk:domain_barrier): the Java mod draws a black sphere whose
  vertices fade in by DomainRules.closureThreshold(lon, lat) as the domain
  forms. Bedrock entity models are made of boxes, so the shell is 8 latitude
  bands x 16 longitude columns of thin plates, each scaled 0 -> 1 by the same
  threshold through the jjk:closure entity property.
* Void sky (jjk:void_sky): the Java sky is a shader; here a box of six planes
  around the arena with a generated starfield and coloured ribbons.

Run: python3 -I tools/gen_domain_assets.py
"""
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "packs", "JJK_RP")

BANDS = 8
COLUMNS = 16
RADIUS_PX = 16  # 1 block; the entity scales the root by the domain radius
SKY_HALF_PX = 80 * 16


def closure_threshold(longitude, latitude):
    """DomainRules.closureThreshold (keep in sync with src/core/domainRules.ts)."""
    noise = (
        math.sin(longitude * 7 + math.sin(latitude * 9) * 1.7) * 0.12
        + math.sin(longitude * 19 - latitude * 13) * 0.065
        + math.cos(longitude * 37 + latitude * 29) * 0.025
    )
    return 0.34 + 0.3 * math.sin(latitude) + noise


def plate_center(band, column):
    lat = -math.pi / 2 + (band + 0.5) * math.pi / BANDS
    lon = (column + 0.5) * 2 * math.pi / COLUMNS
    return lat, lon


def plate_threshold(band, column):
    lat, lon = plate_center(band, column)
    return closure_threshold(lon, lat)


def _plane_uv():
    face = {"uv": [0, 0], "uv_size": [16, 16]}
    return {k: dict(face) for k in ("north", "south", "east", "west", "up", "down")}


def barrier_geometry():
    bones = [{"name": "root", "pivot": [0, 0, 0]}]
    for column in range(COLUMNS):
        lon = (column + 0.5) * 360 / COLUMNS
        bones.append({"name": f"lon_{column}", "parent": "root", "pivot": [0, 0, 0], "rotation": [0, round(lon, 4), 0]})
        for band in range(BANDS):
            lat, _ = plate_center(band, column)
            width = 2 * math.pi * RADIUS_PX * math.cos(lat) / COLUMNS * 1.14
            height = math.pi * RADIUS_PX / BANDS * 1.1
            bones.append({"name": f"lat_{band}_{column}", "parent": f"lon_{column}", "pivot": [0, 0, 0], "rotation": [round(math.degrees(lat), 4), 0, 0]})
            bones.append(
                {
                    "name": f"plate_{band}_{column}",
                    "parent": f"lat_{band}_{column}",
                    "pivot": [0, 0, RADIUS_PX],
                    "cubes": [{"origin": [round(-width / 2, 4), round(-height / 2, 4), RADIUS_PX], "size": [round(width, 4), round(height, 4), 0], "uv": _plane_uv()}],
                }
            )
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.jjk.domain_barrier",
                    "texture_width": 16,
                    "texture_height": 16,
                    "visible_bounds_width": 80,
                    "visible_bounds_height": 80,
                    "visible_bounds_offset": [0, 0, 0],
                },
                "bones": bones,
            }
        ],
    }


def barrier_animation():
    bones = {"root": {"scale": "query.property('jjk:radius')"}}
    for column in range(COLUMNS):
        for band in range(BANDS):
            t = plate_threshold(band, column)
            bones[f"plate_{band}_{column}"] = {"scale": f"math.clamp((query.property('jjk:closure') - {t:.4f}) / 0.09, 0, 1)"}
    return {"format_version": "1.8.0", "animations": {"animation.jjk.domain_barrier.closure": {"loop": True, "bones": bones}}}


def sky_geometry():
    h = SKY_HALF_PX
    planes = [
        {"origin": [-h, -h, h], "size": [2 * h, 2 * h, 0]},
        {"origin": [-h, -h, -h], "size": [2 * h, 2 * h, 0]},
        {"origin": [h, -h, -h], "size": [0, 2 * h, 2 * h]},
        {"origin": [-h, -h, -h], "size": [0, 2 * h, 2 * h]},
        {"origin": [-h, h, -h], "size": [2 * h, 0, 2 * h]},
        {"origin": [-h, -h, -h], "size": [2 * h, 0, 2 * h]},
    ]
    for p in planes:
        p["uv"] = _plane_uv()
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.jjk.void_sky",
                    "texture_width": 16,
                    "texture_height": 16,
                    "visible_bounds_width": 200,
                    "visible_bounds_height": 200,
                    "visible_bounds_offset": [0, 0, 0],
                },
                "bones": [{"name": "root", "pivot": [0, 0, 0], "cubes": planes}],
            }
        ],
    }


def sky_animation():
    return {
        "format_version": "1.8.0",
        "animations": {"animation.jjk.void_sky.drift": {"loop": True, "bones": {"root": {"rotation": [0, "query.life_time * 1.5", 0]}}}},
    }


def void_sky_texture(size=512, seed=7):
    """Deep space: dark gradient, nebula haze, stars and the purple/pink/blue ribbons of the Java sky."""
    rnd = random.Random(seed)
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            u, v = x / size, y / size
            base = 6 + 10 * (1 - abs(v - 0.5) * 2)
            haze = 10 * (math.sin(u * 7.1 + math.sin(v * 5.3) * 2) * 0.5 + 0.5) * (math.sin(v * 6.7 - u * 3.1) * 0.5 + 0.5)
            px[x, y] = (int(base * 0.6 + haze * 0.9), int(base * 0.35 + haze * 0.3), int(base * 1.4 + haze * 1.3))
    ribbons = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(ribbons)
    colors = [(168, 80, 255), (255, 92, 190), (80, 150, 255)]
    for i in range(24):
        c = colors[i % 3]
        y0 = rnd.uniform(0, size)
        amp = rnd.uniform(10, 40)
        freq = rnd.uniform(1, 3)
        phase = rnd.uniform(0, math.tau)
        pts = [(x, y0 + amp * math.sin(freq * x / size * math.tau + phase)) for x in range(0, size + 8, 8)]
        d.line(pts, fill=(*c, 70), width=rnd.choice([1, 2, 3]))
    ribbons = ribbons.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img.convert("RGBA"), ribbons)
    stars = ImageDraw.Draw(img)
    for _ in range(900):
        x, y = rnd.uniform(0, size), rnd.uniform(0, size)
        b = rnd.choice([120, 160, 200, 255])
        r = rnd.choice([0, 0, 0, 1])
        stars.ellipse([x - r, y - r, x + r, y + r], fill=(b, b, min(255, b + 20), 255))
    return img.convert("RGB")


def barrier_texture(size=32, seed=3):
    rnd = random.Random(seed)
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            n = rnd.random()
            px[x, y] = (int(4 + 10 * n), int(2 + 4 * n), int(8 + 18 * n))
    return img


def main(out_root=None):
    if out_root is None:
        paths = {
            "models": os.path.join(RP, "models", "entity"),
            "animations": os.path.join(RP, "animations"),
            "textures": os.path.join(RP, "textures", "jjk", "domain"),
        }
    else:
        paths = {k: os.path.join(out_root, k) for k in ("models", "animations", "textures")}
    for p in paths.values():
        os.makedirs(p, exist_ok=True)
    files = {
        os.path.join(paths["models"], "jjk_domain_barrier.geo.json"): barrier_geometry(),
        os.path.join(paths["models"], "jjk_void_sky.geo.json"): sky_geometry(),
        os.path.join(paths["animations"], "jjk_domain.animation.json"): {
            "format_version": "1.8.0",
            "animations": {**barrier_animation()["animations"], **sky_animation()["animations"]},
        },
    }
    for path, data in files.items():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
    void_sky_texture().save(os.path.join(paths["textures"], "void_sky.png"))
    barrier_texture().save(os.path.join(paths["textures"], "barrier.png"))
    print("[domain] models, animations and textures written")


if __name__ == "__main__":
    main(*sys.argv[1:])
