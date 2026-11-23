# Passe de volume para skins 64x64 (layout humanoide padrao).
import sys, math
from PIL import Image
# (x, y, w, h, depth) de cada parte: faces laterais em (x+... ) seguindo o layout padrao
PARTS_BASE = [
  ('head', 0, 0, 8, 8, 8), ('body', 16, 16, 8, 12, 4), ('rarm', 40, 16, 4, 12, 4),
  ('rleg', 0, 16, 4, 12, 4), ('larm', 32, 48, 4, 12, 4), ('lleg', 16, 48, 4, 12, 4),
]
PARTS_OVER = [
  ('hat', 32, 0, 8, 8, 8), ('jacket', 16, 32, 8, 12, 4), ('rsleeve', 40, 32, 4, 12, 4),
  ('rpants', 0, 32, 4, 12, 4), ('lsleeve', 48, 48, 4, 12, 4), ('lpants', 0, 48, 4, 12, 4),
]
def faces(ox, oy, w, h, d):
    # top/bottom faces at (ox+d, oy) size w x d and (ox+d+w, oy)
    top = (ox+d, oy, w, d); bottom = (ox+d+w, oy, w, d)
    sides = [(ox, oy+d, d, h), (ox+d, oy+d, w, h), (ox+d+w, oy+d, d, h), (ox+2*d+w, oy+d, w, h)]
    return top, bottom, sides
def shade_px(c, f):
    r,g,b,a = c
    if a == 0: return c
    if f >= 1:  # clarear puxando para branco quente suavemente
        k = f - 1
        return (min(255,int(r+(255-r)*k*0.9)), min(255,int(g+(255-g)*k*0.85)), min(255,int(b+(255-b)*k*0.7)), a)
    # escurecer com leve tom frio (sombra mais natural)
    k = 1 - f
    return (int(r*(1-k)), int(g*(1-k*0.97)), int(b*(1-k*0.9)+ (8*k)), a)
def process(img, strength=1.0, over=False):
    im = img.convert('RGBA'); px = im.load()
    parts = PARTS_OVER if over else PARTS_BASE
    for name, ox, oy, w, h, d in parts:
        top, bottom, sides = faces(ox, oy, w, h, d)
        for (fx, fy, fw, fh) in sides:
            for y in range(fh):
                t = y/(fh-1) if fh > 1 else 0
                # luz vem de cima: topo +7%, base -16% (pes/maos mais escuros)
                vf = 1.07 - 0.23*t if name not in ('head','hat') else 1.05 - 0.15*t
                for x in range(fw):
                    ef = 1.0
                    if fw >= 4 and (x == 0 or x == fw-1): ef = 0.94  # bordas (oclusao nas quinas)
                    f = 1 + (vf*ef - 1)*strength
                    X, Y = fx+x, fy+y
                    if 0 <= X < im.width and 0 <= Y < im.height: px[X,Y] = shade_px(px[X,Y], f)
        for (fx, fy, fw, fh), f0 in ((top, 1.08), (bottom, 0.82)):
            for y in range(fh):
                for x in range(fw):
                    X, Y = fx+x, fy+y
                    if 0 <= X < im.width and 0 <= Y < im.height: px[X,Y] = shade_px(px[X,Y], 1+(f0-1)*strength)
    return im
if __name__ == '__main__':
    for f in sys.argv[1:]:
        im = Image.open(f)
        if im.size == (64,64):
            im = process(im, 1.0, False); im = process(im, 0.6, True)
        elif im.size == (64,32):
            # layout antigo: so partes base com y<32 + chapeu
            big = Image.new('RGBA',(64,64),(0,0,0,0)); big.alpha_composite(im.convert('RGBA'),(0,0))
            big = process(big, 1.0, False)
            big = process(big, 0.6, True)
            im = big.crop((0,0,64,32))
        else:
            print('skip size', f, im.size); continue
        im.save(f); print('shaded', f)
