#!/usr/bin/env python3
"""Gera a geometria (geometry.superman) e a skin em pixel art do heroi Solaris.

Estilo pixel art: 2 pixels por unidade (equivalente a uma skin 128x128), paleta
fechada com rampas de cor, sombreado em faixas (sem degrade) e detalhes desenhados
pixel a pixel (rosto, emblema, fivela). Cada face de cada cubo tem UV proprio e
cada pixel e pintado a partir da sua posicao 3D, entao as costuras entre faces
continuam alinhadas.

Personagem original: uniforme grafite com frisos dourados, braceletes e botas
douradas, cinto prateado e capa laranja "chama solar" com um sol nas costas.

Saidas:
  resource_pack/models/entity/superman.geo.json
  resource_pack/textures/entity/superman/superman.png
"""
import json
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "superman_addon", "resource_pack")

S = 2            # pixels por unidade (pixel art 128x128 equivalente)
TW = TH = 128    # tamanho da textura em unidades (imagem 256x256)

# ---------------------------------------------------------------------------
# Esqueleto v2: articulado (cotovelos e joelhos) e com nomes compativeis com o
# jogador vanilla. Medidas na grade de 0,5 unidade (cada pixel cai num texel).
# ---------------------------------------------------------------------------
BONES = [
    ("root", None, [0, 0, 0]),
    ("sm_yaw", "root", [0, 14, 0]),
    ("sm_pitch", "sm_yaw", [0, 14, 0]),
    ("sm_roll", "sm_pitch", [0, 14, 0]),
    ("waist", "sm_roll", [0, 12, 0]),
    ("body", "waist", [0, 24, 0]),
    ("emblem", "body", [0, 20.25, -2.75]),
    ("head", "body", [0, 24, 0]),
    ("hair", "head", [0, 24, 0]),
    ("eyelids", "head", [0, 28, -4]),
    ("eye_glow", "head", [0, 28, -4]),
    ("collar", "body", [0, 23.5, 3]),
    ("sm_cape", "body", [0, 24, 2.5]),
    ("cape1", "sm_cape", [0, 24, 2.5]),
    ("cape2", "cape1", [0, 20, 2.5]),
    ("cape3", "cape2", [0, 16, 2.5]),
    ("cape4", "cape3", [0, 12, 2.5]),
    ("cape5", "cape4", [0, 8, 2.5]),
    ("cape6", "cape5", [0, 4, 2.5]),
    ("rightArm", "body", [-5, 22, 0]),
    ("rightForearm", "rightArm", [-6, 17, 0]),
    ("rightItem", "rightForearm", [-6, 15, 1]),
    ("leftArm", "body", [5, 22, 0]),
    ("leftForearm", "leftArm", [6, 17, 0]),
    ("leftItem", "leftForearm", [6, 15, 1]),
    ("rightLeg", "sm_roll", [-1.9, 12, 0]),
    ("rightShin", "rightLeg", [-1.9, 6, 0]),
    ("leftLeg", "sm_roll", [1.9, 12, 0]),
    ("leftShin", "leftLeg", [1.9, 6, 0]),
]


def cube(bone, part, origin, size, inflate=0, rot=None, pivot=None):
    return {"bone": bone, "part": part, "origin": list(origin), "size": list(size), "inflate": inflate,
            "rot": rot, "pivot": pivot}


def mirror(c, bone):
    """Copia espelhada (lado esquerdo) de um cubo do lado direito."""
    o, sz = c["origin"], c["size"]
    m = dict(c)
    m["bone"] = bone
    m["origin"] = [round(-(o[0] + sz[0]), 4), o[1], o[2]]
    if c["rot"]:
        m["rot"] = [c["rot"][0], -c["rot"][1], -c["rot"][2]]
        m["pivot"] = [-c["pivot"][0], c["pivot"][1], c["pivot"][2]]
    return m


