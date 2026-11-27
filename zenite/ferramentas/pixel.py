"""Primitivas de pixel art usadas pelos geradores de textura do Zênite.

Tudo é determinístico (sementes fixas), então rodar os geradores de novo
produz exatamente os mesmos PNGs.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image

Cor = tuple[int, int, int, int]


def hx(h: str, a: int = 255) -> Cor:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mistura(c0: Cor, c1: Cor, t: float) -> Cor:
    t = max(0.0, min(1.0, t))
    return tuple(round(a + (b - a) * t) for a, b in zip(c0, c1))  # type: ignore[return-value]


def com_alfa(c: Cor, a: int) -> Cor:
    return (c[0], c[1], c[2], max(0, min(255, a)))


def clarear(c: Cor, k: float) -> Cor:
    return mistura(c, (255, 255, 255, c[3]), k)


def escurecer(c: Cor, k: float) -> Cor:
    return mistura(c, (0, 0, 0, c[3]), k)


# Paleta original do Zênite (noite estelar, ouro, prata, ciano, carmesim, violeta).
P = {
    "contorno": hx("#07050f"),
    "noite0": hx("#0a0a1e"), "noite1": hx("#141538"), "noite2": hx("#1f2256"), "noite3": hx("#2f3a86"), "noite4": hx("#4656b8"),
    "ouro0": hx("#6e400e"), "ouro1": hx("#b07a24"), "ouro2": hx("#e6b445"), "ouro3": hx("#ffe597"), "ouro4": hx("#fff6d6"),
    "prata0": hx("#3e4763"), "prata1": hx("#7f8bb0"), "prata2": hx("#c4d0ec"), "prata3": hx("#f4f8ff"),
    "ciano0": hx("#06324f"), "ciano1": hx("#1470b0"), "ciano2": hx("#36c8ff"), "ciano3": hx("#b4f2ff"),
    "carm0": hx("#3e0610"), "carm1": hx("#981526"), "carm2": hx("#ff2f46"), "carm3": hx("#ffb3a2"),
    "lar2": hx("#ff8a2a"), "lar3": hx("#ffd08a"),
    "viol0": hx("#22083e"), "viol1": hx("#531896"), "viol2": hx("#9d4dff"), "viol3": hx("#dcc0ff"),
    "branco": hx("#ffffff"), "creme": hx("#f1e6c8"), "pedra0": hx("#2a2333"), "pedra1": hx("#4b405c"), "pedra2": hx("#776a8c"),
    "nada": (0, 0, 0, 0),
}


class Tela:
    """Imagem RGBA com operações de pixel art (coordenadas inteiras)."""

    def __init__(self, w: int, h: int, fundo: Cor = (0, 0, 0, 0)):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), fundo)
        self.px = self.im.load()

    # ---------------------------------------------------------- básicos
    def dentro(self, x: int, y: int) -> bool:
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x: int, y: int) -> Cor:
        return self.px[x, y] if self.dentro(x, y) else (0, 0, 0, 0)

    def p(self, x: float, y: float, c: Cor) -> None:
        x, y = int(math.floor(x)), int(math.floor(y))
        if self.dentro(x, y):
            self.px[x, y] = c

    def sobre(self, x: float, y: float, c: Cor) -> None:
        """Pinta compondo por alfa (para brilhos)."""
        x, y = int(math.floor(x)), int(math.floor(y))
        if not self.dentro(x, y) or c[3] == 0:
            return
        b = self.px[x, y]
        a = c[3] / 255
        if b[3] == 0:
            self.px[x, y] = c
            return
        out_a = a + (b[3] / 255) * (1 - a)
        cor = tuple(round((c[i] * a + b[i] * (b[3] / 255) * (1 - a)) / out_a) for i in range(3))
        self.px[x, y] = (*cor, round(out_a * 255))

    def rect(self, x0: int, y0: int, x1: int, y1: int, c: Cor) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def linha(self, x0: int, y0: int, x1: int, y1: int, c: Cor, sobre: bool = False) -> None:
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            (self.sobre if sobre else self.p)(x0, y0, c)
            if x0 == x1 and y0 == y1:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def disco(self, cx: float, cy: float, r: float, c: Cor) -> None:
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self.p(x, y, c)

    def anel(self, cx: float, cy: float, r0: float, r1: float, c: Cor, sobre: bool = False) -> None:
        for y in range(int(cy - r1 - 1), int(cy + r1 + 2)):
            for x in range(int(cx - r1 - 1), int(cx + r1 + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if r0 <= d <= r1:
                    (self.sobre if sobre else self.p)(x, y, c)

    def brilho(self, cx: float, cy: float, r: float, c: Cor, forca: float = 1.0) -> None:
        """Halo radial suave (alfa cai com a distância)."""
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
                if d < 1:
                    self.sobre(x, y, com_alfa(c, round(c[3] * forca * (1 - d) ** 2)))

    def estrela4(self, cx: int, cy: int, braco: int, c: Cor, nucleo: Cor | None = None) -> None:
        """Brilho em cruz (estrela de 4 pontas)."""
        for i in range(-braco, braco + 1):
            self.p(cx + i, cy, c)
            self.p(cx, cy + i, c)
        if braco >= 3:
            for d in (-1, 1):
                self.p(cx + d, cy + d, com_alfa(c, c[3] // 2))
                self.p(cx + d, cy - d, com_alfa(c, c[3] // 2))
        self.p(cx, cy, nucleo or P["branco"])

    def poligono(self, pts: list[tuple[float, float]], c: Cor) -> None:
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            yc = y + 0.5
            xs = []
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                if (y0 <= yc < y1) or (y1 <= yc < y0):
                    xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(int(math.ceil(a - 0.5)), int(math.floor(b - 0.5)) + 1):
                    self.p(x, y, c)

    # ---------------------------------------------------------- acabamento
    def opaco(self, x: int, y: int) -> bool:
        return self.get(x, y)[3] > 0

    def contorno(self, c: Cor = P["contorno"], diagonais: bool = False) -> None:
        alvo = []
        viz = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (-1, -1), (1, -1), (-1, 1)] if diagonais else [])
        for y in range(self.h):
            for x in range(self.w):
                if not self.opaco(x, y) and any(self.opaco(x + dx, y + dy) for dx, dy in viz):
                    alvo.append((x, y))
        for x, y in alvo:
            self.p(x, y, c)

    def sombrear(self, luz: float = 0.28, sombra: float = 0.32, ignorar: set[Cor] | None = None) -> None:
        """Luz de cima-esquerda: borda superior/esquerda clareia, inferior/direita escurece."""
        orig = {(x, y): self.get(x, y) for y in range(self.h) for x in range(self.w)}
        for (x, y), c in orig.items():
            if c[3] == 0 or (ignorar and c in ignorar):
                continue
            topo = orig.get((x, y - 1), (0, 0, 0, 0))[3] == 0 or orig.get((x - 1, y), (0, 0, 0, 0))[3] == 0
            base = orig.get((x, y + 1), (0, 0, 0, 0))[3] == 0 or orig.get((x + 1, y), (0, 0, 0, 0))[3] == 0
            if topo and not base:
                self.p(x, y, clarear(c, luz))
            elif base and not topo:
                self.p(x, y, escurecer(c, sombra))

    def colar(self, outra: "Tela", ox: int, oy: int) -> None:
        self.im.alpha_composite(outra.im, (ox, oy))
        self.px = self.im.load()

    def salvar(self, caminho: Path) -> None:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        self.im.save(caminho, optimize=True)


def rng(semente: str) -> random.Random:
    return random.Random(semente)


# ------------------------------------------------------------------ fonte
# Fonte pixel 5x7 própria (maiúsculas, números e acentos usados nos títulos).
FONTE = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    " ": ["000", "000", "000", "000", "000", "000", "000"],
}
ACENTO_CIRC = ["00100", "01010"]


def texto(t: Tela, s: str, x: int, y: int, escala: int, cor: Cor, sombra: Cor | None = None, espaco: int = 1) -> int:
    """Escreve s com a fonte própria. Suporta Ê (E com circunflexo). Retorna a largura."""
    cx = x
    for ch in s:
        circ = ch == "Ê"
        g = FONTE["E" if circ else ch]
        for oy, linha in enumerate(g):
            for ox, b in enumerate(linha):
                if b == "1":
                    for sy in range(escala):
                        for sx in range(escala):
                            if sombra:
                                t.p(cx + ox * escala + sx + escala, y + oy * escala + sy + escala, sombra)
        for oy, linha in enumerate(g):
            for ox, b in enumerate(linha):
                if b == "1":
                    for sy in range(escala):
                        for sx in range(escala):
                            t.p(cx + ox * escala + sx, y + oy * escala + sy, cor)
        if circ:
            for oy, linha in enumerate(ACENTO_CIRC):
                for ox, b in enumerate(linha):
                    if b == "1":
                        for sy in range(escala):
                            for sx in range(escala):
                                t.p(cx + ox * escala + sx, y + (oy - 3) * escala + sy, cor)
        cx += (len(g[0]) + espaco) * escala
    return cx - x


def largura_texto(s: str, escala: int, espaco: int = 1) -> int:
    return sum((len(FONTE["E" if ch == "Ê" else ch][0]) + espaco) * escala for ch in s) - espaco * escala
