#!/usr/bin/env python3
"""Gera particulas, texturas de particulas, icones, textos, itens, receita,
manifestos e o player.json do pacote de comportamento."""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADDON = os.path.join(ROOT, "superman_addon")
RP = os.path.join(ADDON, "resource_pack")
BP = os.path.join(ADDON, "behavior_pack")
VANILLA = os.path.join(ROOT, "tools", "vanilla")

VERSION = [1, 0, 0]
MIN_ENGINE = [1, 26, 30]
UUID = {
    "rp_header": "6a2b4132-97da-4e69-a879-156ed10268a3",
    "rp_module": "238b8fd3-0fca-46cf-b004-02bc25cc505b",
    "bp_header": "ccab486f-f750-483c-b1b7-b5d997b6160f",
    "bp_data": "fed715b8-1991-40f9-b688-b700637057fb",
    "bp_script": "c9076e06-cd10-464f-9f75-184486dcaa70",
}


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Atlas de particulas 128x128 (celulas de 32x32)
# ---------------------------------------------------------------------------
CELL = {
    "glow": (0, 0), "ring": (32, 0), "crack": (64, 0), "puff": (96, 0),
    "streak": (0, 32), "chunk": (32, 32), "flake": (64, 32), "smoke": (96, 32),
    "thinring": (0, 64), "star": (32, 64), "ember": (64, 64), "spark": (96, 64),
}


def particle_atlas():
    W = 128
    img = np.zeros((W, W, 4))
    yy, xx = np.mgrid[0:32, 0:32]
    cx = cy = 15.5
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / 16.0
    rng = np.random.default_rng(7)

    def put(name, rgba):
        x, y = CELL[name]
        img[y:y + 32, x:x + 32] = np.clip(rgba, 0, 1)

    def white(alpha):
        a = np.clip(alpha, 0, 1)
        return np.dstack([np.ones_like(a), np.ones_like(a), np.ones_like(a), a])

    put("glow", white(np.clip(1 - r, 0, 1) ** 1.8))
    put("ring", white(np.exp(-((r - 0.78) / 0.09) ** 2) + 0.25 * np.exp(-((r - 0.6) / 0.12) ** 2)))
    put("thinring", white(np.exp(-((r - 0.85) / 0.05) ** 2)))
    # rachaduras: linhas irregulares a partir do centro
    crack = Image.new("L", (128, 128), 0)
    d = ImageDraw.Draw(crack)
    for i in range(11):
        a = i / 11 * math.tau + rng.uniform(-0.2, 0.2)
        x, y = 64.0, 64.0
        w = 7
        for _ in range(9):
            nx = x + math.cos(a) * rng.uniform(6, 9)
            ny = y + math.sin(a) * rng.uniform(6, 9)
            d.line((x, y, nx, ny), fill=255, width=max(1, int(w)))
            if rng.random() < 0.35:
                b = a + rng.uniform(-1, 1)
                d.line((nx, ny, nx + math.cos(b) * 10, ny + math.sin(b) * 10), fill=255, width=max(1, int(w * 0.6)))
            x, y, a, w = nx, ny, a + rng.uniform(-0.4, 0.4), w * 0.78
    d.ellipse((50, 50, 78, 78), fill=255)
    crack = np.asarray(crack.resize((32, 32), Image.LANCZOS)) / 255.0
    put("crack", np.dstack([np.full((32, 32), 0.12), np.full((32, 32), 0.1), np.full((32, 32), 0.09), crack * 0.92]))
    # nuvem/poeira
    n = rng.random((8, 8))
    n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((32, 32), Image.BICUBIC)) / 255.0
    puff = np.clip(1 - r, 0, 1) ** 1.2 * (0.6 + 0.6 * n)
    put("puff", white(np.clip(puff, 0, 1)))
    smoke = np.clip(1 - r * 1.05, 0, 1) ** 1.0 * (0.5 + 0.7 * n)
    put("smoke", np.dstack([np.full((32, 32), 0.75), np.full((32, 32), 0.75), np.full((32, 32), 0.75), np.clip(smoke, 0, 1)]))
    # risco (para lookat_direction): gradiente horizontal
    sx = np.abs(xx - cx) / 16
    sy = np.abs(yy - cy) / 16
    put("streak", white(np.clip(1 - sx, 0, 1) ** 0.8 * np.exp(-(sy / 0.18) ** 2)))
    # pedaco de bloco (detrito) com relevo
    chunk = np.ones((32, 32, 4))
    edge = np.minimum(np.minimum(xx, 31 - xx), np.minimum(yy, 31 - yy))
    shade = 0.75 + 0.25 * (1 - (xx + yy) / 62) + rng.normal(0, 0.06, (32, 32))
    shade = np.where(edge < 3, shade * 0.7, shade)
    chunk[..., 0] = chunk[..., 1] = chunk[..., 2] = np.clip(shade, 0, 1)
    chunk[..., 3] = (edge >= 1).astype(float)
    put("chunk", chunk)
    # floco de neve
    flake = Image.new("L", (128, 128), 0)
    d = ImageDraw.Draw(flake)
    for i in range(6):
        a = i / 6 * math.tau
        ex, ey = 64 + math.cos(a) * 56, 64 + math.sin(a) * 56
        d.line((64, 64, ex, ey), fill=255, width=9)
        for t in (0.45, 0.7):
            bx, by = 64 + math.cos(a) * 56 * t, 64 + math.sin(a) * 56 * t
            for s in (-1, 1):
                b = a + s * 0.7
                d.line((bx, by, bx + math.cos(b) * 18, by + math.sin(b) * 18), fill=255, width=7)
    flake = np.asarray(flake.resize((32, 32), Image.LANCZOS)) / 255.0
    put("flake", white(flake))
    # estrela de energia
    ang = np.arctan2(yy - cy, xx - cx)
    star = np.clip(1 - r, 0, 1) ** 2.5 + np.clip(1 - r, 0, 1) ** 1.2 * (np.abs(np.cos(ang * 2)) ** 18) * 0.9
    put("star", white(np.clip(star, 0, 1)))
    put("ember", white(np.clip(1 - r * 1.6, 0, 1) ** 1.3))
    put("spark", white(np.exp(-(sy / 0.12) ** 2) * np.clip(1 - sx, 0, 1)))
    out = Image.fromarray((img * 255 + 0.5).astype(np.uint8), "RGBA")
    os.makedirs(os.path.join(RP, "textures", "particle"), exist_ok=True)
    out.save(os.path.join(RP, "textures", "particle", "superman_particles.png"))


