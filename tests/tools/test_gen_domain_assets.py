"""Tests for tools/gen_domain_assets.py (run: python3 -I -m pytest tests/tools)."""
import math
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))

import gen_domain_assets as gen  # noqa: E402
from PIL import Image  # noqa: E402


def _out():
    out = tempfile.mkdtemp()
    gen.main(out)
    return out


def test_barrier_shell_has_one_plate_per_latitude_band_and_longitude_column():
    geo = gen.barrier_geometry()["minecraft:geometry"][0]
    plates = [b for b in geo["bones"] if b["name"].startswith("plate_")]
    assert len(plates) == gen.BANDS * gen.COLUMNS
    assert all(len(b["cubes"]) == 1 for b in plates)


def test_barrier_plates_close_from_the_bottom_up_like_the_java_shell():
    anim = gen.barrier_animation()["animations"]["animation.jjk.domain_barrier.closure"]["bones"]
    bottom = gen.plate_threshold(0, 0)
    top = gen.plate_threshold(gen.BANDS - 1, 0)
    assert bottom < top
    assert f"{bottom:.4f}" in anim["plate_0_0"]["scale"]


def test_threshold_matches_the_java_formula():
    lon, lat = 1.3, -0.4
    noise = math.sin(lon * 7 + math.sin(lat * 9) * 1.7) * 0.12 + math.sin(lon * 19 - lat * 13) * 0.065 + math.cos(lon * 37 + lat * 29) * 0.025
    assert abs(gen.closure_threshold(lon, lat) - (0.34 + 0.3 * math.sin(lat) + noise)) < 1e-12


def test_sky_box_has_six_inward_visible_faces():
    geo = gen.sky_geometry()["minecraft:geometry"][0]
    cubes = [c for b in geo["bones"] for c in b.get("cubes", [])]
    assert len(cubes) == 6
    assert all(sorted(c["size"]).count(0) == 1 for c in cubes)


def test_textures_are_written():
    out = _out()
    sky = Image.open(os.path.join(out, "textures", "void_sky.png"))
    barrier = Image.open(os.path.join(out, "textures", "barrier.png"))
    assert sky.size == (512, 512)
    assert barrier.size == (32, 32)
    # The void is dark: average brightness stays low.
    px = list(sky.convert("L").getdata())
    assert sum(px) / len(px) < 60
