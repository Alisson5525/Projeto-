#!/usr/bin/env python3
"""Gera as definições repetitivas do resource pack do Zênite.

- textures/item_texture.json, terrain_texture.json, flipbook_textures.json
- blocks.json
- attachables/*.json (armaduras: versão genérica para mobs + versão .player)
- particles/*.json (10 efeitos com cor e tamanho vindos do script)
- fogs/abobada.json
"""
from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "RP"

TECNICAS = ["veu", "poco", "nova", "passo", "reversao", "horizonte", "abobada"]
ITENS = ["astrolabio", "codice", "poeira_estelar", "selo_eclipse", "coracao_firmamento", "diadema", "manto", "perneiras", "botas"] + [f"sigilo_{t}" for t in TECNICAS]


def gravar(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def atlases() -> None:
    gravar(RP / "textures" / "item_texture.json", {
        "resource_pack_name": "zenite",
        "texture_name": "atlas.items",
        "texture_data": {f"zenite_{i}": {"textures": f"textures/items/zenite/{i}"} for i in ITENS},
    })
    gravar(RP / "textures" / "terrain_texture.json", {
        "resource_pack_name": "zenite",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": {"zenite_firmamento": {"textures": "textures/blocks/zenite/firmamento"}},
    })
    gravar(RP / "textures" / "flipbook_textures.json", [
        {"flipbook_texture": "textures/blocks/zenite/firmamento", "atlas_tile": "zenite_firmamento", "ticks_per_frame": 3, "blend_frames": True}
    ])
    gravar(RP / "blocks.json", {"format_version": [1, 1, 0], "zenite:firmamento": {"sound": "glass"}})


ARMADURAS = {
    # peça: (variável de camada, tipo vanilla, textura, geometria do jogador)
    "diadema": ("helmet_layer_visible", "helmet", "textures/models/armor/zenite_1", "geometry.zenite.diadema"),
    "manto": ("chest_layer_visible", "chestplate", "textures/models/armor/zenite_1", "geometry.player.armor.chestplate"),
    "perneiras": ("leg_layer_visible", "leggings", "textures/models/armor/zenite_2", "geometry.player.armor.leggings"),
    "botas": ("boot_layer_visible", "boots", "textures/models/armor/zenite_1", "geometry.player.armor.boots"),
}


def attachables() -> None:
    for peca, (var, tipo, tex, geo_jogador) in ARMADURAS.items():
        materiais = {"default": "armor", "enchanted": "armor_enchanted"}
        brilho = "textures/misc/enchanted_actor_glint"
        gravar(RP / "attachables" / f"{peca}.json", {
            "format_version": "1.10.0",
            "minecraft:attachable": {"description": {
                "identifier": f"zenite:{peca}",
                "materials": materiais,
                "textures": {"default": tex, "enchanted": brilho},
                "geometry": {"default": f"geometry.humanoid.armor.{tipo}"},
                "scripts": {"parent_setup": f"variable.{var} = 0.0;"},
                "render_controllers": ["controller.render.armor"],
            }},
        })
        animacoes = {"offset": f"animation.armor.{tipo}.offset"}
        animar = ["offset"]
        tex_jogador = tex
        if peca == "diadema":
            animacoes["aureola"] = "animation.zenite.diadema.aureola"
            animar.append("aureola")
            tex_jogador = "textures/models/armor/zenite_diadema"
        gravar(RP / "attachables" / f"{peca}.player.json", {
            "format_version": "1.10.0",
            "minecraft:attachable": {"description": {
                "identifier": f"zenite:{peca}.player",
                "item": {f"zenite:{peca}": "query.owner_identifier == 'minecraft:player'"},
                "materials": materiais,
                "textures": {"default": tex_jogador, "enchanted": brilho},
                "geometry": {"default": geo_jogador},
                "scripts": {"parent_setup": f"variable.{var} = 0.0;", "animate": animar},
                "animations": animacoes,
                "render_controllers": ["controller.render.armor"],
            }},
        })


# ------------------------------------------------------------------ partículas
CELULA = {"brilho": (0, 0), "estrela": (32, 0), "faisca": (64, 0), "anel": (96, 0), "hex": (0, 32), "runa": (32, 32),
          "fumaca": (64, 32), "onda": (96, 32), "estrela8": (0, 64), "rastro": (32, 64)}
T = "(variable.particle_age / variable.particle_lifetime)"
COR = ["variable.cor.r", "variable.cor.g", "variable.cor.b"]


def uv(celula: str) -> dict:
    return {"texture_width": 128, "texture_height": 128, "uv": list(CELULA[celula]), "uv_size": [32, 32]}


def particula(nome: str, componentes: dict) -> None:
    gravar(RP / "particles" / f"{nome}.json", {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": f"zenite:{nome}",
                "basic_render_parameters": {"material": "particles_blend", "texture": "textures/particle/zenite"},
            },
            "components": componentes,
        },
    })


