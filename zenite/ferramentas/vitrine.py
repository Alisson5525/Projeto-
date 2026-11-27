#!/usr/bin/env python3
"""Monta docs/vitrine.png: ícone do pacote, itens, sigilos, técnicas e prévia 3D.

Antes, renderize a prévia: node ferramentas/previa/renderizar.mjs docs/previa_3d.png
"""
import random
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
R, D = RAIZ / "RP", RAIZ / "docs"
W = 1400
ITENS = ["astrolabio", "codice", "poeira_estelar", "selo_eclipse", "coracao_firmamento", "diadema", "manto", "perneiras", "botas"]
TECS = ["veu", "poco", "nova", "passo", "reversao", "horizonte", "abobada"]


def main() -> None:
    previa = Image.open(D / "previa_3d.png").convert("RGBA")
    v = Image.new("RGBA", (W, 700 + previa.height), (14, 12, 30, 255))
    dr = ImageDraw.Draw(v)
    for y in range(300):
        c = tuple(int(a + (b - a) * y / 300) for a, b in zip((10, 8, 34), (40, 14, 80))) + (255,)
        dr.line([(0, y), (W, y)], fill=c)
    r = random.Random(7)
    for _ in range(220):
        v.putpixel((r.randrange(W), r.randrange(300)), (255, 255, 255, 255) if r.random() < 0.3 else (190, 200, 255, 255))
    v.alpha_composite(Image.open(RAIZ / "BP" / "pack_icon.png").resize((256, 256), Image.NEAREST), (W // 2 - 128, 22))

    def fila(nomes, pasta, y, tam):
        passo = tam + 24
        x0 = W // 2 - (len(nomes) * passo - 24) // 2
        for i, nome in enumerate(nomes):
            dr.rounded_rectangle([x0 + i * passo - 8, y - 8, x0 + i * passo + tam + 8, y + tam + 8], radius=10, fill=(28, 24, 56, 255))
            v.alpha_composite(Image.open(R / "textures" / pasta / "zenite" / f"{nome}.png").resize((tam, tam), Image.NEAREST), (x0 + i * passo, y))

    fila(ITENS, "items", 310, 96)
    fila([f"sigilo_{t}" for t in TECS], "items", 430, 96)
    fila(TECS, "ui", 550, 128)
    v.alpha_composite(previa, (0, 700))
    v.save(D / "vitrine.png", optimize=True)
    print("vitrine", v.size)


if __name__ == "__main__":
    main()