def build_cubes():
    C = []
    # tronco esculpido: base, peitoral, abdomen, dorsais, costas, trapezio
    C += [
        cube("body", "torso", [-4, 12, -2], [8, 12, 4]),
        cube("body", "chest", [-4.25, 18.5, -2.75], [8.5, 4.5, 0.75]),
        cube("body", "abs", [-2.5, 13.5, -2.5], [5, 4.5, 0.5]),
        cube("body", "lat", [-4.75, 14.5, -1.5], [0.75, 7, 3]),
        cube("body", "lat", [4, 14.5, -1.5], [0.75, 7, 3]),
        cube("body", "backm", [-3.5, 14.5, 2], [7, 8, 0.5]),
        cube("body", "trap", [-3, 23.5, -1], [6, 1, 2.5]),
        cube("body", "belt", [-4.75, 11.5, -2.5], [9.5, 2, 5]),
        cube("body", "buckle", [-1.25, 11.75, -3], [2.5, 2, 0.5]),
    ]
    # sol em 3D no peito: medalhao, disco e 8 raios
    C += [
        cube("emblem", "badge", [-2.75, 17.5, -3], [5.5, 5.5, 0.25]),
        cube("emblem", "sundisc", [-1.25, 19, -3.5], [2.5, 2.5, 0.5]),
    ]
    for i in range(8):
        a = i * 45
        ln = 1.25 if i % 2 == 0 else 0.9
        C.append(cube("emblem", "ray", [-0.25, 21.75, -3.35], [0.5, ln, 0.35], rot=[0, 0, a], pivot=[0, 20.25, -3.2]))
    # cabeca esculpida
    C += [
        cube("head", "head", [-4, 24, -4], [8, 8, 8]),
        cube("head", "jaw", [-3, 24, -4.5], [6, 1.5, 0.5]),
        cube("head", "nose", [-0.5, 26, -4.75], [1, 1.5, 0.75]),
        cube("head", "brow", [-3.25, 28.5, -4.75], [6.5, 0.5, 0.75]),
        cube("head", "ear", [-4.75, 26.5, -0.25], [0.75, 2, 1.5]),
        cube("head", "ear", [4, 26.5, -0.25], [0.75, 2, 1.5]),
        cube("hair", "hair", [-4.5, 25.5, -4.5], [9, 7, 9]),
        cube("hair", "tuft", [-2.5, 31.5, -4.75], [5, 1.5, 4], rot=[-18, 0, 0], pivot=[0, 32, -2.75]),
        cube("hair", "tuft", [-3, 32.25, -2], [6, 0.75, 6]),
        cube("hair", "tuft", [-3.5, 27, 4.25], [7, 5, 1], rot=[12, 0, 0], pivot=[0, 32, 4.75]),
        cube("eyelids", "lid", [-3, 27.5, -4.05], [2, 1, 0.05]),
        cube("eyelids", "lid", [1, 27.5, -4.05], [2, 1, 0.05]),
        cube("eye_glow", "glow", [-3, 27.5, -4.1], [2, 1, 0.1]),
        cube("eye_glow", "glow", [1, 27.5, -4.1], [2, 1, 0.1]),
    ]
    # gola alta atras do pescoco (manto)
    C += [
        cube("collar", "collar", [-5.5, 23, 4.25], [11, 4, 0.5], rot=[-22, 0, 0], pivot=[0, 23, 4.5]),
        cube("collar", "collar", [-5.5, 23, 1.5], [1, 2.5, 3], rot=[0, 0, -10], pivot=[-5, 23, 3]),
        cube("collar", "collar", [4.5, 23, 1.5], [1, 2.5, 3], rot=[0, 0, 10], pivot=[5, 23, 3]),
    ]
    # capa longa em 6 segmentos (pares levemente recuados contra z-fighting)
    C += [
        cube("cape1", "cape", [-5, 20, 2.5], [10, 4, 0.5]),
        cube("cape2", "cape", [-5.5, 15.5, 2.55], [11, 5, 0.4]),
        cube("cape3", "cape", [-6, 11.5, 2.5], [12, 5, 0.5]),
        cube("cape4", "cape", [-6.5, 7.5, 2.55], [13, 5, 0.4]),
        cube("cape5", "cape", [-6.75, 3.5, 2.5], [13.5, 5, 0.5]),
        cube("cape6", "cape", [-7, 0.25, 2.55], [14, 4.25, 0.4]),
    ]
    # braco direito: ombro, biceps, antebraco com bracelete, aleta e punho
    right_arm = [
        cube("rightArm", "arm", [-8, 17, -2], [4, 7, 4]),
        cube("rightArm", "deltoid", [-8.5, 20.25, -2.5], [5, 4, 5]),
        cube("rightArm", "biceps", [-7.5, 17.5, -2.5], [3, 2.5, 0.5]),
        cube("rightForearm", "arm", [-8, 12, -2], [4, 5, 4]),
        cube("rightForearm", "elbow", [-7.75, 16.25, -1.75], [3.5, 1.5, 3.5]),
        cube("rightForearm", "gauntlet", [-8.5, 13.75, -2.5], [5, 3, 5]),
        cube("rightForearm", "fin", [-9.25, 14, -1], [0.75, 3.5, 2.5], rot=[0, 0, -12], pivot=[-8.5, 14, 0.25]),
        cube("rightForearm", "fist", [-8.25, 11.75, -2.25], [4.5, 2, 4.5]),
    ]
    C += right_arm
    C += [mirror(c, c["bone"].replace("right", "left")) for c in right_arm]
    # perna direita: coxa, quadriceps, faixa do quadril; canela com bota, joelheira e biqueira
    right_leg = [
        cube("rightLeg", "leg", [-4, 6, -2], [4, 6, 4]),
        cube("rightLeg", "quad", [-3.65, 6.5, -2.5], [3.5, 3.5, 0.5]),
        cube("rightLeg", "trunk", [-4.35, 9.5, -2], [4, 2.5, 4], 0.2),
        cube("rightShin", "leg", [-4, 0, -2], [4, 6, 4]),
        cube("rightShin", "boot", [-4.35, 0.5, -2], [4, 5, 4], 0.25),
        cube("rightShin", "kneeguard", [-3.75, 4.75, -2.75], [3.5, 2, 0.75]),
        cube("rightShin", "toe", [-3.65, 0, -2.75], [3.5, 1.25, 0.75]),
    ]
    C += right_leg
    C += [mirror(c, c["bone"].replace("right", "left")) for c in right_leg]
    return C


CUBES = build_cubes()

FACES = ["north", "south", "east", "west", "up", "down"]


# ---------------------------------------------------------------------------
# Paleta (rampas do mais escuro para o mais claro)
# ---------------------------------------------------------------------------
def H(*hexes):
    return np.array([[int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] for h in hexes])


SUIT = H("07080f", "0e1121", "161b33", "202748", "2b355e", "3c4a7c", "5868a0")
GOLD = H("3a2104", "65390a", "98600f", "cc8d1c", "efb937", "ffdf78", "fff5c8")
CAPE = H("2c0805", "54120a", "82200f", "b03514", "d9531b", "f3802c", "ffb153")
SILV = H("23262f", "424754", "686f82", "939bb0", "c3cad9", "eef1f8")
SKIN = H("4a2418", "7a4228", "a7633f", "cf895b", "e9ab7a", "f7c89c", "ffe3c4")
HAIR = H("050609", "0d0f17", "181c29", "262d44", "3a4566")
EYE_W = H("f2f4fa")[0]
EYE_I = H("7a4a12", "c88a2a", "f0bd55")
LIP = H("b0645a")[0]


def ramp(R, light):
    """Converte iluminacao continua (0..1) em indices da rampa: faixas de cor."""
    idx = np.clip(np.round(np.clip(light, 0, 1) * (len(R) - 1)), 0, len(R) - 1).astype(int)
    return R[idx]


def band(v, a, b):
    """1 onde a <= v < b (pixels inteiros, sem bordas suaves)."""
    return ((v >= a) & (v < b)).astype(float)


def grid(rows, legend):
    """Desenho pixel a pixel: lista de strings -> (rgb, alpha)."""
    h, w = len(rows), len(rows[0])
    rgb = np.zeros((h, w, 3))
    a = np.zeros((h, w))
    for r, line in enumerate(rows):
        assert len(line) == w, f"linha {r} com {len(line)} pixels (esperado {w}): {line}"
        for c, ch in enumerate(line):
            if ch == " " or ch not in legend:
                continue
            rgb[r, c] = legend[ch]
            a[r, c] = 1
    return rgb, a


def full(color, shape):
    return np.broadcast_to(np.asarray(color, dtype=float), shape + (3,)).copy()


