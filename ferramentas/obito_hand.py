import math
from sharingan_hand import TEMPLATE
def obito():
    g=[list(l) for l in TEMPLATE]
    # miolo vermelho 3x3 + anel preto em volta (r ~2)
    for y in range(17):
        for x in range(17):
            r=math.hypot(x-8,y-8)
            if g[y][x]!='.': continue
            if r<=1.5: g[y][x]='v'
            elif r<=2.5: g[y][x]='#'
    # tres foices: varrem 75 graus no sentido horario enquanto se afastam do centro
    for k in range(3):
        t0=-math.pi/2+k*2*math.pi/3
        for i in range(0,41):
            s=i/40
            r=2.9+s*4.0
            a=t0+s*1.35
            w=0.78*(1-s)+0.3
            for y in range(17):
                for x in range(17):
                    if g[y][x] not in '.': continue
                    if math.hypot(x-(8+r*math.cos(a)),y-(8+r*math.sin(a)))<=w: g[y][x]='#'
    g[5][5]='*'
    return [''.join(r) for r in g]
OBITO=obito()
if __name__=='__main__':
    for l in OBITO: print(l)
