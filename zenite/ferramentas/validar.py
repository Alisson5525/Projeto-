#!/usr/bin/env python3
"""Validador estático do add-on Zênite.

Confere tudo o que o jogo só reclamaria em tempo de execução: JSON inválido,
UUIDs repetidos, texturas/geometrias/partículas/sons inexistentes, chaves de
idioma faltando em uma das línguas, itens de receita que não existem, ids
vanilla digitados errado nos scripts e tamanhos de imagem fora do padrão.

Uso: python3 ferramentas/validar.py   (sai com código 1 se houver erro)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BP = RAIZ / "BP"
RP = RAIZ / "RP"
SCRIPTS = BP / "scripts"
VANILLA_DATA = RAIZ / "node_modules" / "@minecraft" / "vanilla-data" / "lib" / "index.js"
AMOSTRAS = Path("/home/user/mojang/bedrock-samples/resource_pack")

erros: list[str] = []
avisos: list[str] = []


def erro(msg: str) -> None:
    erros.append(msg)


def aviso(msg: str) -> None:
    avisos.append(msg)


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(RAIZ))
    except ValueError:
        return str(p)


def ler_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        erro(f"JSON inválido em {rel(p)}: {e}")
        return None


# ------------------------------------------------------------------ JSON
JSONS: dict[Path, object] = {}
for pasta in (BP, RP):
    for p in sorted(pasta.rglob("*.json")):
        d = ler_json(p)
        if d is not None:
            JSONS[p] = d


def json_de(p: Path):
    return JSONS.get(p)


# ------------------------------------------------------------------ vanilla
IDS_VANILLA: set[str] = set()
# Ids que existem no jogo mas não são exportados pelo @minecraft/vanilla-data.
IDS_VANILLA_EXTRA = {"minecraft:end_gateway", "minecraft:item", "minecraft:leash_knot", "minecraft:falling_block"}
if VANILLA_DATA.exists():
    IDS_VANILLA = set(re.findall(r'"(minecraft:[a-z0-9_.]+)"', VANILLA_DATA.read_text(encoding="utf-8"))) | IDS_VANILLA_EXTRA
else:
    aviso("node_modules/@minecraft/vanilla-data ausente: ids vanilla não serão checados (rode npm install)")

SONS_VANILLA: set[str] = set()
PARTICULAS_VANILLA: set[str] = set()
if AMOSTRAS.exists():
    sd = AMOSTRAS / "sounds" / "sound_definitions.json"
    if sd.exists():
        SONS_VANILLA = set(json.loads(sd.read_text(encoding="utf-8")).get("sound_definitions", {}).keys())
    for p in (AMOSTRAS / "particles").glob("*.json"):
        try:
            PARTICULAS_VANILLA.add(json.loads(p.read_text(encoding="utf-8"))["particle_effect"]["description"]["identifier"])
        except Exception:  # noqa: BLE001
            pass

GEOMETRIAS_VANILLA = {
    "geometry.player.armor.helmet", "geometry.player.armor.chestplate", "geometry.player.armor.leggings",
    "geometry.player.armor.boots", "geometry.humanoid.armor.helmet", "geometry.humanoid.armor.chestplate",
    "geometry.humanoid.armor.leggings", "geometry.humanoid.armor.boots",
}
TEXTURAS_VANILLA = {"textures/misc/enchanted_actor_glint", "textures/misc/enchanted_item_glint"}
RENDER_VANILLA = {"controller.render.armor", "controller.render.default", "controller.render.item_default"}


# ------------------------------------------------------------------ manifests
def checar_manifests() -> None:
    mbp, mrp = json_de(BP / "manifest.json"), json_de(RP / "manifest.json")
    if not mbp or not mrp:
        erro("manifest.json ausente no BP ou no RP")
        return
    uuids = [mbp["header"]["uuid"], mrp["header"]["uuid"]]
    uuids += [m["uuid"] for m in mbp["modules"]] + [m["uuid"] for m in mrp["modules"]]
    if len(uuids) != len(set(uuids)):
        erro("UUIDs repetidos entre os manifests")
    for m in (mbp, mrp):
        if m.get("format_version") != 2:
            erro("manifest com format_version diferente de 2")
        if m["header"].get("min_engine_version") != [1, 21, 120]:
            erro("min_engine_version deve ser [1, 21, 120]")
    deps_bp = {d.get("uuid") for d in mbp.get("dependencies", [])}
    if mrp["header"]["uuid"] not in deps_bp:
        erro("BP não depende do RP")
    if mbp["header"]["uuid"] not in {d.get("uuid") for d in mrp.get("dependencies", [])}:
        erro("RP não depende do BP")
    modulos = {d.get("module_name"): d.get("version") for d in mbp.get("dependencies", []) if d.get("module_name")}
    if modulos.get("@minecraft/server") != "2.3.0" or modulos.get("@minecraft/server-ui") != "2.0.0":
        erro(f"versões de script erradas: {modulos}")
    for mod in mbp["modules"]:
        if mod["type"] == "script" and not (BP / mod["entry"]).exists():
            erro(f"entry de script inexistente: {mod['entry']}")


# ------------------------------------------------------------------ idiomas
def ler_lang(p: Path) -> dict[str, str]:
    saida: dict[str, str] = {}
    if not p.exists():
        erro(f"arquivo de idioma ausente: {rel(p)}")
        return saida
    for n, linha in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        if not linha.strip() or linha.startswith("##"):
            continue
        if "=" not in linha:
            erro(f"{rel(p)}:{n}: linha sem '='")
            continue
        k, val = linha.split("=", 1)
        if k != k.strip() or not k:
            erro(f"{rel(p)}:{n}: chave com espaços")
        if k in saida:
            erro(f"{rel(p)}:{n}: chave duplicada {k}")
        if "\t#" in val:
            aviso(f"{rel(p)}:{n}: comentário inline")
        saida[k] = val
    return saida


LANG: dict[str, dict[str, dict[str, str]]] = {}


def checar_idiomas() -> None:
    for nome, pasta in (("BP", BP), ("RP", RP)):
        lista = json_de(pasta / "texts" / "languages.json") or []
        if sorted(lista) != ["en_US", "pt_BR"]:
            erro(f"{nome}/texts/languages.json deve listar en_US e pt_BR")
        LANG[nome] = {lg: ler_lang(pasta / "texts" / f"{lg}.lang") for lg in ("en_US", "pt_BR")}
        a, b = set(LANG[nome]["en_US"]), set(LANG[nome]["pt_BR"])
        for k in sorted(a - b):
            erro(f"{nome}: chave só no en_US: {k}")
        for k in sorted(b - a):
            erro(f"{nome}: chave só no pt_BR: {k}")


def exigir_chave(k: str, origem: str) -> None:
    for lg in ("en_US", "pt_BR"):
        if k not in LANG.get("RP", {}).get(lg, {}):
            erro(f"chave de idioma '{k}' (usada em {origem}) não existe em RP/texts/{lg}.lang")


# ------------------------------------------------------------------ texturas
def png_existe(caminho_sem_ext: str) -> bool:
    return (RP / f"{caminho_sem_ext}.png").exists() or (RP / f"{caminho_sem_ext}.tga").exists()


def exigir_textura(caminho: str, origem: str) -> None:
    if caminho in TEXTURAS_VANILLA:
        return
    if not png_existe(caminho):
        erro(f"textura inexistente '{caminho}' (usada em {origem})")


def atalhos_textura(arquivo: str) -> dict[str, list[str]]:
    d = json_de(RP / "textures" / arquivo)
    out: dict[str, list[str]] = {}
    if not d:
        return out
    for nome, ent in d.get("texture_data", {}).items():
        t = ent.get("textures")
        lista = t if isinstance(t, list) else [t]
        caminhos = [x["path"] if isinstance(x, dict) else x for x in lista]
        out[nome] = caminhos
        for c in caminhos:
            exigir_textura(c, f"textures/{arquivo}:{nome}")
    return out


GEOMETRIAS: set[str] = set()
NEVOAS: set[str] = set()
ANIMACOES: set[str] = set()
RENDERS: set[str] = set()
PARTICULAS: set[str] = set()
SONS: set[str] = set()


def coletar_rp() -> tuple[dict, dict]:
    itens = atalhos_textura("item_texture.json")
    terreno = atalhos_textura("terrain_texture.json")
    fb = json_de(RP / "textures" / "flipbook_textures.json") or []
    for ent in fb:
        exigir_textura(ent["flipbook_texture"], "flipbook_textures.json")
        if ent["atlas_tile"] not in terreno:
            erro(f"flipbook atlas_tile '{ent['atlas_tile']}' não existe em terrain_texture.json")
    for p, d in JSONS.items():
        if RP not in p.parents:
            continue
        if "minecraft:geometry" in d:
            for g in d["minecraft:geometry"]:
                GEOMETRIAS.add(g["description"]["identifier"])
        if "animations" in d and p.parent.name == "animations":
            ANIMACOES.update(d["animations"].keys())
        if "render_controllers" in d:
            RENDERS.update(d["render_controllers"].keys())
        if "minecraft:fog_settings" in d:
            NEVOAS.add(d["minecraft:fog_settings"]["description"]["identifier"])
        if "particle_effect" in d:
            pe = d["particle_effect"]
            PARTICULAS.add(pe["description"]["identifier"])
            tex = pe["description"]["basic_render_parameters"]["texture"]
            if not tex.startswith("textures/particle/particles"):
                exigir_textura(tex, rel(p))
    sd = json_de(RP / "sounds" / "sound_definitions.json")
    if sd:
        for nome, ent in sd.get("sound_definitions", {}).items():
            SONS.add(nome)
            for s in ent.get("sounds", []):
                caminho = s["name"] if isinstance(s, dict) else s
                if not (RP / f"{caminho}.ogg").exists():
                    erro(f"som '{nome}' aponta para {caminho}.ogg, que não existe")
    return itens, terreno


def checar_entidades_cliente() -> None:
    for pasta in ("entity", "attachables"):
        for p in sorted((RP / pasta).glob("*.json")):
            d = json_de(p)
            if not d:
                continue
            desc = (d.get("minecraft:client_entity") or d.get("minecraft:attachable") or {}).get("description", {})
            for t in desc.get("textures", {}).values():
                exigir_textura(t, rel(p))
            for g in desc.get("geometry", {}).values():
                if g not in GEOMETRIAS and g not in GEOMETRIAS_VANILLA:
                    erro(f"geometria '{g}' (em {rel(p)}) não existe")
            for a in desc.get("animations", {}).values():
                if a not in ANIMACOES and not a.startswith(("animation.armor.", "animation.common.", "animation.humanoid.", "controller.animation.humanoid")):
                    erro(f"animação '{a}' (em {rel(p)}) não existe")
            for r in desc.get("render_controllers", []):
                nome_r = r if isinstance(r, str) else next(iter(r))
                if nome_r not in RENDERS and nome_r not in RENDER_VANILLA:
                    erro(f"render controller '{nome_r}' (em {rel(p)}) não existe")


# ------------------------------------------------------------------ behavior pack
ITENS_BP: set[str] = set()
BLOCOS_BP: set[str] = set()
ENTIDADES_BP: set[str] = set()


def checar_bp(itens_tex: dict, terreno: dict) -> None:
    for p in sorted((BP / "items").glob("*.json")):
        d = json_de(p)
        if not d:
            continue
        it = d["minecraft:item"]
        ident = it["description"]["identifier"]
        ITENS_BP.add(ident)
        comps = it.get("components", {})
        icone = comps.get("minecraft:icon")
        nome = icone if isinstance(icone, str) else (icone or {}).get("textures", {}).get("default")
        if not nome:
            erro(f"{rel(p)}: item sem minecraft:icon")
        elif nome not in itens_tex:
            erro(f"{rel(p)}: ícone '{nome}' não existe em item_texture.json")
        dn = comps.get("minecraft:display_name", {}).get("value")
        if not dn:
            erro(f"{rel(p)}: item sem minecraft:display_name")
        else:
            exigir_chave(dn, rel(p))
    for p in sorted((BP / "blocks").glob("*.json")):
        d = json_de(p)
        if not d:
            continue
        bl = d["minecraft:block"]
        ident = bl["description"]["identifier"]
        BLOCOS_BP.add(ident)
        for inst in bl.get("components", {}).get("minecraft:material_instances", {}).values():
            if inst.get("texture") not in terreno:
                erro(f"{rel(p)}: textura de bloco '{inst.get('texture')}' não existe em terrain_texture.json")
        exigir_chave(f"tile.{ident}.name", rel(p))
    for p in sorted((BP / "entities").glob("*.json")):
        d = json_de(p)
        if not d:
            continue
        en = d["minecraft:entity"]
        ident = en["description"]["identifier"]
        ENTIDADES_BP.add(ident)
        if not (RP / "entity").exists() or not any(
            (json_de(c) or {}).get("minecraft:client_entity", {}).get("description", {}).get("identifier") == ident
            for c in (RP / "entity").glob("*.json")
        ):
            erro(f"entidade {ident} sem definição de cliente em RP/entity")
        exigir_chave(f"entity.{ident}.name", rel(p))
        exigir_chave(f"item.spawn_egg.entity.{ident}.name", rel(p))
        texto = json.dumps(en)
        for lt in re.findall(r'"table":\s*"([^"]+)"', texto):
            if not (BP / lt).exists():
                erro(f"{rel(p)}: loot table inexistente {lt}")
    for p in sorted((BP / "recipes").glob("*.json")):
        d = json_de(p)
        if d:
            for ident in re.findall(r'"item":\s*"([a-z_]+:[a-z0-9_]+)"', json.dumps(d)):
                exigir_item(ident, rel(p))
    for p in sorted((BP / "loot_tables").rglob("*.json")):
        d = json_de(p)
        if d:
            for ent in re.findall(r'"name":\s*"([a-z_]+:[a-z0-9_]+)"', json.dumps(d)):
                exigir_item(ent, rel(p))


def exigir_item(ident: str, origem: str) -> None:
    if ident.startswith("zenite:"):
        if ident not in ITENS_BP and ident not in BLOCOS_BP:
            erro(f"item '{ident}' (em {origem}) não existe no BP")
    elif IDS_VANILLA and ident not in IDS_VANILLA:
        erro(f"id vanilla desconhecido '{ident}' (em {origem})")


# ------------------------------------------------------------------ scripts
MODULOS_PERMITIDOS = {"@minecraft/server", "@minecraft/server-ui"}


def bloco_objeto(texto: str, nome: str) -> str:
    m = re.search(rf"export const {nome}\s*=\s*(?:Object\.freeze\()?\{{", texto)
    if not m:
        return ""
    i, prof = m.end() - 1, 0
    for j in range(i, len(texto)):
        if texto[j] == "{":
            prof += 1
        elif texto[j] == "}":
            prof -= 1
            if prof == 0:
                return texto[i : j + 1]
    return ""


def checar_scripts() -> None:
    if not SCRIPTS.exists():
        return
    arquivos = sorted(SCRIPTS.rglob("*.js"))
    textos = {p: p.read_text(encoding="utf-8") for p in arquivos}
    config = SCRIPTS / "core" / "config.js"
    ids_livres: set[str] = set()
    if config.exists():
        tc = config.read_text(encoding="utf-8")
        for nome in ("CHAVES", "COMANDOS"):
            ids_livres |= set(re.findall(r"""['"](zenite:[a-z0-9_]+)['"]""", bloco_objeto(tc, nome)))
    for p, t in textos.items():
        for imp in re.findall(r"""(?:from|import)\s*['"]([^'"]+)['"]""", t):
            if imp.startswith("."):
                if not (p.parent / imp).resolve().exists():
                    erro(f"{rel(p)}: import relativo inexistente {imp}")
            elif imp not in MODULOS_PERMITIDOS:
                erro(f"{rel(p)}: módulo não permitido {imp}")
        for ident in re.findall(r"""['"`](minecraft:[a-z0-9_]+)['"`]""", t):
            if IDS_VANILLA and ident not in IDS_VANILLA:
                erro(f"{rel(p)}: id vanilla desconhecido {ident}")
        for ident in re.findall(r"""['"`](zenite:[a-z0-9_]+)['"`]""", t):
            if ident not in ITENS_BP | BLOCOS_BP | ENTIDADES_BP | PARTICULAS | NEVOAS | ids_livres:
                erro(f"{rel(p)}: id zenite desconhecido {ident}")
        for k in re.findall(r"""\btr\(\s*['"]([^'"]+)['"]""", t):
            exigir_chave(k, rel(p))
        for k in re.findall(r"""translate:\s*['"]([^'"]+)['"]""", t):
            exigir_chave(k, rel(p))
    config = SCRIPTS / "core" / "config.js"
    if config.exists():
        t = textos[config]
        for nome, conjunto, vanilla, tipo in (("SONS", SONS, SONS_VANILLA, "som"), ("PARTICULAS", PARTICULAS, PARTICULAS_VANILLA, "partícula")):
            for ident in re.findall(r"""['"]([a-z_]+[:.][a-z0-9_.]+)['"]""", bloco_objeto(t, nome)):
                if ident not in conjunto and ident not in vanilla:
                    erro(f"{tipo} '{ident}' (core/config.js {nome}) não está definido")
        m = re.search(r"export const TECNICAS\s*=\s*Object\.freeze\(\[(.*?)\]\);", t, re.S)
        if not m:
            erro("core/config.js: TECNICAS não encontrado")
        for tec in re.findall(r"""\bid:\s*['"]([a-z_]+)['"]""", m.group(1) if m else ""):
            for suf in ("nome", "desc"):
                exigir_chave(f"zenite.tec.{tec}.{suf}", "core/config.js")


