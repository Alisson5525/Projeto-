#!/usr/bin/env python3
"""Verificação cruzada BP x RP: JSON válidos; partículas, animações do jogador, ícones de menu, itens e tabelas citados nos
scripts existem; itens têm textura no atlas e nome nos idiomas."""
import json, os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BP = os.path.join(ROOT, "Cronicas_de_Valdoria_BP")
RP = os.path.join(ROOT, "Cronicas_de_Valdoria_RP")
probs = []

def load(p):
    with open(p, encoding="utf-8") as f:
        txt = f.read()
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        # Bedrock tolera comentários // em alguns arquivos
        return json.loads(re.sub(r"^\s*//.*$", "", txt, flags=re.M))

n = 0
for pack in (BP, RP):
    for p in glob.glob(os.path.join(pack, "**", "*.json"), recursive=True):
        n += 1
        try:
            load(p)
        except Exception as e:
            probs.append(f"JSON inválido: {os.path.relpath(p, ROOT)}: {e}")

js = ""
for p in glob.glob(os.path.join(BP, "scripts", "**", "*.js"), recursive=True):
    js += open(p, encoding="utf-8").read() + "\n"

particles = {load(p)["particle_effect"]["description"]["identifier"] for p in glob.glob(os.path.join(RP, "particles", "**", "*.json"), recursive=True)}
used_particles = set()
for m in re.finditer(r'particle\([^,]+,\s*"([a-z_]+)"', js):
    used_particles.add(m.group(1))
for m in re.finditer(r'(?:particula|particle|impact|trail): "([a-z_]+)"', js):
    used_particles.add(m.group(1))
fxblock = re.search(r"SCHOOL_FX = \{(.*?)\};", js, re.S)
for m in re.finditer(r'"([a-z_]+)"', fxblock.group(1) if fxblock else ""):
    used_particles.add(m.group(1))
for name in sorted(used_particles):
    if f"valdoria:{name}" not in particles:
        probs.append(f"partícula usada nos scripts e ausente no RP: {name}")

anims = set()
for p in glob.glob(os.path.join(RP, "animations", "**", "*.json"), recursive=True):
    anims.update(load(p).get("animations", {}).keys())
for m in set(re.findall(r'"(animation\.valdoria\.[a-z0-9_.]+)"', js)) | {f"animation.valdoria.player.{x}" for x in re.findall(r'animation\.valdoria\.player\.\$\{', js) and []}:
    if m not in anims:
        probs.append(f"animação usada nos scripts e ausente no RP: {m}")
for m in re.findall(r'"(arma_[a-z_]+)"', js):
    if f"animation.valdoria.player.{m}" not in anims:
        probs.append(f"animação de arma ausente: {m}")

tex_items = os.path.join(RP, "textures", "items", "valdoria")
for m in set(re.findall(r'ICON\("([a-z_0-9]+)"\)', js)) | set(re.findall(r'textures/items/valdoria/([a-z_0-9]+)', js)):
    if not os.path.exists(os.path.join(tex_items, m + ".png")):
        probs.append(f"ícone de menu inexistente: {m}")
icon_map = re.findall(r'TYPE_ICON = \{([^}]+)\}', js, re.S)
for block in icon_map:
    for m in re.findall(r':\s*"([a-z_0-9]+)"', block):
        if not os.path.exists(os.path.join(tex_items, m + ".png")):
            probs.append(f"ícone de local inexistente: {m}")

items = set()
for p in glob.glob(os.path.join(BP, "items", "**", "*.json"), recursive=True):
    d = load(p)["minecraft:item"]
    items.add(d["description"]["identifier"])
atlas = load(os.path.join(RP, "textures", "item_texture.json"))["texture_data"]
langs = {l: open(os.path.join(RP, "texts", f"{l}.lang"), encoding="utf-8").read() for l in ("pt_BR", "en_US", "pt_PT")}
for p in glob.glob(os.path.join(BP, "items", "**", "*.json"), recursive=True):
    d = load(p)["minecraft:item"]
    iid = d["description"]["identifier"]
    icon = d["components"].get("minecraft:icon")
    icon = icon if isinstance(icon, str) else (icon or {}).get("texture") or (icon or {}).get("textures", {}).get("default")
    if icon and icon not in atlas:
        probs.append(f"item {iid}: ícone '{icon}' fora do atlas")
    elif icon:
        t = atlas[icon]["textures"]
        t = t if isinstance(t, str) else t[0]
        if not os.path.exists(os.path.join(RP, t + ".png")):
            probs.append(f"item {iid}: textura {t} inexistente")
    for l, txt in langs.items():
        if f"item.{iid}.name=" not in txt:
            probs.append(f"item {iid}: sem nome em {l}")

entities = {load(p)["minecraft:entity"]["description"]["identifier"] for p in glob.glob(os.path.join(BP, "entities", "**", "*.json"), recursive=True)}
blocks = {load(p)["minecraft:block"]["description"]["identifier"] for p in glob.glob(os.path.join(BP, "blocks", "**", "*.json"), recursive=True)}
known = items | entities | blocks
refs = set(re.findall(r'I\("([a-z_0-9]+)"\)', js))
refs |= set(re.findall(r'(?:spawnEntity|new ItemStack|spawnGuard)\([^`"\n]*[`"](?:\$\{NS\}:|valdoria:)([a-z_0-9]+)', js))
refs |= set(re.findall(r'\[`\$\{NS\}:([a-z_0-9]+)`, \d+\]', js))  # [item, quantidade]
refs |= {t for t in re.findall(r'tipo: `\$\{NS\}:([a-z_0-9]+)`', js) if t != "tipo"}  # "tipo: `${NS}:tipo`" é chave de propriedade
refs |= set(re.findall(r'item: `\$\{NS\}:([a-z_0-9]+)`', js))
for iid in sorted(refs):
    if f"valdoria:{iid}" not in known:
        probs.append(f"identificador citado nos scripts sem item/entidade/bloco: valdoria:{iid}")

print(f"{n} arquivos JSON lidos; {len(used_particles)} partículas, {len(anims)} animações, {len(items)} itens verificados.")
for p in probs:
    print("  -", p)
print("OK: nenhuma inconsistência." if not probs else f"{len(probs)} inconsistência(s).")
sys.exit(1 if probs else 0)