# ---------------------------------------------------------------------------
# Desenhos pixel a pixel
# ---------------------------------------------------------------------------
FACE_ROWS = [
    "hhhhhhhhhhhhhhhh",
    "hhgHHhhgghhHHghh",
    "hhhhhgHHHHghhhhh",
    ":.hhhhhhhhhhhh.:",
    ":.,,,hhhhhh,,,.:",
    ":.,,,,,,,,,,,,.:",
    ":.hhhh,..,hhhh.:",
    ":.kkk;.,,.;kkk.:",
    ":.wiIw.,,.wIiw.:",
    ":.,::..,:..::,.:",
    ":.,,..n::n..,,.:",
    ";:..,..::..,..:;",
    ";:...;mmmm;...:;",
    ";;:...,ll,...:;;",
    ";;::..,::,..::;;",
    "x;;;::::::::;;;x",
]
FACE_LEGEND = {
    "h": HAIR[1], "H": HAIR[3], "g": HAIR[2], "k": HAIR[0],
    ".": SKIN[4], ",": SKIN[5], "'": SKIN[6], ":": SKIN[3], ";": SKIN[2], "x": SKIN[1], "n": SKIN[1],
    "w": EYE_W, "i": EYE_I[1], "I": EYE_I[0], "m": H("8a4436")[0], "l": SKIN[5],
}

LID_ROWS = [":;;:", "kkkk"]
GLOW_ROWS = ["oyyo", "yWWy"]
GLOW_LEGEND = {"o": CAPE[5], "y": GOLD[5], "W": GOLD[6]}

BUCKLE_ROWS = [
    "sSSSs",
    "SgGgS",
    "SGWGS",
    "sSSSs",
]
BUCKLE_LEGEND = {"s": SILV[1], "S": SILV[3], "g": GOLD[3], "G": GOLD[4], "W": GOLD[6]}


def sun_badge(w, h):
    """Emblema do peito: medalhao com sol de 8 raios (desenho original)."""
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2, (h - 1) / 2
    dx, dy = (xx - cx) / (w / 2), (yy - cy) / (h / 2)
    d = np.sqrt(dx ** 2 + dy ** 2)
    ang = (np.degrees(np.arctan2(dy, dx)) + 360) % 45
    ray = np.minimum(ang, 45 - ang) < 9
    rgb = np.zeros((h, w, 3))
    a = (d < 1.02).astype(float)
    rgb[:] = SUIT[1]
    rgb[(d >= 0.84) & (d < 1.02)] = GOLD[2]
    rgb[(d >= 0.84) & (d < 1.02) & (dy < -0.2)] = GOLD[3]
    rgb[(d < 0.7) & ray & (d > 0.36)] = GOLD[3]
    rgb[(d < 0.7) & ray & (d > 0.36) & (dy < 0)] = GOLD[4]
    rgb[d < 0.38] = GOLD[4]
    rgb[d < 0.24] = GOLD[6]
    rgb[(d < 0.38) & (d >= 0.24) & (dx < -0.05) & (dy < -0.05)] = GOLD[5]
    return rgb, a


def sun_outline(w, h):
    """Sol vazado nas costas da capa."""
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2, (h - 1) / 2
    dx, dy = (xx - cx) / (w / 2), (yy - cy) / (h / 2)
    d = np.sqrt(dx ** 2 + dy ** 2)
    ang = (np.degrees(np.arctan2(dy, dx)) + 360) % 45
    ray = np.minimum(ang, 45 - ang) < 8
    m = ((d >= 0.42) & (d < 0.58)) | (ray & (d >= 0.7) & (d < 1.0)) | (d < 0.2)
    rgb = np.zeros((h, w, 3))
    rgb[:] = GOLD[4]
    rgb[dy > 0.25] = GOLD[3]
    return rgb, m.astype(float)


EMBLEM = sun_badge(12, 11)
CAPE_SUN = sun_outline(14, 14)


def decal_at(decal, X, Y, x0, x1, y0, y1):
    rgb, a = decal
    h, w = a.shape
    U = (X - x0) / (x1 - x0)
    V = (y1 - Y) / (y1 - y0)
    inside = (U >= 0) & (U < 1) & (V >= 0) & (V < 1)
    ix = np.clip((U * w).astype(int), 0, w - 1)
    iy = np.clip((V * h).astype(int), 0, h - 1)
    return rgb[iy, ix], a[iy, ix] * inside


# ---------------------------------------------------------------------------
# Pintura por parte (X,Y,Z = centro de cada pixel no modelo; px,py = pixel na face)
# ---------------------------------------------------------------------------

def p_torso(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.5)
    ax = np.abs(X)
    a = np.ones(X.shape)
    if face == "north":
        L += 0.17 * band(Y, 19, 22.5) * band(ax, 0.5, 3.5)            # peitoral
        L -= 0.33 * band(Y, 18.5, 19) * band(ax, 0.5, 3.5)            # sombra sob o peitoral
        abs_ = band(Y, 13.5, 18.5) * band(ax, 0.5, 2.5)
        L += 0.17 * abs_ * (band(Y, 17.5, 18) + band(Y, 16, 16.5) + band(Y, 14.5, 15))
        L -= 0.17 * abs_ * (band(Y, 16.5, 17) + band(Y, 15, 15.5))
        L -= 0.17 * band(ax, 0, 0.5) * band(Y, 13.5, 18.5)             # linha central
        L -= 0.17 * band(ax, 3, 4)                                     # laterais
        L -= 0.17 * band(Y, 12, 13.5)
        col = ramp(SUIT, L)
        gold = band(Y, 23.5, 24) * band(ax, 1, 4) + band(Y, 23, 23.5) * band(ax, 1, 1.5)
        col = np.where(gold[..., None] > 0, ramp(GOLD, 0.55 + 0.2 * band(Y, 23.5, 24)), col)
        return col, a
    if face == "south":
        L += 0.17 * band(ax, 1, 3) * band(Y, 19.5, 22.5)
        L -= 0.17 * band(ax, 0, 0.5) * band(Y, 13, 22)
        L -= 0.17 * band(ax, 3.5, 4) + 0.17 * band(Y, 12, 13)
        col = ramp(SUIT, L)
        col = np.where((band(Y, 23.5, 24) * band(ax, 0, 4))[..., None] > 0, ramp(GOLD, 0.55), col)
        return col, a
    if face in ("east", "west"):
        L += 0.17 * band(Y, 18, 22) * band(np.abs(Z), 0, 1.5)
        L -= 0.17 * band(np.abs(Z), 1.5, 2)
        col = ramp(SUIT, L)
        pipe = band(Z, -0.5, 0) * band(Y, 12, 23.5)                      # friso dourado lateral
        col = np.where(pipe[..., None] > 0, ramp(GOLD, 0.5 + 0.17 * band(Y, 19, 23.5)), col)
        return col, a
    if face == "up":
        return ramp(SUIT, np.full(X.shape, 0.33)), a
    return ramp(SUIT, np.full(X.shape, 0.17)), a


