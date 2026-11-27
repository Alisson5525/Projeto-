#!/usr/bin/env python3
"""Folha de sprites em pixel art (16x16) para destruicao, poeira, agua e nuvens.

Linhas (y em pixels):
  0  pedacos de bloco (8 variacoes, em tons de cinza para receber a cor do bloco)
  16 pedrinhas e graos
  32 nuvem de poeira animada (8 quadros: cresce e se desfaz)
  48 cacos de vidro/gelo (translucidos com brilho na borda)
  64 folhas
  80 lascas de madeira
  96 gotas d'agua (0-3) e espuma (4-7)
  112 nuvens (0-3) e faiscas (4-7)
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "superman_addon", "resource_pack", "textures", "particle", "superman_debris.png")
S = 16
ROWS = {"chunk": 0, "pebble": 16, "dust": 32, "shard": 48, "leaf": 64, "splinter": 80, "water": 96, "cloud": 112}

# ordem de dithering 4x4 (Bayer) para transparencias em pixel art
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 + 1 / 32


def dither(alpha, levels=(0.0, 0.45, 0.75, 1.0)):
    """Quantiza a transparencia em poucos niveis com padrao ordenado (visual pixel art)."""
    h, w = alpha.shape
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    out = np.zeros_like(alpha)
    for lo, hi in zip(levels[:-1], levels[1:]):
        band = (alpha > lo) & (alpha <= hi)
        frac = (alpha - lo) / (hi - lo)
        out = np.where(band, np.where(frac > th, hi, lo), out)
    return np.where(alpha > levels[-1], levels[-1], out)


def polygon_mask(pts, size=S, ss=8):
    """Preenche o poligono (convexo ou nao) com supersampling e corta em 50%."""
    im = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((size, size), Image.BOX)) >= 128


def edges(mask):
    up = np.roll(mask, 1, 0); up[0] = False
    dn = np.roll(mask, -1, 0); dn[-1] = False
    lf = np.roll(mask, 1, 1); lf[:, 0] = False
    rt = np.roll(mask, -1, 1); rt[:, -1] = False
    return mask & ~up, mask & ~dn, mask & ~lf, mask & ~rt


def rock(rng, rmin, rmax, nv=(5, 8)):
    """Pedaco de pedra: poligono irregular com luz no alto/esquerda, sombra embaixo/direita e rachadura."""
    k = int(rng.integers(*nv))
    off = rng.uniform(0, math.tau)
    angs = [off + j / k * math.tau + rng.uniform(-0.25, 0.25) * math.tau / k for j in range(k)]
    c = S / 2
    pts = [(c + math.cos(a) * rng.uniform(rmin, rmax), c + math.sin(a) * rng.uniform(rmin, rmax)) for a in angs]
    m = polygon_mask(pts)
    top, bot, left, right = edges(m)
    shade = np.full((S, S), 0.82)
    yy, xx = np.mgrid[0:S, 0:S]
    shade += (c - xx) * 0.012 + (c - yy) * 0.016
    shade += rng.choice([-0.06, 0, 0, 0.05], (S, S))
    shade = np.where(top | left, 1.0, shade)
    shade = np.where(bot | right, 0.5, shade)
    # rachadura
    if rng.random() < 0.7:
        x, y = rng.uniform(c - 2, c + 2), rng.uniform(c - 2, c + 2)
        a = rng.uniform(0, math.tau)
        for _ in range(int(rmax)):
            ix, iy = int(x), int(y)
            if 0 <= ix < S and 0 <= iy < S and m[iy, ix] and not (top | left)[iy, ix]:
                shade[iy, ix] = 0.56
            x += math.cos(a); y += math.sin(a); a += rng.uniform(-0.6, 0.6)
    shade = np.round(np.clip(shade, 0, 1) * 8) / 8  # faixas de cor
    return np.dstack([shade, shade, shade, m.astype(float)])


def build():
    rng = np.random.default_rng(42)
    img = np.zeros((128, 128, 4))

    def put(row, i, rgba):
        y = ROWS[row]
        img[y:y + S, i * S:(i + 1) * S] = np.clip(rgba, 0, 1)

    yy, xx = np.mgrid[0:S, 0:S] + 0.5
    c = S / 2

    # pedacos de bloco
    for i in range(8):
        put("chunk", i, rock(rng, 3.5 + (i % 3) * 0.8, 5.5 + (i % 4) * 0.7))
    # pedrinhas/graos
    for i in range(8):
        put("pebble", i, rock(rng, 3.0 + (i % 3) * 0.4, 4.2 + (i % 2) * 0.6, (4, 6)))

    # nuvem de poeira: bolhas que crescem e se desfazem
    blobs = [(c + math.cos(j / 6 * math.tau) * 2.6, c + math.sin(j / 6 * math.tau) * 1.8 + 0.8, rng.uniform(2.6, 3.6)) for j in range(6)]
    blobs.append((c, c, 3.8))
    noise = rng.random((S, S))
    for f in range(8):
        t = f / 7
        grow = 0.8 + 0.55 * t
        d = np.zeros((S, S))
        for bx, by, br in blobs:
            r = np.hypot(xx - (c + (bx - c) * grow), yy - (c + (by - c) * grow - t * 1.5)) / (br * grow)
            d = np.maximum(d, np.clip(1 - r, 0, 1))
        a = np.clip(d * 2.6, 0, 1) * (1 - t ** 2.2) * 0.9
        a = np.where((noise < t * 0.8) & (d < 0.55), a * 0.4, a)   # erosao nas bordas no fim
        a = dither(a, (0.0, 0.3, 0.6, 0.9))
        shade = np.clip(0.95 - (yy - c) * 0.025 - (1 - d) * 0.2, 0.55, 1)
        shade = np.round(shade * 6) / 6
        put("dust", f, np.dstack([shade, shade, shade, a]))

    # cacos de vidro: triangulos finos translucidos com brilho
    for i in range(8):
        a0 = rng.uniform(0, math.tau)
        L = rng.uniform(4.5, 7)
        pts = [(c + math.cos(a0) * L, c + math.sin(a0) * L),
               (c + math.cos(a0 + 2.4) * rng.uniform(2, 3.5), c + math.sin(a0 + 2.4) * rng.uniform(2, 3.5)),
               (c + math.cos(a0 - 2.2) * rng.uniform(2, 3.5), c + math.sin(a0 - 2.2) * rng.uniform(2, 3.5))]
        angs = [math.atan2(p[1] - c, p[0] - c) for p in pts]
        pts = [p for _, p in sorted(zip(angs, pts))]
        m = polygon_mask(pts)
        top, bot, left, right = edges(m)
        rim = top | left
        alpha = np.where(m, 0.55, 0.0)
        alpha = np.where(top | bot | left | right, 0.9, alpha)
        shade = np.where(rim, 1.0, 0.85)
        # reflexo diagonal
        diag = np.abs((xx - c) + (yy - c) - rng.uniform(-2, 1)) < 0.8
        shade = np.where(m & diag, 1.0, shade)
        alpha = np.where(m & diag, 0.95, alpha)
        put("shard", i, np.dstack([shade, shade, shade, alpha]))

    # folhas: elipse com nervura e talo
    for i in range(8):
        ang = rng.uniform(0, math.pi)
        a_, b_ = rng.uniform(4.5, 6.2), rng.uniform(2.6, 3.6)
        ca, sa = math.cos(ang), math.sin(ang)
        u = (xx - c) * ca + (yy - c) * sa
        v = -(xx - c) * sa + (yy - c) * ca
        m = (u / a_) ** 2 + (v / b_) ** 2 <= 1
        if i % 2:  # folha pontuda
            m &= (u / a_) ** 2 + (np.abs(v) / b_ + 0.25 * (u / a_)) ** 2 <= 1.1
        top, bot, left, right = edges(m)
        shade = np.full((S, S), 0.8) + v * 0.03
        shade = np.where(np.abs(v) < 0.55, 0.62, shade)       # nervura
        shade = np.where(top | left, 0.98, shade)
        shade = np.where(bot | right, 0.52, shade)
        stem = (np.abs(v) < 0.6) & (u < -a_) & (u > -a_ - 2)
        alpha = (m | stem).astype(float)
        shade = np.where(stem, 0.5, shade)
        shade = np.round(np.clip(shade, 0, 1) * 8) / 8
        put("leaf", i, np.dstack([shade, shade, shade, alpha]))

    # lascas de madeira: tiras finas com veio
    for i in range(8):
        ang = rng.uniform(0, math.pi)
        L, W = rng.uniform(4, 7), rng.uniform(0.7, 1.4)
        ca, sa = math.cos(ang), math.sin(ang)
        u = (xx - c) * ca + (yy - c) * sa
        v = -(xx - c) * sa + (yy - c) * ca
        m = (np.abs(u) <= L) & (np.abs(v) <= W + 0.3 * (u / L))
        top, bot, left, right = edges(m)
        grain = (np.floor((u + 7) * 1.3) % 3 == 0)
        shade = np.where(grain, 0.7, 0.86)
        shade = np.where(top | left, 1.0, shade)
        shade = np.where(bot | right, 0.55, shade)
        put("splinter", i, np.dstack([shade, shade, shade, m.astype(float)]))

    # gotas d'agua (0-3) e espuma (4-7)
    for i in range(4):
        r = 1.6 + i * 0.6
        d = np.hypot(xx - c, (yy - c) * (1.0 if i < 2 else 0.85)) / r
        m = d <= 1
        top, bot, left, right = edges(m)
        rgb = np.dstack([np.full((S, S), 0.78), np.full((S, S), 0.9), np.ones((S, S))])
        hl = (np.hypot(xx - (c - r * 0.35), yy - (c - r * 0.35)) < max(0.8, r * 0.35)) & m
        rgb[hl] = 1.0
        rgb[bot | right] *= 0.8
        put("water", i, np.dstack([rgb, np.where(m, 0.9, 0.0)]))
    for i in range(4):
        d = np.zeros((S, S))
        for _ in range(5 + i):
            bx, by, br = c + rng.uniform(-4, 4), c + rng.uniform(-3, 3), rng.uniform(1.5, 3.5)
            d = np.maximum(d, np.clip(1 - np.hypot(xx - bx, yy - by) / br, 0, 1))
        a = dither(np.clip(d * 2.5, 0, 1) * 0.95)
        put("water", 4 + i, np.dstack([np.ones((S, S)), np.ones((S, S)), np.ones((S, S)), a]))

    # nuvens (0-3): fofas, brancas em cima e cinza-azuladas embaixo
    for i in range(4):
        d = np.zeros((S, S))
        for _ in range(5):
            bx, by, br = c + rng.uniform(-4.5, 4.5), c + rng.uniform(-1.5, 2.5), rng.uniform(2.5, 4.5)
            d = np.maximum(d, np.clip(1 - np.hypot(xx - bx, (yy - by) * 1.2) / br, 0, 1))
        d *= (yy < c + 5)
        a = dither(np.clip(d * 2.0, 0, 1))
        shade = np.round(np.clip(1.02 - np.clip(yy - c + 1, 0, 8) * 0.04, 0.72, 1) * 6) / 6
        rgb = np.dstack([shade * 0.98, shade * 0.99, np.minimum(1, shade * 1.04)])
        put("cloud", i, np.dstack([rgb, a]))
    # faiscas (4-7): risco horizontal com nucleo claro
    for i in range(4):
        L = 4 + i * 1.3
        core = (np.abs(yy - c) < 0.6) & (np.abs(xx - c) < L)
        halo = (np.abs(yy - c) < 1.4) & (np.abs(xx - c) < L * 0.7)
        a = np.where(core, 1.0, np.where(halo, 0.45, 0.0))
        put("cloud", 4 + i, np.dstack([np.ones((S, S)), np.ones((S, S)), np.ones((S, S)), a]))

    out = Image.fromarray((img * 255 + 0.5).astype(np.uint8), "RGBA")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out.save(OUT)
    return out


if __name__ == "__main__":
    im = build()
    print("folha de sprites:", OUT, im.size)