# ---------------------------------------------------------------------------
# Particulas
# ---------------------------------------------------------------------------
TEX = "textures/particle/superman_particles"


def uv(name):
    x, y = CELL[name]
    return {"texture_width": 128, "texture_height": 128, "uv": [x, y], "uv_size": [32, 32]}


def gradient(stops):
    return {"gradient": {f"{k:.2f}": v for k, v in stops}, "interpolant": "v.particle_age / v.particle_lifetime"}


def P(ident, material, comps):
    return {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": f"superman:{ident}",
                "basic_render_parameters": {"material": material, "texture": TEX},
            },
            "components": comps,
        },
    }


def billboard(size, cell, mode="lookat_xyz", direction=None):
    b = {"size": size, "facing_camera_mode": mode, "uv": uv(cell)}
    if direction:
        b["direction"] = direction
    return b


DIR = ["v.dir.x", "v.dir.y", "v.dir.z"]
CUSTOM_DIR = {"mode": "custom", "custom_direction": DIR}


def particles():
    E = {}
    once = lambda t=0.05: {"minecraft:emitter_lifetime_once": {"active_time": t}}
    life = lambda e: {"minecraft:particle_lifetime_expression": {"max_lifetime": e}}

    # --- ondas de choque e aneis
    E["shockwave"] = P("shockwave", "particles_blend", {
        "minecraft:emitter_initialization": {"creation_expression": "v.rad = (v.radius ?? 4.0);"},
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        **once(),
        "minecraft:emitter_shape_point": {},
        **life("0.65"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard(
            ["0.3 + v.rad * math.sqrt(v.particle_age / v.particle_lifetime)",
             "0.3 + v.rad * math.sqrt(v.particle_age / v.particle_lifetime)"], "ring", "emitter_transform_xz"),
        "minecraft:particle_appearance_tinting": {"color": ["v.color.r ?? 1.0", "v.color.g ?? 1.0", "v.color.b ?? 1.0",
                                                            "0.85 * (1.0 - v.particle_age / v.particle_lifetime)"]},
    })
    for name, dur, mult in (("sonic_boom", 0.45, 1.0), ("clap_wave", 0.6, 3.0)):
        E[name] = P(name, "particles_blend", {
            "minecraft:emitter_initialization": {"creation_expression": f"v.rad = (v.radius ?? 3.0) * {mult};"},
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            **once(),
            "minecraft:emitter_shape_point": {},
            **life(str(dur)),
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": billboard(
                ["0.3 + v.rad * math.sqrt(v.particle_age / v.particle_lifetime)",
                 "0.3 + v.rad * math.sqrt(v.particle_age / v.particle_lifetime)"], "thinring", "direction_z", CUSTOM_DIR),
            "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "0.9 * (1.0 - v.particle_age / v.particle_lifetime)"]},
        })
    E["ground_crack"] = P("ground_crack", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        **once(),
        "minecraft:emitter_shape_point": {},
        **life("6.0"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)"},
        "minecraft:particle_appearance_billboard": billboard(["(v.radius ?? 2.0)", "(v.radius ?? 2.0)"], "crack", "emitter_transform_xz"),
        "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "math.clamp((v.particle_lifetime - v.particle_age) / 1.5, 0.0, 1.0)"]},
        "minecraft:particle_appearance_lighting": {},
    })

    # --- poeira
    def dust(ident, num, speed, size, lt, radius_expr, color="0.62", gravity=-1.0):
        return P(ident, "particles_blend", {
            "minecraft:emitter_rate_instant": {"num_particles": num},
            **once(),
            "minecraft:emitter_shape_disc": {"radius": radius_expr, "plane_normal": [0, 1, 0], "surface_only": True, "direction": "outwards"},
            **life(lt),
            "minecraft:particle_initial_speed": speed,
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-60, 60)"},
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, gravity, 0], "linear_drag_coefficient": 2.5},
            "minecraft:particle_motion_collision": {"collision_radius": 0.1, "coefficient_of_restitution": 0.1, "collision_drag": 2},
            "minecraft:particle_appearance_billboard": billboard(
                [f"({size}) * (0.5 + v.particle_age / v.particle_lifetime)", f"({size}) * (0.5 + v.particle_age / v.particle_lifetime)"], "puff"),
            "minecraft:particle_appearance_tinting": {"color": [color, f"{color} * 0.93", f"{color} * 0.85",
                                                                "0.75 * (1.0 - v.particle_age / v.particle_lifetime)"]},
            "minecraft:particle_appearance_lighting": {},
        })
    E["dust_ring"] = dust("dust_ring", 36, "math.random(4, 7) * math.sqrt(v.radius ?? 3.0) * 0.6", "0.9 + v.particle_random_1 * 0.6",
                          "math.random(1.0, 1.8)", "(v.radius ?? 3.0) * 0.35")
    E["hover_dust"] = dust("hover_dust", 5, "math.random(2, 4)", "0.6 + v.particle_random_1 * 0.4", "math.random(0.6, 1.0)",
                           "(v.radius ?? 1.5) * 0.4", gravity=0.5)
    E["speed_dust"] = dust("speed_dust", 3, "math.random(0.5, 1.5)", "0.5 + v.particle_random_1 * 0.4", "math.random(0.4, 0.8)", "0.3",
                           gravity=0.8)
    E["charge_dust"] = P("charge_dust", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 6},
        **once(),
        "minecraft:emitter_shape_disc": {"radius": "(v.radius ?? 1.0)", "plane_normal": [0, 1, 0], "surface_only": True,
                                         "direction": ["math.random(-0.3, 0.3)", 1, "math.random(-0.3, 0.3)"]},
        **life("math.random(0.5, 0.9)"),
        "minecraft:particle_initial_speed": "math.random(1, 2.5)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.5, 0], "linear_drag_coefficient": 1.5},
        "minecraft:particle_appearance_billboard": billboard(["0.15 + v.particle_random_1 * 0.15", "0.15 + v.particle_random_1 * 0.15"], "chunk"),
        "minecraft:particle_appearance_tinting": {"color": [0.55, 0.5, 0.45, "1.0 - v.particle_age / v.particle_lifetime"]},
        "minecraft:particle_appearance_lighting": {},
    })

    # --- detritos
    def debris(ident, num, speed, size):
        return P(ident, "particles_alpha", {
            "minecraft:emitter_rate_instant": {"num_particles": num},
            **once(),
            "minecraft:emitter_shape_sphere": {"radius": 0.45, "direction": ["math.random(-1, 1)", "math.random(0.2, 1.4)", "math.random(-1, 1)"]},
            **life("math.random(1.4, 2.6)"),
            "minecraft:particle_initial_speed": speed,
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-400, 400)"},
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -19.6, 0], "linear_drag_coefficient": 0.4},
            "minecraft:particle_motion_collision": {"collision_radius": 0.08, "coefficient_of_restitution": 0.35, "collision_drag": 4},
            "minecraft:particle_appearance_billboard": billboard([size, size], "chunk"),
            "minecraft:particle_appearance_tinting": {"color": ["v.color.r ?? 0.5", "v.color.g ?? 0.5", "v.color.b ?? 0.5", 1]},
            "minecraft:particle_appearance_lighting": {},
        })
    E["debris"] = debris("debris", 6, "math.random(3, 7)", "0.07 + v.particle_random_1 * 0.12")
    E["debris_burst"] = debris("debris_burst", 22, "math.random(5, 13)", "0.08 + v.particle_random_1 * 0.16")

    # --- rastros de velocidade
    E["speed_trail"] = P("speed_trail", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 4},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.9, "direction": [0, 0, 0]},
        **life("math.random(0.18, 0.32)"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard(["0.9 + v.particle_random_1 * 0.8", 0.03], "streak", "lookat_direction", CUSTOM_DIR),
        "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "0.55 * (1.0 - v.particle_age / v.particle_lifetime)"]},
    })
    E["wind_trail"] = P("wind_trail", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 2},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.8, "direction": [0, 0, 0]},
        **life("math.random(0.2, 0.35)"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard(["0.5 + v.particle_random_1 * 0.5", 0.02], "streak", "lookat_direction", CUSTOM_DIR),
        "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "0.35 * (1.0 - v.particle_age / v.particle_lifetime)"]},
    })
    E["meteor_trail"] = P("meteor_trail", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 5},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.5, "direction": ["math.random(-1, 1)", 1, "math.random(-1, 1)"]},
        **life("math.random(0.3, 0.6)"),
        "minecraft:particle_initial_speed": "math.random(0.5, 2)",
        "minecraft:particle_appearance_billboard": billboard(["0.25 * (1.0 - v.particle_age / v.particle_lifetime) + 0.05",
                                                              "0.25 * (1.0 - v.particle_age / v.particle_lifetime) + 0.05"], "ember"),
        "minecraft:particle_appearance_tinting": gradient([(0, "#FFFFF0B0"), (0.3, "#FFFFA030"), (0.7, "#FFE03010"), (1, "#00601000")]),
    })

    # --- visao de calor
    E["heat_beam"] = P("heat_beam", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": "math.clamp((v.len ?? 8.0) * 4.0, 2, 220)"},
        **once(),
        "minecraft:emitter_shape_point": {},
        **life("0.1"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_motion_parametric": {"relative_position": [
            "v.dir.x * v.particle_random_1 * (v.len ?? 8.0) + (v.particle_random_2 - 0.5) * 0.04",
            "v.dir.y * v.particle_random_1 * (v.len ?? 8.0) + (v.particle_random_3 - 0.5) * 0.04",
            "v.dir.z * v.particle_random_1 * (v.len ?? 8.0) + (v.particle_random_4 - 0.5) * 0.04"]},
        "minecraft:particle_appearance_billboard": billboard(["0.09 + v.particle_random_2 * 0.06", "0.09 + v.particle_random_2 * 0.06"], "glow"),
        "minecraft:particle_appearance_tinting": {"color": ["1.0", "0.35 + v.particle_random_3 * 0.5", "0.15 + v.particle_random_4 * 0.2", 1.0]},
    })
    E["eye_glow"] = P("eye_glow", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        **once(),
        "minecraft:emitter_shape_point": {},
        **life("0.15"),
        "minecraft:particle_initial_speed": 0,
        "minecraft:particle_appearance_billboard": billboard([0.22, 0.22], "star"),
        "minecraft:particle_appearance_tinting": {"color": [1, 0.55, 0.3, 1]},
    })
    E["heat_impact"] = P("heat_impact", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 7},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.15, "direction": "outwards"},
        **life("math.random(0.25, 0.6)"),
        "minecraft:particle_initial_speed": "math.random(2, 6)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -12, 0], "linear_drag_coefficient": 1},
        "minecraft:particle_motion_collision": {"collision_radius": 0.05, "coefficient_of_restitution": 0.4, "collision_drag": 1},
        "minecraft:particle_appearance_billboard": billboard(["0.07 + v.particle_random_1 * 0.08", "0.07 + v.particle_random_1 * 0.08"], "ember"),
        "minecraft:particle_appearance_tinting": gradient([(0, "#FFFFF6C0"), (0.4, "#FFFF9A2A"), (1, "#00A01E00")]),
    })
    E["melt_burst"] = P("melt_burst", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 10},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.4, "direction": ["math.random(-0.4, 0.4)", 1, "math.random(-0.4, 0.4)"]},
        **life("math.random(0.8, 1.6)"),
        "minecraft:particle_initial_speed": "math.random(0.5, 1.6)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.2, 0], "linear_drag_coefficient": 1},
        "minecraft:particle_appearance_billboard": billboard(["0.3 + v.particle_age * 0.6", "0.3 + v.particle_age * 0.6"], "smoke"),
        "minecraft:particle_appearance_tinting": gradient([(0, "#C0FF8030"), (0.25, "#A0503830"), (1, "#00303030")]),
    })

    # --- sopro congelante
    E["frost_breath"] = P("frost_breath", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 14},
        **once(),
        "minecraft:emitter_shape_point": {"direction": [
            "v.dir.x + math.random(-0.22, 0.22)", "v.dir.y + math.random(-0.22, 0.22)", "v.dir.z + math.random(-0.22, 0.22)"]},
        **life("math.random(0.6, 1.0)"),
        "minecraft:particle_initial_speed": "math.random(10, 17)",
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-90, 90)"},
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -0.6, 0], "linear_drag_coefficient": 2.6},
        "minecraft:particle_motion_collision": {"collision_radius": 0.12, "coefficient_of_restitution": 0.05, "collision_drag": 6},
        "minecraft:particle_appearance_billboard": billboard(["0.08 + v.particle_age * 1.1", "0.08 + v.particle_age * 1.1"], "puff"),
        "minecraft:particle_appearance_tinting": gradient([(0, "#F0FFFFFF"), (0.5, "#B0C8ECFF"), (1, "#00A0D0FF")]),
    })
    E["frost_hit"] = P("frost_hit", "particles_alpha", {
        "minecraft:emitter_rate_instant": {"num_particles": 6},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.5, "direction": "outwards"},
        **life("math.random(0.8, 1.5)"),
        "minecraft:particle_initial_speed": "math.random(0.5, 2)",
        "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": "math.random(-120, 120)"},
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -2, 0], "linear_drag_coefficient": 2},
        "minecraft:particle_appearance_billboard": billboard(["0.12 + v.particle_random_1 * 0.08", "0.12 + v.particle_random_1 * 0.08"], "flake"),
        "minecraft:particle_appearance_tinting": {"color": [0.85, 0.95, 1, 1]},
    })
    E["inhale"] = P("inhale", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": 5},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 1.6, "surface_only": True, "direction": "inwards"},
        **life("0.4"),
        "minecraft:particle_initial_speed": 4,
        "minecraft:particle_appearance_billboard": billboard([0.1, 0.1], "puff"),
        "minecraft:particle_appearance_tinting": {"color": [0.85, 0.93, 1, "0.6 * v.particle_age / v.particle_lifetime"]},
    })

    # --- soco, palma, transformacao
    E["charge_energy"] = P("charge_energy", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": "3 + (v.power ?? 0.5) * 6"},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": "0.6 + (v.power ?? 0.5) * 0.5", "surface_only": True, "direction": "inwards"},
        **life("0.3"),
        "minecraft:particle_initial_speed": "2.5 + (v.power ?? 0.5) * 2",
        "minecraft:particle_appearance_billboard": billboard(["0.05 + (v.power ?? 0.5) * 0.08", "0.05 + (v.power ?? 0.5) * 0.08"], "star"),
        "minecraft:particle_appearance_tinting": gradient([(0, "#00FFFFFF"), (0.5, "#FFFFE58A"), (1, "#FFFFB040")]),
    })
    E["punch_impact"] = P("punch_impact", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 12},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.2, "direction": "outwards"},
        **life("math.random(0.12, 0.25)"),
        "minecraft:particle_initial_speed": "math.random(6, 12)",
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 4},
        "minecraft:particle_appearance_billboard": billboard([0.45, 0.04], "spark", "lookat_direction", {"mode": "derive_from_velocity"}),
        "minecraft:particle_appearance_tinting": {"color": [1, 0.95, 0.8, 1]},
    })
    E["punch_wave"] = P("punch_wave", "particles_blend", {
        "minecraft:emitter_rate_instant": {"num_particles": "10 + (v.power ?? 0.5) * 20"},
        **once(),
        "minecraft:emitter_shape_point": {"direction": [
            "v.dir.x + math.random(-0.3, 0.3)", "v.dir.y + math.random(-0.3, 0.3)", "v.dir.z + math.random(-0.3, 0.3)"]},
        **life("math.random(0.3, 0.6)"),
        "minecraft:particle_initial_speed": "math.random(8, 16) * (0.6 + (v.power ?? 0.5))",
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 3.5},
        "minecraft:particle_appearance_billboard": billboard(["0.25 + v.particle_age * 2", "0.25 + v.particle_age * 2"], "puff"),
        "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "0.5 * (1.0 - v.particle_age / v.particle_lifetime)"]},
    })
    E["transform_gather"] = P("transform_gather", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 10},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 2.4, "surface_only": True, "direction": "inwards"},
        **life("0.55"),
        "minecraft:particle_initial_speed": 4.3,
        "minecraft:particle_appearance_billboard": billboard([0.12, 0.12], "star"),
        "minecraft:particle_appearance_tinting": {"color": [
            "v.particle_random_1 < 0.4 ? 0.3 : (v.particle_random_1 < 0.75 ? 1.0 : 1.0)",
            "v.particle_random_1 < 0.4 ? 0.55 : (v.particle_random_1 < 0.75 ? 0.2 : 0.85)",
            "v.particle_random_1 < 0.4 ? 1.0 : (v.particle_random_1 < 0.75 ? 0.15 : 0.2)", 1]},
    })
    E["transform_burst"] = P("transform_burst", "particles_add", {
        "minecraft:emitter_rate_instant": {"num_particles": 60},
        **once(),
        "minecraft:emitter_shape_sphere": {"radius": 0.4, "direction": "outwards"},
        **life("math.random(0.5, 1.2)"),
        "minecraft:particle_initial_speed": "math.random(4, 11)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -3, 0], "linear_drag_coefficient": 2.2},
        "minecraft:particle_appearance_billboard": billboard(["0.18 * (1.0 - v.particle_age / v.particle_lifetime) + 0.04",
                                                             "0.18 * (1.0 - v.particle_age / v.particle_lifetime) + 0.04"], "star"),
        "minecraft:particle_appearance_tinting": {"color": [
            "v.particle_random_1 < 0.4 ? 0.3 : 1.0",
            "v.particle_random_1 < 0.4 ? 0.55 : (v.particle_random_1 < 0.75 ? 0.2 : 0.85)",
            "v.particle_random_1 < 0.4 ? 1.0 : 0.2", "1.0 - v.particle_age / v.particle_lifetime"]},
    })

    out_dir = os.path.join(RP, "particles")
    os.makedirs(out_dir, exist_ok=True)
    for name, data in E.items():
        write_json(os.path.join(out_dir, f"{name}.json"), data)
    return sorted(E)


