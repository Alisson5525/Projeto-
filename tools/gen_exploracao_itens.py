#!/usr/bin/env python3
"""Gera os itens de exploração da Edição Definitiva: JSON do item (BP), textura 16x16 desenhada em pixel art (RP),
entrada no atlas de itens e nomes nos arquivos de idioma. Idempotente: pode ser executado de novo sem duplicar nada."""
import json, os, re, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BP = os.path.join(ROOT, "Cronicas_de_Valdoria_BP")
RP = os.path.join(ROOT, "Cronicas_de_Valdoria_RP")

RAR_COLOR = {"comum": "§f", "incomum": "§a", "raro": "§9", "epico": "§d", "lendario": "§6"}

# id: (nome, raridade, pasta, pilha, tags extras, brilho, paleta, desenho)
ITEMS = {
 "fragmento_mapa": ("Fragmento de Mapa Antigo", "epico", "quest", 8, ["valdoria:map_fragment"], False,
  {"P": "6b4a22", "p": "e3c890", "q": "cbae72", "R": "a8322a", "b": "4a78b0", "g": "5d8a3c"},
  ["................",
   "..PPPP..........",
   ".Pppppp.PPP.....",
   ".PpqgggpppPP....",
   ".PpgggqRpppP....",
   ".PpqpppRpqppP...",
   "..PpppqpRpppP...",
   "..PbbppppRppP...",
   ".Pbbbqppp.R.P...",
   ".Ppbbpppp.RRP...",
   ".PppppqpRpRpP...",
   "..PpppppppRpP...",
   "..PpqpppRpRpP...",
   "...PPpppppppP...",
   ".....PPP.PPP....",
   "................"]),
 "mapa_reis": ("Mapa dos Reis Esquecidos", "lendario", "quest", 1, ["valdoria:map_kings"], True,
  {"P": "5a3a18", "p": "ead6a2", "q": "cfb276", "R": "9a2a24", "G": "f2c032", "Y": "a67a12", "b": "3c6aa0", "g": "4f7d34", "w": "ffffff"},
  ["................",
   ".PPPPPPPPPPPPPP.",
   ".PpppqpppqpppqP.",
   ".PpggppRpppbbpP.",
   ".PpgppRppppbbpP.",
   ".PpqpRpppqppbpP.",
   ".PppRppGpGppppP.",
   ".PpRpppGGGpqppP.",
   ".PppRppYGYppppP.",
   ".PpqpRRppppRpqP.",
   ".PpppppRRpRpRpP.",
   ".PpggpppppRwRpP.",
   ".PpgggpqpppRpqP.",
   ".PpppppppppppqP.",
   ".PPPPPPPPPPPPPP.",
   "................"]),
 "chave_antiga": ("Chave Antiga", "raro", "key", 16, ["valdoria:key"], False,
  {"K": "3a2410", "B": "b07a3a", "b": "7e5226", "h": "e0b070", "r": "6a8a4a"},
  ["................",
   "..........KKKK..",
   ".........KBBhBK.",
   "........KBbKKbBK",
   "........KBK..KBK",
   "........KbK..KbK",
   ".........KBbbBK.",
   "........KBKKKK..",
   ".......KBK......",
   "......KBK.......",
   ".....KBK........",
   "....KBrK........",
   "...KBKBK........",
   "..KBbKBK........",
   "..KKKKK.........",
   "................"]),
 "tomo_perdido": ("Tomo Perdido", "epico", "quest", 1, ["valdoria:tome"], True,
  {"K": "1e1030", "C": "5a2a8a", "c": "3c1a60", "G": "f0c040", "g": "a07a20", "p": "eadcb8", "q": "c4b48c", "A": "9ef2ff"},
  ["................",
   "...KKKKKKKKKK...",
   "..KCCCCCCCCCcK..",
   "..KCGGGGGGGGcK..",
   "..KCGcccccGCcKp.",
   "..KCGcAAAcGCcKp.",
   "..KCGcAcAcGCcKq.",
   "..KCGcAAAcGCcKp.",
   "..KCGcccccGCcKp.",
   "..KCGGGGGGGGcKq.",
   "..KCCCCCCCCCcKp.",
   "..KCCgGgCCCCcKp.",
   "..KCCCCCCCCCcKq.",
   "..KKKKKKKKKKKKp.",
   "...pqpqpqpqpqp..",
   "................"]),
 "anel_vigia": ("Anel da Sentinela", "incomum", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "2a2a30", "S": "c8ccd4", "s": "8a8e98", "w": "ffffff", "E": "3fbf5a", "e": "1f7a34"},
  ["................",
   "................",
   "......KKKK......",
   ".....KEEwEK.....",
   ".....KEEEeK.....",
   "......KeeK......",
   "....KKSSSSKK....",
   "...KSsK..KsSK...",
   "...KSK....KSK...",
   "...KSK....KsK...",
   "...KSK....KsK...",
   "...KsSK..KsSK...",
   "....KKssssKK....",
   "......KKKK......",
   "................",
   "................"]),
 "amuleto_mineiro": ("Amuleto do Mineiro Anão", "raro", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "2a1c10", "c": "8a8a90", "B": "c08a3a", "b": "7a5222", "O": "ff9a2a", "o": "ffd47a", "s": "b0b4bc"},
  ["................",
   "..c..........c..",
   "...c........c...",
   "....c......c....",
   ".....c....c.....",
   "......cKKc......",
   ".....KBBBBK.....",
   "....KBbssbBK....",
   "....KBsOOsBK....",
   "....KBsooOBK....",
   "....KBsOOsBK....",
   "....KBbssbBK....",
   ".....KBBBBK.....",
   "......KbbK......",
   ".......KK.......",
   "................"]),
 "estandarte_comandante": ("Estandarte do Comandante Caído", "epico", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "1a1010", "W": "6a4a2a", "w": "4a3018", "R": "a8242a", "r": "701820", "G": "e8b840", "g": "9a7a24"},
  ["....GG..........",
   "....WW..........",
   "....WWKKKKKKKK..",
   "....WWRRRRRRRRK.",
   "....WWRRrRRRRRK.",
   "....WWRGGGGGRrK.",
   "....WWRGRRRGRRK.",
   "....WWRGGRGGRrK.",
   "....WWRRGGGRRRK.",
   "....WWRrRGRRrRK.",
   "....WWRRRRRrRK..",
   "....WWRRrRRRK...",
   "....WwKRRK.RK...",
   "....Ww.KK...K...",
   "....Ww..........",
   "....ww..........",
   ]),
 "sino_runico": ("Sino Rúnico de Bolso", "epico", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "2a1a08", "B": "d8a040", "b": "9a6a20", "h": "f8dc8a", "A": "6ff0ff", "a": "2ab0d0"},
  ["................",
   "......KKKK......",
   "......KbbK......",
   ".......KK.......",
   "......KBBK......",
   ".....KBhBBK.....",
   ".....KBhAbK.....",
   "....KBhBAaBK....",
   "....KBhAAAbK....",
   "....KBBBAbBK....",
   "...KBhBBABBbK...",
   "...KBBBBBBBbK...",
   "..KbbbbbbbbbbK..",
   "..KKKKKbbKKKKK..",
   "......KbbK......",
   ".......KK......."]),
 "lanterna_fadas": ("Lanterna das Fadas", "epico", "accessory", 1, ["valdoria:accessory"], True,
  {"K": "1c2a1c", "M": "5a6a5a", "m": "3a4a3a", "G": "b8ffb0", "g": "6ae070", "P": "ffb0f0", "w": "ffffff", "v": "4a8a3a"},
  ["................",
   ".......KK.......",
   "......K..K......",
   ".......KK.......",
   ".....KMMMMK.....",
   "....KMmmmmMK....",
   "....KmGgGgmK....",
   "....KmgwPGmK.v..",
   "....KmGPwgmK.vv.",
   "....KmgGgGmK..v.",
   "....KmGgPgmK....",
   "....KMmmmmMK....",
   ".....KMMMMK.....",
   "......KmmK......",
   "................",
   "................"]),
 "medalhao_purificado": ("Medalhão Purificado", "epico", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "3a2a10", "c": "c8b070", "G": "f0d060", "g": "b08a24", "W": "fffaf0", "w": "e8e0c8", "Y": "fff2a0"},
  ["................",
   "..c..........c..",
   "...c........c...",
   "....c......c....",
   ".....c....c.....",
   "......cKKc......",
   ".....KGGGGK.....",
   "....KGgWWgGK....",
   "...KGgWYYWgGK...",
   "...KGWYWWYWGK...",
   "...KGWYWWYWGK...",
   "...KGgWYYWgGK...",
   "....KGgwwgGK....",
   ".....KGGGGK.....",
   "......KKKK......",
   "................"]),
 "coroa_reis_esquecidos": ("Coroa dos Reis Esquecidos", "lendario", "accessory", 1, ["valdoria:accessory"], True,
  {"K": "3a2208", "G": "f2c234", "g": "a8781a", "h": "fff0a0", "R": "d02a3a", "B": "2a6ad8", "E": "2ab05a", "s": "6a6a6a"},
  ["................",
   "................",
   "..K....K....K...",
   ".KhK..KhK..KhK..",
   ".KGK..KGK..KGK..",
   ".KGGK.KGK.KGGK..",
   ".KGgGKGRGKGgGK..",
   ".KGGgGGGGGgGGK..",
   ".KhGGgGGGgGGhK..",
   ".KGGGGGGGGGGGK..",
   ".KGBGGGEGGGRGK..",
   ".KgGGgGGGgGGgK..",
   ".KgggsgggsgggK..",
   "..KKKKKKKKKKK...",
   "................",
   "................"]),
 "anel_bibliotecario": ("Anel do Bibliotecário", "raro", "accessory", 1, ["valdoria:accessory"], False,
  {"K": "1a1a2a", "G": "d8b048", "g": "8a6a20", "B": "4a7ae8", "b": "2a4aa0", "w": "d8e8ff"},
  ["................",
   "................",
   "......KKKK......",
   ".....KBwBBK.....",
   ".....KBBBbK.....",
   "......KbbK......",
   "....KKGGGGKK....",
   "...KGgK..KgGK...",
   "...KGK....KGK...",
   "...KGK....KgK...",
   "...KGK....KgK...",
   "...KgGK..KgGK...",
   "....KKggggKK....",
   "......KKKK......",
   "................",
   "................"]),
}

