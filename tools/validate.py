"""Static validator for the Vampire Craft add-on.

Cross-checks every reference between the behaviour pack, resource pack and
scripts so a missing texture/sound/lang key/identifier is caught before the
game ever loads the pack.

usage: python3 validate.py <addon dir> [bedrock-samples dir]
exit code 1 when errors are found.
"""
import json, os, re, sys, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jsonc import strip_comments  # noqa: E402

ADDON = sys.argv[1]
SAMPLES = sys.argv[2] if len(sys.argv) > 2 else None
BP = os.path.join(ADDON, "behavior_pack")
RP = os.path.join(ADDON, "resource_pack")
errors, warnings = [], []


def err(m):
    errors.append(m)


def warn(m):
    warnings.append(m)


def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.loads(strip_comments(f.read()))


# 1. Every JSON parses ------------------------------------------------------------
docs = {}
for root in (BP, RP):
    for p in glob.glob(os.path.join(root, "**", "*.json"), recursive=True):
        try:
            docs[p] = load(p)
        except Exception as e:  # noqa: BLE001
            err(f"JSON parse error {os.path.relpath(p, ADDON)}: {e}")


def rel(p):
    return os.path.relpath(p, ADDON)


def walk(o, fn, path=()):
    fn(o, path)
    if isinstance(o, dict):
        for k, v in o.items():
            walk(v, fn, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, fn, path + (i,))


def tex_exists(base):
    return any(os.path.exists(os.path.join(RP, base + ext)) for ext in (".png", ".tga", ".jpg", ".texture_set.json"))


# Vanilla resources (optional) -------------------------------------------------------------
vanilla_sounds, vanilla_loot, vanilla_textures = set(), set(), set()
if SAMPLES:
    sd = os.path.join(SAMPLES, "resource_pack", "sounds", "sound_definitions.json")
    if os.path.exists(sd):
        vanilla_sounds = set(load(sd)["sound_definitions"].keys())
    for p in glob.glob(os.path.join(SAMPLES, "behavior_pack", "loot_tables", "**", "*.json"), recursive=True):
        vanilla_loot.add(os.path.relpath(p, os.path.join(SAMPLES, "behavior_pack")).replace(os.sep, "/"))

# 2. Identifiers defined -----------------------------------------------------------------------
def ids_in(folder, key):
    out = {}
    for p, d in docs.items():
        if p.startswith(os.path.join(BP, folder) + os.sep):
            try:
                out[d[key]["description"]["identifier"]] = p
            except (KeyError, TypeError):
                pass
    return out


items = ids_in("items", "minecraft:item")
blocks = ids_in("blocks", "minecraft:block")
entities = ids_in("entities", "minecraft:entity")
known = set(items) | set(blocks) | set(entities)
for e in entities:
    known.add(e + "_spawn_egg")

# 3. Item icons ------------------------------------------------------------------------------
item_tex = docs.get(os.path.join(RP, "textures", "item_texture.json"), {}).get("texture_data", {})
for k, v in item_tex.items():
    paths = v["textures"] if isinstance(v["textures"], list) else [v["textures"]]
    for t in paths:
        t = t if isinstance(t, str) else t.get("path", "")
        if not tex_exists(t):
            err(f"item_texture '{k}' -> missing file {t}")
for ident, p in items.items():
    icon = docs[p]["minecraft:item"]["components"].get("minecraft:icon")
    name = icon if isinstance(icon, str) else (icon or {}).get("textures", {}).get("default")
    if not name:
        err(f"{ident}: no icon")
    elif name not in item_tex:
        err(f"{ident}: icon '{name}' not in item_texture.json")

# 4. Blocks: textures + geometry ----------------------------------------------------------------
terrain = docs.get(os.path.join(RP, "textures", "terrain_texture.json"), {}).get("texture_data", {})
vanilla_terrain = set()
if SAMPLES and os.path.exists(os.path.join(SAMPLES, "resource_pack", "textures", "terrain_texture.json")):
    vanilla_terrain = set(load(os.path.join(SAMPLES, "resource_pack", "textures", "terrain_texture.json"))["texture_data"].keys())
for k, v in terrain.items():
    paths = v["textures"] if isinstance(v["textures"], list) else [v["textures"]]
    for t in paths:
        t = t if isinstance(t, str) else t.get("path", "")
        if not tex_exists(t):
            err(f"terrain_texture '{k}' -> missing file {t}")
geos = set()
for p, d in docs.items():
    if isinstance(d, dict) and "minecraft:geometry" in d:
        for g in d["minecraft:geometry"]:
            geos.add(g["description"]["identifier"])
    if isinstance(d, dict):
        for k in d:
            if k.startswith("geometry."):
                geos.add(k.split(":")[0])
