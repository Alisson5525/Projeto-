"""Pixel-art generator for Vampire Craft 5 UI assets.

Creates (in the resource pack):
  font/glyph_E1.png          HUD glyph sheet (U+E100..U+E10F), 16x16 cells
  textures/ui/skill_*.png     new skill icons in the same bevelled 24x24 frame
  textures/ui/hunter_*.png    hunter guild icons
  textures/ui/vc_*.png        codex icons
  textures/particle/vc_*.png  particle sprites

usage: python3 gen_art.py <resource_pack dir>
"""
import os, sys
from PIL import Image

RP = sys.argv[1]

# Palette shared by all sprites -------------------------------------------------
P = {
    ".": None,
    "k": (20, 12, 16, 255),     # outline
    "r": (170, 18, 32, 255),    # blood
    "R": (230, 52, 60, 255),    # blood highlight
    "d": (96, 8, 18, 255),      # dark blood
    "w": (245, 245, 245, 255),  # white
    "g": (150, 150, 160, 255),  # grey
    "G": (90, 90, 100, 255),    # dark grey
    "y": (255, 210, 60, 255),   # gold / sun
    "Y": (255, 245, 170, 255),  # light gold
    "o": (230, 120, 30, 255),   # orange
    "b": (60, 90, 200, 255),    # blue
    "B": (140, 180, 255, 255),  # light blue
    "p": (140, 60, 190, 255),   # purple
    "P": (200, 140, 255, 255),  # light purple
    "n": (120, 80, 45, 255),    # brown
    "N": (170, 120, 70, 255),   # light brown
    "e": (60, 170, 70, 255),    # green
    "E": (140, 230, 120, 255),  # light green
    "c": (90, 200, 220, 255),   # cyan
}


def sprite(rows):
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            col = P.get(ch)
            if col:
                im.putpixel((x, y), col)
    return im


