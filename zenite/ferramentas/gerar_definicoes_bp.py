#!/usr/bin/env python3
"""Gera as definições do behavior pack do Zênite.

- items/*.json      astrolábio, códice, poeira, selo, coração, 7 sigilos, 4 armaduras
- blocks/firmamento.json
- entities/arconte.json  (chefe; IA extra vem dos scripts)
- recipes/*.json
- loot_tables/entities/arconte.json, loot_tables/vazio.json
"""
from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BP = RAIZ / "BP"
FV = "1.21.120"
TECNICAS = ["veu", "poco", "nova", "passo", "reversao", "horizonte", "abobada"]


def gravar(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def item(ident: str, componentes: dict, categoria: str = "equipment", grupo: str | None = None) -> None:
    menu = {"category": categoria}
    if grupo:
        menu["group"] = grupo
    comps = {
        "minecraft:icon": f"zenite_{ident}",
        "minecraft:display_name": {"value": f"item.zenite.{ident}.name"},
        **componentes,
    }
    gravar(BP / "items" / f"{ident}.json", {
        "format_version": FV,
        "minecraft:item": {"description": {"identifier": f"zenite:{ident}", "menu_category": menu}, "components": comps},
    })


def itens() -> None:
    unico = {"minecraft:max_stack_size": 1}
    item("astrolabio", {**unico, "minecraft:hand_equipped": True, "minecraft:glint": True})
    item("codice", {**unico, "minecraft:glint": True}, categoria="items")
    item("poeira_estelar", {"minecraft:max_stack_size": 64}, categoria="items")
    item("selo_eclipse", {"minecraft:max_stack_size": 16, "minecraft:glint": True}, categoria="items")
    item("coracao_firmamento", {**unico, "minecraft:glint": True}, categoria="items")
    for tec in TECNICAS:
        item(f"sigilo_{tec}", {**unico, "minecraft:hand_equipped": True})
    armaduras = {
        "diadema": ("slot.armor.head", 3, 500, "armor_head", "minecraft:itemGroup.name.helmet"),
        "manto": ("slot.armor.chest", 8, 720, "armor_torso", "minecraft:itemGroup.name.chestplate"),
        "perneiras": ("slot.armor.legs", 6, 680, "armor_legs", "minecraft:itemGroup.name.leggings"),
        "botas": ("slot.armor.feet", 3, 580, "armor_feet", "minecraft:itemGroup.name.boots"),
    }
    for peca, (slot, protecao, dur, ench, grupo) in armaduras.items():
        item(peca, {
            **unico,
            "minecraft:wearable": {"slot": slot, "protection": protecao},
            "minecraft:durability": {"max_durability": dur},
            "minecraft:repairable": {"repair_items": [{"items": ["zenite:poeira_estelar"], "repair_amount": dur // 4}]},
            "minecraft:enchantable": {"slot": ench, "value": 15},
            "minecraft:tags": {"tags": ["minecraft:is_armor"]},
        }, grupo=grupo)


def bloco() -> None:
    gravar(BP / "blocks" / "firmamento.json", {
        "format_version": FV,
        "minecraft:block": {
            "description": {"identifier": "zenite:firmamento", "menu_category": {"category": "none", "is_hidden_in_commands": False}},
            "components": {
                "minecraft:display_name": "tile.zenite:firmamento.name",
                "minecraft:destructible_by_mining": False,
                "minecraft:destructible_by_explosion": False,
                "minecraft:light_emission": 7,
                "minecraft:loot": "loot_tables/vazio.json",
                "minecraft:map_color": "#170a30",
                "minecraft:material_instances": {"*": {"texture": "zenite_firmamento", "render_method": "opaque"}},
            },
        },
    })


def entidade() -> None:
    gravar(BP / "entities" / "arconte.json", {
        "format_version": FV,
        "minecraft:entity": {
            "description": {
                "identifier": "zenite:arconte",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
                "properties": {
                    "zenite:estado": {"type": "int", "range": [0, 4], "default": 0, "client_sync": True},
                    "zenite:fase": {"type": "int", "range": [1, 3], "default": 1, "client_sync": True},
                },
            },
            "component_groups": {
                "zenite:furia": {
                    "minecraft:movement": {"value": 0.36},
                    "minecraft:attack": {"damage": 14},
                },
            },
            "components": {
                "minecraft:type_family": {"family": ["zenite_arconte", "monster", "mob"]},
                "minecraft:health": {"value": 500, "max": 500},
                "minecraft:boss": {"should_darken_sky": True, "hud_range": 64},
                "minecraft:collision_box": {"width": 0.9, "height": 2.7},
                "minecraft:movement": {"value": 0.28},
                "minecraft:navigation.walk": {"can_path_over_water": True, "avoid_water": True, "avoid_damage_blocks": True},
                "minecraft:movement.basic": {},
                "minecraft:jump.static": {},
                "minecraft:can_climb": {},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:knockback_resistance": {"value": 0.85},
                "minecraft:fire_immune": {},
                "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0, "breathes_water": True},
                "minecraft:damage_sensor": {"triggers": [
                    {"cause": "fall", "deals_damage": "no"},
                    {"cause": "suffocation", "deals_damage": "no"},
                    {"cause": "drowning", "deals_damage": "no"},
                    {"on_damage": {"filters": {"test": "is_family", "subject": "other", "value": "zenite_arconte"}}, "deals_damage": "no"},
                ]},
                "minecraft:attack": {"damage": 10},
                "minecraft:follow_range": {"value": 64, "max": 64},
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.melee_attack": {"priority": 2, "speed_multiplier": 1.15, "track_target": True, "reach_multiplier": 1.4},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 1, "must_see": False, "reselect_targets": True, "within_radius": 48,
                    "entity_types": [{"filters": {"test": "is_family", "subject": "other", "value": "player"}, "max_dist": 48}],
                },
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.8},
                "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 16},
                "minecraft:behavior.random_look_around": {"priority": 8},
                "minecraft:loot": {"table": "loot_tables/entities/arconte.json"},
                "minecraft:experience_reward": {"on_death": "500"},
                "minecraft:nameable": {},
                "minecraft:persistent": {},
                "minecraft:conditional_bandwidth_optimization": {},
            },
            "events": {"zenite:entrar_furia": {"add": {"component_groups": ["zenite:furia"]}}},
        },
    })


def receitas() -> None:
    def shaped(nome: str, padrao: list[str], chave: dict[str, str], resultado: str, qtd: int = 1, libera: str | None = None) -> None:
        gravar(BP / "recipes" / f"{nome}.json", {
            "format_version": "1.20.10",
            "minecraft:recipe_shaped": {
                "description": {"identifier": f"zenite:{nome}"},
                "tags": ["crafting_table"],
                "pattern": padrao,
                "key": {k: {"item": v} for k, v in chave.items()},
                "unlock": [{"item": libera or next(iter(chave.values()))}],
                "result": {"item": resultado, "count": qtd},
            },
        })

    gravar(BP / "recipes" / "poeira_estelar.json", {
        "format_version": "1.20.10",
        "minecraft:recipe_shapeless": {
            "description": {"identifier": "zenite:poeira_estelar"},
            "tags": ["crafting_table"],
            "ingredients": [{"item": "minecraft:amethyst_shard"}, {"item": "minecraft:glowstone_dust"}, {"item": "minecraft:lapis_lazuli"}],
            "unlock": [{"item": "minecraft:amethyst_shard"}],
            "result": {"item": "zenite:poeira_estelar", "count": 2},
        },
    })
    gravar(BP / "recipes" / "codice.json", {
        "format_version": "1.20.10",
        "minecraft:recipe_shapeless": {
            "description": {"identifier": "zenite:codice"},
            "tags": ["crafting_table"],
            "ingredients": [{"item": "minecraft:book"}, {"item": "zenite:poeira_estelar"}],
            "unlock": [{"item": "zenite:poeira_estelar"}],
            "result": {"item": "zenite:codice"},
        },
    })
    shaped("astrolabio", ["PDP", "GOG", "PDP"],
           {"P": "zenite:poeira_estelar", "D": "minecraft:diamond", "G": "minecraft:gold_ingot", "O": "minecraft:ender_eye"}, "zenite:astrolabio")
    shaped("selo_eclipse", ["CPC", "POP", "CPC"],
           {"C": "minecraft:crying_obsidian", "P": "zenite:poeira_estelar", "O": "minecraft:ender_eye"}, "zenite:selo_eclipse", libera="zenite:poeira_estelar")
    for peca, base in (("diadema", "minecraft:diamond_helmet"), ("manto", "minecraft:diamond_chestplate"),
                       ("perneiras", "minecraft:diamond_leggings"), ("botas", "minecraft:diamond_boots")):
        shaped(peca, ["PPP", "PXP", "PPP"], {"P": "zenite:poeira_estelar", "X": base}, f"zenite:{peca}", libera="zenite:poeira_estelar")


def loot() -> None:
    def contagem(nome: str, mn: int, mx: int) -> dict:
        return {"rolls": 1, "entries": [{"type": "item", "name": nome, "weight": 1, "functions": [{"function": "set_count", "count": {"min": mn, "max": mx}}]}]}

    gravar(BP / "loot_tables" / "entities" / "arconte.json", {"pools": [
        {"rolls": 1, "entries": [{"type": "item", "name": "zenite:coracao_firmamento", "weight": 1}]},
        contagem("minecraft:diamond", 4, 8),
        contagem("zenite:poeira_estelar", 6, 12),
        {"rolls": 1, "entries": [{"type": "item", "name": "minecraft:nether_star", "weight": 1}]},
    ]})
    gravar(BP / "loot_tables" / "vazio.json", {"pools": []})


if __name__ == "__main__":
    itens()
    bloco()
    entidade()
    receitas()
    loot()
    print("definições do BP geradas")
