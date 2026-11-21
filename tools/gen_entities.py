"""Generate the Vampire Craft mob behaviours (BP/entities).

The v4 files had broken filters ("other_with_families" is not a real filter),
mobs that spawned without movement components 5% of the time, a projectile
that did not exist, werewolves that burned in daylight, etc. These are rebuilt
from a single clean template so every mob behaves consistently.

usage: python3 gen_entities.py <behavior_pack dir>
"""
import json, os, sys

BP = sys.argv[1]
FMT = "1.21.0"


def fam(f, op="=="):
    return {"test": "is_family", "subject": "other", "operator": op, "value": f}


def tag(t, op="=="):
    return {"test": "has_tag", "subject": "other", "operator": op, "value": t}


def skins(n, mark=False):
    groups = {}
    for i in range(n):
        g = {"minecraft:variant": {"value": i}}
        if mark:
            g["minecraft:mark_variant"] = {"value": i}
        groups[f"minecraft:skin{i + 1}"] = g
    return groups


def skin_randomize(n):
    return {"randomize": [{"weight": 1, "add": {"component_groups": [f"minecraft:skin{i + 1}"]}} for i in range(n)]}


def humanoid_base(families, health, speed, attack, loot, follow=32):
    return {
        "minecraft:type_family": {"family": families},
        "minecraft:health": {"value": health, "max": health},
        "minecraft:attack": {"damage": attack},
        "minecraft:collision_box": {"width": 0.6, "height": 1.9},
        "minecraft:movement": {"value": speed},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": True, "can_pass_doors": True, "can_open_doors": True, "avoid_water": True},
        "minecraft:annotation.open_door": {},
        "minecraft:jump.static": {},
        "minecraft:can_climb": {},
        "minecraft:physics": {},
        "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:nameable": {},
        "minecraft:follow_range": {"value": follow, "max": follow},
        "minecraft:loot": {"table": loot},
        "minecraft:conditional_bandwidth_optimization": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 8, "probability": 0.02},
        "minecraft:behavior.random_look_around": {"priority": 9},
    }


def melee(priority=3, speed=1.15):
    return {"minecraft:behavior.melee_box_attack": {"priority": priority, "speed_multiplier": speed, "track_target": True}}


def targets(entries, priority=2, must_see=True):
    return {"minecraft:behavior.nearest_attackable_target": {"priority": priority, "must_see": must_see, "reselect_targets": True, "within_radius": 24, "entity_types": entries}}


def despawn_monster():
    return {"minecraft:despawn": {"despawn_from_distance": {}}}


def entity(identifier, groups, components, events, spawnable=True):
    return {
        "format_version": FMT,
        "minecraft:entity": {
            "description": {"identifier": identifier, "is_spawnable": spawnable, "is_summonable": True},
            "component_groups": groups,
            "components": components,
            "events": events,
        },
    }


