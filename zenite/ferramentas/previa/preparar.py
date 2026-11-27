#!/usr/bin/env python3
"""Prepara texturas para a prévia 3D: separa cor (opaca) e máscara emissiva.

O navegador premultiplica o alfa ao ler imagens, o que apagaria a cor dos
pixels emissivos (alfa baixo). Aqui a separação é feita sem perdas.
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = Path(__file__).resolve().parent / "saida"
SAIDA.mkdir(exist_ok=True)
for nome in ("arconte", "arconte_furia"):
    im = Image.open(RAIZ / "RP" / "textures" / "entity" / "zenite" / f"{nome}.png").convert("RGBA")
    cor = Image.new("RGBA", im.size)
    emi = Image.new("RGBA", im.size)
    pc, pe, pi = cor.load(), emi.load(), im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pi[x, y]
            pc[x, y] = (r, g, b, 255)
            k = 1 - a / 255
            pe[x, y] = (round(r * k), round(g * k), round(b * k), 255)
    cor.save(SAIDA / f"{nome}_cor.png")
    emi.save(SAIDA / f"{nome}_emi.png")
print("texturas da prévia preparadas")