blocks_json = docs.get(os.path.join(RP, "blocks.json"), {})
script_components = set()
for p in glob.glob(os.path.join(BP, "scripts", "**", "*.js"), recursive=True):
    script_components |= set(re.findall(r'registerCustomComponent\("([^"]+)"', open(p, encoding="utf-8").read()))
for ident, p in blocks.items():
    def chk(o, path):
        if isinstance(o, dict):
            mi = o.get("minecraft:material_instances")
            if isinstance(mi, dict):
                for inst in mi.values():
                    tx = inst.get("texture") if isinstance(inst, dict) else None
                    if tx and tx not in terrain and tx not in vanilla_terrain:
                        err(f"{ident}: texture '{tx}' not in terrain_texture.json")
            g = o.get("minecraft:geometry")
            gid = g if isinstance(g, str) else (g or {}).get("identifier") if isinstance(g, dict) else None
            if gid and not gid.startswith("minecraft:") and gid not in geos:
                err(f"{ident}: geometry '{gid}' not found in RP models")
            for k in o:
                if ":" in k and not k.startswith("minecraft:") and not k.startswith("tag:") and path and path[-1] in ("components",):
                    if k not in script_components:
                        err(f"{ident}: custom component '{k}' not registered in scripts")
            if "minecraft:custom_components" in o:
                for c in o["minecraft:custom_components"]:
                    if c not in script_components:
                        err(f"{ident}: custom component '{c}' not registered")
    walk(docs[p]["minecraft:block"], chk)

# 5. Loot table references --------------------------------------------------------------------------
for p, d in docs.items():
    if not p.startswith(BP):
        continue
    def chk(o, path):
        if isinstance(o, str) and o.startswith("loot_tables/") and o.endswith(".json"):
            if not os.path.exists(os.path.join(BP, o)) and o not in vanilla_loot:
                err(f"{rel(p)}: loot table '{o}' does not exist")
    walk(d, chk)

# 6. sunrise:* identifiers referenced anywhere in BP data/scripts -------------------------------------------
ID_RE = re.compile(r"(?<![.\w])(?:sunrise|thini):[a-z0-9_]+(?!\.name)")
defined_other = set()
for p, d in docs.items():
    if "particle_effect" in d:
        defined_other.add(d["particle_effect"]["description"]["identifier"])
    if "minecraft:fog_settings" in d:
        defined_other.add(d["minecraft:fog_settings"]["description"]["identifier"])
    for key in ("minecraft:recipe_shaped", "minecraft:recipe_shapeless", "minecraft:recipe_brewing_mix", "minecraft:recipe_furnace"):
        if key in d:
            defined_other.add(d[key]["description"]["identifier"])
    for key in ("minecraft:feature_rules", "minecraft:structure_template_feature", "minecraft:ore_feature", "minecraft:scatter_feature", "minecraft:single_block_feature"):
        if key in d:
            defined_other.add(d[key]["description"]["identifier"])
    if "minecraft:spawn_rules" in d:
        defined_other.add(d["minecraft:spawn_rules"]["description"]["identifier"])
state_names = set()
for p in blocks.values():
    for s in docs[p]["minecraft:block"]["description"].get("states", {}):
        state_names.add(s)
ignore_prefixes = ("sunrise:to_bat", "sunrise:from_bat", "sunrise:talked", "sunrise:skin", "sunrise:hunter_arrow")
script_files = glob.glob(os.path.join(BP, "scripts", "**", "*.js"), recursive=True)
for p in list(glob.glob(os.path.join(BP, "**", "*.json"), recursive=True)) + script_files:
    if "/entities/" in p and "/vanilla/" not in p:
        pass
    text = open(p, encoding="utf-8").read()
    for m in set(ID_RE.findall(text)):
        if m in known or m in defined_other or m in state_names or m in script_components or m.startswith(ignore_prefixes):
            continue
        if re.search(rf'"{re.escape(m)}"\s*:\s*\{{', text) and ("events" in text or "component_groups" in text):
            continue  # event / component group name
        if m.startswith("sunrise:blood_moon_fog"):
            continue
        err(f"{rel(p)}: unknown identifier '{m}'")

# 7. Lang keys ------------------------------------------------------------------------------------------
langs = {}
for p in glob.glob(os.path.join(RP, "texts", "*.lang")):
    keys = set()
    for line in open(p, encoding="utf-8-sig"):
        if "=" in line and not line.startswith("#"):
            keys.add(line.split("=", 1)[0].strip())
    langs[os.path.basename(p)] = keys
