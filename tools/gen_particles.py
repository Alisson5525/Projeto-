"""Generates packs/JJK_RP/particles/*.json.

The Java mod uses Photon effects (hundreds of emitters). Here every effect is
a small parameterized Bedrock emitter: the scripts pass size, color, count,
speed and lifetime through Molang variables (src/game/fx.ts), so a handful of
files cover every technique, and `variable.jjk_density` (the world performance
profile) scales particle counts down on weak phones.

Run: python3 -I tools/gen_particles.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "packs", "JJK_RP", "particles")

T = "(variable.particle_age / variable.particle_lifetime)"
EASE_OUT = f"(1 - math.pow(1 - {T}, 3))"
GROW = f"math.lerp(variable.jjk_size0, variable.jjk_size1, {EASE_OUT})"
FADE_OUT = f"variable.jjk_a * (1 - math.pow({T}, 2))"
FADE_IN_OUT = f"variable.jjk_a * math.sin({T} * 180)"
COUNT = "math.max(1, math.floor(variable.jjk_count * variable.jjk_density))"
UV = {"texture_width": 1, "texture_height": 1, "uv": [0, 0], "uv_size": [1, 1]}


def tint(alpha):
    return {"color": ["variable.jjk_r", "variable.jjk_g", "variable.jjk_b", alpha]}


def effect(identifier, texture, material, components):
    base = {
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
    }
    base.update(components)
    return {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": identifier,
                "basic_render_parameters": {"material": material, "texture": "textures/jjk/fx/" + texture},
            },
            "components": base,
        },
    }


def single(size, facing="lookat_xyz", direction=None, alpha=FADE_OUT):
    billboard = {"size": [size, size], "facing_camera_mode": facing, "uv": UV}
    if direction:
        billboard["direction"] = {"mode": "custom_direction", "custom_direction": direction}
    return {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "variable.jjk_life"},
        "minecraft:particle_appearance_billboard": billboard,
        "minecraft:particle_appearance_tinting": tint(alpha),
    }


def streaks(direction, speed, life, size, drag, gravity, alpha):
    return {
        "minecraft:emitter_rate_instant": {"num_particles": COUNT},
        "minecraft:emitter_shape_sphere": {"radius": "variable.jjk_radius", "surface_only": True, "direction": direction},
        "minecraft:particle_initial_speed": speed,
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, gravity, 0], "linear_drag_coefficient": drag},
        "minecraft:particle_lifetime_expression": {"max_lifetime": life},
        "minecraft:particle_appearance_billboard": {
            "size": size,
            "facing_camera_mode": "lookat_direction",
            "direction": {"mode": "derive_from_velocity", "min_speed_threshold": 0.01},
            "uv": UV,
        },
        "minecraft:particle_appearance_tinting": tint(alpha),
    }


SHRINK = f"(1 - {T} * 0.6)"

EFFECTS = {
    # Expanding ring facing the camera (Infinity ripple, impacts, Red outline).
    "fx_ring": effect("jjk:fx_ring", "thin_ring", "particles_add", single(GROW)),
    # Ring oriented by (jjk_dx, jjk_dy, jjk_dz): ground shockwaves, aftershocks.
    "fx_ring_flat": effect(
        "jjk:fx_ring_flat",
        "thin_ring",
        "particles_add",
        single(GROW, "direction_z", ["variable.jjk_dx", "variable.jjk_dy", "variable.jjk_dz"]),
    ),
    # Soft flash (white-hot flashes, blooms, collapses).
    "fx_glow": effect("jjk:fx_glow", "glow", "particles_add", single(GROW)),
    # Sparks thrown outward from a point.
    "fx_sparks": effect(
        "jjk:fx_sparks",
        "streak_h",
        "particles_add",
        streaks(
            "outwards",
            "variable.jjk_speed * (0.55 + variable.particle_random_1 * 0.45)",
            "variable.jjk_life * (0.6 + variable.particle_random_2 * 0.4)",
            [f"variable.jjk_size0 * {SHRINK}", f"variable.jjk_size0 * 0.2 * {SHRINK}"],
            3.5,
            -3,
            FADE_OUT,
        ),
    ),
    # Streaks sucked into a point (Blue suction ribbons, Red gathering wisps).
    "fx_suction": effect(
        "jjk:fx_suction",
        "streak_h",
        "particles_add",
        streaks(
            "inwards",
            "variable.jjk_speed",
            "variable.jjk_life",
            ["variable.jjk_size0", "variable.jjk_size0 * 0.18"],
            0,
            0,
            FADE_IN_OUT,
        ),
    ),
    # Glittering dots leaving (speed > 0) or entering (speed < 0) a sphere.
    "fx_dots": effect(
        "jjk:fx_dots",
        "dot",
        "particles_add",
        {
            "minecraft:emitter_rate_instant": {"num_particles": COUNT},
            "minecraft:emitter_shape_sphere": {"radius": "variable.jjk_radius", "surface_only": True, "direction": "outwards"},
            "minecraft:particle_initial_speed": "variable.jjk_speed",
            "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 1.5},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "variable.jjk_life * (0.7 + variable.particle_random_1 * 0.3)"},
            "minecraft:particle_appearance_billboard": {
                "size": [f"variable.jjk_size0 * (1 - {T})", f"variable.jjk_size0 * (1 - {T})"],
                "facing_camera_mode": "lookat_xyz",
                "uv": UV,
            },
            "minecraft:particle_appearance_tinting": tint(FADE_OUT),
        },
    ),
    # One frame of the Blue/Red orb, re-spawned by the script every 2 ticks so it follows the palm.
    "blue_orb": effect("jjk:blue_orb", "blue_orb", "particles_blend", single("variable.jjk_size0", alpha="variable.jjk_a")),
    "red_orb": effect("jjk:red_orb", "red_orb", "particles_blend", single("variable.jjk_size0", alpha="variable.jjk_a")),
    "purple_orb": effect("jjk:purple_orb", "purple_orb", "particles_blend", single("variable.jjk_size0", alpha="variable.jjk_a")),
    # Unlimited Void "information overload": random glyphs (8x4 sheet) flickering over the head.
    "void_overload": {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": "jjk:void_overload",
                "basic_render_parameters": {"material": "particles_blend", "texture": "textures/jjk/domain/overload_sheet"},
            },
            "components": {
                "minecraft:emitter_lifetime_once": {"active_time": 0.05},
                "minecraft:emitter_rate_instant": {"num_particles": COUNT},
                "minecraft:emitter_shape_sphere": {"radius": "variable.jjk_radius", "surface_only": False, "direction": [0, 1, 0]},
                "minecraft:particle_initial_speed": "variable.jjk_speed",
                "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 2},
                "minecraft:particle_lifetime_expression": {"max_lifetime": "variable.jjk_life * (0.6 + variable.particle_random_3 * 0.4)"},
                "minecraft:particle_appearance_billboard": {
                    "size": ["variable.jjk_size0", "variable.jjk_size0"],
                    "facing_camera_mode": "lookat_xyz",
                    "uv": {
                        "texture_width": 256,
                        "texture_height": 256,
                        "uv": ["math.floor(variable.particle_random_1 * 8) * 32", "math.floor(variable.particle_random_2 * 4) * 32"],
                        "uv_size": [32, 32],
                    },
                },
                "minecraft:particle_appearance_tinting": tint(f"variable.jjk_a * (math.mod(math.floor(variable.particle_age * 12), 2) * 0.5 + 0.5)"),
            },
        },
    },
}


def main(out_dir=OUT):
    os.makedirs(out_dir, exist_ok=True)
    for name, data in EFFECTS.items():
        with open(os.path.join(out_dir, f"jjk_{name}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
    print(f"[particles] wrote {len(EFFECTS)} effects")


if __name__ == "__main__":
    main()