# ---------------------------------------------------------------------------
# Icones (32x32) e icones dos pacotes
# ---------------------------------------------------------------------------
def rgba(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


SHIELD = [(0.13, 0.03), (0.87, 0.03), (0.995, 0.30), (0.5, 0.985), (0.005, 0.30)]


def s_path(w, h, x0=0, y0=0):
    import gen_model as gm  # reaproveita o mesmo desenho do S
    sp = []
    sp += gm.bezier((x0 + 0.80 * w, y0 + 0.17 * h), (x0 + 0.55 * w, y0 + 0.10 * h), (x0 + 0.20 * w, y0 + 0.14 * h), (x0 + 0.24 * w, y0 + 0.32 * h))
    sp += gm.bezier((x0 + 0.24 * w, y0 + 0.32 * h), (x0 + 0.28 * w, y0 + 0.48 * h), (x0 + 0.74 * w, y0 + 0.40 * h), (x0 + 0.70 * w, y0 + 0.58 * h))[1:]
    sp += gm.bezier((x0 + 0.70 * w, y0 + 0.58 * h), (x0 + 0.67 * w, y0 + 0.72 * h), (x0 + 0.42 * w, y0 + 0.76 * h), (x0 + 0.30 * w, y0 + 0.62 * h))[1:]
    return gm.stroke_polygon(sp, 0.085 * w, 0.17 * w)


def draw_shield(d, x0, y0, w, h, field="#f8cc2c", border="#c8162a", s_col="#c8162a", outline="#4e0610"):
    P_ = [(x0 + x * w, y0 + y * h) for x, y in SHIELD]
    d.polygon(P_, fill=rgba(outline))
    cx, cy = x0 + w / 2, y0 + h * 0.44

    def shrink(k):
        return [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in P_]
    d.polygon(shrink(0.92), fill=rgba(border))
    d.polygon(shrink(0.78), fill=rgba(field))
    d.polygon(s_path(w, h, x0, y0), fill=rgba(s_col))


def icon(name, draw_fn, size=32, ss=8):
    W = size * ss
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_fn(d, W)
    img = img.resize((size, size), Image.LANCZOS)
    # contorno escuro de 1px (estilo de icone do Minecraft)
    a = np.asarray(img)[..., 3] > 100
    edge = np.zeros_like(a)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(np.roll(a, dy, 0), dx, 1)
    edge &= ~a
    arr = np.asarray(img).copy()
    arr[edge] = [20, 14, 24, 255]
    arr[..., 3] = np.where(arr[..., 3] > 100, 255, np.where(edge, 255, 0))
    out = os.path.join(RP, "textures", "items", "superman")
    os.makedirs(out, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(os.path.join(out, f"{name}.png"))


def icons():
    icon("emblema", lambda d, W: draw_shield(d, W * 0.06, W * 0.1, W * 0.88, W * 0.8))

    def voo(d, W):
        # capa vermelha ondulando com linhas de velocidade
        pts = [(W * 0.3, W * 0.12), (W * 0.62, W * 0.12)]
        for i in range(9):
            t = i / 8
            pts.append((W * (0.62 + 0.25 * t + 0.05 * math.sin(t * 9)), W * (0.12 + 0.75 * t)))
        for i in range(9):
            t = 1 - i / 8
            pts.append((W * (0.18 + 0.2 * t + 0.05 * math.sin(t * 9 + 1)), W * (0.12 + 0.78 * t)))
        d.polygon(pts, fill=rgba("c8162a"))
        d.polygon([(W * 0.35, W * 0.2), (W * 0.55, W * 0.2), (W * 0.62, W * 0.7), (W * 0.42, W * 0.75)], fill=rgba("ee4a4e"))
        draw_shield(d, W * 0.36, W * 0.36, W * 0.26, W * 0.24, field="#f8cc2c", border="#f8cc2c", s_col="#c8162a", outline="#c08a10")
        for y in (0.3, 0.5, 0.7):
            d.line((W * 0.02, W * y, W * 0.16, W * y), fill=rgba("dfe9ff"), width=int(W * 0.05))

    def calor(d, W):
        for x in (0.3, 0.7):
            d.ellipse((W * (x - 0.17), W * 0.2, W * (x + 0.17), W * 0.42), fill=rgba("ffffff"))
            d.ellipse((W * (x - 0.09), W * 0.24, W * (x + 0.09), W * 0.4), fill=rgba("ff3010"))
            d.ellipse((W * (x - 0.04), W * 0.28, W * (x + 0.04), W * 0.36), fill=rgba("fff4a0"))
            d.polygon([(W * (x - 0.06), W * 0.38), (W * (x + 0.06), W * 0.38), (W * (x + 0.2), W * 0.98), (W * (x - 0.02), W * 0.98)],
                      fill=rgba("ff5020"))
            d.polygon([(W * (x - 0.02), W * 0.38), (W * (x + 0.02), W * 0.38), (W * (x + 0.1), W * 0.98), (W * (x + 0.04), W * 0.98)],
                      fill=rgba("ffe070"))
        d.line((W * 0.13, W * 0.17, W * 0.45, W * 0.2), fill=rgba("12141e"), width=int(W * 0.07))
        d.line((W * 0.55, W * 0.2, W * 0.87, W * 0.17), fill=rgba("12141e"), width=int(W * 0.07))

    def sopro(d, W):
        c = W * 0.5
        for i in range(6):
            a = i / 6 * math.tau
            d.line((c, c, c + math.cos(a) * W * 0.42, c + math.sin(a) * W * 0.42), fill=rgba("bfe6ff"), width=int(W * 0.08))
            for t in (0.5, 0.75):
                bx, by = c + math.cos(a) * W * 0.42 * t, c + math.sin(a) * W * 0.42 * t
                for s in (-1, 1):
                    b = a + s * 0.75
                    d.line((bx, by, bx + math.cos(b) * W * 0.13, by + math.sin(b) * W * 0.13), fill=rgba("e8f6ff"), width=int(W * 0.05))
        d.ellipse((c - W * 0.08, c - W * 0.08, c + W * 0.08, c + W * 0.08), fill=rgba("ffffff"))

    def soco(d, W):
        # estrela de impacto + punho
        star = []
        for i in range(16):
            a = i / 16 * math.tau
            r = 0.47 if i % 2 == 0 else 0.3
            star.append((W * 0.5 + math.cos(a) * W * r, W * 0.5 + math.sin(a) * W * r))
        d.polygon(star, fill=rgba("f8cc2c"))
        d.rounded_rectangle((W * 0.24, W * 0.3, W * 0.76, W * 0.72), radius=W * 0.08, fill=rgba("efbf96"))
        for i in range(4):
            x = W * (0.27 + i * 0.12)
            d.rounded_rectangle((x, W * 0.26, x + W * 0.11, W * 0.44), radius=W * 0.04, fill=rgba("f3caa4"))
            d.line((x + W * 0.11, W * 0.3, x + W * 0.11, W * 0.44), fill=rgba("c98b64"), width=int(W * 0.015))
        d.rounded_rectangle((W * 0.18, W * 0.46, W * 0.36, W * 0.62), radius=W * 0.05, fill=rgba("f3caa4"))
        d.rectangle((W * 0.3, W * 0.72, W * 0.7, W * 0.96), fill=rgba("2350be"))
        d.rectangle((W * 0.3, W * 0.72, W * 0.7, W * 0.77), fill=rgba("142c78"))

    def impacto(d, W):
        d.rectangle((0, W * 0.72, W, W), fill=rgba("6b5a48"))
        d.rectangle((0, W * 0.72, W, W * 0.78), fill=rgba("5f9b3f"))
        for a in (-60, -30, 0, 30, 60, 90, 120, 150, 180, 210):
            r = math.radians(a)
            d.line((W * 0.5, W * 0.74, W * 0.5 + math.cos(r) * W * 0.5, W * 0.74 + math.sin(r) * W * 0.2),
                   fill=rgba("2a2018"), width=int(W * 0.03))
        d.arc((W * 0.05, W * 0.38, W * 0.95, W * 1.08), 190, 350, fill=rgba("ffffff"), width=int(W * 0.06))
        d.arc((W * 0.2, W * 0.5, W * 0.8, W * 0.98), 190, 350, fill=rgba("dfe9ff"), width=int(W * 0.05))
        d.rounded_rectangle((W * 0.36, W * 0.1, W * 0.64, W * 0.5), radius=W * 0.07, fill=rgba("efbf96"))
        d.rectangle((W * 0.38, 0, W * 0.62, W * 0.12), fill=rgba("2350be"))
        for i in range(3):
            y = W * (0.22 + i * 0.09)
            d.line((W * 0.38, y, W * 0.62, y), fill=rgba("c98b64"), width=int(W * 0.02))

    icon("voo", voo)
    icon("visao_calor", calor)
    icon("sopro_congelante", sopro)
    icon("super_soco", soco)
    icon("impacto", impacto)


def pack_icon(path, bg_top, bg_bot, subtitle_bar):
    W = 256
    img = Image.new("RGBA", (W, W))
    d = ImageDraw.Draw(img)
    top, bot = np.array(rgba(bg_top)[:3]), np.array(rgba(bg_bot)[:3])
    for y in range(W):
        t = y / (W - 1)
        d.line((0, y, W, y), fill=tuple(int(c) for c in top * (1 - t) + bot * t) + (255,))
    # raios de luz
    for i in range(12):
        a = i / 12 * math.tau
        d.polygon([(W / 2, W / 2), (W / 2 + math.cos(a - 0.08) * W, W / 2 + math.sin(a - 0.08) * W),
                   (W / 2 + math.cos(a + 0.08) * W, W / 2 + math.sin(a + 0.08) * W)], fill=(255, 255, 255, 28))
    big = Image.new("RGBA", (W * 4, W * 4), (0, 0, 0, 0))
    draw_shield(ImageDraw.Draw(big), W * 4 * 0.14, W * 4 * 0.12, W * 4 * 0.72, W * 4 * 0.66)
    big = big.resize((W, W), Image.LANCZOS)
    shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 140), (6, 8), big)
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, shadow)
    img = Image.alpha_composite(img, big)
    d = ImageDraw.Draw(img)
    d.rectangle((0, W - 34, W, W), fill=rgba(subtitle_bar, 230))
    img.save(path)


