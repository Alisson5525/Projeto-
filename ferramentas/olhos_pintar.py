"""Pinta as grades desenhadas a mao com as paletas (rampas com deslocamento de matiz)."""
import math, os, sys
from PIL import Image
from olhos_grades import GRADES
from olhos import PAL, hexc, botao, bloqueado

N = 17
FORA = {"sharingan": "#2a0610", "rinnegan": "#1d1238", "byakugan": "#6d6488", "byakugan_evo": "#56688f",
        "tenseigan": "#061c44", "cego": "#3a363e"}


def pintar(grade, pkey, alfa_fundo=255, alfa_padrao=255):
    pal = PAL[pkey]
    ramp = [hexc(c) for c in pal["iris"]]
    img = Image.new("RGBA", (N, N))
    for y in range(N):
        for x in range(N):
            ch = grade[y][x]
            r = math.hypot(x - 8, y - 8)
            a = alfa_fundo
            if ch in ".,*":
                t = 1 - min(1, r / 7.6)
                idx = min(3, 1 + int(t * 3.2))
                if y <= 3:
                    idx -= 1          # sombra da palpebra superior
                if ch == ",":
                    idx -= 1          # meio-tom junto ao padrao
                col = ramp[max(0, idx)]
                if ch == "*":
                    col, a = hexc(pal["brilho"]), 255
            elif ch == " ":
                col = hexc(FORA[pkey])
                if y <= 2:
                    col = tuple(int(c * 0.75) for c in col)
            elif ch == "~":
                col = hexc(pal["limbo"])
            elif ch == "o":
                col, a = hexc(pal["anel"]), alfa_padrao
            elif ch == "#":
                col, a = hexc(pal["padrao"]), alfa_padrao
            elif ch == "v":
                col, a = hexc(pal.get("pupila_v", pal["iris"][2])), alfa_padrao
            elif ch == "+":
                col, a = hexc(pal.get("padrao") if pkey in ("tenseigan",) else pal["padrao"]), alfa_padrao
            else:
                raise ValueError(ch)
            img.putpixel((x, y), col + (a,))
    return img


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for nome, (g, p) in GRADES.items():
        img = pintar(g, p)
        img.save(os.path.join(out, nome + ".png"))
        b = botao(img)
        b.save(os.path.join(out, "bt_" + nome + ".png"))
        bloqueado(b).save(os.path.join(out, "bt_" + nome + "_lock.png"))
