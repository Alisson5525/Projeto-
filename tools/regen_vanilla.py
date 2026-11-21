"""Rebuild vanilla overrides from the latest official vanilla files.

The v4 add-on shipped hand-edited copies of 1.16–1.20 vanilla files, which froze
those mobs/loot at old versions (missing newer behaviour) on current Minecraft.
This script takes the *current* vanilla files from Mojang/bedrock-samples and
injects only the Vampire Craft changes, so the overrides stay up to date.

usage: python3 regen_vanilla.py <bedrock-samples dir> <behavior_pack dir>
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jsonc import strip_comments  # noqa: E402

SAMPLES, BP = sys.argv[1], sys.argv[2]
VBP = os.path.join(SAMPLES, "behavior_pack")

def load(p):
    with open(p, encoding="utf-8-sig") as f:
        return json.loads(strip_comments(f.read()))

def save(p, d):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def tag_not(t):
    return {"test": "has_tag", "subject": "other", "operator": "!=", "value": t}

def tag_is(t):
    return {"test": "has_tag", "subject": "other", "value": t}

def mentions_player(flt):
    s = json.dumps(flt)
    return '"value": "player"' in s and "is_family" in s

TARGET_COMPONENTS = ("minecraft:behavior.nearest_attackable_target", "minecraft:behavior.nearest_prioritized_attackable_target")

def walk_components(entity):
    """Yield every components dict (base + component groups)."""
    e = entity["minecraft:entity"]
    yield e.get("components", {})
    for g in e.get("component_groups", {}).values():
        yield g

def ignore_tags(entity, tags):
    n = 0
    for comps in walk_components(entity):
        for key in TARGET_COMPONENTS:
            comp = comps.get(key)
            if not comp:
                continue
            for et in comp.get("entity_types", []):
                flt = et.get("filters")
                if flt and mentions_player(flt):
                    et["filters"] = {"all_of": [flt] + [tag_not(t) for t in tags]}
                    n += 1
    return n

def golem_hunts_supernaturals(entity):
    n = 0
    for comps in walk_components(entity):
        comp = comps.get("minecraft:behavior.nearest_attackable_target")
        if not comp:
            continue
        comp.setdefault("entity_types", []).append({
            "filters": {"all_of": [
                {"test": "is_family", "subject": "other", "value": "player"},
                {"any_of": [tag_is("vampiro"), tag_is("lobisomem")]},
                tag_not("vc_undetectable"),
            ]},
            "max_dist": 16,
        })
        n += 1
    return n

# Night creatures leave vampires and werewolves alone (v4 behaviour, kept).
NIGHT_MOBS = ["zombie", "husk", "drowned", "skeleton", "stray", "bogged", "phantom", "spider", "cave_spider",
              "slime", "witch", "zombie_villager", "zombie_villager_v2"]
out_dir = os.path.join(BP, "entities", "vanilla")
for name in NIGHT_MOBS:
    src = os.path.join(VBP, "entities", f"{name}.json")
    if not os.path.exists(src):
        print("skip (missing)", name); continue
    d = load(src)
    n = ignore_tags(d, ["vampiro", "lobisomem"])
    save(os.path.join(out_dir, f"{name}.json"), d)
    print(f"{name}: patched {n} target filters")

# Creepers only lose track of you with the Undetectable skill.
d = load(os.path.join(VBP, "entities", "creeper.json"))
print("creeper:", ignore_tags(d, ["vc_undetectable"]))
save(os.path.join(out_dir, "creeper.json"), d)

for golem in ["iron_golem", "snow_golem"]:
    d = load(os.path.join(VBP, "entities", f"{golem}.json"))
    print(golem, golem_hunts_supernaturals(d))
    save(os.path.join(out_dir, f"{golem}.json"), d)

# ---------------------------------------------------------------------------
# Chest loot: latest vanilla + one extra Vampire Craft pool
# ---------------------------------------------------------------------------
def count(lo, hi):
    return [{"function": "set_count", "count": {"min": lo, "max": hi}}]

GARLIC = lambda w, lo=1, hi=4: {"type": "item", "name": "sunrise:garlic", "weight": w, "functions": count(lo, hi)}
EXTRA = {
    "spawn_bonus_chest": [GARLIC(10, 2, 4), {"type": "empty", "weight": 5}],
    "village_two_room_house": [GARLIC(5, 2, 4), {"type": "empty", "weight": 10}],
    "jungle_temple": [GARLIC(10, 3, 7), {"type": "empty", "weight": 5}],
    "abandoned_mineshaft": [GARLIC(10, 2, 4), {"type": "item", "name": "sunrise:vampire_tooth", "weight": 2}, {"type": "empty", "weight": 12}],
    "simple_dungeon": [GARLIC(10, 2, 4), {"type": "item", "name": "sunrise:vampire_tooth", "weight": 4},
                       {"type": "item", "name": "sunrise:blood_bottle_4", "weight": 4, "functions": count(1, 2)},
                       {"type": "item", "name": "sunrise:werewolf_fang", "weight": 3}, {"type": "empty", "weight": 10}],
    "woodland_mansion": [GARLIC(20, 1, 4), {"type": "item", "name": "sunrise:pure_vampire_blood", "weight": 3},
                         {"type": "item", "name": "sunrise:change_stone", "weight": 2}, {"type": "empty", "weight": 10}],
    "village/village_savanna_house": [GARLIC(10, 1, 5), {"type": "empty", "weight": 10}],
    "village/village_taiga_house": [GARLIC(10, 1, 5), {"type": "empty", "weight": 10}],
    "village/village_plains_house": [GARLIC(10, 1, 5), {"type": "empty", "weight": 10}],
}
chest_dir = os.path.join(BP, "loot_tables", "chests")
for name, entries in EXTRA.items():
    src = os.path.join(VBP, "loot_tables", "chests", f"{name}.json")
    d = load(src)
    d.setdefault("pools", []).append({"rolls": 1, "entries": entries})
    save(os.path.join(chest_dir, f"{name}.json"), d)
    print("loot", name)
