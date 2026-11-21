"""Loot tables for every Vampire Craft mob and structure.

Design: common drops always, thematic drops scale with Looting, rare drops
only when killed by a player. usage: python3 gen_loot.py <behavior_pack dir>
"""
import json, os, sys

BP = sys.argv[1]


def item(name, w=1, lo=1, hi=1, looting=0, extra=None):
    e = {"type": "item", "name": name, "weight": w, "functions": []}
    if (lo, hi) != (1, 1):
        e["functions"].append({"function": "set_count", "count": {"min": lo, "max": hi}})
    if looting:
        e["functions"].append({"function": "looting_enchant", "count": {"min": 0, "max": looting}})
    if extra:
        e["functions"] += extra
    if not e["functions"]:
        del e["functions"]
    return e


def empty(w):
    return {"type": "empty", "weight": w}


def pool(entries, rolls=1, player_only=False, chance=None, looting_mult=None):
    p = {"rolls": rolls, "entries": entries}
    cond = []
    if player_only:
        cond.append({"condition": "killed_by_player"})
    if chance is not None:
        if looting_mult is not None:
            cond.append({"condition": "random_chance_with_looting", "chance": chance, "looting_multiplier": looting_mult})
        else:
            cond.append({"condition": "random_chance", "chance": chance})
    if cond:
        p["conditions"] = cond
    return p


def save(rel, pools):
    path = os.path.join(BP, "loot_tables", rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"pools": pools}, f, indent=2, ensure_ascii=False)
    print("wrote", rel)


S = "sunrise:"

# Drop philosophy (5.3): every creature ALWAYS drops its signature item, common
# extras are frequent, Looting adds more, and only the rarest relics require a
# player kill. (5.0–5.2 made fangs 15–35% player-only drops: far too rare.)

# ---------------------------------------------------------------- vampires
save("entities/weak_vampire.json", [
    pool([item(S + "vampire_blood", 1, 1, 2, 1)]),
    pool([item(S + "vampire_tooth", 1, 1, 1, 1)], chance=0.7, looting_mult=0.1),
    pool([item("minecraft:bone", 1, 1, 2, 1)]),
    pool([item(S + "blood_bottle_1", 4), item(S + "blood_bottle_2", 2), item("minecraft:gold_nugget", 4, 2, 5), item(S + "weak_human_heart", 2)], chance=0.6),
    pool([item(S + "change_stone")], player_only=True, chance=0.04, looting_mult=0.02),
])
save("entities/vampire.json", [
    pool([item(S + "vampire_blood", 1, 2, 3, 2)]),
    pool([item(S + "vampire_tooth", 1, 1, 2, 1)]),
    pool([item(S + "pure_vampire_blood", 1, 1, 1, 1)], chance=0.45, looting_mult=0.1),
    pool([item("minecraft:gold_ingot", 4, 1, 3), item("minecraft:emerald", 3, 1, 3), item(S + "blood_bottle_4", 4, 1, 2), item(S + "human_heart", 2)], rolls=2),
    pool([item(S + "vampire_sword_e", 2), item(S + "change_stone", 1)], player_only=True, chance=0.12, looting_mult=0.03),
])
save("entities/vampire_witch.json", [
    pool([item(S + "pure_vampire_blood", 1, 1, 3, 1)]),
    pool([item(S + "philosopher_stone", 1, 1, 1, 1)], chance=0.8, looting_mult=0.1),
    pool([item("minecraft:glowstone_dust", 3, 2, 5, 2), item("minecraft:redstone", 3, 2, 5, 2), item(S + "blood_bottle_4", 2, 1, 2),
          item("minecraft:amethyst_shard", 2, 1, 3), item(S + "vampire_tooth", 2, 1, 2)], rolls=3),
    pool([item(S + "blood_altar")], chance=0.35),
])
save("entities/vampire_chicken.json", [
    pool([item("minecraft:feather", 1, 1, 3, 1)]),
    pool([item("minecraft:chicken", 1, 1, 1, 1)]),
    pool([item(S + "blood_bottle_1", 2), item(S + "vampire_blood", 1)], chance=0.6),
])
save("entities/bat_minion.json", [
    pool([item("minecraft:leather", 1, 0, 1, 1)]),
    pool([item(S + "vampire_blood", 1, 1, 1, 1)], chance=0.75, looting_mult=0.1),
    pool([item(S + "vampire_tooth")], chance=0.2, looting_mult=0.05),
])

# ---------------------------------------------------------------- werewolves
save("entities/weak_werewolf.json", [
    pool([item(S + "werewolf_fang", 1, 1, 1, 1)], chance=0.75, looting_mult=0.08),
    pool([item(S + "liver", 1, 1, 1, 1)], chance=0.7, looting_mult=0.08),
    pool([item("minecraft:leather", 1, 1, 2, 1), item("minecraft:rabbit_hide", 1, 1, 2, 1)]),
    pool([item("minecraft:bone", 1, 1, 2), item("minecraft:beef", 1, 1, 2)]),
])
save("entities/werewolf.json", [
    pool([item(S + "werewolf_fang", 1, 1, 2, 1)]),
    pool([item(S + "liver", 1, 1, 2, 1)]),
    pool([item("minecraft:leather", 1, 1, 3, 1)]),
    pool([item("minecraft:beef", 1, 1, 2), item("minecraft:mutton", 1, 1, 2), item("minecraft:bone", 1, 1, 3)]),
    pool([item(S + "moon_stone_ore", 3, 1, 3), item(S + "human_heart", 1)], chance=0.4),
    pool([item(S + "werewolf_claws_e")], player_only=True, chance=0.1, looting_mult=0.03),
])
save("entities/black_werewolf.json", [
    pool([item(S + "werewolf_fang", 1, 2, 3, 1)]),
    pool([item(S + "liver", 1, 2, 3, 1)]),
    pool([item("minecraft:leather", 1, 2, 4, 2)]),
    pool([item(S + "moon_stone_ingot", 1, 1, 2, 1)], chance=0.7),
    pool([item(S + "werewolf_claws_e", 2), item("minecraft:diamond", 2, 1, 2), item(S + "blood_altar", 1)], chance=0.5),
])