def save(im, rel):
    path = os.path.join(RP, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print("wrote", rel)


# ---------------------------------------------------------------------------
# HUD glyphs (16x16 each). Index = codepoint - 0xE100
# ---------------------------------------------------------------------------
GLYPHS = [
    # 0 blood drop full
    ["......kk........", ".....kRk........", ".....kRrk.......", "....kRrrk.......", "....kRrrrk......", "...kRRrrrk......",
     "...kRrrrrrk.....", "..kRRrrrrrk.....", "..kRrrrrrrrk....", "..kRrrrrrrdk....", "..kRrrrrrrdk....", "...krrrrrddk....",
     "...kdrrrdddk....", "....kdddddk.....", ".....kkkkk......", "................"],
    # 1 blood drop half
    ["......kk........", ".....kGk........", ".....kGGk.......", "....kGGGk.......", "....kGGGGk......", "...kGGGGGk......",
     "...kGGGGGGk.....", "..kRrrrrrrk.....", "..kRrrrrrrrk....", "..kRrrrrrrdk....", "..kRrrrrrrdk....", "...krrrrrddk....",
     "...kdrrrdddk....", "....kdddddk.....", ".....kkkkk......", "................"],
    # 2 blood drop empty
    ["......kk........", ".....kgk........", ".....kgGk.......", "....kgGGk.......", "....kgGGGk......", "...kgGGGGk......",
     "...kgGGGGGk.....", "..kgGGGGGGk.....", "..kgGGGGGGGk....", "..kgGGGGGGGk....", "..kgGGGGGGGk....", "...kGGGGGGGk....",
     "...kGGGGGGGk....", "....kGGGGGk.....", ".....kkkkk......", "................"],
    # 3 sun warning
    ["................", ".......y........", "...y...y...y....", "....y.....y.....", "......yyy.......", ".....yYYYy......",
     "..yy.yYYYy.yy...", ".....yYYYy......", "......yyy.......", "....y.....y.....", "...y...y...y....", ".......y........",
     "................", "................", "................", "................"],
    # 4 fang emblem (vampire)
    ["................", "..kkkkkkkkkkk...", ".krrrrrrrrrrrk..", ".kRrrrrrrrrrdk..", ".kkwkkkkkkkwkk..", "..kwk.....kwk...",
     "..kwk.....kwk...", "...kwk...kwk....", "...kwk...kwk....", "....kw...wk.....", "....kk...kk.....", "................",
     "................", "................", "................", "................"],
    # 5 paw (werewolf)
    ["................", "...kk...kk......", "..kNnk.kNnk.....", "..knnk.knnk.....", "kk.kk...kk.kk...", "kNnk.....kNnk...",
     "knnk.kkk.knnk...", ".kk.kNNnk.kk....", "...kNnnnnk......", "..kNnnnnnnk.....", "..knnnnnnnk.....", "...kknnnkk......",
     ".....kkk........", "................", "................", "................"],
    # 6 crossbow (hunter)
    ["................", ".kkkkkkkkkkkk...", "kNnnnnnnnnnnnk..", ".kkkkkkgkkkkk...", ".......g........", ".k.....g.....k..",
     "..k....g....k...", "...k...g...k....", "....k..g..k.....", ".....k.g.k......", "......kgk.......", ".......n........",
     ".......n........", "......knk.......", "................", "................"],
    # 7 xp segment full
    ["................", "................", "................", "................", "................", "kkkkkkkk........",
     "kEEEEEEk........", "keeeeeek........", "keeeeeek........", "kkkkkkkk........", "................", "................",
     "................", "................", "................", "................"],
    # 8 xp segment empty
    ["................", "................", "................", "................", "................", "kkkkkkkk........",
     "kGGGGGGk........", "kGGGGGGk........", "kGGGGGGk........", "kkkkkkkk........", "................", "................",
     "................", "................", "................", "................"],
    # 9 hourglass
    ["................", "..kkkkkkk.......", "..kNNNNNk.......", "...kYYYk........", "...kYYYk........", "....kYk.........",
     ".....k..........", "....kYk.........", "...kgYgk........", "...kYYYk........", "..kNNNNNk.......", "..kkkkkkk.......",
     "................", "................", "................", "................"],
    # 10 skull (infection)
    ["................", "...kkkkkk.......", "..kwwwwwwk......", ".kwwwwwwwwk.....", ".kwkkwwkkwk.....", ".kwkkwwkkwk.....",
     ".kwwwwkwwwk.....", "..kwwwwwwk......", "...kwkwkk.......", "...kkkkk........", "................", "................",
     "................", "................", "................", "................"],
    # 11 full moon
    ["................", "....kkkkk.......", "...kwwwwgk......", "..kwwwgwwwk.....", "..kwwwwwwgk.....", "..kwgwwwwwk.....",
     "..kwwwwgwwk.....", "...kwwwwwk......", "....kkkkk.......", "................", "................", "................",
     "................", "................", "................", "................"],
    # 12 blood moon
    ["................", "....kkkkk.......", "...kRRRRrk......", "..kRRRrRRRk.....", "..kRRRRRRrk.....", "..kRrRRRRRk.....",
     "..kRRRRrRRk.....", "...kRRRRRk......", "....kkkkk.......", "................", "................", "................",
     "................", "................", "................", "................"],
    # 13 bite target
    ["................", "................", "kkkkkkkkkkkk....", "kddddddddddk....", "kkwkkkkkkwkk....", ".kwk....kwk.....",
     "..kw....wk......", "..kk....kk......", "................", "..kk....kk......", "..kw....wk......", ".kwk....kwk.....",
     "kkwkkkkkkwkk....", "kddddddddddk....", "kkkkkkkkkkkk....", "................"],
    # 14 star
    ["................", "......k.........", ".....kyk........", ".....kyk........", "kkkkkyYykkkk....", ".kyyyYYYyyk.....",
     "..kyyYYyyk......", "...kyyyyk.......", "..kyykkyyk......", "..kyk..kyk......", ".kk......kk.....", "................",
     "................", "................", "................", "................"],
    # 15 wolf head (in form)
    ["................", ".kk.......kk....", ".kNk.....kNk....", ".kNnkkkkknNk....", ".knnnnnnnnnk....", "kNnnnnnnnnnnk...",
     "knnykknnkkynk...", "knnnnnnnnnnnk...", ".knnnnGGnnnk....", "..knnGkkGnk.....", "...knwkkwnk.....", "....kkkkkk......",
     "................", "................", "................", "................"],
]

sheet = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
for i, rows in enumerate(GLYPHS):
    sheet.paste(sprite(rows), ((i % 16) * 16, (i // 16) * 16))
save(sheet, "font/glyph_E1.png")

# ---------------------------------------------------------------------------
# Skill icons — reuse the bevelled frame of an original icon
# ---------------------------------------------------------------------------
frame = Image.open(os.path.join(RP, "textures/ui/skill_nightvision.png")).convert("RGBA")
fill = (198, 198, 198, 255)
for y in range(4, 20):
    for x in range(4, 20):
        frame.putpixel((x, y), fill)


def icon(rows, tint=None):
    im = frame.copy()
    if tint:
        for y in range(3, 21):
            for x in range(3, 21):
                if im.getpixel((x, y)) == fill:
                    im.putpixel((x, y), tint)
    spr = sprite(rows)
    im.alpha_composite(spr, ((24 - spr.width) // 2, (24 - spr.height) // 2))
    return im


ICONS = {
    "skill_transform": (["....kk....kk....", "...kNk....kNk...", "...knnkkkknnk...", "..knnnnnnnnnnk..", "..knnnnnnnnnnk..", ".kNnykknnkkynNk.",
                         ".knnnnnnnnnnnnk.", ".knnnnnnnnnnnnk.", "..knnnnGGnnnnk..", "...knnGkkGnnk...", "...knwkkkkwnk...", "....knwwwwnk....",
                         ".....kkkkkk.....", "................"], (140, 120, 170, 255)),
    "skill_howl": (["....kk..........", "...kNnk.........", "..kNnnnk..k.k...", "..knnnnnk..k.k..", ".kknnyknnk..k.k.", "kNnnnnnnnk..k.k.",
                    "knnnnnnnk..k.k..", ".kkkknnk..k.k...", "....knnk........", "....knnk........", "...knnnnk.......", "...knnnnk.......",
                    "..kkkkkkkk......", "................"], (60, 50, 110, 255)),
    "skill_lunge": (["................", "..k.............", ".kNk..........k.", "kNnnk........kk.", ".knnnkkkkkkkkkkk", "..knnnnnnnnnnnkk",
                     "..knnnnnnnnnnnkk", ".knnnkkkkkkkkkkk", "kNnnk........kk.", ".kNk..........k.", "..k.............", "................"],
                    (180, 160, 120, 255)),
    "skill_onehit": (["................", ".......kk.......", "......kwwk......", ".....kwggwk.....", "....kwggggwk....", "...kwggggggwk...",
                      "..kkkkkggkkkkk..", ".......gg.......", "......kNNk......", ".....kNnnNk.....", ".....knnnnk.....", "......kkkk......",
                      "..R.........R...", "...R.......R...."], (150, 60, 60, 255)),
    "skill_sangramento": (["...k....k....k..", "..kR...kR...kR..", "..kr...kr...kr..", ".kRrk.kRrk.kRrk.", ".krrk.krrk.krrk.", ".krrk.krrk.krrk.",
                           "..kk...kk...kk..", "................", "....kk....kk....", "...kRrk..kRrk...", "...krrk..krrk...", "....kk....kk....",
                           "................"], (120, 30, 40, 255)),
    "skill_poucafome": (["......kkk.......", ".....kNNNk......", "....kNnnnnk.....", "....knnwnnk.....", "....knnnnnk.....", ".....knnnk......",
                         "......kgk.......", "......kgk.......", ".....kwgwk......", ".....kwkwk......", "................", "..kkkkkkkkkkk...",
                         "..kEEEEEEEEEk...", "..kkkkkkkkkkk..."], (90, 140, 80, 255)),
    "skill_suntransform": (["......y.........", "...y..y..y......", "....yYYYy.......", "..yyYYYYYyy.....", "....yYYYy.......", "...y..y..y......",
                            "......y.........", ".kk......kk.....", ".kNk....kNk.....", ".knnkkkknnk.....", "knnnnnnnnnnk....", "knykknnkkynk....",
                            ".knnnGGnnnk.....", "..kkkkkkkk......"], (230, 180, 90, 255)),
    "skill_hypnosis": (["................", "....kkkkkkkk....", "..kkPPPPPPPPkk..", ".kPPpppppppppPk.", "kPppkkkkkkkkppPk", "kPpkwwwwwwwwkpPk",
                        "kPpkwpppppppkpPk", "kPpkwpkkkkpwkpPk", "kPpkwpkPPkpwkpPk", "kPpkwppppppwkpPk", ".kPpkwwwwwwkpPk.", "..kkPPPPPPPPkk..",
                        "....kkkkkkkk...."], (70, 30, 100, 255)),
    "skill_blood_nova": (["......kkkk......", "....kkRrrRkk....", "...kRr....rRk...", "..kR..kkkk..Rk..", ".kR..kRrrRk..Rk.", ".kr.kRrRRrRk.rk.",
                          ".kr.krRwwRrk.rk.", ".kr.krRwwRrk.rk.", ".kr.kRrRRrRk.rk.", ".kR..kRrrRk..Rk.", "..kR..kkkk..Rk..", "...kRr....rRk...",
                          "....kkRrrRkk....", "......kkkk......"], (60, 10, 20, 255)),
    "skill_hunter_sense": (["................", "....kkkkkkkk....", "..kkYYYYYYYYkk..", ".kYyyyyyyyyyyYk.", "kYyykkkkkkkkyyYk", "kYykwwwwwwwwkyYk",
                            "kYykwwbbbbwwkyYk", "kYykwbbkkbbwkyYk", "kYykwwbbbbwwkyYk", "kYykwwwwwwwwkyYk", ".kYykkkkkkkkyYk.", "..kkYYYYYYYYkk..",
                            "....kkkkkkkk...."], (40, 60, 90, 255)),
    "skill_divine": (["......kkk.......", "......kYk.......", "......kYk.......", "...kkkkYkkkk....", "...kYYYYYYYk....", "...kkkkYkkkk....",
                      "......kYk.......", "......kYk.......", "......kYk.......", "......kYk.......", "......kkk.......", "..y.........y...",
                      "...y.......y...."], (110, 150, 220, 255)),
    "skill_holy_burst": (["......y.y.......", "...y..YYY..y....", "....yYYwYYy.....", "..yYYwwwwwYYy...", "...YYwwYwwYY....", "yyYwwYYyYYwwYyy.",
                          "...YYwwYwwYY....", "..yYYwwwwwYYy...", "....yYYwYYy.....", "...y..YYY..y....", "......y.y.......", "................"],
                         (200, 170, 80, 255)),
    "hunter_vital": (["................", "..kkk....kkk....", ".kRRrk..kRRrk...", "kRRrrrkkrrrrdk..", "kRrrrrrrrrrrdk..", "kRrrrrrrrrrrdk..",
                      ".krrrrrrrrrdk...", "..krrrrrrrdk....", "...krrrrrdk.....", "....krrrdk......", ".....krdk.......", "......kk........"],
                     (180, 200, 180, 255)),
    "hunter_agility": (["................", "........kkkk....", ".......kNnnk....", "......kNnnk.....", "..kkkkNnnk......", ".kNnnnnnk.......",
                        "kNnnnnnk........", "kkkkknnk........", "....kNnk........", "...kNnk.........", "..kNnkkkkk......", "..kkkNnnnk......",
                        "....kkkkkk......", "..g.g.g........."], (170, 210, 230, 255)),
    "hunter_combat": (["..............kk", ".............kwk", "............kwgk", "...........kwgk.", "..........kwgk..", ".........kwgk...",
                       "..kk....kwgk....", "...kk..kwgk.....", "....kkkwgk......", ".....knwk.......", "....knnkk.......", "...knnk.kk......",
                       "..knnk...k......", "..kkk..........."], (220, 170, 160, 255)),
    "hunter_mission": (["..kkkkkkkkkk....", ".kNNNNNNNNNNk...", ".kNwwwwwwwwNk...", "..kwkkkkkkwk....", "..kwwwwwwwwk....", "..kwkkkkkwwk....",
                        "..kwwwwwwwwk....", "..kwkkkkkkwk....", "..kwwwwwwwwk....", "..kwkkkwwrrk....", ".kNNNNNNNrRrk...", ".kkkkkkkkkrk....",
                        "..........k....."], (190, 170, 130, 255)),
    "hunter_train": (["................", "......kkkk......", ".....kYYYYk.....", "....kYyyyyYk....", "....kyykkyyk....", "....kyk..kyk....",
                      ".....k....k.....", "...kkkkkkkkkk...", "..kgggggggggk...", "..kgGGGGGGGgk...", "..kkkkkkkkkkk...", "....kG...Gk.....",
                      "...kkk...kkk...."], (160, 190, 160, 255)),
    "vc_world": (["................", "....kkkkk.......", "...kRRRRrk......", "..kRRRrRRRk.....", "..kRRRRRRrk.....", "..kRrRRRRRk.....",
                  "..kRRRRrRRk.....", "...kRRRRRk......", "....kkkkk.......", "................", "k.k.kk.k.kk.k.k.", "kkkkkkkkkkkkkkkk",
                  "GGGGGGGGGGGGGGGG"], (30, 20, 50, 255)),
    "vc_settings": (["................", "......kkkk......", "...kk.kggk.kk...", "..kggkkggkkggk..", "..kgggggggggk...", "...kgggkkgggk...",
                     ".kkggk....kggkk.", ".kgggk....kgggk.", ".kkggk....kggkk.", "...kgggkkgggk...", "..kgggggggggk...", "..kggkkggkkggk..",
                     "...kk.kggk.kk...", "......kkkk......"], None),
    "vc_admin": (["................", "..k..k...k..k...", "..kykkyykkyk....", "..kyyyyyyyyk....", "..kyyyyyyyyk....", "..kYYYYYYYYk....",
                  "..kkkkkkkkkk....", "................", "....kkkkkk......", "...kgggggggk....", "...kgkkkkkgk....", "...kgk...kgk....",
                  "...kgggggggk....", "...kkkkkkkkk...."], (120, 40, 40, 255)),
}
for name, (rows, tint) in ICONS.items():
    save(icon(rows, tint), f"textures/ui/{name}.png")

# ---------------------------------------------------------------------------
# Particle sprites (8x8 / 16x16)
# ---------------------------------------------------------------------------
save(sprite(["...yy...", "..yYYy..", ".yYwwYy.", "yYwwwwYy", "yYwwwwYy", ".yYwwYy.", "..yYYy..", "...yy..."]), "textures/particle/vc_hunter_mark.png")
ring_rows = []
for y in range(16):
    row = ""
    for x in range(16):
        d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
        row += "w" if 6.0 <= d <= 7.5 else ("g" if 5.0 <= d < 6.0 else ".")
    ring_rows.append(row)
save(sprite(ring_rows), "textures/particle/vc_wave.png")
