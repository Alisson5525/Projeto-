"""Tests for tools/convert_animations.py (run: python3 -I -m pytest tests/tools)."""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))

import convert_animations as ca  # noqa: E402

BEDROCK_BONES = {"root", "waist", "body", "head", "rightArm", "leftArm", "rightLeg", "leftLeg"}


def test_ease_in_quart_is_monotonic_from_0_to_1():
    samples = [ca.ease("easeInQuart", i / 20, None) for i in range(21)]
    assert samples[0] == 0 and abs(samples[-1] - 1) < 1e-9
    assert all(b >= a for a, b in zip(samples, samples[1:]))


def test_ease_in_back_overshoots_below_zero():
    assert ca.ease("easeInBack", 0.2, None) < 0


def test_ease_in_elastic_uses_bounciness_argument():
    assert ca.ease("easeInElastic", 0.5, [2]) != ca.ease("easeInElastic", 0.5, None)


def test_bones_are_renamed_to_bedrock_player_bones():
    anim = {
        "animation_length": 1,
        "bones": {name: {"rotation": {"0.0": [0, 0, 0], "1.0": [10, 0, 0]}} for name in ca.BONE_MAP},
    }
    out = ca.convert_animation(anim)
    assert set(out["bones"]) <= BEDROCK_BONES
    assert "root" in out["bones"] and "body" in out["bones"]


def test_hip_pivot_compensation_keeps_hip_fixed_for_pitch():
    anim = {"animation_length": 1, "bones": {"body": {"rotation": {"0.0": [90, 0, 0], "1.0": [90, 0, 0]}}}}
    out = ca.convert_animation(anim)
    pos = out["bones"]["root"]["position"]
    first = pos[sorted(pos, key=float)[0]]
    assert math.isclose(first[1], 12, abs_tol=1e-6)
    assert math.isclose(first[2], 12, abs_tol=1e-6)


def test_native_catmullrom_keys_are_kept_with_post_values():
    anim = {
        "animation_length": 1,
        "bones": {"head": {"rotation": {"0.0": {"vector": [0, 0, 0], "lerp_mode": "catmullrom"}, "1.0": [5, 0, 0]}}},
    }
    out = ca.convert_animation(anim)
    k0 = out["bones"]["head"]["rotation"]["0.0"]
    assert k0 == {"post": [0, 0, 0], "lerp_mode": "catmullrom"}


def test_custom_easing_segments_are_baked_into_linear_samples():
    anim = {
        "animation_length": 1,
        "bones": {"head": {"rotation": {"0.0": [0, 0, 0], "1.0": {"vector": [90, 0, 0], "easing": "easeInQuart"}}}},
    }
    out = ca.convert_animation(anim)
    keys = out["bones"]["head"]["rotation"]
    assert len(keys) > 10
    mid = keys["0.5"]
    assert math.isclose(mid[0], 90 * 0.5 ** 4, rel_tol=1e-3)


def test_loop_and_override_flags_are_preserved():
    anim = {"animation_length": 2, "loop": "hold_on_last_frame", "bones": {}}
    out = ca.convert_animation(anim)
    assert out["loop"] == "hold_on_last_frame"
    assert out["override_previous_animation"] is True


def test_nested_post_vector_format_is_understood():
    anim = {
        "animation_length": 1,
        "bones": {"head": {"rotation": {
            "0.0": {"post": {"vector": [0, 0, 0]}, "lerp_mode": "catmullrom"},
            "1.0": {"post": {"vector": [10, -7, 0]}, "lerp_mode": "catmullrom"},
        }}},
    }
    out = ca.convert_animation(anim)
    assert out["bones"]["head"]["rotation"]["1.0"] == {"post": [10, -7, 0], "lerp_mode": "catmullrom"}


def test_static_vector_channel_becomes_single_key():
    anim = {"animation_length": 1, "bones": {"head": {"rotation": {"vector": [5, 0, 0]}}}}
    out = ca.convert_animation(anim)
    assert out["bones"]["head"]["rotation"] == {"0.0": [5, 0, 0]}


def test_head_and_arms_do_not_inherit_the_torso_rotation():
    anim = {
        "animation_length": 1,
        "bones": {
            "torso": {"rotation": {"0.0": [90, 0, 0], "1.0": [90, 0, 0]}},
            "head": {"rotation": {"0.0": [0, 0, 0], "1.0": [0, 0, 0]}},
        },
    }
    out = ca.convert_animation(anim)
    head = out["bones"]["head"]["rotation"]
    first = head[sorted(head, key=float)[0]]
    assert math.isclose(first[0], -90, abs_tol=1e-3)
    assert "rightArm" in out["bones"] and "leftArm" in out["bones"]
    arm_pos = out["bones"]["rightArm"]["position"]
    p = arm_pos[sorted(arm_pos, key=float)[0]]
    # undoing a 90° pitch of the torso around the neck moves the shoulder pivot
    assert math.isclose(abs(p[1]) + abs(p[2]), 4, abs_tol=1e-3)


def test_rotation_matrix_round_trips_through_euler():
    for r in ([10, 20, 30], [-45, 5, 80], [0, -60, 0]):
        back = ca.matrix_to_euler(ca.euler_to_matrix(*r))
        assert all(math.isclose(a, b, abs_tol=1e-6) for a, b in zip(r, back))


def test_hip_pivot_compensation_for_sideways_roll():
    anim = {"animation_length": 1, "bones": {"body": {"rotation": {"0.0": [0, 0, 90], "1.0": [0, 0, 90]}}}}
    out = ca.convert_animation(anim)
    pos = out["bones"]["root"]["position"]
    first = pos[sorted(pos, key=float)[0]]
    assert math.isclose(first[0], -12, abs_tol=1e-6)
    assert math.isclose(first[1], 12, abs_tol=1e-6)
    assert math.isclose(first[2], 0, abs_tol=1e-6)


def test_upside_down_cartwheel_lifts_by_the_hip_diameter():
    anim = {"animation_length": 1, "bones": {"body": {"rotation": {"0.0": [0, 0, 180], "1.0": [0, 0, 180]}}}}
    out = ca.convert_animation(anim)
    pos = out["bones"]["root"]["position"]
    assert math.isclose(pos[sorted(pos, key=float)[0]][1], 24, abs_tol=1e-6)