scripts_text = "\n".join(open(p, encoding="utf-8").read() for p in script_files)
used = set(re.findall(r'"(vc\.[a-z0-9_.]+)"', scripts_text)) - {"vc.wolf.howl"}
# Expand the dynamic keys.
sys.path.insert(0, os.path.dirname(__file__))
for f in ("vampire", "werewolf", "hunter"):
    for k in ("title", "sub", "tip"):
        used.add(f"vc.become.{f}.{k}")
    used.add(f"vc.infect.{f}.start")
    used.add(f"vc.hud.infect.{f}")
for f in ("human", "vampire", "werewolf", "hunter"):
    used.add(f"vc.faction.{f}")
skill_ids = {}
skills_src = open(os.path.join(BP, "scripts", "systems", "skills.js"), encoding="utf-8").read()
for fac in ("vampire", "werewolf", "hunter"):
    block = re.search(fac + r": \[(.*?)\n  \],", skills_src, re.S).group(1)
    skill_ids[fac] = re.findall(r'id: "([a-z_]+)"', block)
    for sid in skill_ids[fac]:
        used.add(f"vc.skill.{fac}.{sid}.name")
        used.add(f"vc.skill.{fac}.{sid}.desc")
        if not tex_exists(f"textures/ui/skill_{sid}"):
            err(f"skill icon missing: textures/ui/skill_{sid}.png")
menus = open(os.path.join(BP, "scripts", "ui", "menus.js"), encoding="utf-8").read()
topics = dict(re.findall(r'  (\w+): \[([^\]]+)\],', re.search(r"const TOPICS = \{(.*?)\n\};", menus, re.S).group(1)))
for topic, subs in topics.items():
    used.add(f"vc.codex.page.{topic}")
    used.add(f"vc.codex.{topic}.intro")
    for s in re.findall(r'"(\w+)"', subs):
        for k in ("title", "1", "2"):
            used.add(f"vc.codex.{topic}.{s}.{k}")
for pg in re.findall(r'\["(\w+)", "textures', menus):
    used.add(f"vc.codex.page.{pg}")
for i in range(1, 5):
    used.add(f"vc.eyes.{i}")
for st in ("vital", "agility", "combat"):
    used.add(f"vc.hunter.stat.{st}")
    used.add(f"vc.hunter.stat.{st}.desc")
hunter_src = open(os.path.join(BP, "scripts", "systems", "hunter.js"), encoding="utf-8").read()
missions = re.findall(r'\{ kind: "(\w+)"', re.search(r"export const MISSIONS = \[(.*?)\n\];", hunter_src, re.S).group(1))
for i, kind in enumerate(missions):
    if kind == "kill":
        used.add(f"vc.hunter.mission.{i}")
for m in re.findall(r'item: "(sunrise:[a-z_]+)"', hunter_src + skills_src):
    used.add(f"item.{m}.name")
for ident in list(items) + list(blocks):
    pref = "item" if ident in items else "tile"
    if ident in items and docs[items[ident]]["minecraft:item"]["description"].get("menu_category", {}).get("category") == "none":
        continue
    used.add(f"{pref}.{ident}.name")
for ident in entities:
    if not ident.startswith("minecraft:"):
        used.add(f"entity.{ident}.name")
for p, d in docs.items():
    def chk(o, path):
        if isinstance(o, dict) and isinstance(o.get("value"), str) and o["value"].startswith("item.sunrise"):
            used.add(o["value"])
    if p.startswith(os.path.join(BP, "items")):
        walk(d, chk)
for lang, keys in langs.items():
    for k in sorted(used - keys):
        err(f"{lang}: missing key {k}")

# 8. Script resources: textures, particles, sounds, animations -------------------------------------------
for t in set(re.findall(r'"(textures/[a-z0-9_/]+)"', scripts_text)):
    if not tex_exists(t):
        err(f"script texture missing: {t}")
particles = {d["particle_effect"]["description"]["identifier"] for d in docs.values() if isinstance(d, dict) and "particle_effect" in d}
for pid in set(re.findall(r'"((?:sunrise|minecraft):[a-z0-9_]+)"', scripts_text)):
    pass
for call in re.findall(r'(?:particle|particleAt|ring|spawnParticle)\([^"]*"([a-z]+:[a-z0-9_]+)"', scripts_text):
    if call.startswith("sunrise:") and call not in particles:
        err(f"script particle missing: {call}")
rp_sounds = set(docs.get(os.path.join(RP, "sounds", "sound_definitions.json"), {}).get("sound_definitions", {}).keys())
for snd in set(re.findall(r'"([a-z0-9_]+\.[a-z0-9_.]+)"', scripts_text)):
    if snd.startswith(("vc.", "animation.", "textures/")) and snd != "vc.wolf.howl":
        continue
    if not re.search(r'(?:sound|playSound)\([^\n]*"' + re.escape(snd) + '"', scripts_text):
        continue
    if snd not in rp_sounds and vanilla_sounds and snd not in vanilla_sounds:
        err(f"script sound missing: {snd}")
