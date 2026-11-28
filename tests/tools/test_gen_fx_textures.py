"""Tests for tools/gen_fx_textures.py (run: python3 -I -m pytest tests/tools)."""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))

import gen_fx_textures as gen  # noqa: E402
from PIL import Image  # noqa: E402


def _orbs():
    out = tempfile.mkdtemp()
    gen.main(out)
    return {name: Image.open(os.path.join(out, name + ".png")).convert("RGBA") for name in ("blue_orb", "red_orb", "purple_orb")}


def test_orbs_are_square_power_of_two_textures():
    for img in _orbs().values():
        assert img.size == (128, 128)


def test_orb_is_opaque_at_center_and_transparent_at_corners():
    for img in _orbs().values():
        assert img.getpixel((64, 64))[3] >= 250
        assert img.getpixel((0, 0))[3] == 0


def test_orb_core_is_hotter_than_its_body():
    for img in _orbs().values():
        core = sum(img.getpixel((64, 64))[:3])
        body = sum(img.getpixel((64 + 30, 64))[:3])
        assert core > body


def test_orb_body_keeps_the_technique_color():
    orbs = _orbs()
    r, g, b, _ = orbs["blue_orb"].getpixel((64 + 30, 64))
    assert b > r and b > g
    r, g, b, _ = orbs["red_orb"].getpixel((64 + 30, 64))
    assert r > g and r > b
    r, g, b, _ = orbs["purple_orb"].getpixel((64 + 30, 64))
    assert b > g and r > g


def test_orb_has_a_soft_halo_outside_the_body():
    for img in _orbs().values():
        halo = img.getpixel((64 + 52, 64))[3]
        assert 0 < halo < 200


def test_streak_is_horizontal_bright_in_the_middle_and_fades_at_the_tips():
    out = tempfile.mkdtemp()
    gen.main(out)
    img = Image.open(os.path.join(out, "streak_h.png")).convert("RGBA")
    assert img.size == (64, 16)
    mid = img.getpixel((32, 8))[3]
    assert mid >= 240
    assert img.getpixel((0, 8))[3] < mid / 4
    assert img.getpixel((32, 0))[3] < mid / 4
