"""World generation for Vampire Craft 5.1: ores, structure placement, structure files.

* Fixes the ores (v4 only replaced the removed `stone` + `stone_type` ids and
  generated at y 120-200, i.e. almost never).
* Makes the structures findable (v4 used scatter_chance 0.1 = 0.1% per chunk).
* Cleans/upgrades the existing .mcstructure files (junk entities, chests with
  random loot) and generates two new structures from code:
    - Cripta Vampírica (underground, blood altar + spawner + loot)
    - Círculo Lunar (surface, werewolf ritual site)

usage: python3 gen_worldgen.py <behavior_pack dir>
"""
import json, os, random, sys
import nbtlib
from nbtlib.tag import Byte, Short, Int, Float, String, List, Compound

BP = sys.argv[1]
random.seed(1337)
VERSION = 18087969  # 1.20.1.33 — same palette version as the original structures; the game upgrades it.
# Block names below must therefore be valid 1.20.1 ids (e.g. cobweb is "minecraft:web").


def save_json(rel, data):
    path = os.path.join(BP, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("wrote", rel)


# ---------------------------------------------------------------------------
# Ores
# ---------------------------------------------------------------------------
STONES = ["minecraft:stone", "minecraft:granite", "minecraft:diorite", "minecraft:andesite", "minecraft:tuff"]
DEEP = ["minecraft:deepslate", "minecraft:tuff"]


def ore_feature(name, block, count, replace):
    save_json(f"features/{name}.json", {
        "format_version": "1.17.0",
        "minecraft:ore_feature": {
            "description": {"identifier": f"sunrise:{name}"},
            "count": count,
            "replace_rules": [{"places_block": block, "may_replace": replace}],
        },
    })


def ore_rule(name, feature, iterations, y_lo, y_hi):
    save_json(f"feature_rules/{name}.json", {
        "format_version": "1.13.0",
        "minecraft:feature_rules": {
            "description": {"identifier": f"sunrise:{name}", "places_feature": f"sunrise:{feature}"},
            "conditions": {"placement_pass": "underground_pass",
                           "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "overworld"}]},
            "distribution": {
                "iterations": iterations, "coordinate_eval_order": "zyx",
                "x": {"distribution": "uniform", "extent": [0, 16]},
                "y": {"distribution": "triangle", "extent": [y_lo, y_hi]},
                "z": {"distribution": "uniform", "extent": [0, 16]},
            },
        },
    })


ore_feature("sun_stone_ore_block_feature", "sunrise:sun_stone_ore_block", 6, STONES)
ore_rule("overworld_underground_sun_stone_ore_block", "sun_stone_ore_block_feature", 6, 0, 96)
ore_feature("moon_stone_ore_block_feature", "sunrise:moon_stone_ore_block", 6, DEEP + ["minecraft:stone"])
ore_rule("overworld_underground_moon_stone_ore_block", "moon_stone_ore_block_feature", 5, -58, 16)

# ---------------------------------------------------------------------------
# Structure placement
# ---------------------------------------------------------------------------
def biome_any(*tags):
    return [{"all_of": [{"any_of": [{"test": "has_biome_tag", "operator": "==", "value": t} for t in tags]},
                        {"test": "has_biome_tag", "operator": "==", "value": "overworld"}]}]


def structure(name, structure_name, constraints, radius=4):
    save_json(f"features/{name}.json", {
        "format_version": "1.13.0",
        "minecraft:structure_template_feature": {
            "description": {"identifier": f"sunrise:{name}"},
            "structure_name": structure_name,
            "adjustment_radius": radius,
            "facing_direction": "random",
            "constraints": constraints,
        },
    })


def surface_rule(name, feature, chance, biomes, y_offset=0):
    save_json(f"feature_rules/{name}.json", {
        "format_version": "1.13.0",
        "minecraft:feature_rules": {
            "description": {"identifier": f"sunrise:{name}", "places_feature": f"sunrise:{feature}"},
            "conditions": {"placement_pass": "surface_pass", "minecraft:biome_filter": biome_any(*biomes)},
            "distribution": {
                "iterations": 1, "scatter_chance": chance,
                "x": {"distribution": "uniform", "extent": [0, 15]},
                "y": f"query.heightmap(variable.worldx, variable.worldz) + {y_offset}",
                "z": {"distribution": "uniform", "extent": [0, 15]},
            },
        },
    })


GROUNDED = {"grounded": {}, "unburied": {}}
# scatter_chance is a percentage per chunk.
structure("torre_vampiro_feature", "mystructure:torre_vampira", GROUNDED, 7)
surface_rule("torre_vampiro_feature_rule", "torre_vampiro_feature", 0.9, ["forest", "taiga", "roofed", "swamp"])
structure("cemiterio_pequeno_feature", "mystructure:cemiterio_pequeno", {"grounded": {}}, 6)
surface_rule("cemiterio_pequeno_feature_rule", "cemiterio_pequeno_feature", 1.6, ["plains", "forest", "taiga", "birch"], -5)
structure("barraca_cacador_feature", "mystructure:hunters_camp", GROUNDED, 6)
surface_rule("barraca_cacador_feature_rule", "barraca_cacador_feature", 1.4, ["plains", "forest", "taiga", "savanna"], -1)
structure("casa_cacador_feature", "mystructure:casa_cacador", GROUNDED, 6)
surface_rule("casa_cacador_feature_rule", "casa_cacador_feature", 0.8, ["plains", "forest", "birch", "taiga"], -1)
structure("circulo_lunar_feature", "mystructure:circulo_lunar", {"grounded": {}}, 6)
surface_rule("circulo_lunar_feature_rule", "circulo_lunar_feature", 1.0, ["taiga", "forest", "extreme_hills", "mega"], -1)
structure("cripta_vampira_feature", "mystructure:cripta_vampira",
          {"block_intersection": {"block_allowlist": STONES + DEEP + ["minecraft:dirt", "minecraft:gravel", "minecraft:air", "minecraft:cave_air"]}}, 4)
save_json("feature_rules/cripta_vampira_feature_rule.json", {
    "format_version": "1.13.0",
    "minecraft:feature_rules": {
        "description": {"identifier": "sunrise:cripta_vampira_feature_rule", "places_feature": "sunrise:cripta_vampira_feature"},
        "conditions": {"placement_pass": "underground_pass", "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "overworld"}]},
        "distribution": {
            "iterations": 1, "scatter_chance": 1.2,
            "x": {"distribution": "uniform", "extent": [0, 15]},
            "y": {"distribution": "uniform", "extent": [-30, 30]},
            "z": {"distribution": "uniform", "extent": [0, 15]},
        },
    },
})

# ---------------------------------------------------------------------------
# .mcstructure helpers
# ---------------------------------------------------------------------------
SDIR = os.path.join(BP, "structures")


def load_struct(name):
    return nbtlib.load(os.path.join(SDIR, f"{name}.mcstructure"), byteorder="little")


def save_struct(nbt, name):
    nbt.save(os.path.join(SDIR, f"{name}.mcstructure"), byteorder="little")
    print("wrote structures/" + name)


def chest_data(loot, x, y, z):
    return Compound({"block_entity_data": Compound({
        "Findable": Byte(0), "Items": List[Compound]([]), "id": String("Chest"), "isMovable": Byte(1),
        "x": Int(x), "y": Int(y), "z": Int(z), "LootTable": String(loot)})})


def palette_entry(name, states=None):
    return Compound({"name": String(name), "states": Compound(states or {}), "version": Int(VERSION)})


def index_of(size, x, y, z):
    return (x * size[1] + y) * size[2] + z


def add_chest(nbt, loot, want_xz=None):
    """Put a chest on a free floor cell (air with a solid block below). Run on pristine files only."""
    s = nbt["structure"]
    size = [int(v) for v in nbt["size"]]
    pal = s["palette"]["default"]["block_palette"]
    idx = s["block_indices"][0]
    air = {i for i, p in enumerate(pal) if str(p["name"]) == "minecraft:air"}
    pal.append(palette_entry("minecraft:chest", {"facing_direction": Int(3)}))
    chest_i = len(pal) - 1
    cells = [(x, y, z) for x in range(1, size[0] - 1) for z in range(1, size[2] - 1) for y in range(1, size[1])]
    cx, cz = want_xz or (size[0] // 2, size[2] // 2)
    # Prefer the lowest floor near the centre (inside the camp/house, not on a roof).
    cells.sort(key=lambda c: (c[1], abs(c[0] - cx) + abs(c[2] - cz)))
    for x, y, z in cells:
        i = index_of(size, x, y, z)
        below = index_of(size, x, y - 1, z)
        if int(idx[i]) in air and int(idx[below]) >= 0 and int(idx[below]) not in air:
            idx[i] = Int(chest_i)
            origin = [int(v) for v in nbt["structure_world_origin"]]
            s["palette"]["default"]["block_position_data"][str(i)] = chest_data(loot, origin[0] + x, origin[1] + y, origin[2] + z)
            return (x, y, z)
    raise RuntimeError("no free cell for chest")


# Vampire tower: drop junk entities saved by accident (items, xp orbs).
t = load_struct("torre_vampira")
ents = t["structure"]["entities"]
t["structure"]["entities"] = List[Compound]([e for e in ents if str(e["identifier"]).startswith("sunrise:")])
save_struct(t, "torre_vampira")

# Graveyard: chests now roll random loot.
g = load_struct("cemiterio_pequeno")
for k, v in g["structure"]["palette"]["default"]["block_position_data"].items():
    bed = v.get("block_entity_data")
    if bed is not None and str(bed.get("id", "")) == "Chest":
        bed["LootTable"] = String("loot_tables/sunrise/graveyard.json")
        bed["Items"] = List[Compound]([])
save_struct(g, "cemiterio_pequeno")

# Hunter camp: one of the three hunters becomes the Hunter Master (the guild NPC
# no longer spawns naturally — v4 spawned persistent trainers everywhere).
camp = load_struct("hunters_camp")
e = camp["structure"]["entities"][0]
e["identifier"] = String("sunrise:hunter_treiner")
e["definitions"] = List[String]([String("+sunrise:hunter_treiner"), String("+minecraft:skin1")])
e["Variant"] = Int(0)
e["Persistent"] = Byte(1)
save_struct(camp, "hunters_camp")

# Hunter camp + house: a supply chest.
for name in ["hunters_camp", "casa_cacador", "barraca_cacador"]:
    s = load_struct(name)
    print(name, "chest at", add_chest(s, "loot_tables/sunrise/hunter_house.json"))
    save_struct(s, name)


# ---------------------------------------------------------------------------
# New structures built from code
# ---------------------------------------------------------------------------
class Builder:
    def __init__(self, sx, sy, sz, fill="minecraft:structure_void"):
        self.size = [sx, sy, sz]
        self.pal = []
        self.pal_idx = {}
        self.blocks = {}
        self.bpd = {}
        self.fill = fill

    def p(self, name, states=None):
        key = (name, json.dumps(states or {}, sort_keys=True, default=str))
        if key not in self.pal_idx:
            self.pal_idx[key] = len(self.pal)
            self.pal.append(palette_entry(name, states))
        return self.pal_idx[key]

    def set(self, x, y, z, name, states=None, data=None):
        if 0 <= x < self.size[0] and 0 <= y < self.size[1] and 0 <= z < self.size[2]:
            self.blocks[(x, y, z)] = self.p(name, states)
            if data is not None:
                self.bpd[index_of(self.size, x, y, z)] = Compound({"block_entity_data": Compound(data)})

    def box(self, x0, y0, z0, x1, y1, z1, name, states=None):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                for z in range(z0, z1 + 1):
                    self.set(x, y, z, name, states)

    def save(self, name):
        sx, sy, sz = self.size
        void = self.p(self.fill)
        layer0 = [Int(-1 if self.fill == "minecraft:structure_void" and self.blocks.get((x, y, z)) is None else self.blocks.get((x, y, z), void))
                  for x in range(sx) for y in range(sy) for z in range(sz)]
        layer1 = [Int(-1)] * len(layer0)
        nbt = nbtlib.File({
            "format_version": Int(1),
            "size": List[Int]([Int(v) for v in self.size]),
            "structure": Compound({
                "block_indices": List[List[Int]]([List[Int](layer0), List[Int](layer1)]),
                "entities": List[Compound]([]),
                "palette": Compound({"default": Compound({
                    "block_palette": List[Compound](self.pal),
                    "block_position_data": Compound({str(k): v for k, v in self.bpd.items()}),
                })}),
            }),
            "structure_world_origin": List[Int]([Int(0), Int(0), Int(0)]),
        })
        nbt.save(os.path.join(SDIR, f"{name}.mcstructure"), byteorder="little")
        print("wrote structures/" + name, self.size, len(self.pal), "palette entries")


def chest_at(b, x, y, z, loot):
    b.set(x, y, z, "minecraft:chest", {"facing_direction": Int(3)},
          {"Findable": Byte(0), "Items": List[Compound]([]), "id": String("Chest"), "isMovable": Byte(1),
           "x": Int(x), "y": Int(y), "z": Int(z), "LootTable": String(loot)})


# --- Cripta Vampírica (11 x 7 x 13) ------------------------------------------------
c = Builder(11, 7, 13, fill="minecraft:air")
WALL = ["minecraft:deepslate_bricks"] * 6 + ["minecraft:cracked_deepslate_bricks"] * 3 + ["minecraft:deepslate_tiles"]
for x in range(11):
    for y in range(7):
        for z in range(13):
            edge = x in (0, 10) or y in (0, 6) or z in (0, 12)
            if edge:
                c.set(x, y, z, random.choice(WALL))
            else:
                c.set(x, y, z, "minecraft:air")
c.box(1, 0, 1, 9, 0, 11, "minecraft:polished_blackstone")
c.box(4, 0, 1, 6, 0, 11, "minecraft:polished_blackstone_bricks")
for (px, pz) in [(2, 3), (8, 3), (2, 9), (8, 9)]:  # pillars
    c.box(px, 1, pz, px, 5, pz, "minecraft:chiseled_deepslate")
    c.set(px, 1, pz + 1, "minecraft:soul_lantern")
c.set(5, 1, 10, "sunrise:blood_altar", {"sunrise:blood_altar_level": Int(3)})
c.box(4, 1, 11, 6, 1, 11, "minecraft:red_carpet")
chest_at(c, 2, 1, 11, "loot_tables/sunrise/crypt.json")
chest_at(c, 8, 1, 11, "loot_tables/sunrise/crypt.json")
c.set(5, 1, 6, "minecraft:mob_spawner", None, {
    "id": String("MobSpawner"), "EntityIdentifier": String("sunrise:weak_vampire"), "Delay": Short(40),
    "MinSpawnDelay": Short(300), "MaxSpawnDelay": Short(700), "SpawnCount": Short(2), "MaxNearbyEntities": Short(3),
    "RequiredPlayerRange": Short(12), "SpawnRange": Short(4), "isMovable": Byte(1),
    "DisplayEntityWidth": Float(0.6), "DisplayEntityHeight": Float(1.9), "DisplayEntityScale": Float(1.0),
    "x": Int(5), "y": Int(1), "z": Int(6)})
for (x, y, z) in [(1, 5, 1), (9, 5, 1), (1, 5, 11), (9, 5, 11), (1, 1, 6), (9, 4, 7), (3, 5, 6)]:
    c.set(x, y, z, "minecraft:web")
c.box(5, 1, 0, 5, 2, 0, "minecraft:air")  # crumbled entrance
c.save("cripta_vampira")

# --- Círculo Lunar (13 x 6 x 13) -----------------------------------------------------------
m = Builder(13, 6, 13)
cx = cz = 6
for x in range(13):
    for z in range(13):
        d = ((x - cx) ** 2 + (z - cz) ** 2) ** 0.5
        if d <= 6.2:
            m.set(x, 0, z, random.choice(["minecraft:podzol", "minecraft:podzol", "minecraft:gravel", "minecraft:mossy_cobblestone"]))
            for y in range(1, 6):
                m.set(x, y, z, "minecraft:air")
import math
for i in range(8):
    a = i / 8 * math.tau
    px, pz = round(cx + math.cos(a) * 5), round(cz + math.sin(a) * 5)
    h = random.choice([2, 3, 3, 4])
    for y in range(1, h + 1):
        m.set(px, y, pz, random.choice(["minecraft:mossy_cobblestone", "minecraft:mossy_cobblestone", "minecraft:cobblestone", "minecraft:deepslate_bricks"]))
m.box(5, 0, 5, 7, 0, 7, "minecraft:chiseled_deepslate")
m.set(6, 1, 6, "minecraft:lodestone")
chest_at(m, 6, 1, 8, "loot_tables/sunrise/lunar_circle.json")
for (x, z) in [(3, 6), (9, 6), (6, 3), (4, 9)]:
    m.set(x, 1, z, "minecraft:bone_block")
m.save("circulo_lunar")
