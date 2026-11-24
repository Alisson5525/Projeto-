"""Acabamento pixel art (Naruto Striker+ - Edicao Definitiva).

1) Icones (<= 32px) sem contorno recebem contorno externo de 1px, na cor escura
   do proprio pixel vizinho com deslocamento de matiz para o azul/roxo (padrao do
   restante dos icones do add-on, que ja usam contorno escuro).
2) Texturas de modelo (skins, roupas, chefes, NPCs, jutsus):
   - alfa: residuos quase invisiveis (1..12) viram 0; texturas "binarias" (quase sem
     semitransparencia) tem o alfa fechado em 0/255 -> bordas nitidas no alpha-test;
   - cores quase identicas (ruido, dE < 3.2 em CIELAB) sao unificadas na cor mais
     frequente do grupo -> menos ruido, mesmas cores percebidas;
   - pixels orfaos (diferentes dos 4 vizinhos, que concordam entre si, por dE < 9)
     assumem a cor dos vizinhos -> remove "sujeira" de pixel solto.
   Nada e redimensionado; UVs e identificadores ficam intactos.
"""
import os, sys, json, colorsys
import numpy as np
from PIL import Image


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], -1)


def escuro_hue(rgb):
    r, g, b = [v / 255 for v in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    # sombra: puxa o matiz para ~250 graus (azul-violeta), baixa a luminosidade
    alvo = 250 / 360
    dh = ((alvo - h + 0.5) % 1) - 0.5
    h = (h + dh * 0.35) % 1
    l = max(0.045, min(0.12, l * 0.22))
    s = min(1, s * 0.6 + 0.15)
    return tuple(int(v * 255) for v in colorsys.hls_to_rgb(h, l, s))


def contornar(im):
    a = np.array(im.convert("RGBA"))
    h, w, _ = a.shape
    op = a[..., 3] > 127
    if op.sum() == 0:
        return im, False
    borda = []
    for y in range(h):
        for x in range(w):
            if not op[y, x]:
                continue
            if any(not (0 <= x + dx < w and 0 <= y + dy < h) or not op[y + dy, x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                borda.append(a[y, x, :3])
    borda = np.array(borda)
    lum = 0.299 * borda[:, 0] + 0.587 * borda[:, 1] + 0.114 * borda[:, 2]
    if (lum < 70).mean() >= 0.55:
        return im, False  # ja tem contorno
    # componentes conexos: faiscas/pontos soltos (< 4 px) nao recebem contorno
    comp = -np.ones((h, w), int)
    tam = []
    for y in range(h):
        for x in range(w):
            if op[y, x] and comp[y, x] < 0:
                pilha = [(x, y)]; comp[y, x] = len(tam); n = 0
                while pilha:
                    cx, cy = pilha.pop(); n += 1
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and op[ny, nx] and comp[ny, nx] < 0:
                            comp[ny, nx] = len(tam); pilha.append((nx, ny))
                tam.append(n)
    grande = lambda xx, yy: tam[comp[yy, xx]] >= 4
    out = a.copy()
    mudou = False
    for y in range(h):
        for x in range(w):
            if op[y, x]:
                continue
            viz = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h and op[y + dy, x + dx] and grande(x + dx, y + dy)]
            if viz:
                cor = a[viz[0][1], viz[0][0], :3]
                out[y, x] = list(escuro_hue(cor)) + [255]
                mudou = True
    return Image.fromarray(out), mudou


def limpar(im):
    a = np.array(im.convert("RGBA")).astype(np.int32)
    h, w, _ = a.shape
    alpha = a[..., 3]
    vis = alpha > 0
    if vis.sum() == 0:
        return im, {}
    st = {}
    resid = (alpha > 0) & (alpha <= 12)
    st["alfa_residuo"] = int(resid.sum())
    alpha[resid] = 0
    semi = ((alpha > 0) & (alpha < 255)).sum() / max(1, (alpha > 0).sum())
    if semi < 0.04:
        n = int(((alpha > 0) & (alpha < 255)).sum())
        alpha[:] = np.where(alpha >= 128, 255, 0)
        st["alfa_fechado"] = n
    a[..., 3] = alpha
    vis = alpha > 0
    # unifica cores quase identicas
    cores, inv, cont = np.unique(a[vis][:, :3], axis=0, return_inverse=True, return_counts=True)
    inv = inv.reshape(-1)
    if len(cores) > 1:
        lab = srgb_to_lab(cores.astype(float))
        ordem = np.argsort(-cont)
        rep = np.arange(len(cores))
        livre = np.ones(len(cores), bool)
        for i in ordem:
            if not livre[i]:
                continue
            d = np.sqrt(((lab - lab[i]) ** 2).sum(-1))
            grupo = livre & (d < 3.2)
            rep[grupo] = i
            livre[grupo] = False
        novo = cores[rep][inv]
        st["cores_antes"] = int(len(cores))
        st["cores_depois"] = int(len(np.unique(rep)))
        px = a[vis]
        px[:, :3] = novo
        a[vis] = px
    # pixels orfaos
    rgb = a[..., :3]
    lab = srgb_to_lab(rgb.astype(float))
    orf = 0
    out = a.copy()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if a[y, x, 3] == 0:
                continue
            vz = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if any(a[yy, xx, 3] != a[y, x, 3] for xx, yy in vz):
                continue
            c0 = tuple(rgb[vz[0][1], vz[0][0]])
            if all(tuple(rgb[yy, xx]) == c0 for xx, yy in vz[1:]) and tuple(rgb[y, x]) != c0:
                d = np.sqrt(((lab[y, x] - lab[vz[0][1], vz[0][0]]) ** 2).sum())
                if d < 9:
                    out[y, x, :3] = c0
                    orf += 1
    st["orfaos"] = orf
    return Image.fromarray(out.astype(np.uint8)), st


def main():
    rp, relatorio, *ignorar = sys.argv[1:]
    T = os.path.join(rp, "textures")
    ign = set(ignorar)
    rel = {"icones_contornados": [], "limpeza": {}}
    pastas_modelo = ("tudo", "bosses", "npcs", "roupas", "custom", "jutsus")
    for raiz, _, fs in os.walk(T):
        for f in fs:
            if not f.lower().endswith(".png"):
                continue
            p = os.path.join(raiz, f)
            r = os.path.relpath(p, T)
            if r in ign:
                continue
            im = Image.open(p)
            topo = r.split(os.sep)[0]
            if topo == "items" and max(im.size) <= 32:
                novo, mudou = contornar(im)
                if mudou:
                    novo.save(p)
                    rel["icones_contornados"].append(r)
            elif topo in pastas_modelo:
                novo, st = limpar(im)
                if st and (st.get("orfaos") or st.get("alfa_residuo") or st.get("alfa_fechado") or st.get("cores_depois", 0) < st.get("cores_antes", 0)):
                    if im.mode == "RGB":
                        novo = novo.convert("RGB")
                    novo.save(p)
                    rel["limpeza"][r] = st
    json.dump(rel, open(relatorio, "w"), indent=1, ensure_ascii=False)
    print("icones:", len(rel["icones_contornados"]), "limpas:", len(rel["limpeza"]))


if __name__ == "__main__":
    main()