# ---------------------------------------------------------------------------
# Textos
# ---------------------------------------------------------------------------
ITEMS = {
    "emblema": ("Emblema do Superman", "Superman Emblem"),
    "voo": ("Poder: Voo", "Power: Flight"),
    "visao_calor": ("Poder: Visão de Calor", "Power: Heat Vision"),
    "sopro_congelante": ("Poder: Sopro Congelante", "Power: Freeze Breath"),
    "super_soco": ("Poder: Super Soco", "Power: Super Punch"),
    "impacto": ("Poder: Impacto", "Power: Impact"),
}


def texts():
    d = os.path.join(RP, "texts")
    os.makedirs(d, exist_ok=True)
    write_json(os.path.join(d, "languages.json"), ["pt_BR", "pt_PT", "en_US"])
    for lang, idx in (("pt_BR", 0), ("pt_PT", 0), ("en_US", 1)):
        lines = [f"item.superman:{k}.name={v[idx]}" for k, v in ITEMS.items()]
        lines.append("pack.name=Superman Add-on")
        lines.append("pack.description=" + ("Voo, visão de calor, sopro congelante, super força e destruição do cenário"
                                            if idx == 0 else "Flight, heat vision, freeze breath, super strength and scenery destruction"))
        with open(os.path.join(d, f"{lang}.lang"), "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    bd = os.path.join(BP, "texts")
    os.makedirs(bd, exist_ok=True)
    write_json(os.path.join(bd, "languages.json"), ["pt_BR", "pt_PT", "en_US"])
    for lang, idx in (("pt_BR", 0), ("pt_PT", 0), ("en_US", 1)):
        with open(os.path.join(bd, f"{lang}.lang"), "w", encoding="utf-8") as f:
            f.write("pack.name=Superman Add-on (Comportamento)\n")
            f.write("pack.description=" + ("Scripts de voo, poderes e destruição" if idx == 0 else "Flight, powers and destruction scripts") + "\n")


# ---------------------------------------------------------------------------
# Itens, receita, entidade do jogador (BP), manifestos
# ---------------------------------------------------------------------------
def items():
    tex = {}
    for k in ITEMS:
        ident = f"superman:{k}"
        comps = {
            "minecraft:icon": f"superman_{k}",
            "minecraft:display_name": {"value": f"item.superman:{k}.name"},
            "minecraft:max_stack_size": 1,
            "minecraft:allow_off_hand": False,
            "minecraft:hand_equipped": False,
        }
        if k == "emblema":
            comps["minecraft:glint"] = True
            comps["minecraft:rarity"] = "epic"
        else:
            comps["minecraft:rarity"] = "rare"
        write_json(os.path.join(BP, "items", f"{k}.json"), {
            "format_version": "1.21.60",
            "minecraft:item": {
                "description": {"identifier": ident, "menu_category": {"category": "equipment"}},
                "components": comps,
            },
        })
        tex[f"superman_{k}"] = {"textures": f"textures/items/superman/{k}"}
    write_json(os.path.join(RP, "textures", "item_texture.json"),
               {"resource_pack_name": "superman", "texture_name": "atlas.items", "texture_data": tex})
    write_json(os.path.join(BP, "recipes", "emblema.json"), {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": "superman:emblema_receita"},
            "tags": ["crafting_table"],
            "pattern": ["RGR", "GDG", " R "],
            "key": {"R": {"item": "minecraft:redstone"}, "G": {"item": "minecraft:gold_ingot"}, "D": {"item": "minecraft:diamond"}},
            "unlock": {"context": "AlwaysUnlocked"},
            "result": {"item": "superman:emblema"},
        },
    })


