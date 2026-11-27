#!/usr/bin/env python3
"""Mostruario das particulas de destruicao em pixel art, com a cor de cada material (docs/preview/particulas.png)."""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ATLAS = os.path.join(ROOT, "superman_addon", "resource_pack", "textures", "particle", "superman_debris.png")
OUT = os.path.join(ROOT, "docs", "preview", "particulas.png")

# (nome, linha da folha, cor), na mesma ordem e cores do debrisColor dos scripts
ROWS = [
    ("pedra", 0, (0.52, 0.52, 0.52)), ("ardosia", 0, (0.27, 0.27, 0.3)), ("terra", 0, (0.47, 0.33, 0.22)),
    ("areia (graos)", 16, (0.86, 0.8, 0.58)), ("madeira (lascas)", 80, (0.55, 0.4, 0.24)),
    ("vidro (cacos)", 48, (0.75, 0.9, 1.0)), ("folhas", 64, (0.36, 0.56, 0.24)), ("cerejeira", 64, (0.95, 0.7, 0.8)),
    ("poeira de pedra", 32, (0.62, 0.6, 0.58)), ("poeira de terra", 32, (0.58, 0.44, 0.32)),
    ("agua: gotas e espuma", 96, (0.86, 0.94, 1.0)), ("nuvens e faiscas", 112, (1.0, 1.0, 1.0)),
]


def main():
    atlas = Image.open(ATLAS).convert("RGBA")
    Z = 5
    cw = 16 * Z
    W, H = 200 + 8 * (cw + 8), len(ROWS) * (cw + 10) + 50
    out = Image.new("RGBA", (W, H), (32, 38, 52, 255))
    d = ImageDraw.Draw(out)
    d.text((14, 14), "Particulas de destruicao e de voo (pixel art, cor do material)", fill=(240, 240, 250))
    for r, (name, y, col) in enumerate(ROWS):
        oy = 46 + r * (cw + 10)
        d.text((14, oy + cw // 2 - 6), name, fill=(220, 225, 235))
        for i in range(8):
            spr = atlas.crop((i * 16, y, i * 16 + 16, y + 16))
            px = spr.load()
            for yy in range(16):
                for xx in range(16):
                    rr, gg, bb, aa = px[xx, yy]
                    px[xx, yy] = (int(rr * col[0]), int(gg * col[1]), int(bb * col[2]), aa)
            spr = spr.resize((cw, cw), Image.NEAREST)
            ox = 200 + i * (cw + 8)
            d.rectangle((ox - 2, oy - 2, ox + cw + 1, oy + cw + 1), fill=(46, 54, 72, 255))
            out.alpha_composite(spr, (ox, oy))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out.convert("RGB").save(OUT)
    print("mostruario:", OUT)


if __name__ == "__main__":
    main()