def p_emblem(face, X, Y, Z, cube, px, py):
    o, s = cube["origin"], cube["size"]
    if face == "north":
        return decal_at(EMBLEM, X, Y, o[0], o[0] + s[0], o[1], o[1] + s[1])
    rgb, a = decal_at(EMBLEM, np.clip(X, o[0] + 0.01, o[0] + s[0] - 0.01), np.clip(Y, o[1] + 0.01, o[1] + s[1] - 0.01),
                      o[0], o[0] + s[0], o[1], o[1] + s[1])
    return full(GOLD[2], X.shape), a


def p_belt(face, X, Y, Z, cube, px, py):
    o, s = cube["origin"], cube["size"]
    row = np.floor((o[1] + s[1] - Y) * S)          # 0 = linha de cima
    L = np.where(row == 0, 0.8, np.where(row == 1, 0.6, 0.4))
    if face in ("north", "south"):
        L = L - 0.2 * (np.mod(np.floor(X * S), 4) == 0) * (row == 1)
    if face in ("east", "west"):
        L = L - 0.2 * (np.mod(np.floor(Z * S), 4) == 0) * (row == 1)
    if face in ("up", "down"):
        L = np.full(X.shape, 0.6 if face == "up" else 0.2)
    return ramp(SILV, L), np.ones(X.shape)


def p_buckle(face, X, Y, Z, cube, px, py):
    if face == "north":
        return grid(BUCKLE_ROWS, BUCKLE_LEGEND)
    return full(SILV[2], X.shape), np.ones(X.shape)


def cape_color(X, Y, side):
    fold = np.cos(X * 1.6 + np.sin(Y * 0.35) * 0.9)
    L = 0.62 + 0.17 * np.round(fold * 1.4) / 1.4
    L -= 0.17 * band(Y, 0, 7) + 0.17 * band(Y, 0, 3.5)
    if side == "in":
        L -= 0.34
    col = ramp(CAPE, L)
    hem = band(Y, 0.25, 0.75)
    col = np.where(hem[..., None] > 0, ramp(GOLD, 0.33 if side == "out" else 0.17), col)
    stitch = band(Y, 0.75, 1.25) * (np.mod(np.floor(X * S), 2) == 0) * (side == "out")
    col = np.where(stitch[..., None] > 0, ramp(CAPE, 0.83), col)
    if side == "out":
        # sol vazado nas costas (visto de tras: esquerda do observador = +X)
        rgb, a = decal_at(CAPE_SUN, -X, Y, -3.5, 3.5, 12.5, 19.5)
        col = np.where(a[..., None] > 0, rgb, col)
    return col


def p_cape(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    if face == "south":
        col = cape_color(X, Y, "out")
        # debrum dourado nas bordas laterais da capa
        edge = (X < o[0] + 0.5) | (X > o[0] + sz[0] - 0.5)
        col = np.where(edge[..., None], ramp(GOLD, np.full(X.shape, 0.33)), col)
        return col, np.ones(X.shape)
    if face == "north":
        return cape_color(X, Y, "in"), np.ones(X.shape)
    col = ramp(CAPE, np.full(X.shape, 0.33))
    col = np.where((Y < 0.75)[..., None], ramp(GOLD, np.full(X.shape, 0.5)), col)
    return col, np.ones(X.shape)


def p_drape(face, X, Y, Z, cube, px, py):
    L = 0.66 + 0.17 * (np.mod(np.floor(X * S), 3) == 0)
    if face in ("down", "north"):
        L = np.full(X.shape, 0.33)
    col = ramp(CAPE, L)
    if face == "up":
        col = np.where((np.abs(X) > 3.5)[..., None], ramp(GOLD, np.full(X.shape, 0.66)), col)
    return col, np.ones(X.shape)


def p_arm(face, X, Y, Z, cube, px, py):
    o = cube["origin"]
    side = -1 if o[0] < 0 else 1           # -1 = braco direito
    lx = (X - o[0]) / 4.0
    L = np.full(X.shape, 0.5)
    L += 0.17 * band(Y, 21, 24)                                    # ombro
    if face == "north":
        L += 0.17 * band(Y, 18, 20.5) * band(lx, 0.25, 0.75)       # biceps
        L -= 0.17 * band(Y, 20.5, 21) * band(lx, 0.25, 0.75)
    if face in ("east", "west"):
        outer = (face == "east" and side < 0) or (face == "west" and side > 0)
        L -= 0.17 * (0 if outer else 1)
    col = ramp(SUIT, L)
    # friso dourado no lado de fora
    if face in ("east", "west"):
        outer = (face == "east" and side < 0) or (face == "west" and side > 0)
        if outer:
            pipe = band(Z, -0.5, 0) * band(Y, 17.5, 23.5)
            col = np.where(pipe[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.5)), col)
    # bracelete dourado
    br = band(Y, 14.5, 17.5)
    brL = 0.5 + 0.17 * band(Y, 16.5, 17) - 0.17 * band(Y, 14.5, 15) + 0.33 * band(Y, 17, 17.5)
    if face == "north":
        brL += 0.17 * band(lx, 0.25, 0.5) * band(Y, 15.5, 16.5)
    col = np.where(br[..., None] > 0, ramp(GOLD, brL), col)
    # luva (punho fechado)
    hand = band(Y, 12, 14.5)
    hL = np.full(X.shape, 0.5)
    if face == "north":
        hL += 0.17 * band(Y, 13.5, 14.5) - 0.17 * band(Y, 13, 13.5)
        hL -= 0.17 * (np.mod(np.floor(lx * 8), 2) == 1) * band(Y, 12, 13)
    if face == "down":
        hL = np.full(X.shape, 0.33)
    col = np.where(hand[..., None] > 0, ramp(SUIT, hL - 0.17), col)
    if face == "north":
        # placa dourada sobre os nos dos dedos
        knuckle = band(Y, 13.5, 14) * band(lx, 0.125, 0.875) * (np.mod(np.floor(lx * 8), 2) == 0)
        col = np.where(knuckle[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.66)), col)
    if face == "up":
        col = ramp(SUIT, np.full(X.shape, 0.66))
    if face == "down":
        col = ramp(SUIT, np.full(X.shape, 0.17))
    return col, np.ones(X.shape)