# ---------------------------------------------------------------- humans
save("entities/hunter.json", [
    pool([item("minecraft:arrow", 1, 2, 6, 2)]),
    pool([item(S + "garlic", 1, 1, 3, 1)]),
    pool([item(S + "weak_human_heart", 1, 1, 1, 1)], chance=0.85, looting_mult=0.05),
    pool([item(S + "human_heart", 1, 1, 1, 1)], chance=0.4, looting_mult=0.08),
    pool([item("minecraft:bread", 3, 1, 2), item("minecraft:iron_ingot", 2, 1, 2), item(S + "syringe", 2), item(S + "garlic_syringe", 1)], chance=0.5),
    pool([item(S + "hunter_bow")], player_only=True, chance=0.06, looting_mult=0.02),
])
save("entities/hunter_black.json", [
    pool([item("minecraft:arrow", 1, 2, 6, 2)]),
    pool([item(S + "weak_human_heart", 1, 1, 2, 1)]),
    pool([item(S + "human_heart", 1, 1, 1, 1)], chance=0.6),
])

# ---------------------------------------------------------------- structures
save("sunrise/vampire_tower.json", [
    pool([item(S + "blood_bottle_4", 4, 1, 3), item(S + "vampire_blood", 4, 1, 3), item(S + "weak_human_heart", 3, 1, 2),
          item("minecraft:gold_ingot", 3, 2, 5), item("minecraft:emerald", 2, 1, 4), item("minecraft:candle", 2, 2, 4),
          item("minecraft:book", 2, 1, 3)], rolls={"min": 3, "max": 6}),
    pool([item(S + "pure_vampire_blood", 3), item(S + "vampire_tooth", 3, 1, 2), item(S + "human_heart", 2),
          item(S + "change_stone", 1), item(S + "vampire_sword_e", 1), empty(4)], rolls=2),
    pool([item(S + "blood_altar", 1), item(S + "recharging_altar", 1), item("minecraft:enchanted_book", 1,
          extra=[{"function": "enchant_randomly"}]), empty(3)]),
])
save("sunrise/crypt.json", [
    pool([item("minecraft:bone", 3, 2, 6), item("minecraft:rotten_flesh", 3, 2, 5), item("minecraft:candle", 2, 1, 3),
          item(S + "blood_bottle_2", 3, 1, 2), item(S + "blood_bottle_4", 2), item("minecraft:gold_nugget", 3, 3, 9),
          item(S + "vampire_blood", 3, 1, 3)], rolls={"min": 3, "max": 6}),
    pool([item(S + "vampire_tooth", 4, 1, 2), item(S + "pure_vampire_blood", 2), item(S + "weak_human_heart", 3, 1, 3),
          item(S + "human_heart", 2), item(S + "change_stone", 1), item("minecraft:golden_apple", 1), empty(3)], rolls=2),
    pool([item(S + "philosopher_stone", 1), item(S + "eclipse_ingot", 2), item("minecraft:diamond", 1, 1, 2), empty(5)]),
])
save("sunrise/graveyard.json", [
    pool([item("minecraft:bone", 4, 1, 4), item("minecraft:candle", 3, 1, 3), item("minecraft:rotten_flesh", 3, 1, 4),
          item(S + "garlic", 3, 1, 3), item("minecraft:iron_shovel", 1), item("minecraft:poppy", 2, 1, 3)], rolls={"min": 2, "max": 5}),
    pool([item(S + "weak_human_heart", 3), item(S + "vampire_tooth", 2), item(S + "blood_bottle_1", 3),
          item("minecraft:gold_ingot", 2, 1, 2), empty(6)], rolls=2),
])
save("sunrise/hunter_house.json", [
    pool([item("minecraft:arrow", 4, 4, 12), item("minecraft:bread", 3, 1, 4), item(S + "garlic", 4, 2, 5),
          item("minecraft:iron_ingot", 2, 1, 3), item("minecraft:torch", 2, 2, 8), item("minecraft:glass_bottle", 2, 1, 3)], rolls={"min": 3, "max": 6}),
    pool([item(S + "syringe", 3), item(S + "garlic_syringe", 2), item(S + "hunter_bow", 1), item(S + "sun_stone_ingot", 2, 1, 2),
          item(S + "vampire_cure", 1), item(S + "werewolf_cure", 1), empty(4)], rolls=2),
])
save("sunrise/lunar_circle.json", [
    pool([item("minecraft:bone", 3, 2, 5), item("minecraft:leather", 3, 1, 4), item(S + "liver", 3, 1, 2),
          item("minecraft:rabbit_foot", 1), item("minecraft:beef", 2, 1, 3)], rolls={"min": 3, "max": 5}),
    pool([item(S + "werewolf_fang", 3), item(S + "moon_stone_ingot", 3, 1, 3), item(S + "moon_stone_ore", 2, 2, 4),
          item(S + "werewolf_claws_e", 1), item(S + "blood_altar", 1), empty(3)], rolls=2),
])
