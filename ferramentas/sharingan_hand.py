TEMPLATE = [
 "                 ",
 "      ~~~~~      ",
 "    ~~.....~~    ",
 "   ~.........~   ",
 "  ~...........~  ",
 "  ~...........~  ",
 " ~.............~ ",
 " ~.............~ ",
 " ~.............~ ",
 " ~.............~ ",
 " ~.............~ ",
 "  ~...........~  ",
 "  ~...........~  ",
 "   ~.........~   ",
 "    ~~.....~~    ",
 "      ~~~~~      ",
 "                 ",
]
RING = [(c,3) for c in range(6,11)] + [(5,4),(11,4),(4,5),(12,5)] + [(3,r) for r in range(6,11)] + [(13,r) for r in range(6,11)] + [(4,11),(12,11),(5,12),(11,12)] + [(c,13) for c in range(6,11)]
def montar(tomoes, pupila=((7,7),(8,7),(9,7),(7,8),(8,8),(9,8),(7,9),(8,9),(9,9)), brilho=(5,5), meio=True):
    g=[list(l) for l in TEMPLATE]
    for x,y in RING: g[y][x]='o'
    for x,y in pupila: g[y][x]='#'
    for px in tomoes:
        for x,y in px: g[y][x]='#'
    if meio:
        for y in range(5,17):
            for x in range(17):
                if g[y][x]=='.' and any(0<=x+a<17 and 0<=y+b<17 and g[y+b][x+a]=='#' for a,b in ((1,0),(-1,0),(0,1),(0,-1))):
                    g[y][x]=','
    if brilho: g[brilho[1]][brilho[0]]='*'
    return [''.join(r) for r in g]
TOP = [(8,2),(7,3),(8,3),(9,3),(7,4),(8,4),(9,4),(10,3),(11,4)]
LR  = [(11,10),(12,10),(13,10),(11,11),(12,11),(13,11),(12,12),(11,12),(10,13)]
LL  = [(3,10),(4,10),(5,10),(3,11),(4,11),(5,11),(4,12),(3,9),(3,8)]
SHARINGAN = montar([TOP,LR,LL])
if __name__=='__main__':
    for l in SHARINGAN: print(l)
