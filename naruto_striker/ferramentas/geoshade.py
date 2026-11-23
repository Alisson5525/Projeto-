# Sombreamento guiado pela geometria: le as faces dos cubos (UV por face ou box UV)
# e aplica luz de cima / sombra embaixo / gradiente vertical nas laterais.
import sys, json, math
from PIL import Image
def faces_of(cube):
    uv = cube.get('uv'); size = cube['size']
    out = []
    if isinstance(uv, dict):
        for name, f in uv.items():
            if 'uv' not in f: continue
            u, v = f['uv']; w, h = f.get('uv_size', [0, 0])
            out.append((name, u, v, w, h))
    elif isinstance(uv, list):
        u, v = uv; w, h, d = size
        w2, h2, d2 = abs(w), abs(h), abs(d)
        out += [('up', u+d2, v, w2, d2), ('down', u+d2+w2, v, w2, d2),
                ('east', u, v+d2, d2, h2), ('north', u+d2, v+d2, w2, h2),
                ('west', u+d2+w2, v+d2, d2, h2), ('south', u+2*d2+w2, v+d2, w2, h2)]
    return out
def shade(c, f):
    r, g, b, a = c
    if a == 0: return c
    if f >= 1:
        k = f - 1
        return (min(255, int(r + (255-r)*k*0.9)), min(255, int(g + (255-g)*k*0.85)), min(255, int(b + (255-b)*k*0.7)), a)
    k = 1 - f
    return (int(r*(1-k)), int(g*(1-k*0.97)), min(255, int(b*(1-k*0.9) + 8*k)), a)
def process(tex_path, geo_path, geo_id, out_path, strength=1.0):
    im = Image.open(tex_path).convert('RGBA'); px = im.load()
    j = json.load(open(geo_path, encoding='utf-8-sig'))
    g = [x for x in j['minecraft:geometry'] if x['description']['identifier'] == geo_id][0]
    tw, th = g['description']['texture_width'], g['description']['texture_height']
    sx, sy = im.width / tw, im.height / th
    feito = set()
    for bone in g['bones']:
        for cube in bone.get('cubes', []):
            for name, u, v, w, h in faces_of(cube):
                if w == 0 or h == 0: continue
                x0, x1 = sorted([u*sx, (u+w)*sx]); y0, y1 = sorted([v*sy, (v+h)*sy])
                X0, X1, Y0, Y1 = int(math.floor(x0)), int(math.ceil(x1)), int(math.floor(y0)), int(math.ceil(y1))
                H = max(1, Y1 - Y0)
                for y in range(Y0, Y1):
                    for x in range(X0, X1):
                        if not (0 <= x < im.width and 0 <= y < im.height) or (x, y) in feito: continue
                        if name == 'up': f = 1.08
                        elif name == 'down': f = 0.82
                        else:
                            t = (y - Y0) / (H - 1) if H > 1 else 0
                            if h < 0: t = 1 - t
                            f = 1.06 - 0.2 * t
                            if (X1 - X0) >= 4 and (x == X0 or x == X1 - 1): f *= 0.95
                        px[x, y] = shade(px[x, y], 1 + (f - 1) * strength)
                        feito.add((x, y))
    im.save(out_path)
    return len(feito)
if __name__ == '__main__':
    print(process(*sys.argv[1:5], float(sys.argv[5]) if len(sys.argv) > 5 else 1.0))
