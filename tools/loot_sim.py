"""Monte-Carlo simulation of the add-on loot tables (player kill, no Looting).

usage: python3 loot_sim.py <behavior_pack dir> [kills]
Prints, per mob, the chance of getting each item and the average amount.
"""
import json, os, random, sys, glob

BP = sys.argv[1]
KILLS = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
LOOTING = int(sys.argv[3]) if len(sys.argv) > 3 else 0


def rng(v):
    if isinstance(v, dict):
        return random.randint(int(v["min"]), int(v["max"]))
    return int(v)


def roll(table):
    out = {}
    for pool in table["pools"]:
        ok = True
        for c in pool.get("conditions", []):
            if c["condition"] == "random_chance" and random.random() >= c["chance"]:
                ok = False
            if c["condition"] == "random_chance_with_looting" and random.random() >= c["chance"] + c.get("looting_multiplier", 0) * LOOTING:
                ok = False
        if not ok:
            continue
        for _ in range(rng(pool.get("rolls", 1))):
            entries = pool["entries"]
            total = sum(e.get("weight", 1) for e in entries)
            r = random.uniform(0, total)
            for e in entries:
                r -= e.get("weight", 1)
                if r <= 0:
                    if e["type"] == "item":
                        n = 1
                        for f in e.get("functions", []):
                            if f["function"] in ("set_count", "minecraft:set_count"):
                                n = rng(f["count"])
                            if f["function"] == "looting_enchant":
                                n += random.randint(0, int(f["count"]["max"])) if LOOTING else 0
                        if n > 0:
                            out[e["name"]] = out.get(e["name"], 0) + n
                    break
    return out


for path in sorted(glob.glob(os.path.join(BP, "loot_tables", "entities", "*.json"))):
    if "equipment" in path:
        continue
    table = json.load(open(path))
    got, amount = {}, {}
    for _ in range(KILLS):
        for k, v in roll(table).items():
            got[k] = got.get(k, 0) + 1
            amount[k] = amount.get(k, 0) + v
    name = os.path.basename(path)[:-5]
    print(f"\n{name}")
    for k in sorted(got, key=lambda k: -got[k]):
        print(f"  {k.replace('minecraft:', '').replace('sunrise:', ''):28s} {100 * got[k] / KILLS:5.1f}%   média {amount[k] / KILLS:.2f}")