def bp_player():
    with open(os.path.join(VANILLA, "player.json")) as f:
        ent = json.load(f)
    ent["minecraft:entity"]["description"]["properties"] = {
        "superman:on": {"type": "bool", "default": False, "client_sync": True},
        "superman:fly": {"type": "int", "range": [0, 11], "default": 0, "client_sync": True},
        "superman:power": {"type": "int", "range": [0, 11], "default": 0, "client_sync": True},
        "superman:charge": {"type": "float", "range": [0.0, 1.0], "default": 0.0, "client_sync": True},
        "superman:input": {"type": "int", "range": [0, 8], "default": 4, "client_sync": True},
    }
    write_json(os.path.join(BP, "entities", "player.json"), ent)


def manifests():
    write_json(os.path.join(RP, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": "pack.name", "description": "pack.description",
            "uuid": UUID["rp_header"], "version": VERSION, "min_engine_version": MIN_ENGINE,
        },
        "modules": [{"type": "resources", "uuid": UUID["rp_module"], "version": VERSION}],
        "dependencies": [{"uuid": UUID["bp_header"], "version": VERSION}],
    })
    write_json(os.path.join(BP, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": "pack.name", "description": "pack.description",
            "uuid": UUID["bp_header"], "version": VERSION, "min_engine_version": MIN_ENGINE,
        },
        "modules": [
            {"type": "data", "uuid": UUID["bp_data"], "version": VERSION},
            {"type": "script", "language": "javascript", "uuid": UUID["bp_script"], "version": VERSION,
             "entry": "scripts/main.js"},
        ],
        "dependencies": [
            {"uuid": UUID["rp_header"], "version": VERSION},
            {"module_name": "@minecraft/server", "version": "2.0.0"},
            {"module_name": "@minecraft/server-ui", "version": "2.0.0"},
        ],
    })


def main():
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    particle_atlas()
    names = particles()
    icons()
    pack_icon(os.path.join(RP, "pack_icon.png"), "2a5ad6", "0c1c52", "c8162a")
    pack_icon(os.path.join(BP, "pack_icon.png"), "c8162a", "4e0610", "2350be")
    texts()
    items()
    bp_player()
    manifests()
    print(f"{len(names)} particulas, 6 itens, manifestos e textos gerados")


if __name__ == "__main__":
    main()