anims = set()
if SAMPLES:
    for p in glob.glob(os.path.join(SAMPLES, "resource_pack", "animations", "*.json")):
        try:
            anims |= set(load(p).get("animations", {}).keys())
        except Exception:  # noqa: BLE001
            pass
for p, d in docs.items():
    if isinstance(d, dict) and "animations" in d and p.startswith(os.path.join(RP, "animations")):
        anims |= set(d["animations"].keys())
for a in set(re.findall(r'"(animation\.[a-z0-9_.]+)"', scripts_text)):
    if a not in anims:
        err(f"script animation missing: {a}")
for p, d in docs.items():
    if p.startswith(os.path.join(RP, "attachables")):
        for k, v in d["minecraft:attachable"]["description"].get("animations", {}).items():
            if v.startswith("animation.") and v not in anims and not v.startswith(("animation.humanoid", "animation.player")):
                err(f"{rel(p)}: animation {v} missing")

# 9. Head items need an attachable -------------------------------------------------------------------------------
attach_ids = {d["minecraft:attachable"]["description"]["identifier"] for p, d in docs.items() if p.startswith(os.path.join(RP, "attachables"))}
for ident in items:
    if ident.split(":")[1].startswith("trans_") and ident not in attach_ids:
        err(f"cosmetic head {ident} has no attachable")

# 10. Client entities for every BP entity ---------------------------------------------------------------------------
client = {d["minecraft:client_entity"]["description"]["identifier"] for p, d in docs.items() if isinstance(d, dict) and "minecraft:client_entity" in d}
for e in entities:
    if not e.startswith("minecraft:") and e not in client:
        err(f"entity {e} has no client entity")

# 11. scriptevent commands in functions exist -----------------------------------------------------------------------
admin = open(os.path.join(BP, "scripts", "systems", "admin.js"), encoding="utf-8").read()
cmds = set(re.findall(r"^  (\w+): ", admin, re.M))
for p in glob.glob(os.path.join(BP, "functions", "**", "*.mcfunction"), recursive=True):
    for m in re.findall(r"scriptevent vc:(\w+)", open(p, encoding="utf-8").read()):
        if m not in cmds:
            err(f"{rel(p)}: scriptevent vc:{m} not handled")

# 12. Structures: files exist, loot tables in chests exist, block ids are known
try:
    import nbtlib
    for p, d in docs.items():
        st = d.get("minecraft:structure_template_feature") if isinstance(d, dict) else None
        if st:
            name = st["structure_name"].split(":", 1)[1]
            if not os.path.exists(os.path.join(BP, "structures", name + ".mcstructure")):
                err(f"{rel(p)}: structure file {name}.mcstructure missing")
    for f in glob.glob(os.path.join(BP, "structures", "*.mcstructure")):
        n = nbtlib.load(f, byteorder="little")
        s_ = n["structure"]
        size = [int(v) for v in n["size"]]
        if len(s_["block_indices"][0]) != size[0] * size[1] * size[2]:
            err(f"{rel(f)}: block index count mismatch")
        pal = s_["palette"]["default"]["block_palette"]
        for b in pal:
            bn = str(b["name"])
            if bn.startswith(("sunrise:", "thini:")) and bn not in blocks:
                err(f"{rel(f)}: unknown block {bn}")
        for v in s_["palette"]["default"].get("block_position_data", {}).values():
            lt = v.get("block_entity_data", {}).get("LootTable")
            if lt is not None and not os.path.exists(os.path.join(BP, str(lt))):
                err(f"{rel(f)}: loot table {lt} missing")
            ent = v.get("block_entity_data", {}).get("EntityIdentifier")
            if ent is not None and str(ent) not in entities:
                err(f"{rel(f)}: spawner entity {ent} unknown")
        for e in s_["entities"]:
            if str(e["identifier"]) not in entities and not str(e["identifier"]).startswith("minecraft:"):
                err(f"{rel(f)}: unknown entity {e['identifier']}")
except ImportError:
    warn("nbtlib not installed: structures not checked")

# 13. Glyph sheet ------------------------------------------------------------------------------------------------------
if not os.path.exists(os.path.join(RP, "font", "glyph_E1.png")):
    err("font/glyph_E1.png missing (HUD)")

for w in warnings:
    print("WARN ", w)
for e in errors:
    print("ERROR", e)
print(f"\n{len(docs)} JSON files, {len(items)} items, {len(blocks)} blocks, {len(entities)} entities, {len(used)} lang keys checked")
print(f"{len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