def p_leg(face, X, Y, Z, cube, px, py):
    o = cube["origin"]
    lx = (X - o[0]) / 4.0
    L = np.full(X.shape, 0.5)
    if face == "north":
        L += 0.17 * band(Y, 7, 10) * band(lx, 0.25, 0.75)
        L -= 0.17 * band(Y, 6, 6.5) * band(lx, 0.25, 0.75)
    if face == "south":
        L -= 0.17 * band(Y, 6, 9)
    col = ramp(SUIT, L)
    inner_right = o[0] > -1   # perna esquerda: lado de fora e +X (west)
    if face in ("east", "west"):
        outer = (face == "east" and not inner_right) or (face == "west" and inner_right)
        if outer:
            pipe = band(Z, -0.5, 0) * band(Y, 5.5, 12)
            col = np.where(pipe[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.5)), col)
    if face == "down":
        col = ramp(GOLD, np.full(X.shape, 0.17))
    return col, np.ones(X.shape)


def p_trunk(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.33)
    col = ramp(SUIT, L)
    o, s = cube["origin"], cube["size"]
    top = o[1] + s[1]
    edge = band(Y, top - 0.5, top) + band(Y, o[1], o[1] + 0.5)
    col = np.where(edge[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.5 + 0.17 * (Y > top - 0.5))), col)
    a = np.ones(X.shape)
    if face == "up":
        a = np.zeros(X.shape)
    return col, a


def p_boot(face, X, Y, Z, cube, px, py):
    o, s = cube["origin"], cube["size"]
    lx = (X - o[0]) / s[0]
    L = np.full(X.shape, 0.5)
    L += 0.17 * band(Y, 2.5, 4.5) * (face == "north") * band(lx, 0.25, 0.5)
    L -= 0.17 * band(Y, 0.5, 2)
    col = ramp(GOLD, L - 0.17)
    sole = band(Y, 0, 1)
    col = np.where(sole[..., None] > 0, ramp(SUIT, np.full(X.shape, 0.17)), col)
    top = o[1] + s[1]
    a = np.ones(X.shape)
    if face == "north":
        notch = top - 1.5 * (np.abs(lx - 0.5) < 0.2) - 1.0 * ((np.abs(lx - 0.5) >= 0.2) & (np.abs(lx - 0.5) < 0.3))
        a = np.where(Y > notch, 0.0, 1.0)
        rim = band(Y, notch - 0.5, notch)
        col = np.where(rim[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.83)), col)
    else:
        col = np.where(band(Y, top - 0.5, top)[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.83)), col)
    if face == "up":
        col = ramp(GOLD, np.full(X.shape, 0.17))
        a = np.where((Z < -1.25) & (np.abs(lx - 0.5) < 0.3), 0.0, 1.0)
    if face == "down":
        col = ramp(SUIT, np.full(X.shape, 0.0))
    return col, a


def p_head(face, X, Y, Z, cube, px, py):
    a = np.ones(X.shape)
    if face == "north":
        return grid(FACE_ROWS, FACE_LEGEND)
    if face in ("east", "west"):
        # u cresce de tras para frente (east) ou da frente para tras (west)
        L = np.full(X.shape, 0.66)
        L -= 0.17 * band(Y, 24, 25) + 0.17 * band(Z, 2.5, 4)
        col = ramp(SKIN, L)
        # orelha 3x4 pixels
        ear = band(Z, 0, 1.5) * band(Y, 26.5, 28.5)
        earL = 0.5 + 0.17 * band(Z, 1, 1.5) - 0.17 * band(Z, 0.5, 1) * band(Y, 27, 28)
        col = np.where(ear[..., None] > 0, ramp(SKIN, earL), col)
        # cabelo: acima da linha que desce de tras para frente, costeleta na frente
        hline = 29.5 - 2.0 * (Z > 1.0) - 1.0 * ((Z > -1.0) & (Z <= 1.0))
        burns = band(Z, -3.5, -2.5) * band(Y, 27.5, 32)
        hair = ((Y > hline) | (burns > 0))
        hc = ramp(HAIR, 0.25 + 0.25 * (np.mod(np.floor(Y * S) + np.floor(Z * S), 3) == 0))
        col = np.where(hair[..., None], hc, col)
        return col, a
    if face == "south":
        hline = 26.0 + 0.5 * (np.abs(X) > 2.5)
        hc = ramp(HAIR, 0.25 + 0.25 * (np.mod(np.floor(X * S), 3) == 0) * (Y > 28))
        col = np.where((Y > hline)[..., None], hc, ramp(SKIN, np.full(X.shape, 0.5)))
        return col, a
    if face == "up":
        return ramp(HAIR, np.full(X.shape, 0.25)), a
    return ramp(SKIN, np.full(X.shape, 0.33)), a