def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def draw(pal, rows):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows[:16]):
        for x, ch in enumerate(row[:16]):
            if ch != "." and ch in pal:
                im.putpixel((x, y), hexrgb(pal[ch]) + (255,))
    return im

def item_json(iid, folder, stack, tags, rarity, glint):
    cat = "equipment" if folder == "accessory" else "items"
    comp = {
        "minecraft:icon": f"valdoria_{iid}",
        "minecraft:max_stack_size": stack,
        "minecraft:display_name": {"value": f"item.valdoria:{iid}.name"},
        "minecraft:tags": {"tags": tags + [f"valdoria:rarity_{rarity}"]},
    }
    if glint:
        comp["minecraft:glint"] = True
    return {"format_version": "1.21.90", "minecraft:item": {
        "description": {"identifier": f"valdoria:{iid}", "menu_category": {"category": cat}}, "components": comp}}

def main():
    atlas_path = os.path.join(RP, "textures", "item_texture.json")
    atlas = json.load(open(atlas_path, encoding="utf-8"))
    for iid, (nome, rar, folder, stack, tags, glint, pal, rows) in ITEMS.items():
        d = os.path.join(BP, "items", folder)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, f"{iid}.json"), "w", encoding="utf-8") as f:
            json.dump(item_json(iid, folder, stack, tags, rar, glint), f, ensure_ascii=False, indent=2)
        draw(pal, rows).save(os.path.join(RP, "textures", "items", "valdoria", f"{iid}.png"))
        atlas["texture_data"][f"valdoria_{iid}"] = {"textures": f"textures/items/valdoria/{iid}"}
    with open(atlas_path, "w", encoding="utf-8") as f:
        json.dump(atlas, f, ensure_ascii=False, indent=2)
    for pack in (BP, RP):
        for lang in ("pt_BR", "pt_PT", "en_US"):
            p = os.path.join(pack, "texts", f"{lang}.lang")
            if not os.path.exists(p):
                continue
            txt = open(p, encoding="utf-8").read()
            add = []
            for iid, (nome, rar, *_r) in ITEMS.items():
                key = f"item.valdoria:{iid}"
                if f"\n{key}=" in "\n" + txt:
                    continue
                add.append(f"{key}={RAR_COLOR[rar]}{nome}")
                add.append(f"{key}.name={RAR_COLOR[rar]}{nome}")
            if add:
                if not txt.endswith("\n"):
                    txt += "\n"
                txt += "\n".join(add) + "\n"
                open(p, "w", encoding="utf-8").write(txt)
    print(f"{len(ITEMS)} itens de exploração gerados.")

if __name__ == "__main__":
    main()
