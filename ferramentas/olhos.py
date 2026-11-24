"""Gerador de pixel art dos doujutsu (Naruto Striker+ - Edicao Definitiva).

Cada olho e desenhado em 17x17 a partir de formas geometricas avaliadas por
supersampling e decididas por maioria (sem anti-aliasing: cada pixel recebe UMA
cor de uma paleta fechada). Depois aplica-se: sombra da palpebra superior (rampa
com deslocamento de matiz), contorno do padrao e brilho especular de 1 pixel.

Saidas:
  - textura da entidade (canal alfa = mascara de emissao do material "enderman":
    fundo com o mesmo valor do original, padrao em 255 para brilhar);
  - botao de menu 17x17 (opaco, com moldura) e versao bloqueada (dessaturada).
"""
import math, sys, os
from PIL import Image

N = 17
C = (N - 1) / 2.0  # centro 8.0
SS = 7  # amostras por eixo


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def render(campo):
    """campo(x, y) -> nome da camada (coordenadas em pixels, origem no canto)."""
    out = [[None] * N for _ in range(N)]
    for py in range(N):
        for px in range(N):
            votos = {}
            for sy in range(SS):
                for sx in range(SS):
                    x = px + (sx + 0.5) / SS
                    y = py + (sy + 0.5) / SS
                    l = campo(x - 0.5 - C, y - 0.5 - C)
                    votos[l] = votos.get(l, 0) + 1
            # prioridade: camadas de detalhe vencem empates proximos
            melhor = max(votos.items(), key=lambda kv: (kv[1] + PRIORIDADE.get(kv[0], 0) * SS * SS * 0.18))
            out[py][px] = melhor[0]
    return out


PRIORIDADE = {"padrao": 1.0, "pupila": 1.2, "anel": 0.6, "brilho": 2.0, "contorno": 0.4}


def polar(x, y):
    r = math.hypot(x, y)
    a = math.atan2(y, x)
    return r, a


def angdist(a, b):
    d = (a - b) % (2 * math.pi)
    return min(d, 2 * math.pi - d)


# ---------------------------------------------------------------- formas

def tomoe(x, y, cx, cy, rot, tam=1.55):
    """Tomoe: cabeca circular + cauda curva tangente ao anel."""
    dx, dy = x - cx, y - cy
    if dx * dx + dy * dy <= tam * tam:
        return True
    # cauda: arco que sai da cabeca no sentido 'rot'
    ca, sa = math.cos(rot), math.sin(rot)
    lx = dx * ca + dy * sa
    ly = -dx * sa + dy * ca
    if 0 < lx < tam * 2.2:
        largura = tam * (1 - lx / (tam * 2.2)) * 0.95
        curva = (lx ** 2) * 0.16
        return abs(ly - curva + tam * 0.35) < largura * 0.55
    return False


def olho_base(fundo="iris"):
    return lambda x, y: fundo


def sharingan(x, y, n_tomoe=3):
    r, a = polar(x, y)
    if r <= 1.9:
        return "pupila"
    for k in range(n_tomoe):
        ang = -math.pi / 2 + k * 2 * math.pi / n_tomoe
        cx, cy = 4.6 * math.cos(ang), 4.6 * math.sin(ang)
        if tomoe(x, y, cx, cy, ang + math.pi / 2):
            return "padrao"
    if 4.3 <= r <= 5.0:
        return "anel"
    if r >= 7.6:
        return "limbo"
    return "iris"


def mgk_itachi(x, y):
    r, a = polar(x, y)
    if r <= 1.6:
        return "pupila_v"  # ponto vermelho no centro do padrao
    if r <= 2.8:
        return "padrao"
    if r >= 7.6:
        return "limbo"
    # tres pas curvas (shuriken de Itachi)
    for k in range(3):
        base = -math.pi / 2 + k * 2 * math.pi / 3
        espiral = base + (r - 2.5) * 0.32
        largura = 0.62 * (1 - (r - 2.5) / 5.5) + 0.12
        if r < 7.2 and angdist(a, espiral) < largura:
            return "padrao"
    return "iris"


def mgk_obito(x, y):
    r, a = polar(x, y)
    if r <= 1.5:
        return "padrao"
    if 2.2 <= r <= 3.1:
        return "padrao"  # anel interno
    if r >= 7.6:
        return "limbo"
    # tres foices finas e curvas que partem do anel
    for k in range(3):
        base = math.pi / 6 + k * 2 * math.pi / 3
        espiral = base - (r - 2.8) * 0.55
        largura = 0.42 * (1 - (r - 2.8) / 4.6)
        if 2.8 <= r <= 7.0 and angdist(a, espiral) < max(0.08, largura):
            return "padrao"
    return "iris"


def mgk_sasuke(x, y):
    r, a = polar(x, y)
    if r <= 1.4:
        return "pupila_v"
    if r <= 2.4:
        return "padrao"
    if r >= 7.6:
        return "limbo"
    # tres petalas elipticas longas (formam a estrela de seis pontas)
    for k in range(3):
        ang = -math.pi / 2 + k * 2 * math.pi / 3
        ca, sa = math.cos(ang), math.sin(ang)
        lx = x * ca + y * sa
        ly = -x * sa + y * ca
        if (lx / 7.0) ** 2 + (ly / 1.75) ** 2 <= 1.0:
            return "padrao"
    return "iris"