def p_hair(face, X, Y, Z, cube, px, py):
    """Cabelo penteado para tras com volume (camada 3D)."""
    if face == "up":
        # mechas na direcao da frente para tras, com risco de luz
        st = np.mod(np.floor(X * S) + np.floor(Z * S * 0.34), 4)
        L = 0.25 + 0.25 * (st == 0) + 0.25 * (st == 0) * (Z < -1.5)
        return ramp(HAIR, L), np.ones(X.shape)
    if face == "north":
        # topete: mechas mais compridas no centro, franja recortada pixel a pixel
        cols = np.floor((X + 4.5) * S).astype(int)
        depth = np.array([2, 3, 3, 4, 3, 4, 5, 5, 6, 6, 5, 5, 4, 4, 3, 3, 3, 2])[np.clip(cols, 0, 17)]
        rows = np.floor((32.5 - Y) * S).astype(int)
        a = (rows < depth).astype(float)
        L = 0.25 + 0.25 * (rows == 0) + 0.25 * ((np.mod(cols, 3) == 1) & (rows < depth - 1))
        return ramp(HAIR, L), a
    if face in ("east", "west"):
        rows = np.floor((32.5 - Y) * S).astype(int)
        zc = np.floor((Z + 4.5) * S).astype(int)          # 0 = frente
        depth = 3 + (zc >= 4) + (zc >= 8) + (zc >= 11) + (zc >= 14)
        a = (rows < depth).astype(float)
        L = 0.25 + 0.25 * (np.mod(rows + zc // 2, 3) == 0)
        return ramp(HAIR, L), a
    if face == "south":
        rows = np.floor((32.5 - Y) * S).astype(int)
        cols = np.floor((X + 4.5) * S).astype(int)
        depth = 11 + (np.mod(cols, 3) == 0)
        a = (rows < depth).astype(float)
        L = 0.25 + 0.25 * (np.mod(cols, 3) == 1) * (rows < depth - 2)
        return ramp(HAIR, L), a
    return ramp(HAIR, np.full(X.shape, 0.0)), np.zeros(X.shape)


def p_lid(face, X, Y, Z, cube, px, py):
    if face == "north":
        return grid(LID_ROWS, {":": SKIN[3], ";": SKIN[2], "k": HAIR[0]})
    return full(SKIN[3], X.shape), np.zeros(X.shape)


def p_glow(face, X, Y, Z, cube, px, py):
    if face == "north":
        return grid(GLOW_ROWS, GLOW_LEGEND)
    return full(CAPE[5], X.shape), np.ones(X.shape)


def _suit_plate(face, X, Y, Z, base=0.5, top_light=True):
    L = np.full(X.shape, base)
    if face == "up" and top_light:
        L = L + 0.17
    if face in ("down",):
        L = L - 0.33
    if face in ("east", "west"):
        L = L - 0.17
    return L


def p_chest(face, X, Y, Z, cube, px, py):
    L = _suit_plate(face, X, Y, Z, 0.5)
    ax = np.abs(X)
    if face == "north":
        L += 0.17 * band(Y, 21, 23) * band(ax, 0.5, 3.5)
        L -= 0.17 * band(Y, 18.5, 19.5) * band(ax, 0.5, 4)
        L -= 0.17 * band(ax, 0, 0.5)
        L -= 0.17 * band(ax, 3.5, 4.5)
    col = ramp(SUIT, L)
    if face == "up":
        col = np.where((band(ax, 3, 4.5) > 0)[..., None], ramp(GOLD, np.full(X.shape, 0.5)), col)
    return col, np.ones(X.shape)


def p_abs(face, X, Y, Z, cube, px, py):
    L = _suit_plate(face, X, Y, Z, 0.5)
    if face == "north":
        ax = np.abs(X)
        row = np.mod(Y - 13.5, 1.5)
        L += 0.17 * band(row, 1.0, 1.5)
        L -= 0.17 * (band(row, 0, 0.5) + band(ax, 0, 0.5))
        L -= 0.17 * band(ax, 2, 2.5)
    return ramp(SUIT, L), np.ones(X.shape)


def p_lat(face, X, Y, Z, cube, px, py):
    L = _suit_plate(face, X, Y, Z, 0.42)
    col = ramp(SUIT, L)
    outer = (face == "east" and X.mean() < 0) or (face == "west" and X.mean() > 0)
    if outer:
        pipe = band(Z, -0.5, 0)
        col = np.where(pipe[..., None] > 0, ramp(GOLD, 0.5 + 0.17 * band(Y, 18, 21.5)), col)
    return col, np.ones(X.shape)


def p_backm(face, X, Y, Z, cube, px, py):
    L = _suit_plate(face, X, Y, Z, 0.45)
    if face == "south":
        ax = np.abs(X)
        L += 0.17 * band(ax, 1, 3) * band(Y, 18, 22)
        L -= 0.17 * band(ax, 0, 0.5)
    return ramp(SUIT, L), np.ones(X.shape)


def p_trap(face, X, Y, Z, cube, px, py):
    return ramp(SUIT, _suit_plate(face, X, Y, Z, 0.5)), np.ones(X.shape)


def p_badge(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    cx, cy = o[0] + sz[0] / 2, o[1] + sz[1] / 2
    d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / (sz[0] / 2)
    if face == "north":
        col = ramp(SUIT, np.full(X.shape, 0.17))
        col = np.where((d >= 0.8)[..., None], ramp(GOLD, 0.5 + 0.17 * (Y > cy)), col)
        return col, (d < 1.0).astype(float)
    return ramp(GOLD, np.full(X.shape, 0.33)), np.zeros(X.shape)


def p_sundisc(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    cx, cy = o[0] + sz[0] / 2, o[1] + sz[1] / 2
    d = np.maximum(np.abs(X - cx), np.abs(Y - cy))
    if face == "north":
        col = ramp(GOLD, 0.83 - 0.33 * (d > 0.75))
        col = np.where(((X < cx) & (Y > cy) & (d <= 0.75))[..., None], full(GOLD[6], X.shape), col)
        return col, np.ones(X.shape)
    return ramp(GOLD, np.full(X.shape, 0.5)), np.ones(X.shape)


def p_ray(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    t = (Y - o[1]) / sz[1]
    return ramp(GOLD, 0.83 - 0.33 * t), np.ones(X.shape)


def p_jaw(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.66)
    if face == "north":
        L -= 0.17 * band(np.abs(X), 2, 3) + 0.17 * band(Y, 24, 24.5)
        L += 0.17 * band(np.abs(X), 0, 1) * band(Y, 24.5, 25.5)
    elif face == "down":
        L = np.full(X.shape, 0.33)
    elif face in ("east", "west"):
        L = np.full(X.shape, 0.5)
    return ramp(SKIN, L), np.ones(X.shape)


def p_nose(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.66)
    if face == "north":
        L += 0.17 * band(Y, 26.5, 27.5)
        L -= 0.33 * band(Y, 26, 26.5)
    elif face in ("east", "west"):
        L = np.full(X.shape, 0.5)
    elif face == "down":
        L = np.full(X.shape, 0.17)
    return ramp(SKIN, L), np.ones(X.shape)


def p_brow(face, X, Y, Z, cube, px, py):
    if face == "down":
        return ramp(SKIN, np.full(X.shape, 0.33)), np.ones(X.shape)
    ax = np.abs(X)
    col = ramp(HAIR, np.full(X.shape, 0.25))
    if face == "north":
        # sobrancelhas sobre os olhos, pele no meio
        skin = (band(ax, 0, 1.0) + band(ax, 3.0, 3.25)) > 0
        col = np.where(skin[..., None], ramp(SKIN, np.full(X.shape, 0.66)), col)
    return col, np.ones(X.shape)


def p_ear(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.5)
    outer = (face == "east" and X.mean() < 0) or (face == "west" and X.mean() > 0)
    if outer:
        L -= 0.17 * band(Y, 27, 28) * band(Z, 0.25, 0.75)
        L += 0.17 * band(Z, 0.75, 1.25)
    return ramp(SKIN, L), np.ones(X.shape)


def p_tuft(face, X, Y, Z, cube, px, py):
    st = np.mod(np.floor(X * S) + np.floor(Z * S * 0.5) + np.floor(Y * S * 0.5), 3)
    L = 0.25 + 0.25 * (st == 0) + 0.25 * (face == "up") * (st == 0)
    if face == "down":
        L = np.full(X.shape, 0.0)
    return ramp(HAIR, L), np.ones(X.shape)


def p_collar(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    col = ramp(CAPE, np.full(X.shape, 0.62))
    if face in ("north",) and sz[2] < 1:
        col = ramp(CAPE, np.full(X.shape, 0.3))
    top = o[1] + sz[1]
    col = np.where(band(Y, top - 0.5, top)[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.66)), col)
    if face == "up":
        col = ramp(GOLD, np.full(X.shape, 0.66))
    return col, np.ones(X.shape)


def p_deltoid(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    L = np.full(X.shape, 0.58)
    if face == "up":
        L = np.full(X.shape, 0.75)
    if face == "down":
        L = np.full(X.shape, 0.25)
    L -= 0.17 * band(Y, o[1], o[1] + 1.5) * (face not in ("up", "down"))
    col = ramp(SUIT, L)
    rim = band(Y, o[1], o[1] + 0.5) * (face not in ("up", "down"))
    col = np.where(rim[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.58)), col)
    if face == "up":
        edge = (X < o[0] + 0.5) | (X > o[0] + sz[0] - 0.5) | (Z < o[2] + 0.5) | (Z > o[2] + sz[2] - 0.5)
        col = np.where(edge[..., None], ramp(GOLD, np.full(X.shape, 0.66)), col)
    return col, np.ones(X.shape)


def p_biceps(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.66 if face == "north" else 0.5)
    L -= 0.17 * band(Y, 17.5, 18) * (face == "north")
    return ramp(SUIT, L), np.ones(X.shape)


def p_gauntlet(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    row = np.floor((o[1] + sz[1] - Y) * S)
    L = 0.5 + 0.17 * (row == 0) - 0.17 * (row == sz[1] * S - 1) - 0.17 * (np.mod(row, 2) == 1) * (row > 0)
    if face in ("up", "down"):
        L = np.full(X.shape, 0.33 if face == "up" else 0.17)
    col = ramp(GOLD, L)
    if face == "north":
        cx = o[0] + sz[0] / 2
        gem = (np.abs(X - cx) < 0.5) & band(Y, 14.75, 15.75).astype(bool)
        col = np.where(gem[..., None], full(GOLD[5], X.shape), col)
    return col, np.ones(X.shape)


def p_fin(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    L = 0.66 + 0.17 * band(Y, o[1] + sz[1] - 0.5, o[1] + sz[1])
    return ramp(GOLD, L), np.ones(X.shape)


def p_fist(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    L = np.full(X.shape, 0.33)
    col = ramp(SUIT, L)
    if face == "north":
        lx = (X - o[0]) / sz[0]
        stud = band(Y, 13.25, 13.75) * (np.mod(np.floor(lx * 9), 2) == 1)
        col = np.where(stud[..., None] > 0, ramp(GOLD, np.full(X.shape, 0.66)), col)
        col = np.where((band(Y, 12, 12.5) > 0)[..., None], ramp(SUIT, np.full(X.shape, 0.17)), col)
    if face == "down":
        col = ramp(SUIT, np.full(X.shape, 0.17))
    return col, np.ones(X.shape)


def p_elbow(face, X, Y, Z, cube, px, py):
    return ramp(SUIT, _suit_plate(face, X, Y, Z, 0.42)), np.ones(X.shape)


def p_quad(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.58 if face == "north" else 0.42)
    L += 0.17 * band(Y, 8.5, 10) * (face == "north")
    return ramp(SUIT, L), np.ones(X.shape)


def p_kneeguard(face, X, Y, Z, cube, px, py):
    o, sz = cube["origin"], cube["size"]
    cx = o[0] + sz[0] / 2
    L = 0.58 + 0.17 * (np.abs(X - cx) < 0.5) - 0.17 * band(Y, o[1], o[1] + 0.5)
    if face in ("up", "down", "east", "west"):
        L = np.full(X.shape, 0.42)
    return ramp(GOLD, L), np.ones(X.shape)


def p_toe(face, X, Y, Z, cube, px, py):
    L = np.full(X.shape, 0.5 if face in ("north", "up") else 0.33)
    col = ramp(GOLD, L)
    col = np.where((band(Y, 0, 0.5) > 0)[..., None], ramp(SUIT, np.full(X.shape, 0.17)), col)
    return col, np.ones(X.shape)


PAINTERS = {
    "torso": p_torso, "emblem": p_emblem, "belt": p_belt, "buckle": p_buckle, "drape": p_drape,
    "head": p_head, "hair": p_hair, "lid": p_lid, "glow": p_glow, "cape": p_cape, "arm": p_arm,
    "leg": p_leg, "trunk": p_trunk, "boot": p_boot,
    "chest": p_chest, "abs": p_abs, "lat": p_lat, "backm": p_backm, "trap": p_trap, "badge": p_badge,
    "sundisc": p_sundisc, "ray": p_ray, "jaw": p_jaw, "nose": p_nose, "brow": p_brow, "ear": p_ear,
    "tuft": p_tuft, "collar": p_collar, "deltoid": p_deltoid, "biceps": p_biceps, "gauntlet": p_gauntlet,
    "fin": p_fin, "fist": p_fist, "elbow": p_elbow, "quad": p_quad, "kneeguard": p_kneeguard, "toe": p_toe,
}

# ---------------------------------------------------------------------------
# Camada de brilho: pixels que acendem (olhos, sol do peito, frisos, sol da capa)
# ---------------------------------------------------------------------------
GLOW_ALL = {"glow", "sundisc", "ray", "fin"}
GLOW_GOLD = {"torso", "lat", "arm", "leg", "badge", "buckle", "chest", "deltoid", "gauntlet", "kneeguard"}


def glow_mask(part, face, rgb, a):
    if part in GLOW_ALL:
        return a > 0.5
    def near(colors):
        m = np.zeros(a.shape, bool)
        for c in colors:
            m |= np.all(np.abs(rgb - c) < 1e-3, axis=-1)
        return m & (a > 0.5)
    if part in ("gauntlet", "kneeguard"):
        return near([GOLD[5]])
    if part in GLOW_GOLD:
        return near([GOLD[3], GOLD[4], GOLD[5], GOLD[6]])
    if part == "head" and face == "north":
        return near([EYE_I[0], EYE_I[1]])
    if part == "cape" and face == "south":
        return near([GOLD[3], GOLD[4]])
    return np.zeros(a.shape, bool)

# ---------------------------------------------------------------------------
# Mapeamento face -> coordenadas 3D dos pixels
# ---------------------------------------------------------------------------

def face_dims(face, size):
    sx, sy, sz = size
    return {"north": (sx, sy), "south": (sx, sy), "east": (sz, sy), "west": (sz, sy),
            "up": (sx, sz), "down": (sx, sz)}[face]


def face_coords(face, origin, size, pw, ph):
    """Centro 3D de cada pixel. Convencao igual ao box-UV dos skins:
      north = frente (u com +X), south = costas (u com -X)
      east = lado direito do personagem (-X), u de tras para frente
      west = lado esquerdo (+X), u da frente para tras
      up: u com +X, v de tras para frente; down: u com +X, v da frente para tras"""
    ox, oy, oz = origin
    sx, sy, sz = size
    u = (np.arange(pw) + 0.5) / pw
    v = (np.arange(ph) + 0.5) / ph
    U, V = np.meshgrid(u, v)
    if face == "north":
        X, Y, Z = ox + U * sx, oy + sy - V * sy, np.full(U.shape, oz)
    elif face == "south":
        X, Y, Z = ox + sx - U * sx, oy + sy - V * sy, np.full(U.shape, oz + sz)
    elif face == "east":
        X, Y, Z = np.full(U.shape, ox), oy + sy - V * sy, oz + sz - U * sz
    elif face == "west":
        X, Y, Z = np.full(U.shape, ox + sx), oy + sy - V * sy, oz + U * sz
    elif face == "up":
        X, Y, Z = ox + U * sx, np.full(U.shape, oy + sy), oz + sz - V * sz
    else:
        X, Y, Z = ox + U * sx, np.full(U.shape, oy), oz + V * sz
    PX, PY = np.meshgrid(np.arange(pw), np.arange(ph))
    return X, Y, Z, PX, PY


class Packer:
    def __init__(self, w, h, pad=1):
        self.w, self.h, self.pad = w, h, pad
        self.x = pad
        self.y = pad
        self.row_h = 0

    def add(self, pw, ph):
        p = self.pad
        if self.x + pw + p > self.w:
            self.x = p
            self.y += self.row_h + p
            self.row_h = 0
        if self.y + ph + p > self.h:
            raise RuntimeError("textura cheia")
        pos = (self.x, self.y)
        self.x += pw + p
        self.row_h = max(self.row_h, ph)
        return pos


def build():
    W, Hh = TW * S, TH * S
    img = np.zeros((Hh, W, 4))
    glow = np.zeros((Hh, W, 4))
    filled = np.zeros((Hh, W), bool)
    packer = Packer(W, Hh, pad=1)
    jobs = []
    for ci, c in enumerate(CUBES):
        for face in FACES:
            fw, fh = face_dims(face, c["size"])
            pw = max(1, int(math.ceil(fw * S - 1e-6)))
            ph = max(1, int(math.ceil(fh * S - 1e-6)))
            jobs.append((ph, pw, ci, face))
    jobs.sort(key=lambda j: (-j[0], -j[1]))
    face_uv = {}
    for ph, pw, ci, face in jobs:
        c = CUBES[ci]
        x0, y0 = packer.add(pw, ph)
        X, Y, Z, PX, PY = face_coords(face, c["origin"], c["size"], pw, ph)
        rgb, a = PAINTERS[c["part"]](face, X, Y, Z, {"origin": c["origin"], "size": c["size"]}, PX, PY)
        rgb = np.clip(np.asarray(rgb, dtype=float), 0, 1)
        a = np.clip(np.asarray(a, dtype=float), 0, 1)
        assert rgb.shape[:2] == (ph, pw), f"{c['part']}/{face}: {rgb.shape} != {(ph, pw)}"
        img[y0:y0 + ph, x0:x0 + pw, :3] = rgb
        img[y0:y0 + ph, x0:x0 + pw, 3] = a
        gm = glow_mask(c["part"], face, rgb, a)
        glow[y0:y0 + ph, x0:x0 + pw, :3] = rgb * 0.45 + np.array([1.0, 0.86, 0.5]) * 0.55
        glow[y0:y0 + ph, x0:x0 + pw, 3] = gm.astype(float)
        filled[y0:y0 + ph, x0:x0 + pw] = True
        fw, fh = face_dims(face, c["size"])
        face_uv[(ci, face)] = {"uv": [x0 / S, y0 / S], "uv_size": [fw, fh]}

    # repete a cor da borda no espaco vazio (evita sangramento em mipmaps)
    rgb = img[..., :3].copy()
    known = filled.copy()
    for _ in range(2):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(known.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                k = np.roll(np.roll(known, dy, 0), dx, 1)
                acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * k[..., None]
                cnt += k
        new = (~known) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        known |= new
    img[..., :3] = rgb
    tex_dir = os.path.join(RP, "textures", "entity", "superman")
    os.makedirs(tex_dir, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(tex_dir, "superman.png"))
    Image.fromarray((np.clip(glow, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(tex_dir, "superman_glow.png"))

    bones_json = []
    for name, parent, pivot in BONES:
        b = {"name": name, "pivot": pivot}
        if parent:
            b["parent"] = parent
        cubes = []
        for ci, c in enumerate(CUBES):
            if c["bone"] != name:
                continue
            j = {"origin": c["origin"], "size": c["size"], "uv": {f: face_uv[(ci, f)] for f in FACES}}
            if c["inflate"]:
                j["inflate"] = c["inflate"]
            if c["rot"]:
                j["rotation"] = c["rot"]
                j["pivot"] = c["pivot"]
            cubes.append(j)
        if cubes:
            b["cubes"] = cubes
        if name == "rightItem":
            b["locators"] = {"lead_hold": [-6, 15, 1]}
        if name == "head":
            b["locators"] = {"sm_eyes": [0, 27.75, -4.2]}
        bones_json.append(b)
    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.superman",
                "texture_width": TW, "texture_height": TH,
                "visible_bounds_width": 5, "visible_bounds_height": 4, "visible_bounds_offset": [0, 1.2, 0],
            },
            "bones": bones_json,
        }],
    }
    geo_dir = os.path.join(RP, "models", "entity")
    os.makedirs(geo_dir, exist_ok=True)
    with open(os.path.join(geo_dir, "superman.geo.json"), "w") as f:
        json.dump(geo, f, indent=1)
    print(f"modelo 3D: {len(CUBES)} cubos, {len(BONES)} ossos; skin {W}x{Hh}, ocupacao {filled.mean():.0%}, "
          f"{int(glow[..., 3].sum())} pixels de brilho")


if __name__ == "__main__":
    build()
