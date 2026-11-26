#!/usr/bin/env python3
"""Gera a geometria (geometry.superman) e a skin HD do Superman.

A skin e pintada proceduralmente: cada face de cada cubo recebe um mapa UV proprio
(per-face UV) e cada texel e colorido a partir da sua posicao 3D no modelo. Isso
mantem costuras continuas entre faces e permite detalhes em alta resolucao
(4 px por unidade, 8 px no rosto e no emblema).

Saidas:
  resource_pack/models/entity/superman.geo.json
  resource_pack/textures/entity/superman/superman.png
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "superman_addon", "resource_pack")

S = 8            # pixels por unidade de textura (imagem 1024x1024)
TW = TH = 128    # tamanho da textura em unidades (imagem = 512x512)

# ---------------------------------------------------------------------------
# Esqueleto. Nomes compativeis com o jogador vanilla (root, waist, body, head,
# rightArm, leftArm, rightLeg, leftLeg, rightItem, leftItem) para que as
# animacoes vanilla (segurar itens, atacar, arco, etc.) continuem funcionando.
# sm_yaw / sm_pitch / sm_roll sao eixos separados usados no voo.
# ---------------------------------------------------------------------------
BONES = [
    ("root", None, [0, 0, 0]),
    ("sm_yaw", "root", [0, 14, 0]),
    ("sm_pitch", "sm_yaw", [0, 14, 0]),
    ("sm_roll", "sm_pitch", [0, 14, 0]),
    ("waist", "sm_roll", [0, 12, 0]),
    ("body", "waist", [0, 24, 0]),
    ("head", "body", [0, 24, 0]),
    ("hair", "head", [0, 24, 0]),
    ("curl", "head", [-0.7, 31.1, -4.4]),
    ("eyelids", "head", [0, 27.6, -4]),
    ("eye_glow", "head", [0, 27.6, -4]),
    ("sm_cape", "body", [0, 23.9, 2.2]),
    ("cape1", "sm_cape", [0, 23.9, 2.2]),
    ("cape2", "cape1", [0, 19.8, 2.2]),
    ("cape3", "cape2", [0, 15.7, 2.2]),
    ("cape4", "cape3", [0, 11.6, 2.2]),
    ("cape5", "cape4", [0, 7.5, 2.2]),
    ("rightArm", "body", [-5, 22, 0]),
    ("rightItem", "rightArm", [-6, 15, 1]),
    ("leftArm", "body", [5, 22, 0]),
    ("leftItem", "leftArm", [6, 15, 1]),
    ("rightLeg", "sm_roll", [-1.9, 12, 0]),
    ("leftLeg", "sm_roll", [1.9, 12, 0]),
]

# (osso, parte, origem, tamanho, inflate, detalhe por face {face: multiplicador})
CUBES = [
    ("body", "torso", [-4, 12, -2], [8, 12, 4], 0, {}),
    ("body", "emblem", [-3, 17.3, -2.32], [6, 5.4, 0.32], 0, {"north": 2.5}),
    ("body", "belt", [-4.3, 12.35, -2.3], [8.6, 1.45, 4.6], 0, {}),
    ("body", "buckle", [-1.25, 12.2, -2.48], [2.5, 1.75, 0.2], 0, {"north": 2}),
    ("body", "drape", [-4.45, 23.15, 0.35], [8.9, 1.0, 2.3], 0, {}),
    ("head", "head", [-4, 24, -4], [8, 8, 8], 0, {"north": 2}),
    ("hair", "hair", [-4.3, 25.6, -4.3], [8.6, 6.8, 8.6], 0, {"north": 1.5}),
    ("curl", "curl", [-1.75, 28.6, -4.58], [2.0, 2.6, 0.26], 0, {"north": 3, "south": 3}),
    ("eyelids", "lid", [-3.15, 27.1, -4.05], [2.1, 1.15, 0.05], 0, {"north": 3}),
    ("eyelids", "lid", [1.05, 27.1, -4.05], [2.1, 1.15, 0.05], 0, {"north": 3}),
    ("eye_glow", "glow", [-3.0, 27.2, -4.1], [1.8, 0.95, 0.08], 0, {"north": 2}),
    ("eye_glow", "glow", [1.2, 27.2, -4.1], [1.8, 0.95, 0.08], 0, {"north": 2}),
    # capa em 5 segmentos encadeados (sobreposicao de 0.25 para esconder fendas;
    # segmentos pares levemente recuados para evitar z-fighting)
    ("cape1", "cape", [-5.0, 19.8, 2.2], [10.0, 4.1, 0.45], 0, {}),
    ("cape2", "cape", [-5.3, 15.7, 2.25], [10.6, 4.35, 0.36], 0, {}),
    ("cape3", "cape", [-5.6, 11.6, 2.2], [11.2, 4.35, 0.45], 0, {}),
    ("cape4", "cape", [-5.9, 7.5, 2.25], [11.8, 4.35, 0.36], 0, {}),
    ("cape5", "cape", [-6.2, 3.2, 2.2], [12.4, 4.55, 0.45], 0, {}),
    ("rightArm", "arm", [-8, 12, -2], [4, 12, 4], 0, {}),
    ("leftArm", "arm", [4, 12, -2], [4, 12, 4], 0, {}),
    ("rightLeg", "leg", [-3.9, 0, -2], [4, 12, 4], 0, {}),
    ("rightLeg", "trunk", [-3.9, 9.5, -2], [4, 2.5, 4], 0.2, {}),
    ("rightLeg", "boot", [-3.9, 0.3, -2], [4, 5.3, 4], 0.3, {}),
    ("leftLeg", "leg", [-0.1, 0, -2], [4, 12, 4], 0, {}),
    ("leftLeg", "trunk", [-0.1, 9.5, -2], [4, 2.5, 4], 0.2, {}),
    ("leftLeg", "boot", [-0.1, 0.3, -2], [4, 5.3, 4], 0.3, {}),
]

FACES = ["north", "south", "east", "west", "up", "down"]

# ---------------------------------------------------------------------------
# Paleta
# ---------------------------------------------------------------------------
def C(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0

BLUE = C("2350be")
BLUE_D = C("142c78")
BLUE_DD = C("0c1c52")
BLUE_L = C("4f86e6")
BLUE_LL = C("8fb6ff")
RED = C("c8162a")
RED_D = C("7c0a18")
RED_DD = C("4e0610")
RED_L = C("ee4a4e")
YEL = C("f8cc2c")
YEL_D = C("c08a10")
YEL_L = C("fff07e")
SKIN = C("efbf96")
SKIN_D = C("c98b64")
SKIN_DD = C("9c6444")
SKIN_L = C("ffd9b8")
HAIR = C("12141e")
HAIR_L = C("3a4566")
WHITE = C("f6f8ff")
IRIS = C("2f74d0")
IRIS_D = C("173f86")
BLACK = C("0a0a10")
LIP = C("b56a5a")


def mix(a, b, t):
    t = np.clip(t, 0.0, 1.0)[..., None]
    return a * (1.0 - t) + b * t


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def hash3(x, y, z):
    v = np.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
    return v - np.floor(v)


def fabric(X, Y, Z, amt=0.05):
    """Textura de tecido: ruido fino + trama diagonal sutil."""
    n = hash3(np.floor(X * S * 2), np.floor(Y * S * 2), np.floor(Z * S * 2)) - 0.5
    weave = ((np.floor(X * S * 1.5) + np.floor(Y * S * 1.5) + np.floor(Z * S * 1.5)) % 2) - 0.5
    return 1.0 + n * amt + weave * amt * 0.35


def gauss(X, Y, cx, cy, rx, ry):
    return np.exp(-(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2))


def line_mask(d, width, soft=0.35):
    """1 dentro de uma linha de distancia |d| < width (com borda suave)."""
    return 1.0 - smooth(width, width + soft, np.abs(d))


# ---------------------------------------------------------------------------
# Desenhos de alta resolucao (emblema)
# ---------------------------------------------------------------------------
def bezier(p0, p1, p2, p3, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t * t
        d = t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def stroke_polygon(path, w0, w1):
    """Converte uma linha central em poligono com largura variavel (fita)."""
    left, right = [], []
    n = len(path)
    for i, (x, y) in enumerate(path):
        xa, ya = path[max(i - 1, 0)]
        xb, yb = path[min(i + 1, n - 1)]
        dx, dy = xb - xa, yb - ya
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        t = i / (n - 1)
        w = (w0 + (w1 - w0) * math.sin(t * math.pi) ** 0.7) * 0.5
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return left + right[::-1]


SHIELD = [(0.13, 0.03), (0.87, 0.03), (0.995, 0.30), (0.5, 0.985), (0.005, 0.30)]


def draw_emblem(W, H, style="chest"):
    """Escudo em forma de pentagono com um 'S' estilizado (desenho proprio)."""
    ss = 8
    w, h = W * ss, H * ss
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    P = [(x * w, y * h) for x, y in SHIELD]
    red = tuple(int(c * 255) for c in RED) + (255,)
    redd = tuple(int(c * 255) for c in RED_D) + (255,)
    yel = tuple(int(c * 255) for c in YEL) + (255,)
    yell = tuple(int(c * 255) for c in YEL_L) + (255,)
    yeld = tuple(int(c * 255) for c in YEL_D) + (255,)

    def shrink(poly, k):
        cx = sum(p[0] for p in poly) / len(poly)
        cy = sum(p[1] for p in poly) / len(poly) - h * 0.06
        return [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in poly]

    # S estilizado: curva superior que abre para a direita e varre para baixo,
    # termina com uma ponta em gancho na parte inferior esquerda.
    sp = []
    sp += bezier((0.80 * w, 0.17 * h), (0.55 * w, 0.10 * h), (0.20 * w, 0.14 * h), (0.24 * w, 0.32 * h))
    sp += bezier((0.24 * w, 0.32 * h), (0.28 * w, 0.48 * h), (0.74 * w, 0.40 * h), (0.70 * w, 0.58 * h))[1:]
    sp += bezier((0.70 * w, 0.58 * h), (0.67 * w, 0.72 * h), (0.42 * w, 0.76 * h), (0.30 * w, 0.62 * h))[1:]
    s_poly = stroke_polygon(sp, 0.085 * w, 0.17 * w)

    if style == "chest":
        d.polygon(P, fill=redd)
        d.polygon(shrink(P, 0.93), fill=red)
        d.polygon(shrink(P, 0.80), fill=yel)
        # brilho na parte superior do campo amarelo
        hl = Image.new("L", (w, h), 0)
        ImageDraw.Draw(hl).ellipse((0.15 * w, -0.25 * h, 0.85 * w, 0.42 * h), fill=120)
        hl = hl.filter(ImageFilter.GaussianBlur(ss * 2))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).polygon(shrink(P, 0.80), fill=255)
        light = Image.new("RGBA", (w, h), yell)
        img.paste(light, (0, 0), Image.composite(hl, Image.new("L", (w, h), 0), mask))
        # sombra do S + S vermelho
        sh = [(x + 0.02 * w, y + 0.025 * h) for x, y in s_poly]
        d.polygon(sh, fill=yeld)
        d.polygon(s_poly, fill=red)
        # filete claro no S
        inner = stroke_polygon(sp, 0.025 * w, 0.05 * w)
        d.polygon([(x - 0.012 * w, y - 0.015 * h) for x, y in inner], fill=tuple(int(c * 255) for c in RED_L) + (255,))
        # contorno do escudo
        d.line(P + [P[0]], fill=redd, width=int(ss * 1.2))
    else:
        # versao das costas da capa: escudo amarelo vazado
        d.polygon(P, fill=yel)
        d.polygon(shrink(P, 0.84), fill=(0, 0, 0, 0))
        d.polygon(s_poly, fill=yel)
        d.line(P + [P[0]], fill=yeld, width=int(ss * 1.0))
    img = img.resize((W, H), Image.LANCZOS)
    return np.asarray(img).astype(np.float64) / 255.0


def sample_decal(decal, U, V):
    """Amostra (nearest) uma imagem RGBA em coordenadas normalizadas U,V."""
    H, W = decal.shape[:2]
    ix = np.clip((U * W).astype(int), 0, W - 1)
    iy = np.clip((V * H).astype(int), 0, H - 1)
    out = decal[iy, ix]
    inside = (U >= 0) & (U < 1) & (V >= 0) & (V < 1)
    out = out * inside[..., None]
    return out


EMBLEM_CHEST = draw_emblem(96, 86, "chest")
EMBLEM_CAPE = draw_emblem(64, 58, "cape")

# ---------------------------------------------------------------------------
# Pintura por parte. Recebe X,Y,Z (coordenadas do modelo de cada texel),
# a face e o cubo; devolve (rgb, alpha).
# ---------------------------------------------------------------------------

def p_torso(face, X, Y, Z, cube):
    f = fabric(X, Y, Z)
    col = np.broadcast_to(BLUE, X.shape + (3,)).copy()
    a = np.ones(X.shape)
    if face == "north":
        # peitorais (sob o emblema, mas a borda inferior aparece)
        pec = gauss(X, Y, -2.1, 21.2, 2.2, 1.7) + gauss(X, Y, 2.1, 21.2, 2.2, 1.7)
        col = mix(col, BLUE_L, pec * 0.45)
        under = line_mask(Y - (19.55 - 0.18 * np.abs(X)), 0.18) * (np.abs(X) < 3.8)
        col = mix(col, BLUE_D, under * 0.7)
        # abdomen: 2 fileiras visiveis abaixo do emblema
        absx = np.abs(X)
        in_abs = (absx < 1.9) & (Y > 13.8) & (Y < 17.4)
        cell_y = np.mod(Y - 13.8, 1.75)
        hl = gauss(absx, cell_y, 0.95, 0.95, 0.75, 0.55) * in_abs
        col = mix(col, BLUE_L, hl * 0.55)
        sep = (line_mask(X, 0.1) + line_mask(cell_y, 0.08) * (absx < 1.9)) * in_abs
        col = mix(col, BLUE_D, np.clip(sep, 0, 1) * 0.75)
        # obliquos / laterais mais escuros
        col = mix(col, BLUE_D, smooth(2.6, 4.0, absx) * 0.55)
        col = mix(col, BLUE_D, smooth(15.5, 13.5, Y) * smooth(1.5, 3.5, absx) * 0.4)
    elif face == "south":
        absx = np.abs(X)
        blade = gauss(absx, Y, 2.0, 20.5, 1.6, 2.0)
        col = mix(col, BLUE_L, blade * 0.35)
        col = mix(col, BLUE_D, line_mask(X, 0.12) * smooth(13, 16, Y) * 0.5)
        col = mix(col, BLUE_D, smooth(2.8, 4.0, absx) * 0.4)
    elif face in ("east", "west"):
        lat = gauss(Z, Y, 0.0, 19.5, 1.8, 3.5)
        col = mix(col, BLUE_L, lat * 0.25)
        col = mix(col, BLUE_D, smooth(1.0, 2.0, np.abs(Z)) * 0.35)
    elif face == "up":
        col = mix(col, BLUE_D, 0.25)
    elif face == "down":
        col = np.broadcast_to(RED_D, X.shape + (3,)).copy()
    # parte inferior: sunga vermelha (logo abaixo do cinto)
    trunks = Y < 12.55
    col = np.where(trunks[..., None], mix(RED, RED_D, smooth(12.55, 12.0, Y) * 0.6), col)
    # oclusao no topo (gola) e na base
    col = mix(col, BLUE_DD, smooth(23.4, 24.0, Y) * 0.35 * (face != "up"))
    return col * f[..., None], a


def p_emblem(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    if face == "north":
        U = (X - o[0]) / s[0]
        V = (o[1] + s[1] - Y) / s[1]
        d = sample_decal(EMBLEM_CHEST, U, V)
        return d[..., :3], (d[..., 3] > 0.5).astype(float)
    col = np.broadcast_to(RED_D, X.shape + (3,)).copy()
    return col, np.ones(X.shape) * 0  # bordas finas: invisiveis (o escudo nao e retangular)


def p_belt(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    t = (Y - o[1]) / s[1]
    col = mix(YEL, YEL_L, gauss(t, t, 0.62, 0.62, 0.25, 0.25) * 0.6)
    col = mix(col, YEL_D, (line_mask(t - 0.06, 0.06, 0.06) + line_mask(t - 0.94, 0.06, 0.06)))
    # passadores / rebites a cada 1.6 unidades
    if face in ("north", "south"):
        k = np.mod(X + 0.4, 1.6)
        col = mix(col, YEL_D, line_mask(k - 0.8, 0.07, 0.08) * 0.6)
    if face in ("east", "west"):
        k = np.mod(Z + 0.4, 1.6)
        col = mix(col, YEL_D, line_mask(k - 0.8, 0.07, 0.08) * 0.6)
    if face in ("up", "down"):
        col = mix(YEL_D, YEL, 0.4)
        col = np.broadcast_to(col, X.shape + (3,)).copy() if col.ndim == 1 else col
    return col * fabric(X, Y, Z, 0.03)[..., None], np.ones(X.shape)


def p_buckle(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    U = (X - o[0]) / s[0] * 2 - 1
    V = (Y - o[1]) / s[1] * 2 - 1
    r = np.sqrt(U ** 2 + (V * 1.05) ** 2)
    col = mix(YEL_L, YEL, smooth(0.0, 0.8, r))
    col = mix(col, YEL_D, line_mask(r - 0.72, 0.09, 0.08))
    col = mix(col, RED, (r < 0.42) * 1.0)
    col = mix(col, RED_L, gauss(U, V, -0.12, 0.15, 0.2, 0.15) * (r < 0.42))
    a = (r < 1.0).astype(float) if face == "north" else np.ones(X.shape)
    if face != "north":
        col = np.broadcast_to(YEL_D, X.shape + (3,)).copy()
    return col, a


def cape_color(X, Y, side):
    """Cor da capa em coordenadas globais (X lateral, Y altura)."""
    folds = np.cos(X * 1.55 + np.sin(Y * 0.35) * 0.8) * 0.5 + 0.5
    folds2 = np.cos(X * 3.1 + 1.3 + Y * 0.12) * 0.5 + 0.5
    base = RED if side == "out" else mix(RED_D, RED, np.full(X.shape, 0.25))
    col = mix(np.broadcast_to(base, X.shape + (3,)), RED_D, folds * 0.45 + folds2 * 0.12)
    col = mix(col, RED_L, smooth(0.75, 1.0, folds) * smooth(3.5, 20, Y) * (0.35 if side == "out" else 0.1))
    col = mix(col, RED_DD, smooth(10.0, 3.2, Y) * 0.35)
    # barra inferior (bainha) com costura
    hem = smooth(4.3, 3.9, Y)
    col = mix(col, RED_D, hem * 0.6)
    stitch = line_mask(Y - 4.05, 0.06, 0.05) * (np.mod(X * 2.5, 1.0) < 0.55)
    col = mix(col, RED_L, stitch * 0.7)
    if side == "out":
        # escudo amarelo nas costas (visto de tras: esquerda do observador = +X)
        ex0, ex1, ey0, ey1 = -3.3, 3.3, 11.9, 19.5
        U = (ex1 - X) / (ex1 - ex0)
        V = (ey1 - Y) / (ey1 - ey0)
        d = sample_decal(EMBLEM_CAPE, U, V)
        m = d[..., 3:4] > 0.5
        col = np.where(m, d[..., :3] * (0.85 + 0.15 * folds[..., None]), col)
    return col


def p_cape(face, X, Y, Z, cube):
    f = fabric(X, Y, Z, 0.06)
    if face == "south":
        col = cape_color(X, Y, "out")
    elif face == "north":
        col = cape_color(X, Y, "in")
    else:
        col = np.broadcast_to(RED_D, X.shape + (3,)).copy()
    return col * f[..., None], np.ones(X.shape)


def p_drape(face, X, Y, Z, cube):
    col = mix(np.broadcast_to(RED, X.shape + (3,)), RED_D, smooth(-1, 1, np.cos(X * 2.2)) * 0.35)
    if face in ("down", "north"):
        col = np.broadcast_to(RED_D, X.shape + (3,)).copy()
    return col * fabric(X, Y, Z, 0.06)[..., None], np.ones(X.shape)


def p_arm(face, X, Y, Z, cube):
    o = cube["origin"]
    side = -1 if o[0] < 0 else 1           # -1 = braco direito
    lx = (X - o[0]) / 4.0                  # 0..1 de -X para +X
    inner_x = (1 - lx) if side > 0 else lx  # 0 no lado de dentro (encostado no corpo)
    f = fabric(X, Y, Z)
    col = np.broadcast_to(BLUE, X.shape + (3,)).copy()
    # deltoide e biceps
    col = mix(col, BLUE_L, gauss(Y, Y, 22.3, 22.3, 1.6, 1.6) * 0.45)
    if face == "north":
        col = mix(col, BLUE_L, gauss(lx, Y, 0.5, 18.5, 0.35, 1.8) * 0.35)
        col = mix(col, BLUE_D, line_mask(Y - 20.6, 0.15) * 0.4)
    if face == "south":
        col = mix(col, BLUE_L, gauss(lx, Y, 0.5, 19.0, 0.35, 2.0) * 0.25)
    col = mix(col, BLUE_D, smooth(16.5, 15.2, Y) * 0.35)
    # costura lateral externa
    if face in ("east", "west"):
        outer = (face == "east" and side < 0) or (face == "west" and side > 0)
        if outer:
            col = mix(col, BLUE_D, line_mask(Z - 0.0, 0.08) * smooth(15.5, 17, Y) * 0.6)
    # punho: mao a partir de y < 15
    hand = Y < 15.0
    skin = np.broadcast_to(SKIN, X.shape + (3,)).copy()
    skin = mix(skin, SKIN_D, smooth(14.0, 12.0, Y) * 0.4)
    if face == "north":
        # nos dos dedos (dedos dobrados do punho fechado)
        kn = line_mask(Y - 13.15, 0.1) + (line_mask(np.mod(lx * 4, 1.0) - 0.5, 0.05) * (Y < 13.15))
        skin = mix(skin, SKIN_D, np.clip(kn, 0, 1) * 0.8)
        skin = mix(skin, SKIN_L, gauss(lx, Y, 0.5, 14.1, 0.4, 0.4) * 0.4)
    if face in ("east", "west"):
        inner = (face == "west" and side < 0) or (face == "east" and side > 0)
        if inner:
            # polegar sobre o lado de dentro
            th = gauss(Z, Y, -0.9, 13.6, 0.6, 0.9)
            skin = mix(skin, SKIN_L, th * 0.6)
            skin = mix(skin, SKIN_D, line_mask(np.sqrt(((Z + 0.9) / 0.6) ** 2 + ((Y - 13.6) / 0.9) ** 2) - 1, 0.12) * 0.7)
    if face == "down":
        skin = mix(skin, SKIN_DD, 0.3)
    col = np.where(hand[..., None], skin, col)
    # punho da manga
    col = mix(col, BLUE_DD, line_mask(Y - 15.12, 0.11) * (face != "down"))
    if face == "up":
        col = mix(np.broadcast_to(BLUE, X.shape + (3,)), BLUE_L, 0.25)
    if face == "down":
        col = skin
    f = np.where(hand, 1.0 + (f - 1.0) * 0.4, f)
    return col * f[..., None], np.ones(X.shape)


def p_leg(face, X, Y, Z, cube):
    o = cube["origin"]
    lx = (X - o[0]) / 4.0
    f = fabric(X, Y, Z)
    col = np.broadcast_to(BLUE, X.shape + (3,)).copy()
    if face == "north":
        col = mix(col, BLUE_L, gauss(lx, Y, 0.5, 8.4, 0.35, 1.6) * 0.45)   # quadriceps
        col = mix(col, BLUE_D, gauss(lx, Y, 0.5, 6.2, 0.3, 0.35) * 0.5)    # joelho
    if face == "south":
        col = mix(col, BLUE_L, gauss(lx, Y, 0.5, 4.8, 0.35, 1.2) * 0.25)
    col = np.where((Y > 9.5)[..., None], np.broadcast_to(RED, X.shape + (3,)), col)
    col = np.where((Y < 4.4)[..., None], np.broadcast_to(RED_D, X.shape + (3,)), col)
    if face == "down":
        col = np.broadcast_to(C("3a0a10"), X.shape + (3,)).copy()
    return col * f[..., None], np.ones(X.shape)


def p_trunk(face, X, Y, Z, cube):
    f = fabric(X, Y, Z, 0.05)
    col = np.broadcast_to(RED, X.shape + (3,)).copy()
    col = mix(col, RED_L, gauss(Y, Y, 11.2, 11.2, 0.6, 0.6) * 0.25)
    col = mix(col, RED_D, line_mask(Y - 9.65, 0.14))
    a = np.ones(X.shape)
    o = cube["origin"]
    lx = (X - o[0]) / 4.0
    inner = lx if o[0] > -1 else (1 - lx)   # 0 = lado de dentro (virilha)
    if face in ("north", "south"):
        cut_y = 9.5 + 0.9 * smooth(0.35, 0.0, inner)
        a = np.where(Y < cut_y, 0.0, 1.0)
        col = mix(col, RED_D, line_mask(Y - cut_y, 0.16))
    if face == "up":
        a = np.zeros(X.shape)
    if face == "down":
        col = np.broadcast_to(RED_DD, X.shape + (3,)).copy()
    return col * f[..., None], a


def p_boot(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    lx = (X - o[0]) / s[0]
    f = fabric(X, Y, Z, 0.035)
    col = np.broadcast_to(RED, X.shape + (3,)).copy()
    # brilho do couro
    col = mix(col, RED_L, gauss(lx, Y, 0.35, 3.4, 0.22, 1.2) * 0.45 * (face == "north"))
    col = mix(col, RED_L, gauss(Y, Y, 3.2, 3.2, 1.0, 1.0) * 0.18)
    col = mix(col, RED_D, smooth(2.0, 0.4, Y) * 0.25)
    # sola
    sole = Y < 0.85
    col = np.where(sole[..., None], mix(np.broadcast_to(C("2c0a0e"), X.shape + (3,)), RED_DD, 0.4), col)
    col = mix(col, RED_L, line_mask(Y - 0.95, 0.07) * 0.6)
    # costura lateral
    if face in ("east", "west"):
        col = mix(col, RED_D, line_mask(Z - 0.3, 0.07) * (Y > 1.0) * 0.7)
    # borda superior
    top = o[1] + s[1]
    a = np.ones(X.shape)
    if face == "north":
        notch = top - 1.35 * smooth(0.36, 0.0, np.abs(lx - 0.5))
        a = np.where(Y > notch, 0.0, 1.0)
        col = mix(col, RED_DD, line_mask(Y - notch, 0.18) * 0.9)
        col = mix(col, RED_L, line_mask(Y - (notch - 0.3), 0.06) * 0.35)
    else:
        col = mix(col, RED_DD, line_mask(Y - (top - 0.15), 0.18) * 0.9)
    if face == "up":
        col = np.broadcast_to(RED_DD, X.shape + (3,)).copy()
        a = np.where((Z < -1.2) & (np.abs(lx - 0.5) < 0.36), 0.0, 1.0)
    if face == "down":
        col = np.broadcast_to(C("240709"), X.shape + (3,)).copy()
    return col * f[..., None], a


def face_features(X, Y):
    """Rosto (face norte da cabeca). X em [-4,4] (direita do personagem = -X), Y em [24,32]."""
    col = np.broadcast_to(SKIN, X.shape + (3,)).copy()
    ax = np.abs(X)
    # volume: macas do rosto, mandibula, testa
    col = mix(col, SKIN_L, gauss(ax, Y, 2.4, 26.6, 1.0, 0.7) * 0.35)
    col = mix(col, SKIN_L, gauss(ax, Y, 0.0, 30.2, 2.8, 0.9) * 0.25)
    col = mix(col, SKIN_D, smooth(2.8, 4.0, ax) * 0.45)
    col = mix(col, SKIN_D, smooth(25.6, 24.0, Y) * 0.45)
    # mandibula marcada
    jaw = line_mask(Y - (24.55 + 0.55 * smooth(1.2, 3.6, ax)), 0.12) * (ax > 1.2)
    col = mix(col, SKIN_D, jaw * 0.6)
    # queixo com covinha
    col = mix(col, SKIN_D, line_mask(X, 0.07) * smooth(24.3, 24.6, Y) * smooth(25.3, 25.0, Y) * 0.8)
    # nariz
    col = mix(col, SKIN_L, gauss(X, Y, 0.0, 26.8, 0.35, 0.9) * 0.45)
    col = mix(col, SKIN_D, line_mask(X - 0.55, 0.07) * smooth(26.0, 26.4, Y) * smooth(27.8, 27.3, Y) * 0.8)
    col = mix(col, SKIN_DD, (gauss(X, Y, -0.45, 25.95, 0.2, 0.11) + gauss(X, Y, 0.45, 25.95, 0.2, 0.11)) * 0.8)
    col = mix(col, SKIN_D, line_mask(Y - 25.8, 0.06) * (ax < 0.8) * 0.5)
    # boca firme
    mouth = line_mask(Y - (25.2 + 0.07 * (ax / 1.1) ** 2), 0.04, 0.05) * smooth(1.2, 0.9, ax)
    col = mix(col, LIP * 0.8, mouth * 0.85)
    col = mix(col, LIP, gauss(X, Y, 0.0, 25.0, 0.7, 0.12) * 0.35)
    col = mix(col, SKIN_D, line_mask(Y - 24.9, 0.06) * (ax < 0.7) * 0.4)
    col = mix(col, SKIN_L, line_mask(Y - 24.82, 0.06) * (ax < 0.6) * 0.3)
    # olhos: esclera, iris azul, pupila, brilho
    for ex, sgn in ((-2.05, -1), (2.05, 1)):
        ux = (X - ex) / 0.92
        uy = (Y - 27.62) / 0.42
        eye = (ux ** 2 + uy ** 2) < 1.0
        col = np.where(eye[..., None], np.broadcast_to(WHITE, X.shape + (3,)), col)
        ix = X - (ex + 0.18 * -sgn)
        ir = np.sqrt((ix / 0.36) ** 2 + ((Y - 27.6) / 0.40) ** 2)
        iris = (ir < 1.0) & eye
        icol = mix(np.broadcast_to(IRIS, X.shape + (3,)), IRIS_D, smooth(0.3, 1.0, ir))
        col = np.where(iris[..., None], icol, col)
        pup = (ir < 0.42) & eye
        col = np.where(pup[..., None], np.broadcast_to(BLACK, X.shape + (3,)), col)
        glint = gauss(X, Y, ex + 0.18 * -sgn - 0.12, 27.75, 0.09, 0.08) > 0.5
        col = np.where(glint[..., None], np.broadcast_to(WHITE, X.shape + (3,)), col)
        # palpebra superior
        lid = line_mask(np.sqrt(ux ** 2 + ((Y - 27.55) / 0.5) ** 2) - 1.0, 0.09) * (Y > 27.6)
        col = mix(col, SKIN_DD * 0.6, lid)
        # sobrancelha grossa, heroica (mais alta por fora)
        bx = (X - ex) * sgn
        by = 28.55 + 0.16 * bx - 0.05 * bx * bx
        brow = line_mask(Y - by, 0.17, 0.06) * (np.abs(X - ex) < 1.15)
        col = mix(col, HAIR, brow)
        # olheira suave
        col = mix(col, SKIN_D, gauss(X, Y, ex, 27.05, 0.8, 0.18) * 0.25)
    # linha do cabelo no alto da testa
    hairline = 31.0 + 0.18 * np.cos(X * 2.3)
    col = np.where((Y > hairline)[..., None], mix(np.broadcast_to(HAIR, X.shape + (3,)), HAIR_L, gauss(X, Y, -1.0, 31.6, 1.5, 0.3) * 0.5), col)
    return col


def p_head(face, X, Y, Z, cube):
    a = np.ones(X.shape)
    if face == "north":
        return face_features(X, Y), a
    col = np.broadcast_to(SKIN, X.shape + (3,)).copy()
    if face in ("east", "west"):
        # u cresce de tras para frente (east) ou da frente para tras (west); usamos Z direto
        col = mix(col, SKIN_D, smooth(-2.5, -4.0, Z) * 0.15 + smooth(25.5, 24.0, Y) * 0.4)
        # orelha
        er = np.sqrt(((Z - 0.6) / 0.85) ** 2 + ((Y - 27.6) / 1.35) ** 2)
        col = mix(col, SKIN_D, line_mask(er - 0.75, 0.13) * 0.8)
        col = mix(col, SKIN_DD, (er < 0.45) * 0.45)
        col = mix(col, SKIN_L, line_mask(er - 0.95, 0.1) * 0.35)
        # cabelo nas laterais (acima da orelha e costeleta)
        hline = 29.4 - 1.8 * smooth(-1.0, 3.5, Z)
        sideburn = (Z < -2.6) & (Z > -3.7) & (Y > 27.4)
        hairm = (Y > hline) | sideburn
        hcol = mix(np.broadcast_to(HAIR, X.shape + (3,)), HAIR_L, hash3(Z * 9, Y * 9, X) * 0.25)
        col = np.where(hairm[..., None], hcol, col)
    elif face == "south":
        hline = 26.2 + 0.3 * np.cos(X * 1.4)
        hcol = mix(np.broadcast_to(HAIR, X.shape + (3,)), HAIR_L, gauss(X, Y, 0, 30, 2.5, 1.5) * 0.3)
        col = np.where((Y > hline)[..., None], hcol, mix(col, SKIN_D, 0.3))
    elif face == "up":
        col = mix(np.broadcast_to(HAIR, X.shape + (3,)), HAIR_L, 0.2)
    elif face == "down":
        col = mix(np.broadcast_to(SKIN_D, X.shape + (3,)), SKIN_DD, 0.3)
    return col, a


def hair_strands(A, B, scale=1.0):
    s = np.sin(A * 6.0 * scale + np.sin(B * 2.0) * 1.5) * 0.5 + 0.5
    n = hash3(np.floor(A * S * 2), np.floor(B * S * 0.7), 3.0)
    return s * 0.6 + n * 0.4


def p_hair(face, X, Y, Z, cube):
    a = np.zeros(X.shape)
    base = np.broadcast_to(HAIR, X.shape + (3,))
    if face == "up":
        st = hair_strands(X + 0.3 * Z, Z)
        # risca lateral (lado direito do personagem)
        part = line_mask(X + 1.7 + 0.1 * Z, 0.1)
        col = mix(base, HAIR_L, st * 0.55 + gauss(X, Z, -0.5, -1.0, 2.6, 2.6) * 0.3)
        col = mix(col, BLACK, part * 0.7)
        a = np.ones(X.shape)
        return col, a
    if face == "north":
        edge = 30.75 + 0.35 * np.cos(X * 1.9 + 0.6) + 0.25 * smooth(1.5, 4.3, np.abs(X))
        a = (Y > edge).astype(float)
        st = hair_strands(X, Y)
        col = mix(base, HAIR_L, st * 0.5 + smooth(edge, edge + 1.2, Y) * 0.2)
        col = mix(col, BLACK, line_mask(Y - edge, 0.12) * 0.5)
        return col, a
    if face in ("east", "west"):
        edge = 29.6 - 1.9 * smooth(-1.5, 3.8, Z) + 0.18 * np.sin(Z * 3.1)
        a = (Y > edge).astype(float)
        st = hair_strands(Z, Y)
        col = mix(base, HAIR_L, st * 0.45 + smooth(edge, edge + 1.5, Y) * 0.15)
        col = mix(col, BLACK, line_mask(Y - edge, 0.1) * 0.5)
        return col, a
    if face == "south":
        edge = 26.6 + 0.35 * np.cos(X * 1.6) + 0.2 * np.sin(X * 4.7)
        a = (Y > edge).astype(float)
        st = hair_strands(X, Y)
        col = mix(base, HAIR_L, st * 0.45)
        col = mix(col, BLACK, line_mask(Y - edge, 0.12) * 0.5)
        return col, a
    return np.broadcast_to(HAIR, X.shape + (3,)).copy(), a


def draw_curl(W, H):
    """Cacho em gancho (desenho vetorial com supersampling)."""
    ss = 8
    w, h = W * ss, H * ss
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    path = []
    path += bezier((0.62 * w, 0.00 * h), (0.40 * w, 0.10 * h), (0.10 * w, 0.30 * h), (0.22 * w, 0.55 * h))
    path += bezier((0.22 * w, 0.55 * h), (0.32 * w, 0.78 * h), (0.78 * w, 0.72 * h), (0.70 * w, 0.52 * h))[1:]
    path += bezier((0.70 * w, 0.52 * h), (0.64 * w, 0.40 * h), (0.48 * w, 0.44 * h), (0.47 * w, 0.52 * h))[1:]
    poly = stroke_polygon(path, 0.30 * w, 0.10 * w)
    d.polygon(poly, fill=tuple(int(c * 255) for c in HAIR) + (255,))
    hl = stroke_polygon(path[:70], 0.08 * w, 0.03 * w)
    d.polygon([(x - 0.03 * w, y) for x, y in hl], fill=tuple(int(c * 255) for c in HAIR_L) + (255,))
    img = img.resize((W, H), Image.LANCZOS)
    return np.asarray(img).astype(np.float64) / 255.0


CURL = draw_curl(48, 64)


def p_curl(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    U = (X - o[0]) / s[0]
    V = (o[1] + s[1] - Y) / s[1]
    if face == "south":
        U = 1 - U
    if face in ("north", "south"):
        d = sample_decal(CURL, U, V)
        return d[..., :3], (d[..., 3] > 0.5).astype(float)
    return np.broadcast_to(HAIR, X.shape + (3,)).copy(), np.zeros(X.shape)


def p_lid(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    V = (o[1] + s[1] - Y) / s[1]
    col = mix(np.broadcast_to(SKIN, X.shape + (3,)), SKIN_D, V * 0.5)
    col = mix(col, HAIR, line_mask(V - 0.82, 0.08, 0.06))
    a = np.ones(X.shape) if face == "north" else np.zeros(X.shape)
    return col, a


def p_glow(face, X, Y, Z, cube):
    o, s = cube["origin"], cube["size"]
    U = (X - o[0]) / s[0] * 2 - 1
    V = (Y - o[1]) / s[1] * 2 - 1
    r = np.sqrt(U ** 2 + V ** 2)
    col = mix(np.broadcast_to(C("fffbe8"), X.shape + (3,)), C("ff3a10"), smooth(0.0, 0.9, r))
    return col, np.ones(X.shape)


PAINTERS = {
    "torso": p_torso, "emblem": p_emblem, "belt": p_belt, "buckle": p_buckle,
    "drape": p_drape, "head": p_head, "hair": p_hair, "curl": p_curl, "lid": p_lid,
    "glow": p_glow, "cape": p_cape, "arm": p_arm, "leg": p_leg, "trunk": p_trunk,
    "boot": p_boot,
}

# ---------------------------------------------------------------------------
# Mapeamento face -> coordenadas 3D dos texels
# ---------------------------------------------------------------------------

def face_dims(face, size):
    sx, sy, sz = size
    return {"north": (sx, sy), "south": (sx, sy), "east": (sz, sy), "west": (sz, sy),
            "up": (sx, sz), "down": (sx, sz)}[face]


def face_coords(face, origin, size, pw, ph):
    """Coordenadas 3D (centro de cada texel) para uma face com pw x ph pixels.

    Convencao (igual ao box-UV dos skins):
      north = frente, u cresce com +X;  south = costas, u cresce com -X
      east  = lado direito do personagem (-X), u cresce de tras (+Z) para frente
      west  = lado esquerdo (+X), u cresce da frente para tras
      up: u com +X, v de tras para frente;  down: u com +X, v da frente para tras
    """
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
    else:  # down
        X, Y, Z = ox + U * sx, np.full(U.shape, oy), oz + V * sz
    return X, Y, Z


# ---------------------------------------------------------------------------
# Empacotamento simples em prateleiras
# ---------------------------------------------------------------------------
class Packer:
    def __init__(self, w, h, pad=2):
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
    W, H = TW * S, TH * S
    img = np.zeros((H, W, 4))
    filled = np.zeros((H, W), bool)
    packer = Packer(W, H, pad=2)

    # ordena faces grandes primeiro para empacotar melhor
    jobs = []
    for ci, (bone, part, origin, size, inflate, detail) in enumerate(CUBES):
        for face in FACES:
            fw, fh = face_dims(face, size)
            mult = detail.get(face, 1)
            pw = max(1, int(math.ceil(fw * S * mult)))
            ph = max(1, int(math.ceil(fh * S * mult)))
            jobs.append((ph, pw, ci, face))
    jobs.sort(key=lambda j: (-j[0], -j[1]))

    face_uv = {}
    for ph, pw, ci, face in jobs:
        bone, part, origin, size, inflate, detail = CUBES[ci]
        x0, y0 = packer.add(pw, ph)
        X, Y, Z = face_coords(face, origin, size, pw, ph)
        cube = {"origin": origin, "size": size}
        rgb, a = PAINTERS[part](face, X, Y, Z, cube)
        rgb = np.clip(np.asarray(rgb, dtype=np.float64), 0, 1)
        img[y0:y0 + ph, x0:x0 + pw, :3] = rgb
        img[y0:y0 + ph, x0:x0 + pw, 3] = np.clip(a, 0, 1)
        filled[y0:y0 + ph, x0:x0 + pw] = True
        face_uv[(ci, face)] = {"uv": [x0 / S, y0 / S], "uv_size": [pw / S, ph / S]}

    # dilatacao das cores para dentro do espaco vazio (evita sangramento com mipmaps)
    rgb = img[..., :3].copy()
    known = filled.copy()
    for _ in range(3):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(known.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                sh_known = np.roll(np.roll(known, dy, 0), dx, 1)
                sh_rgb = np.roll(np.roll(rgb, dy, 0), dx, 1)
                acc += sh_rgb * sh_known[..., None]
                cnt += sh_known
        new = (~known) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        known = known | new
    img[..., :3] = rgb

    out = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    tex_dir = os.path.join(RP, "textures", "entity", "superman")
    os.makedirs(tex_dir, exist_ok=True)
    Image.fromarray(out, "RGBA").save(os.path.join(tex_dir, "superman.png"))

    # ---- geometria ----
    bones_json = []
    for name, parent, pivot in BONES:
        b = {"name": name, "pivot": pivot}
        if parent:
            b["parent"] = parent
        cubes = []
        for ci, (bone, part, origin, size, inflate, detail) in enumerate(CUBES):
            if bone != name:
                continue
            c = {"origin": origin, "size": size,
                 "uv": {f: face_uv[(ci, f)] for f in FACES}}
            if inflate:
                c["inflate"] = inflate
            cubes.append(c)
        if cubes:
            b["cubes"] = cubes
        if name == "rightItem":
            b["locators"] = {"lead_hold": [-6, 15, 1]}
        if name == "head":
            b["locators"] = {"sm_eyes": [0, 27.6, -4.2]}
        bones_json.append(b)

    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.superman",
                "texture_width": TW,
                "texture_height": TH,
                "visible_bounds_width": 4,
                "visible_bounds_height": 4,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": bones_json,
        }],
    }
    geo_dir = os.path.join(RP, "models", "entity")
    os.makedirs(geo_dir, exist_ok=True)
    with open(os.path.join(geo_dir, "superman.geo.json"), "w") as f:
        json.dump(geo, f, indent=1)
    used = filled.mean()
    print(f"textura {W}x{H} gerada, {len(face_uv)} faces, ocupacao {used:.0%}")


if __name__ == "__main__":
    build()
