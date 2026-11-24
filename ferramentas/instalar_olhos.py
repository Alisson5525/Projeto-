import os, sys
from PIL import Image
from olhos_grades import GRADES
from olhos_pintar import pintar
from olhos import botao, bloqueado
RP = sys.argv[1]
T = os.path.join(RP, "textures")
def olho(nome, af, ap):
    g, p = GRADES[nome]
    return pintar(g, p, af, ap)
def salvar(img, rel):
    p = os.path.join(T, rel)
    assert os.path.exists(p), p  # so substitui arquivos existentes (mesmo caminho/identificador)
    img.save(p)
    print("ok", rel, img.size)
# texturas de entidade (material emissivo: alfa = intensidade do brilho; fundo mantem o valor original)
for nome, rel, af in (("sharingan", "tudo/uchiha/sharingan.png", 111), ("mgk_itachi", "tudo/uchiha/mgk_itachi.png", 111),
                      ("mgk_obito", "tudo/uchiha/mgk_obito.png", 111), ("mgk_sasuke", "tudo/uchiha/mgk_sasuke.png", 111),
                      ("byakugan", "tudo/hyuga/byakugan.png", 255), ("byakugan_evoluido", "tudo/hyuga/byakugan_evoluido.png", 255),
                      ("tenseigan", "tudo/hyuga/tenseigan.png", 95)):
    salvar(olho(nome, af, 255), rel)
# Rinnegan (dois olhos lado a lado, 34x17)
r = Image.new("RGBA", (34, 17)); e = olho("rinnegan", 128, 255)
r.paste(e, (0, 0)); r.paste(e.transpose(Image.FLIP_LEFT_RIGHT), (17, 0)); salvar(r, "tudo/uchiha/rinnegan.png")
# Izanagi: olho que perdeu a luz (esq.) + Sharingan (dir.); cantos fora da iris sem brilho
iz = Image.new("RGBA", (34, 17))
for i, nome in enumerate(("cego", "sharingan")):
    g, p = GRADES[nome]
    img = pintar(g, p, 255, 255)
    px = img.load()
    for y in range(17):
        for x in range(17):
            if g[y][x] == " ":
                px[x, y] = px[x, y][:3] + (0,)
    iz.paste(img, (i * 17, 0))
salvar(iz, "tudo/uchiha/izanagi.png")
# botoes de menu
for nome in ("sharingan", "mgk_itachi", "mgk_obito", "mgk_sasuke", "rinnegan", "byakugan", "byakugan_evoluido", "tenseigan"):
    b = botao(olho(nome, 255, 255))
    salvar(b, f"ui/menu_modo/bt_{nome}.png")
    salvar(bloqueado(b), f"ui/menu_modo/bt_{nome}_lock.png")