def save(name, data):
    path = os.path.join(BP, "entities", f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("wrote", path)


# Target lists ------------------------------------------------------------------
NOT_VAMPIRE_PLAYER = {"all_of": [fam("player"), tag("vampiro", "!="), tag("vc_undetectable", "!=")]}
NOT_WOLF_PLAYER = {"all_of": [fam("player"), tag("lobisomem", "!=")]}
SUPERNATURAL_PLAYER = {"all_of": [fam("player"), {"any_of": [tag("vampiro"), tag("lobisomem")]}]}


def vampire_targets():
    return [
        {"filters": NOT_VAMPIRE_PLAYER, "max_dist": 24},
        {"filters": {"any_of": [fam("villager"), fam("wandering_trader"), fam("humano")]}, "max_dist": 20},
        {"filters": fam("lobisomem"), "max_dist": 16},
    ]


def wolf_targets():
    return [
        {"filters": NOT_WOLF_PLAYER, "max_dist": 24},
        {"filters": {"any_of": [fam("villager"), fam("humano"), fam("vampiro"), fam("sheep"), fam("pig")]}, "max_dist": 18},
    ]


# ---------------------------------------------------------------------------
# Vampires — burn in daylight, avoid the sun and escape as a bat when wounded
# ---------------------------------------------------------------------------
def vampire(identifier, health, attack, speed, loot, bat_escape):
    comps = humanoid_base(["vampiro", "undead", "monster", "supernatural"], health, speed, attack, loot)
    comps.update(despawn_monster())
    comps.update({
        "minecraft:burns_in_daylight": {},
        "minecraft:behavior.flee_sun": {"priority": 2, "speed_multiplier": 1.2},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 12 : 0"},
        "minecraft:equip_item": {},
        "minecraft:shareables": {"items": []},
    })
    # Combat lives in the base components so mobs saved inside structures
    # (with old component-group lists) still fight.
    comps.update(melee(3, 1.25))
    comps.update(targets(vampire_targets()))
    comps["minecraft:behavior.leap_at_target"] = {"priority": 4, "yd": 0.35, "must_be_on_ground": True}
    groups = skins(4, mark=True)
    events = {
        "minecraft:entity_spawned": {"sequence": [skin_randomize(4)]},
    }
    if bat_escape:
        comps["minecraft:environment_sensor"] = {"triggers": [{
            "filters": {"all_of": [{"test": "actor_health", "subject": "self", "operator": "<=", "value": int(health * 0.3)},
                                   {"test": "has_component", "subject": "self", "operator": "!=", "value": "minecraft:can_fly"},
                                   {"test": "has_tag", "subject": "self", "operator": "!=", "value": "vc_bat_used"}]},
            "event": "sunrise:to_bat"}]}
        groups["vc:bat"] = {
            "minecraft:variant": {"value": 4},
            "minecraft:collision_box": {"width": 0.5, "height": 0.9},
            "minecraft:can_fly": {},
            "minecraft:flying_speed": {"value": 0.35},
            "minecraft:movement": {"value": 0.35},
            "minecraft:navigation.hover": {"can_path_over_water": True, "can_sink": False, "can_pass_doors": True, "avoid_water": True},
            "minecraft:movement.hover": {},
            "minecraft:physics": {"has_gravity": False},
            "minecraft:behavior.random_hover": {"priority": 4, "xz_dist": 10, "y_dist": 6, "y_offset": -1, "interval": 1, "hover_height": [2, 6]},
            "minecraft:behavior.melee_box_attack": {"priority": 9, "speed_multiplier": 0.1},
            "minecraft:behavior.avoid_mob_type": {"priority": 1, "entity_types": [{"filters": fam("player"), "max_dist": 16, "walk_speed_multiplier": 1.6, "sprint_speed_multiplier": 1.8}]},
            "minecraft:spell_effects": {"add_effects": [{"effect": "regeneration", "duration": 8, "amplifier": 2, "display_on_screen_animation": False}]},
            "minecraft:timer": {"looping": False, "time": 8, "time_down_event": {"event": "sunrise:from_bat"}},
        }
        events["sunrise:to_bat"] = {"sequence": [
            {"add": {"component_groups": ["vc:bat"]}},
        ]}
        restore = [{"filters": {"test": "is_mark_variant", "value": i}, "add": {"component_groups": [f"minecraft:skin{i + 1}"]}} for i in range(4)]
        events["sunrise:from_bat"] = {"sequence": [
            {"remove": {"component_groups": ["vc:bat"]}},
            *restore,
        ]}
    return entity(identifier, groups, comps, events)


save("vampire", vampire("sunrise:vampire", 50, 7, 0.3, "loot_tables/entities/vampire.json", True))
save("weak_vampire", vampire("sunrise:weak_vampire", 26, 4, 0.28, "loot_tables/entities/weak_vampire.json", False))


# ---------------------------------------------------------------------------
# Werewolves — night predators; vanish at dawn when far from players
# ---------------------------------------------------------------------------
def werewolf(identifier, health, attack, speed, loot, kb_resist, scale):
    comps = humanoid_base(["lobisomem", "monster", "supernatural"], health, speed, attack, loot, 40)
    comps.update({
        "minecraft:despawn": {"filters": {"test": "is_daytime", "value": True}, "despawn_from_distance": {"min_distance": 24, "max_distance": 64}},
        "minecraft:knockback_resistance": {"value": kb_resist},
        "minecraft:scale": {"value": scale},
        "minecraft:collision_box": {"width": 0.8, "height": 2.2 * scale},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 15 : 0"},
        "minecraft:behavior.leap_at_target": {"priority": 3, "yd": 0.45, "must_be_on_ground": True},
    })
    comps.update(melee(4, 1.35))
    comps.update(targets(wolf_targets()))
    groups = skins(4)
    events = {"minecraft:entity_spawned": {"sequence": [skin_randomize(4)]}}
    return entity(identifier, groups, comps, events)


save("weak_werewolf", werewolf("sunrise:weak_werewolf", 30, 5, 0.31, "loot_tables/entities/weak_werewolf.json", 0.1, 0.9))
save("werewolf", werewolf("sunrise:werewolf", 50, 8, 0.33, "loot_tables/entities/werewolf.json", 0.4, 1.0))
save("black_werewolf", werewolf("sunrise:black_werewolf", 90, 12, 0.34, "loot_tables/entities/black_werewolf.json", 0.8, 1.15))


# ---------------------------------------------------------------------------
# Hunters — protect villages and hunt vampires/werewolves (including players)
# ---------------------------------------------------------------------------
def hunter(identifier, health, attack, trainer):
    comps = humanoid_base(["humano", "hunter", "mob"], health, 0.32, attack,
                          "loot_tables/entities/hunter.json" if not trainer else "loot_tables/empty.json")
    comps.update({
        "minecraft:equipment": {"table": "loot_tables/entities/equipment/hunter_treiner.json" if trainer else "loot_tables/entities/equipment/hunter.json"},
        "minecraft:equip_item": {},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 5 : 0"},
        "minecraft:behavior.move_indoors": {"priority": 6, "speed_multiplier": 0.8},
        "minecraft:behavior.open_door": {"priority": 6, "close_door_after": True},
        "minecraft:behavior.restrict_open_door": {"priority": 5},
    })
    comps.update(melee(3, 1.2))
    comps.update(targets([
        {"filters": SUPERNATURAL_PLAYER, "max_dist": 20},
        {"filters": {"any_of": [fam("vampiro"), fam("vampire"), fam("lobisomem")]}, "max_dist": 24},
        {"filters": {"all_of": [fam("monster"), fam("creeper", "!=")]}, "max_dist": 12},
    ], must_see=True))
    groups = skins(1 if trainer else 5)
    events = {"minecraft:entity_spawned": {"sequence": [skin_randomize(1 if trainer else 5)]}}
    if trainer:
        comps["minecraft:persistent"] = {}
        comps["minecraft:interact"] = {"interactions": [{"interact_text": "action.interact.talk", "cooldown": 1.0, "on_interact": {"event": "sunrise:talked", "target": "self"}}]}
        comps["minecraft:health"] = {"value": 60, "max": 60}
        events["sunrise:talked"] = {}
    else:
        comps.update(despawn_monster())
    return entity(identifier, groups, comps, events)


save("hunter", hunter("sunrise:hunter", 30, 5, False))
save("hunter_treiner", hunter("sunrise:hunter_treiner", 60, 7, True))


# ---------------------------------------------------------------------------
# Patch the remaining hand-made mobs in place
# ---------------------------------------------------------------------------
def patch(name, fn):
    path = os.path.join(BP, "entities", f"{name}.json")
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    fn(d["minecraft:entity"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    print("patched", name)


def witch(e):
    for g in list(e.get("component_groups", {}).values()) + [e["components"]]:
        sh = g.get("minecraft:shooter")
        if sh:
            sh.pop("type", None)
            sh.pop("auxVal", None)
    for g in e.get("component_groups", {}).values():
        es = g.get("minecraft:environment_sensor")
        if es and "on_environment" in es:
            oe = es.pop("on_environment")
            es["triggers"] = [oe] if isinstance(oe, dict) else oe
    e["components"]["minecraft:type_family"] = {"family": ["vampiro", "vampire", "monster", "undead", "supernatural"]}
    e["components"].pop("minecraft:burns_in_daylight", None)
    e["components"]["minecraft:behavior.nearest_attackable_target"] = {"priority": 2, "must_see": True, "reselect_targets": True,
                                                                         "entity_types": vampire_targets()}
    e["components"]["minecraft:despawn"] = {"despawn_from_distance": {}}


def servant_bat(e):
    c = e["components"]
    c["minecraft:type_family"] = {"family": ["bat", "vc_servant", "mob"]}
    c["minecraft:behavior.nearest_attackable_target"] = {"priority": 1, "must_see": False, "reselect_targets": True, "entity_types": [
        {"filters": {"all_of": [{"any_of": [fam("monster"), fam("humano"), fam("irongolem"), fam("lobisomem")]}, fam("vampiro", "!="), fam("vampire", "!=")]}, "max_dist": 16}]}
    c["minecraft:attack"] = {"damage": 2}


patch("vampire_witch", witch)
patch("bullet_queen", lambda e: e["components"]["minecraft:projectile"].pop("destroyOnHurt", None))
patch("servantsbat", servant_bat)


# ---------------------------------------------------------------------------
# Spawn rules
# ---------------------------------------------------------------------------
def spawn_rule(identifier, population, conditions):
    path = os.path.join(BP, "spawn_rules", identifier.split(":")[1].replace("treiner", "treiner") + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"format_version": "1.8.0", "minecraft:spawn_rules": {
            "description": {"identifier": identifier, "population_control": population}, "conditions": conditions}}, f, indent=2)
    print("spawn rule", identifier)


def night_surface(weight, herd, biomes, extra=None):
    c = {
        "minecraft:spawns_on_surface": {},
        "minecraft:brightness_filter": {"min": 0, "max": 7, "adjust_for_weather": True},
        "minecraft:difficulty_filter": {"min": "easy", "max": "hard"},
        "minecraft:weight": {"default": weight},
        "minecraft:herd": {"min_size": herd[0], "max_size": herd[1]},
        "minecraft:biome_filter": {"any_of": [{"test": "has_biome_tag", "operator": "==", "value": b} for b in biomes]},
    }
    c.update(extra or {})
    return c


OVERWORLD_LAND = ["plains", "forest", "taiga", "savanna", "swamp", "roofed", "birch", "extreme_hills", "mesa", "desert", "jungle"]
spawn_rule("sunrise:weak_vampire", "monster", [night_surface(14, (1, 2), OVERWORLD_LAND)])
spawn_rule("sunrise:vampire", "monster", [night_surface(6, (1, 1), ["forest", "roofed", "taiga", "swamp", "birch"])])
spawn_rule("sunrise:vampire_witch", "monster", [night_surface(1, (1, 1), ["swamp", "roofed"])])
spawn_rule("sunrise:weak_werewolf", "monster", [night_surface(10, (1, 3), ["forest", "taiga", "birch", "extreme_hills"])])
spawn_rule("sunrise:werewolf", "monster", [night_surface(5, (1, 2), ["taiga", "forest", "extreme_hills"])])
spawn_rule("sunrise:black_werewolf", "monster", [night_surface(1, (1, 1), ["taiga", "extreme_hills", "mega"])])
spawn_rule("sunrise:hunter", "animal", [{
    "minecraft:spawns_on_surface": {},
    "minecraft:brightness_filter": {"min": 9, "max": 15, "adjust_for_weather": False},
    "minecraft:weight": {"default": 3},
    "minecraft:herd": {"min_size": 1, "max_size": 2},
    "minecraft:biome_filter": {"any_of": [{"test": "has_biome_tag", "operator": "==", "value": b} for b in ["plains", "forest", "taiga", "savanna"]]},
}])