def rinnegan(x, y):
    r, a = polar(x, y)
    if r <= 1.3:
        return "pupila"
    for rr in (2.9, 4.7, 6.5):
        if abs(r - rr) <= 0.5:
            return "anel"
    if r >= 7.7:
        return "limbo"
    return "iris"


def byakugan(x, y):
    r, a = polar(x, y)
    if abs(r - 4.4) <= 0.45:
        return "anel"  # iris quase invisivel
    if r <= 1.2:
        return "centro"
    if r >= 7.7:
        return "limbo"
    return "iris"


def byakugan_evo(x, y):
    r, a = polar(x, y)
    if abs(r - 4.4) <= 0.5:
        return "anel"
    if r <= 1.5:
        return "centro"
    # quatro marcas do Byakugan evoluido (losangos nos pontos cardeais)
    for k in range(4):
        ang = k * math.pi / 2 + math.pi / 4
        cx, cy = 5.9 * math.cos(ang), 5.9 * math.sin(ang)
        if abs(x - cx) + abs(y - cy) <= 1.2:
            return "padrao"
    if r >= 7.7:
        return "limbo"
    return "iris"


def tenseigan(x, y):
    r, a = polar(x, y)
    if r <= 1.3:
        return "pupila"
    # flor/estrela de 8 pontas
    raio_estrela = 3.0 + 2.6 * (abs(math.cos(4 * a)) ** 2.2)
    if r <= raio_estrela and r <= 6.2:
        return "padrao"
    if abs(r - 6.9) <= 0.45:
        return "anel"
    if r >= 7.7:
        return "limbo"
    return "iris"


def cego(x, y):
    r, a = polar(x, y)
    if r >= 7.7:
        return "limbo"
    if abs(r - 4.6) <= 0.45:
        return "anel"
    return "iris"


# ---------------------------------------------------------------- paletas
# rampas com deslocamento de matiz (sombra puxa para roxo/azul, luz para laranja)
PAL = {
    "sharingan": {"iris": ["#5a0a1e", "#8e0f22", "#c8161f", "#e5362a"], "limbo": "#3a0614", "anel": "#62091a",
                  "padrao": "#12030a", "pupila": "#12030a", "pupila_v": "#d81e2a", "brilho": "#ffe9dc"},
    "rinnegan": {"iris": ["#4b2f86", "#6e4fb4", "#9479d6", "#b6a2ea"], "limbo": "#2e1b5c", "anel": "#2a1950",
                 "padrao": "#2a1950", "pupila": "#1b0f38", "brilho": "#f3edff"},
    "byakugan": {"iris": ["#a79bc4", "#cfc6e2", "#ebe6f5", "#fbf9ff"], "limbo": "#8d80ad", "anel": "#bdb2d6",
                 "padrao": "#9a8cc0", "centro": "#d9d1ec", "pupila": "#bdb2d6", "brilho": "#ffffff"},
    "byakugan_evo": {"iris": ["#8fa6cf", "#bccbe8", "#e1e9f8", "#f6f9ff"], "limbo": "#7085b6", "anel": "#9fb3dc",
                     "padrao": "#5b74b8", "centro": "#cfdcf4", "pupila": "#9fb3dc", "brilho": "#ffffff"},
    "tenseigan": {"iris": ["#0c3f8f", "#1565c8", "#2b8ff0", "#57b6ff"], "limbo": "#082a63", "anel": "#bff3ff",
                  "padrao": "#d9fbff", "pupila": "#1565c8", "brilho": "#ffffff"},
    "cego": {"iris": ["#6f6a73", "#8f8a92", "#aaa5ac", "#c2bdc4"], "limbo": "#4f4a55", "anel": "#a39ea7",
             "padrao": "#4f4a55", "pupila": "#4f4a55", "brilho": "#dedbe0"},
}


def pintar(camadas, pal, alfa_fundo=255, alfa_padrao=255, palpebra=True, brilho=True):
    img = Image.new("RGBA", (N, N))
    ramp = [hexc(c) for c in pal["iris"]]
    for y in range(N):
        for x in range(N):
            l = camadas[y][x]
            r = math.hypot(x - C, y - C)
            if l == "iris":
                # degrade radial da iris (centro mais claro) quantizado na rampa
                t = 1 - min(1, r / 7.8)
                idx = 1 + int(t * 2.99) if r > 0 else 3
                idx = max(0, min(3, idx))
                # palpebra superior: escurece as linhas de cima
                if palpebra and y <= 3:
                    idx = max(0, idx - (2 if y <= 1 else 1))
                col = ramp[idx]
                a = alfa_fundo
            else:
                col = hexc(pal.get(l, pal["iris"][0]) if isinstance(pal.get(l), str) else pal["iris"][0])
                if palpebra and y <= 1 and l == "limbo":
                    col = tuple(int(c * 0.7) for c in col)
                a = alfa_padrao if l in ("padrao", "pupila", "pupila_v", "anel", "centro") else alfa_fundo
            img.putpixel((x, y), col + (a,))
    if brilho:
        # brilho especular 2px no quadrante superior esquerdo (luz vinda de cima)
        for (bx, by_) in ((5, 4), (6, 4)):
            c = img.getpixel((bx, by_))
            img.putpixel((bx, by_), hexc(pal["brilho"]) + (255,))
        c = img.getpixel((5, 5))
        img.putpixel((5, 5), tuple(min(255, int(v * 0.5 + w * 0.5)) for v, w in zip(c[:3], hexc(pal["brilho"]))) + (255,))
    return img