# ------------------------------------------------------------------ imagens
TAMANHOS = {
    "textures/models/armor/zenite_1.png": (64, 32),
    "textures/models/armor/zenite_2.png": (64, 32),
    "textures/models/armor/zenite_diadema.png": (64, 64),
    "textures/entity/zenite/arconte.png": (128, 128),
    "textures/particle/zenite.png": (128, 128),
    "font/glyph_E7.png": (256, 256),
}


def checar_imagens() -> None:
    for caminho, tam in TAMANHOS.items():
        p = RP / caminho
        if p.exists() and Image.open(p).size != tam:
            erro(f"{caminho} deveria ter {tam}, tem {Image.open(p).size}")
    for p in sorted((RP / "textures" / "items").rglob("*.png")):
        if Image.open(p).size != (16, 16):
            erro(f"{rel(p)} deveria ter 16x16")
    for p in sorted((RP / "textures" / "ui").rglob("*.png")):
        if Image.open(p).size != (32, 32):
            erro(f"{rel(p)} deveria ter 32x32")
    for p in sorted((RP / "textures" / "blocks").rglob("*.png")):
        w, h = Image.open(p).size
        if w != 16 or h % 16:
            erro(f"{rel(p)} deveria ter 16 de largura e altura múltipla de 16")
    for pasta in (BP, RP):
        ic = pasta / "pack_icon.png"
        if not ic.exists():
            erro(f"{rel(ic)} ausente")
        else:
            w, h = Image.open(ic).size
            if w != h:
                erro(f"{rel(ic)} não é quadrado")


def main() -> int:
    checar_manifests()
    checar_idiomas()
    itens_tex, terreno = coletar_rp()
    checar_entidades_cliente()
    checar_bp(itens_tex, terreno)
    checar_scripts()
    checar_imagens()
    for a in avisos:
        print(f"aviso: {a}")
    if erros:
        for e in erros:
            print(f"ERRO: {e}")
        print(f"\n{len(erros)} erro(s).")
        return 1
    print(
        f"OK — {len(JSONS)} JSONs, {len(ITENS_BP)} itens, {len(BLOCOS_BP)} blocos, {len(ENTIDADES_BP)} entidades, "
        f"{len(PARTICULAS)} partículas, {len(SONS)} sons, {len(GEOMETRIAS)} geometrias"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