def billboard(tamanho: str, celula: str, modo: str = "lookat_xyz", direcao: list | None = None) -> dict:
    b = {"size": [tamanho, tamanho], "facing_camera_mode": modo, "uv": uv(celula)}
    if direcao:
        b["direction"] = {"mode": "custom", "custom_direction": direcao}
    return b


def tinta(alfa: str) -> dict:
    return {"color": COR + [f"variable.cor.a * ({alfa})"]}


def particulas() -> None:
    instantaneo = lambda n: {"minecraft:emitter_rate_instant": {"num_particles": n}, "minecraft:emitter_lifetime_once": {"active_time": 0.05}}
    particula("brilho", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.12},
        "minecraft:particle_appearance_billboard": billboard("variable.tamanho", "brilho"),
        "minecraft:particle_appearance_tinting": tinta("1"),
    })
    particula("faisca", {
        **instantaneo(6),
        "minecraft:emitter_shape_sphere": {"radius": 0.1, "direction": "outwards"},
        "minecraft:particle_initial_speed": "2 + variable.particle_random_1 * 3",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -2, 0], "linear_drag_coefficient": 3},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "0.35 + variable.particle_random_2 * 0.4"},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * (1 - {T})", "faisca"),
        "minecraft:particle_appearance_tinting": tinta(f"1 - {T}"),
    })
    particula("estrela", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {"direction": [0, 1, 0]},
        "minecraft:particle_initial_speed": 0.3,
        "minecraft:particle_initial_spin": {"rotation": "variable.particle_random_1 * 360", "rotation_rate": 90},
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 1},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.7},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * math.sin({T} * 180)", "estrela"),
        "minecraft:particle_appearance_tinting": tinta("1"),
    })
    particula("anel", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.35},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * (0.2 + 0.8 * {T})", "anel"),
        "minecraft:particle_appearance_tinting": tinta(f"1 - {T}"),
    })
    particula("sugar", {
        **instantaneo(14),
        "minecraft:emitter_shape_sphere": {"radius": "variable.tamanho", "surface_only": True, "direction": "inwards"},
        "minecraft:particle_initial_speed": "variable.tamanho / 0.45",
        "minecraft:particle_motion_dynamic": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.45},
        "minecraft:particle_appearance_billboard": billboard(f"0.14 * (1 - 0.6 * {T})", "faisca"),
        "minecraft:particle_appearance_tinting": tinta(f"0.3 + 0.7 * {T}"),
    })
    particula("explosao", {
        **instantaneo(28),
        "minecraft:emitter_shape_sphere": {"radius": 0.3, "direction": "outwards"},
        "minecraft:particle_initial_speed": "variable.tamanho * (2 + variable.particle_random_1 * 3)",
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 2.5},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "0.5 + variable.particle_random_2 * 0.4"},
        "minecraft:particle_appearance_billboard": billboard(f"0.35 * (1 - {T})", "brilho"),
        "minecraft:particle_appearance_tinting": {"color": [
            f"math.lerp(1, variable.cor.r, math.min(1, {T} * 3))",
            f"math.lerp(1, variable.cor.g, math.min(1, {T} * 3))",
            f"math.lerp(1, variable.cor.b, math.min(1, {T} * 3))",
            f"variable.cor.a * (1 - {T})",
        ]},
    })
    particula("onda", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.6},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * (0.1 + 0.9 * math.sqrt({T}))", "onda", "direction_z", [0, 1, 0]),
        "minecraft:particle_appearance_tinting": tinta(f"1 - {T}"),
    })
    particula("rastro", {
        **instantaneo(1),
        "minecraft:emitter_shape_sphere": {"radius": 0.05, "direction": "outwards"},
        "minecraft:particle_initial_speed": 0.2,
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 2},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.5},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * (1 - {T})", "brilho"),
        "minecraft:particle_appearance_tinting": tinta(f"0.9 * (1 - {T})"),
    })
    particula("runa", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_initial_spin": {"rotation": 0, "rotation_rate": 60},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 1.2},
        "minecraft:particle_appearance_billboard": billboard("variable.tamanho", "runa", "direction_z", [0, 1, 0]),
        "minecraft:particle_appearance_tinting": tinta(f"math.sin({T} * 180)"),
    })
    particula("hex", {
        **instantaneo(1),
        "minecraft:emitter_shape_point": {},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.3},
        "minecraft:particle_appearance_billboard": billboard(f"variable.tamanho * (0.4 + 0.6 * {T})", "hex"),
        "minecraft:particle_appearance_tinting": tinta(f"1 - {T}"),
    })


def nevoa() -> None:
    ar = {"fog_start": 4.0, "fog_end": 38.0, "fog_color": "#170a30", "render_distance_type": "fixed"}
    gravar(RP / "fogs" / "abobada.json", {
        "format_version": "1.16.100",
        "minecraft:fog_settings": {
            "description": {"identifier": "zenite:abobada"},
            "distance": {"air": ar, "weather": dict(ar)},
        },
    })


if __name__ == "__main__":
    atlases()
    attachables()
    particulas()
    nevoa()
    print("definições do RP geradas")