def botao(eye, cor_moldura="#1b0d12"):
    """Botao de menu: olho com moldura de 1px escura e bisel claro/escuro interno."""
    b = eye.copy().convert("RGBA")
    px = b.load()
    for y in range(N):
        for x in range(N):
            r, g, bb, _ = px[x, y]
            px[x, y] = (r, g, bb, 255)
    m = hexc(cor_moldura)
    for i in range(N):
        for (x, y) in ((i, 0), (i, N - 1), (0, i), (N - 1, i)):
            px[x, y] = m + (255,)
    # bisel: luz em cima/esquerda, sombra embaixo/direita
    for i in range(1, N - 1):
        r, g, bb, a = px[i, 1]; px[i, 1] = (min(255, r + 40), min(255, g + 40), min(255, bb + 40), 255)
        r, g, bb, a = px[1, i]; px[1, i] = (min(255, r + 28), min(255, g + 28), min(255, bb + 28), 255)
        r, g, bb, a = px[i, N - 2]; px[i, N - 2] = (int(r * 0.6), int(g * 0.6), int(bb * 0.6), 255)
        r, g, bb, a = px[N - 2, i]; px[N - 2, i] = (int(r * 0.7), int(g * 0.7), int(bb * 0.7), 255)
    return b


def bloqueado(img):
    """Versao bloqueada: luminancia em cinza azulado frio, escurecida, com cadeado."""
    b = img.copy()
    px = b.load()
    for y in range(N):
        for x in range(N):
            r, g, bb, a = px[x, y]
            l = int(0.3 * r + 0.59 * g + 0.11 * bb)
            l = int(l * 0.62)
            px[x, y] = (l, l, min(255, l + 10), a)
    # cadeado 5x6 no canto inferior direito
    cad = ["..#..",
           ".#.#.",
           ".#.#.",
           "#####",
           "##.##",
           "#####"]
    ox, oy = N - 7, N - 8
    for j, linha in enumerate(cad):
        for i, ch in enumerate(linha):
            if ch == "#":
                px[ox + i, oy + j] = (240, 196, 72, 255) if j >= 3 else (210, 210, 220, 255)
    for j in range(len(cad) + 2):
        for i in range(7):
            x, y = ox - 1 + i, oy - 1 + j
            if 0 <= x < N and 0 <= y < N and px[x, y][:3] not in ((240, 196, 72), (210, 210, 220)):
                if cad[j - 1][i - 1] == "." if 0 < j <= len(cad) and 0 < i <= 5 else True:
                    pass
    return b


def contorno_padrao(camadas, img, cor):
    """Escurece 1px a iris colada ao padrao (aumenta a leitura em 17x17)."""
    px = img.load()
    for y in range(N):
        for x in range(N):
            if camadas[y][x] != "iris":
                continue
            viz = [camadas[yy][xx] for xx, yy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if 0 <= xx < N and 0 <= yy < N]
            if any(v == "padrao" for v in viz) and y > 3:
                r, g, b, a = px[x, y]
                px[x, y] = (int(r * 0.78), int(g * 0.78), int(b * 0.78), a)


DESENHOS = {
    "sharingan": (sharingan, "sharingan"),
    "mgk_itachi": (mgk_itachi, "sharingan"),
    "mgk_obito": (mgk_obito, "sharingan"),
    "mgk_sasuke": (mgk_sasuke, "sharingan"),
    "rinnegan": (rinnegan, "rinnegan"),
    "byakugan": (byakugan, "byakugan"),
    "byakugan_evoluido": (byakugan_evo, "byakugan_evo"),
    "tenseigan": (tenseigan, "tenseigan"),
    "cego": (cego, "cego"),
}


def gerar(nome, alfa_fundo=255, alfa_padrao=255):
    f, p = DESENHOS[nome]
    cam = render(f)
    img = pintar(cam, PAL[p], alfa_fundo, alfa_padrao)
    if nome.startswith("mgk") or nome == "sharingan":
        contorno_padrao(cam, img, None)
    return img


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for n in DESENHOS:
        img = gerar(n)
        img.save(os.path.join(out, n + ".png"))
        botao(img).save(os.path.join(out, "bt_" + n + ".png"))
        bloqueado(botao(img)).save(os.path.join(out, "bt_" + n + "_lock.png"))
