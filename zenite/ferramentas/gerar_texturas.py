#!/usr/bin/env python3
"""Gera as texturas do Zênite (arte original, pixel art procedural).

Saídas (em RP/ e BP/):
  textures/items/zenite/*.png        ícones 16x16
  textures/ui/zenite/*.png           ícones das técnicas 32x32 (Roda de Técnicas)
  textures/blocks/zenite/firmamento  flipbook 16x128 (8 quadros) do céu estrelado
  textures/models/armor/zenite_1/2   camadas de armadura 64x32
  textures/particle/zenite.png       atlas de partículas 128x128
  font/glyph_E7.png                  página de glifos 256x256 (HUD)
  pack_icon.png                      ícone dos pacotes 256x256
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

from pixel import P, Tela, com_alfa, clarear, escurecer, hx, largura_texto, mistura, rng, texto

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "RP"
BP = RAIZ / "BP"

TEC_CORES = {
    "veu": (P["prata0"], P["prata2"], P["prata3"]),
    "poco": (P["ciano0"], P["ciano2"], P["ciano3"]),
    "nova": (P["carm0"], P["carm2"], P["carm3"]),
    "passo": (P["noite3"], P["prata2"], P["branco"]),
    "reversao": (P["ouro0"], P["ouro2"], P["ouro4"]),
    "horizonte": (P["viol0"], P["viol2"], P["viol3"]),
    "abobada": (P["viol1"], P["viol2"], P["viol3"]),
}


# =================================================================== ícones de técnica
def simbolo_tecnica(t: Tela, tec: str, s: int) -> None:
    k = s / 32
    c = s / 2
    esc, med, cla = TEC_CORES[tec]
    r = rng(f"sim-{tec}-{s}")
    if tec == "veu":
        for raio, cor in ((11.5, P["prata2"]), (8.0, com_alfa(P["ciano2"], 200)), (4.5, com_alfa(P["ciano3"], 160))):
            pts = [(c + raio * k * math.cos(math.pi / 6 + i * math.pi / 3), c + raio * k * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                t.linha(round(x0), round(y0), round(x1), round(y1), cor)
        if s >= 32:  # flecha parada antes da barreira
            t.linha(2, 26, 8, 20, P["pedra2"])
            t.linha(3, 26, 9, 20, P["pedra1"])
            t.p(9, 19, P["prata3"]); t.p(10, 19, P["prata2"]); t.p(9, 18, P["prata2"])
            t.p(2, 27, P["ouro2"]); t.p(1, 26, P["ouro2"])
            for i in range(3):
                t.sobre(11 + i, 17 - i, com_alfa(P["ciano3"], 170 - 40 * i))
        t.brilho(c, c, 6 * k, com_alfa(P["ciano3"], 120))
    elif tec == "poco":
        t.brilho(c, c, 13 * k, com_alfa(P["ciano1"], 150))
        for i in range(0, 260):
            th = i * 0.085
            raio = (1.2 + th * 1.25) * k
            if raio > 13 * k:
                break
            x, y = c + raio * math.cos(th), c + raio * math.sin(th)
            cor = mistura(P["ciano3"], P["ciano1"], raio / (13 * k))
            t.p(x, y, cor)
            t.p(c - (x - c), c - (y - c), mistura(P["ciano2"], P["ciano0"], raio / (13 * k)))
        t.disco(c, c, 2.6 * k, P["ciano3"])
        t.disco(c, c, 1.3 * k, P["branco"])
        for _ in range(int(6 * k) + 2):
            a, d = r.random() * 6.283, (7 + r.random() * 6) * k
            t.p(c + d * math.cos(a), c + d * math.sin(a), P["prata2"])
    elif tec == "nova":
        t.brilho(c, c, 14 * k, com_alfa(P["carm1"], 170))
        for i in range(8):
            a = i * math.pi / 4 + math.pi / 8
            r0, r1 = 6.5 * k, (13.5 if i % 2 == 0 else 11) * k
            cor = P["lar2"] if i % 2 == 0 else P["carm2"]
            t.linha(round(c + r0 * math.cos(a)), round(c + r0 * math.sin(a)), round(c + r1 * math.cos(a)), round(c + r1 * math.sin(a)), cor)
        t.anel(c, c, 8.4 * k, 9.2 * k, com_alfa(P["carm3"], 140), sobre=True)
        t.disco(c, c, 5 * k, P["carm2"])
        t.disco(c, c, 3.2 * k, P["lar3"])
        t.disco(c, c, 1.5 * k, P["branco"])
    elif tec == "passo":
        for i, a in enumerate((70, 120, 200)):
            x = c - (9 - i * 4.5) * k
            pts = [(x, c - 5 * k), (x + 4 * k, c), (x, c + 5 * k), (x - 4 * k, c)]
            t.poligono(pts, com_alfa(P["prata2"], a))
        t.estrela4(round(c + 7 * k), round(c), max(2, round(5 * k)), P["prata3"], P["branco"])
        t.brilho(c + 7 * k, c, 5 * k, com_alfa(P["ciano3"], 160))
        for i in range(3):
            y = round(c + (i - 1) * 4 * k)
            t.linha(round(c - 13 * k), y, round(c - 7 * k), y, com_alfa(P["prata1"], 150), sobre=True)
    elif tec == "reversao":
        t.brilho(c, c, 13 * k, com_alfa(P["ouro1"], 150))
        w, h = 3 * k, 9 * k
        t.rect(round(c - w), round(c - h), round(c + w) - 1, round(c + h) - 1, P["ouro2"])
        t.rect(round(c - h), round(c - w), round(c + h) - 1, round(c + w) - 1, P["ouro2"])
        t.rect(round(c - w + k), round(c - h + k), round(c - w + 2 * k) - 1, round(c + h - k) - 1, P["ouro4"])
        t.anel(c, c, 11 * k, 12 * k, com_alfa(P["ouro3"], 160), sobre=True)
        for _ in range(int(5 * k) + 1):
            a, d = r.random() * 6.283, (9 + r.random() * 4) * k
            t.p(c + d * math.cos(a), c + d * math.sin(a), P["ouro4"])
    elif tec == "horizonte":
        t.brilho(c, c, 14 * k, com_alfa(P["viol1"], 180))
        t.anel(c, c, 5.2 * k, 7.6 * k, P["viol2"])
        t.anel(c, c, 5.2 * k, 6.0 * k, P["viol3"])
        t.disco(c, c, 5.0 * k, hx("#020106"))
        for i in range(-14, 15):  # disco de acreção inclinado
            x = c + i * k
            y = c + i * 0.28 * k
            if abs(i) > 5:
                t.p(x, y, P["viol3"] if abs(i) < 10 else P["viol2"])
                t.p(x, y + 1, com_alfa(P["viol2"], 140))
        t.p(c - 2 * k, c - 2 * k, P["viol3"])
    elif tec == "abobada":
        horiz = round(c + 6 * k)
        for y in range(s):
            for x in range(s):
                if (x + 0.5 - c) ** 2 + (y + 0.5 - horiz) ** 2 <= (12 * k) ** 2 and y < horiz:
                    t.p(x, y, mistura(P["viol0"], P["noite1"], (horiz - y) / (12 * k)))
        for y in range(s):
            for x in range(s):
                d = math.hypot(x + 0.5 - c, y + 0.5 - horiz)
                if 11.2 * k <= d <= 12.4 * k and y < horiz:
                    t.p(x, y, P["viol2"])
        t.rect(round(c - 13 * k), horiz, round(c + 13 * k), horiz + max(1, round(k)), P["prata1"])
        for _ in range(int(9 * k) + 2):
            a, d = math.pi + r.random() * math.pi, r.random() * 10 * k
            x, y = c + d * math.cos(a), horiz + d * math.sin(a)
            t.p(x, y, P["branco"] if r.random() < 0.5 else P["viol3"])
        t.estrela4(round(c + 3 * k), round(horiz - 7 * k), max(1, round(2 * k)), P["viol3"])


def icone_tecnica(tec: str, s: int, moldura: bool = True) -> Tela:
    t = Tela(s, s)
    k = s / 32
    c = s / 2
    esc, med, cla = TEC_CORES[tec]
    if moldura:
        t.disco(c, c, 15.5 * k, P["contorno"])
        for y in range(s):
            for x in range(s):
                d = math.hypot(x + 0.5 - c, y + 0.5 - c)
                if d <= 14.5 * k:
                    t.p(x, y, mistura(mistura(P["noite1"], esc, 0.35), P["noite0"], d / (14.5 * k)))
        t.anel(c, c, 13.6 * k, 14.6 * k, med)
        t.anel(c, c, 13.6 * k, 14.0 * k, cla if s >= 32 else med)
    simbolo_tecnica(t, tec, s)
    return t


# =================================================================== itens 16x16
def item_poeira() -> Tela:
    t = Tela(16, 16)
    r = rng("poeira")
    for y, (x0, x1) in {13: (3, 12), 12: (4, 11), 11: (5, 10), 10: (7, 8)}.items():
        for x in range(x0, x1 + 1):
            t.p(x, y, r.choice([P["viol1"], P["noite3"], P["viol2"], P["noite2"]]))
    t.contorno()
    for x, y in ((5, 12), (8, 11), (10, 12), (7, 13), (11, 13)):
        t.p(x, y, r.choice([P["ciano3"], P["ouro3"], P["branco"]]))
    t.estrela4(11, 5, 2, P["ciano3"])
    t.estrela4(5, 7, 1, P["ouro3"])
    t.p(8, 3, P["branco"]); t.p(13, 9, P["viol3"]); t.p(3, 4, P["ciano2"])
    return t


def item_astrolabio() -> Tela:
    t = Tela(16, 16)
    t.anel(7.5, 1.6, 0.6, 1.6, P["ouro2"])
    t.anel(8, 9, 5.2, 6.6, P["ouro2"])
    t.anel(8, 9, 5.2, 5.7, P["ouro1"])
    t.disco(8, 9, 5.2, P["noite1"])
    t.anel(8, 9, 3.0, 3.8, P["prata1"])
    t.linha(3, 9, 12, 9, com_alfa(P["prata2"], 200))
    t.linha(8, 4, 8, 13, com_alfa(P["prata2"], 200))
    t.linha(5, 6, 11, 12, P["prata0"])
    t.contorno()
    t.sombrear(0.25, 0.3)
    t.brilho(8, 9, 3.5, com_alfa(P["ciano2"], 230))
    t.estrela4(8, 9, 1, P["ciano3"], P["branco"])
    for x, y in ((8, 2), (2, 9), (14, 9), (8, 15)):
        t.p(x, y + (1 if y == 2 else 0), P["ouro3"])
    return t


def item_codice() -> Tela:
    t = Tela(16, 16)
    t.rect(4, 2, 12, 13, P["noite2"])
    t.rect(3, 2, 4, 13, P["noite1"])
    t.rect(12, 3, 13, 13, P["creme"])
    t.linha(12, 3, 12, 13, escurecer(P["creme"], 0.25))
    for y in (4, 11):
        t.rect(3, y, 4, y, P["ouro2"])
    for x, y in ((5, 2), (11, 2), (5, 13), (11, 13)):
        t.p(x, y, P["ouro2"])
    t.rect(5, 3, 11, 3, P["noite3"])
    t.contorno()
    t.sombrear(0.2, 0.3, ignorar={P["creme"]})
    t.estrela4(8, 8, 2, P["ouro3"], P["ouro4"])
    t.p(6, 5, P["ciano3"]); t.p(10, 11, P["ciano2"]); t.p(10, 5, P["prata2"])
    return t


def item_selo() -> Tela:
    t = Tela(16, 16)
    t.disco(8, 8, 6.8, P["pedra1"])
    t.anel(8, 8, 5.6, 6.8, P["pedra2"])
    t.disco(8, 8, 4.4, P["viol1"])
    t.anel(8, 8, 3.4, 4.4, P["viol3"])
    t.disco(8, 8, 3.3, hx("#030108"))
    t.contorno()
    t.sombrear(0.22, 0.3)
    for a in range(0, 360, 45):
        x = 8 + 6.1 * math.cos(math.radians(a)) - 0.5
        y = 8 + 6.1 * math.sin(math.radians(a)) - 0.5
        t.p(x + 0.5, y + 0.5, P["ouro2"])
    t.p(6, 6, com_alfa(P["viol3"], 160))
    return t


def item_coracao() -> Tela:
    t = Tela(16, 16)
    forma = Tela(16, 16)
    forma.disco(4.9, 6.2, 3.3, P["branco"])
    forma.disco(11.1, 6.2, 3.3, P["branco"])
    forma.poligono([(1.7, 7.3), (14.3, 7.3), (8.0, 14.6)], P["branco"])
    for y in range(0, 6):  # entalhe entre os dois lóbulos
        for x in (7, 8):
            if y <= 4:
                forma.p(x, y, (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            if forma.opaco(x, y):
                t.p(x, y, mistura(P["viol2"], P["ciano1"], (x + y - 6) / 18))
    for y in range(16):  # facetas do cristal
        for x in range(16):
            if t.opaco(x, y) and (x - y) % 5 == 0:
                t.p(x, y, clarear(t.get(x, y), 0.18))
    t.contorno(P["viol0"])
    t.sombrear(0.35, 0.35)
    r = rng("coracao")
    for _ in range(7):
        x, y = r.randint(4, 12), r.randint(5, 11)
        if t.get(x, y)[3] and t.get(x, y) != P["viol0"]:
            t.p(x, y, r.choice([P["branco"], P["ouro3"], P["ciano3"]]))
    t.p(4, 5, P["branco"]); t.p(5, 4, P["viol3"]); t.p(4, 6, P["viol3"])
    t.estrela4(9, 9, 1, P["branco"])
    return t


def item_sigilo(tec: str) -> Tela:
    t = Tela(16, 16)
    esc, med, cla = TEC_CORES[tec]
    pts = [(8 + 7.3 * math.cos(math.pi / 6 + i * math.pi / 3), 8 + 7.3 * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    t.poligono(pts, P["pedra1"])
    pts2 = [(8 + 5.8 * math.cos(math.pi / 6 + i * math.pi / 3), 8 + 5.8 * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    t.poligono(pts2, P["noite1"])
    t.contorno()
    t.sombrear(0.25, 0.3)
    sub = icone_tecnica(tec, 16, moldura=False)
    for y in range(16):
        for x in range(16):
            c = sub.get(x, y)
            if c[3] and t.get(x, y)[3] and 2 < x < 13 and 2 < y < 13:
                t.sobre(x, y, c)
    for x, y in ((8, 1), (8, 14)):
        t.p(x, y, P["ouro2"])
    return t


def silhueta(t: Tela, mapa: list[str], cores: dict[str, tuple]) -> None:
    for y, linha in enumerate(mapa):
        for x, ch in enumerate(linha):
            if ch in cores:
                t.p(x, y, cores[ch])


def item_armadura(peca: str) -> Tela:
    t = Tela(16, 16)
    N, n, G, g, S, C, V = P["noite2"], P["noite1"], P["ouro2"], P["ouro1"], P["prata2"], P["ciano2"], P["viol2"]
    mapas = {
        "diadema": [
            "................",
            "......SSSS......",
            "....SS....SS....",
            "......SSSS......",
            "................",
            "................",
            "..GGG......GGG..",
            ".G...GGGGGG...G.",
            ".G....GCCG....G.",
            "..GG...CC...GG..",
            "....GGGGGGGG....",
            "................",
        ],
        "manto": [
            "................",
            "..GGG......GGG..",
            ".GNNNG....GNNNG.",
            ".GNNNNGGGGNNNNG.",
            ".GNNNNNGGNNNNNG.",
            "..SNNNNGGNNNNS..",
            "...NNNNCCNNNN...",
            "...NNNNGGNNNN...",
            "...NNNNNNNNNN...",
            "...NNNNNNNNNN...",
            "...nNNNNNNNNn...",
            "...nNNNNNNNNn...",
            "...GGGGGGGGGG...",
        ],
        "perneiras": [
            "................",
            "...VVVVVVVVVV...",
            "...VVVVGGVVVV...",
            "...NNNNNNNNNN...",
            "...NNNN..NNNN...",
            "...NNNN..NNNN...",
            "...GGNN..NNGG...",
            "...NNNN..NNNN...",
            "...NNNN..NNNN...",
            "...SNNN..NNNS...",
            "...SNNN..NNNS...",
            "...NNNN..NNNN...",
        ],
        "botas": [
            "................",
            "................",
            "................",
            "................",
            "...NNN....NNN...",
            "...NNN....NNN...",
            "..SNNN....NNNS..",
            "...NNN....NNN...",
            "...NNN....NNN...",
            "..NNNN....NNNN..",
            ".GGNNN....NNNGG.",
            ".GGGGG....GGGGG.",
        ],
    }
    silhueta(t, mapas[peca], {"N": N, "n": n, "G": G, "g": g, "S": S, "C": C, "V": V})
    off = {"diadema": 2, "manto": 1, "perneiras": 2, "botas": 2}[peca]
    if off:
        im = Image.new("RGBA", (16, 16))
        im.alpha_composite(t.im, (0, off))
        t.im = im
        t.px = im.load()
    t.contorno()
    t.sombrear(0.22, 0.3)
    r = rng(f"arm-{peca}")
    for _ in range(3):
        x, y = r.randint(4, 11), r.randint(5, 12)
        if t.get(x, y)[:3] == N[:3] or t.get(x, y)[:3] == clarear(N, 0.22)[:3]:
            t.p(x, y, P["prata3"])
    if peca == "diadema":
        t.p(8, 2 + off, P["ouro4"])
    return t


# =================================================================== bloco
def bloco_firmamento() -> Image.Image:
    quadros = 8
    out = Image.new("RGBA", (16, 16 * quadros))
    r = rng("firmamento")
    base = [[None] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            n = 0.5 + 0.5 * math.sin(x * 0.9 + y * 0.35) * math.cos(y * 0.7 - x * 0.2)
            base[y][x] = mistura(P["noite0"], mistura(P["viol0"], P["noite1"], (x + y) / 30), 0.55 + 0.35 * n)
    nebulosas = [(4.5, 11.0, 4.0, P["viol1"]), (12.0, 3.5, 3.2, P["ciano0"])]
    estrelas = [(r.randint(1, 14), r.randint(1, 14), r.random() * 6.283, r.choice([1, 1, 1, 2])) for _ in range(9)]
    grande = [(3, 4), (11, 11)]
    for q in range(quadros):
        t = Tela(16, 16)
        for y in range(16):
            for x in range(16):
                t.p(x, y, base[y][x])
        for cx, cy, rr, cor in nebulosas:
            t.brilho(cx, cy, rr, com_alfa(cor, 170), 0.9)
        for x, y, fase, tam in estrelas:
            v = 0.5 + 0.5 * math.sin(fase + q * 6.283 / quadros)
            cor = mistura(P["noite3"], P["branco"], v)
            t.p(x, y, cor)
            if tam == 2 and v > 0.6:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    t.sobre(x + dx, y + dy, com_alfa(P["prata2"], round(120 * v)))
        for i, (x, y) in enumerate(grande):
            v = 0.5 + 0.5 * math.sin(i * 2.4 + q * 6.283 / quadros)
            braco = 1 if v < 0.55 else 2
            t.estrela4(x, y, braco, com_alfa(P["ciano3"] if i == 0 else P["viol3"], round(150 + 105 * v)), P["branco"])
        out.alpha_composite(t.im, (0, 16 * q))
    return out


# =================================================================== armadura (64x32)
def face(t: Tela, x0: int, y0: int, w: int, h: int, fn) -> None:
    for y in range(h):
        for x in range(w):
            c = fn(x, y, w, h)
            if c:
                t.p(x0 + x, y0 + y, c)


def tecido(x: int, y: int, semente: str) -> tuple:
    r = rng(f"{semente}-{x}-{y}")
    v = r.random()
    return P["noite2"] if v < 0.55 else (P["noite1"] if v < 0.8 else mistura(P["noite2"], P["noite3"], 0.5))


def constelacao(t: Tela, pts: list[tuple[int, int]], ox: int, oy: int) -> None:
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        t.linha(ox + x0, oy + y0, ox + x1, oy + y1, com_alfa(P["prata1"], 150), sobre=True)
    for x, y in pts:
        t.p(ox + x, oy + y, P["prata3"])


def armadura_camada1() -> Tela:
    t = Tela(64, 32)
    # --- cabeça (fallback para mobs com geometria humanoide): só a tiara
    for fx, fy in ((0, 8), (8, 8), (16, 8), (24, 8)):
        face(t, fx, fy, 8, 8, lambda x, y, w, h: (P["ouro2"] if y == 3 else (P["ouro1"] if y == 4 else None)))
    t.p(11, 11, P["ciano2"]); t.p(12, 11, P["ciano3"]); t.p(11, 12, P["ciano1"]); t.p(12, 12, P["ciano2"])
    # --- corpo: manto
    def corpo_frente(x, y, w, h):
        if y == h - 1:
            return P["ouro2"]
        if abs(x - 3.5) <= max(0, 3 - y) + 0.5 and y < 4:
            return P["ouro2"] if abs(x - 3.5) > max(0, 3 - y) - 0.6 else P["noite0"]
        if x in (3, 4) and y >= 4:
            return P["ouro1"]
        return tecido(x, y, "manto")
    face(t, 20, 20, 8, 12, corpo_frente)
    t.p(23, 24, P["ciano3"]); t.p(24, 24, P["ciano2"]); t.p(23, 25, P["ciano2"]); t.p(24, 25, P["ciano1"])
    t.p(21, 27, P["prata3"]); t.p(26, 22, P["prata3"]); t.p(26, 28, P["prata2"])
    face(t, 32, 20, 8, 12, lambda x, y, w, h: P["ouro2"] if y == h - 1 else tecido(x, y, "costas"))
    constelacao(t, [(1, 2), (3, 4), (5, 3), (6, 6), (4, 8), (2, 9)], 32, 20)
    for fx in (16, 28):
        face(t, fx, 20, 4, 12, lambda x, y, w, h: P["ouro2"] if y == h - 1 else (P["prata1"] if x == 1 and y % 3 == 0 else tecido(x, y, f"lado{fx}")))
    face(t, 20, 16, 8, 4, lambda x, y, w, h: P["ouro2"] if y in (0, h - 1) and x in (0, w - 1) else tecido(x, y, "topo"))
    face(t, 28, 16, 8, 4, lambda x, y, w, h: P["noite1"])
    # --- braços: mangas com ombreira de prata e punho dourado
    def manga(x, y, w, h):
        if y <= 1:
            return P["prata2"] if y == 0 else P["prata1"]
        if y >= h - 2:
            return P["ouro2"] if y == h - 2 else P["ouro1"]
        return tecido(x, y, "manga")
    for fx in (40, 44, 48, 52):
        face(t, fx, 20, 4, 12, manga)
    t.p(45, 30, P["ciano2"]); t.p(53, 30, P["ciano2"])
    face(t, 44, 16, 4, 4, lambda x, y, w, h: P["prata2"] if (x + y) % 3 else P["prata3"])
    face(t, 48, 16, 4, 4, lambda x, y, w, h: P["noite1"])
    # --- botas (parte de baixo das pernas)
    def bota(x, y, w, h):
        if y < 7:
            return None
        if y >= h - 2:
            return P["ouro2"] if y == h - 2 else P["ouro1"]
        if y == 7:
            return P["prata2"]
        return P["noite1"] if (x + y) % 4 else P["noite2"]
    for fx in (0, 4, 8, 12):
        face(t, fx, 20, 4, 12, bota)
    face(t, 8, 16, 4, 4, lambda x, y, w, h: P["noite0"])
    t.p(5, 28, P["prata3"]); t.p(13, 28, P["prata3"])
    return t


def armadura_camada2() -> Tela:
    t = Tela(64, 32)
    def faixa(x, y, w, h):
        if y < 8:
            return None
        if y in (8, 11):
            return P["ouro1"]
        return P["viol1"] if y == 9 else P["viol0"]
    face(t, 20, 20, 8, 12, faixa)
    face(t, 32, 20, 8, 12, faixa)
    for fx in (16, 28):
        face(t, fx, 20, 4, 12, faixa)
    t.rect(23, 29, 24, 30, P["ouro3"]); t.p(23, 29, P["ouro4"])
    def perna(x, y, w, h):
        if y in (5, 6) and w == 4:
            return P["ouro2"] if y == 5 else P["ouro1"]
        return P["noite2"] if (x * 7 + y * 3) % 5 else P["noite1"]
    for fx in (0, 4, 8, 12):
        face(t, fx, 20, 4, 12, perna)
    for fx in (0, 8):  # listra lateral prateada
        for y in range(20, 32):
            if y not in (25, 26):
                t.p(fx + (3 if fx == 0 else 0), y, P["prata1"])
    face(t, 4, 16, 4, 4, lambda x, y, w, h: P["viol1"])
    face(t, 8, 16, 4, 4, lambda x, y, w, h: P["noite1"])
    face(t, 20, 16, 8, 4, lambda x, y, w, h: None)
    return t


# =================================================================== partículas
def atlas_particulas() -> Tela:
    t = Tela(128, 128)
    B = P["branco"]

    def celula(i: int, j: int):
        return i * 32, j * 32

    # (0,0) brilho suave
    x0, y0 = celula(0, 0)
    for y in range(32):
        for x in range(32):
            d = math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 15.5
            if d < 1:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * (1 - d) ** 2.2)))
    # (1,0) estrela de 4 pontas
    x0, y0 = celula(1, 0)
    for y in range(32):
        for x in range(32):
            dx, dy = abs(x + 0.5 - 16), abs(y + 0.5 - 16)
            v = max(0, 1 - dx / 15) * max(0, 1 - dy / 1.6) + max(0, 1 - dy / 15) * max(0, 1 - dx / 1.6)
            v += max(0, 1 - math.hypot(dx, dy) / 6) ** 2
            if v > 0.02:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * min(1, v))))
    # (2,0) faísca
    x0, y0 = celula(2, 0)
    for y in range(32):
        for x in range(32):
            d = math.hypot(x + 0.5 - 16, y + 0.5 - 16)
            v = 1 if d < 3 else max(0, 1 - (d - 3) / 6) ** 2
            if v > 0.02:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * v)))
    # (3,0) anel fino
    x0, y0 = celula(3, 0)
    for y in range(32):
        for x in range(32):
            d = abs(math.hypot(x + 0.5 - 16, y + 0.5 - 16) - 13)
            if d < 2.2:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * (1 - d / 2.2) ** 1.5)))
    # (0,1) hexágono
    x0, y0 = celula(0, 1)
    pts = [(16 + 13 * math.cos(math.pi / 6 + i * math.pi / 3), 16 + 13 * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    for y in range(32):
        for x in range(32):
            px, py = x + 0.5, y + 0.5
            dmin = 99.0
            for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
                vx, vy = bx - ax, by - ay
                tt = max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
                dmin = min(dmin, math.hypot(px - ax - tt * vx, py - ay - tt * vy))
            if dmin < 2:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * (1 - dmin / 2))))
    # (1,1) runa
    x0, y0 = celula(1, 1)
    for y in range(32):
        for x in range(32):
            d = math.hypot(x + 0.5 - 16, y + 0.5 - 16)
            if 11 <= d <= 13:
                t.p(x0 + x, y0 + y, B)
    for a, b in (((16, 5), (16, 27)), ((7, 21), (25, 11)), ((7, 11), (25, 21))):
        t.linha(x0 + a[0], y0 + a[1], x0 + b[0], y0 + b[1], B)
    t.disco(x0 + 16, y0 + 16, 3, B)
    # (2,1) fumaça
    x0, y0 = celula(2, 1)
    r = rng("fumaca")
    bolhas = [(16 + r.uniform(-6, 6), 16 + r.uniform(-6, 6), r.uniform(5, 9)) for _ in range(6)]
    for y in range(32):
        for x in range(32):
            v = sum(max(0, 1 - math.hypot(x + 0.5 - bx, y + 0.5 - by) / br) ** 2 for bx, by, br in bolhas)
            if v > 0.03:
                t.p(x0 + x, y0 + y, com_alfa(B, round(200 * min(1, v))))
    # (3,1) onda de choque
    x0, y0 = celula(3, 1)
    for y in range(32):
        for x in range(32):
            d = math.hypot(x + 0.5 - 16, y + 0.5 - 16)
            if 6 < d < 15.5:
                v = math.exp(-((d - 13) ** 2) / 3.5) + 0.25 * max(0, (d - 6) / 9)
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * min(1, v))))
    # (0,2) estrela de 8 pontas
    x0, y0 = celula(0, 2)
    for y in range(32):
        for x in range(32):
            dx, dy = x + 0.5 - 16, y + 0.5 - 16
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            v = max(0, 1 - d / (5 + 10 * abs(math.cos(4 * a)) ** 8)) ** 1.5
            if v > 0.02:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * v)))
    # (1,2) rastro vertical
    x0, y0 = celula(1, 2)
    for y in range(32):
        for x in range(32):
            v = max(0, 1 - abs(x + 0.5 - 16) / 6) ** 2 * math.sin(math.pi * (y + 0.5) / 32)
            if v > 0.02:
                t.p(x0 + x, y0 + y, com_alfa(B, round(255 * v)))
    return t


# =================================================================== glifos
def glifos() -> Tela:
    t = Tela(256, 256)

    def celula(n: int) -> Tela:
        return Tela(16, 16)

    def por(n: int, c: Tela) -> None:
        t.colar(c, (n % 16) * 16, (n // 16) * 16)

    def segmento(fracao: float, cheio: tuple, brilho: tuple) -> Tela:
        c = Tela(16, 16)
        c.rect(0, 3, 6, 12, P["contorno"])
        c.rect(1, 4, 5, 11, P["noite1"])
        n = round(5 * fracao)
        for x in range(1, 1 + n):
            for y in range(4, 12):
                c.p(x, y, mistura(brilho, cheio, (y - 4) / 7))
        if n:
            c.rect(1, 4, n, 4, P["branco"] if fracao >= 1 else brilho)
        return c

    for i, f in enumerate((0, 0.25, 0.5, 0.75, 1.0)):
        por(i, segmento(f, P["ciano1"], P["ciano3"]))
    tampa = Tela(16, 16)
    tampa.poligono([(0, 7.5), (3.5, 3), (7, 7.5), (3.5, 12)], P["ouro2"])
    tampa.p(3, 7, P["ouro4"]); tampa.contorno()
    por(5, tampa)
    tampa_d = Tela(16, 16)
    tampa_d.im = tampa.im.copy()
    tampa_d.px = tampa_d.im.load()
    por(6, tampa_d)
    por(7, segmento(1.0, P["ouro1"], P["ouro3"]))
    veu = Tela(16, 16)
    pts = [(7 + 6 * math.cos(math.pi / 6 + i * math.pi / 3), 8 + 6 * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    for (a, b), (c2, d) in zip(pts, pts[1:] + pts[:1]):
        veu.linha(round(a), round(b), round(c2), round(d), P["ciano3"])
    veu.disco(7, 8, 2, P["prata3"])
    por(8, veu)
    dom = Tela(16, 16)
    dom.anel(7, 12, 5, 6.4, P["viol2"])
    dom.rect(0, 12, 14, 12, P["prata2"])
    dom.p(6, 9, P["branco"]); dom.p(9, 8, P["viol3"])
    for y in range(13, 16):
        for x in range(16):
            dom.p(x, y, (0, 0, 0, 0))
    por(9, dom)
    ok = Tela(16, 16)
    for x, y in ((1, 8), (2, 9), (3, 10), (4, 11), (5, 10), (6, 9), (7, 8), (8, 7), (9, 6), (10, 5)):
        ok.p(x, y, hx("#5dff7a")); ok.p(x, y + 1, hx("#2fae48"))
    por(10, ok)
    amp = Tela(16, 16)
    amp.rect(2, 2, 10, 3, P["ouro2"]); amp.rect(2, 12, 10, 13, P["ouro2"])
    amp.poligono([(3, 4), (10, 4), (6.5, 8)], P["prata2"]); amp.poligono([(6.5, 8), (10, 12), (3, 12)], P["carm2"])
    por(11, amp)
    eter = Tela(16, 16)
    eter.poligono([(6, 1), (11, 7), (6, 14), (1, 7)], P["ciano2"])
    eter.poligono([(6, 3), (8.5, 7), (6, 11), (3.5, 7)], P["ciano3"])
    eter.p(5, 5, P["branco"]); eter.contorno()
    por(12, eter)
    cad = Tela(16, 16)
    cad.anel(6, 6, 2.2, 3.6, P["prata2"])
    cad.rect(2, 7, 10, 13, P["ouro2"]); cad.p(6, 10, P["contorno"]); cad.contorno()
    por(13, cad)
    est = Tela(16, 16)
    est.estrela4(7, 8, 5, P["ouro3"], P["branco"])
    por(14, est)
    for i, tec in enumerate(("veu", "poco", "nova", "passo", "reversao", "horizonte", "abobada")):
        por(16 + i, icone_tecnica(tec, 16))
    return t


# =================================================================== ícone do pacote
def pack_icon() -> Image.Image:
    s = 64
    t = Tela(s, s)
    r = rng("pack")
    for y in range(s):
        for x in range(s):
            t.p(x, y, mistura(hx("#04041a"), hx("#2a0e57"), (y / s) ** 1.3))
    for _ in range(5):
        cx, cy, rr = r.uniform(0, s), r.uniform(0, s), r.uniform(8, 18)
        t.brilho(cx, cy, rr, com_alfa(r.choice([P["viol1"], P["ciano0"], P["noite3"]]), 150))
    for _ in range(45):
        x, y = r.randint(0, s - 1), r.randint(0, s - 1)
        t.p(x, y, mistura(P["prata1"], P["branco"], r.random()))
    cx, cy = 32, 29
    t.brilho(cx, cy, 24, com_alfa(P["viol2"], 120))
    t.anel(cx, cy, 17.2, 19.2, P["ouro2"])
    t.anel(cx, cy, 17.2, 17.8, P["ouro1"])
    t.anel(cx, cy, 13.3, 14.0, com_alfa(P["prata2"], 220))
    for a in range(0, 360, 30):
        rad = math.radians(a)
        t.linha(round(cx + 19.5 * math.cos(rad)), round(cy + 19.5 * math.sin(rad)), round(cx + 21.5 * math.cos(rad)), round(cy + 21.5 * math.sin(rad)), P["ouro3"] if a % 90 == 0 else P["ouro1"])
    t.brilho(cx - 6, cy + 1, 7, com_alfa(P["ciano2"], 230))
    t.disco(cx - 6, cy + 1, 2.6, P["ciano3"])
    t.brilho(cx + 6, cy + 1, 7, com_alfa(P["carm2"], 230))
    t.disco(cx + 6, cy + 1, 2.6, P["carm3"])
    t.brilho(cx, cy + 1, 5, com_alfa(P["viol3"], 220))
    t.disco(cx, cy + 1, 1.6, P["branco"])
    t.estrela4(cx, cy - 22, 4, P["ouro3"], P["branco"])
    t.brilho(cx, cy - 22, 5, com_alfa(P["ouro3"], 200))
    w = largura_texto("ZÊNITE", 1)
    texto(t, "ZÊNITE", (s - w) // 2, 53, 1, P["ouro3"], sombra=P["contorno"])
    big = t.im.resize((256, 256), Image.NEAREST)
    return big


# =================================================================== main
def main() -> None:
    itens = RP / "textures" / "items" / "zenite"
    item_poeira().salvar(itens / "poeira_estelar.png")
    item_astrolabio().salvar(itens / "astrolabio.png")
    item_codice().salvar(itens / "codice.png")
    item_selo().salvar(itens / "selo_eclipse.png")
    item_coracao().salvar(itens / "coracao_firmamento.png")
    for peca in ("diadema", "manto", "perneiras", "botas"):
        item_armadura(peca).salvar(itens / f"{peca}.png")
    for tec in TEC_CORES:
        item_sigilo(tec).salvar(itens / f"sigilo_{tec}.png")
        icone_tecnica(tec, 32).salvar(RP / "textures" / "ui" / "zenite" / f"{tec}.png")
    fb = RP / "textures" / "blocks" / "zenite" / "firmamento.png"
    fb.parent.mkdir(parents=True, exist_ok=True)
    bloco_firmamento().save(fb, optimize=True)
    armadura_camada1().salvar(RP / "textures" / "models" / "armor" / "zenite_1.png")
    armadura_camada2().salvar(RP / "textures" / "models" / "armor" / "zenite_2.png")
    atlas_particulas().salvar(RP / "textures" / "particle" / "zenite.png")
    glifos().salvar(RP / "font" / "glyph_E7.png")
    icone = pack_icon()
    for pasta in (BP, RP):
        icone.save(pasta / "pack_icon.png", optimize=True)
    print("texturas geradas")


if __name__ == "__main__":
    main()
