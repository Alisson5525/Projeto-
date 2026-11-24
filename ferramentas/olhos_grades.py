"""Olhos desenhados a mao, pixel a pixel (17x17).

Legenda:
  ' ' fora da iris (canto do quadrado: tom escuro da palpebra/esclera)
  '~' borda escura da iris (limbo)
  '.' iris (recebe degrade radial quantizado + sombra da palpebra)
  ',' iris escurecida (meio-tom ao redor do padrao, da volume)
  'o' anel fino (cor de anel da paleta)
  '#' padrao preto/escuro
  'v' miolo colorido (centro vermelho dos Mangekyou)
  '+' destaque claro do padrao (Tenseigan, marcas do Byakugan evoluido)
  '*' brilho especular
"""

SHARINGAN_OLD = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.....~~    ",
    "   ~....##...~   ",
    "  ~...,####,..~  ",
    "  ~..o,###.o..~  ",
    " ~..o..,#,..o..~ ",
    " ~.*o.,###,..o.~ ",
    " ~..o,#####,.o.~ ",
    " ~.##,#####,.o.~ ",
    " ~,###,###,,##.~ ",
    "  ~###o..,o###~  ",
    "  ~.##.ooo.###~  ",
    "   ~.,.....,#~   ",
    "    ~~.....~~    ",
    "      ~~~~~      ",
    "                 ",
]

MGK_ITACHI = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.###.~~    ",
    "   ~...####..~   ",
    "  ~...,####...~  ",
    "  ~.*..####,..~  ",
    " ~.....#####,..~ ",
    " ~..,###vvv##,.~ ",
    " ~.#####vvv####~ ",
    " ~####,#vvv#####~",
    " ~###,..###,,##~ ",
    "  ~#,...,###..~  ",
    "  ~.....####,.~  ",
    "   ~...,####.~   ",
    "    ~~..###~~    ",
    "      ~~~~~      ",
    "                 ",
]

MGK_OBITO_OLD = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.....~~    ",
    "   ~..##.....~   ",
    "  ~.*..##.....~  ",
    "  ~.....##,...~  ",
    " ~.....,###,...~ ",
    " ~.....#.v.#,##~ ",
    " ~....#v###v###~ ",
    " ~...,#.v.v.#..~ ",
    " ~..###,###,...~ ",
    "  ~##,...,.....~ ",
    "  ~#.......##.~  ",
    "   ~.......##~   ",
    "    ~~......~    ",
    "      ~~~~~      ",
    "                 ",
]

MGK_SASUKE = [
    "                 ",
    "      ~~~~~      ",
    "    ~~..#..~~    ",
    "   ~...###...~   ",
    "  ~.*..###....~  ",
    "  ~##,.###.,##~  ",
    " ~..###,#,###..~ ",
    " ~...,#vvv#,...~ ",
    " ~....#v#v#....~ ",
    " ~...,#vvv#,...~ ",
    " ~..###,#,###..~ ",
    "  ~##,.###.,##~  ",
    "  ~....###....~  ",
    "   ~...###...~   ",
    "    ~~..#..~~    ",
    "      ~~~~~      ",
    "                 ",
]

RINNEGAN = [
    "                 ",
    "      ~~~~~      ",
    "    ~~ooooo~~    ",
    "   ~oo.....oo~   ",
    "  ~o..ooooo..o~  ",
    "  ~o*o.....o.o~  ",
    " ~o.o..ooo..o.o~ ",
    " ~o.o.o...o.o.o~ ",
    " ~o.o.o.#.o.o.o~ ",
    " ~o.o.o...o.o.o~ ",
    " ~o.o..ooo..o.o~ ",
    "  ~o.o.....o.o~  ",
    "  ~o..ooooo..o~  ",
    "   ~oo.....oo~   ",
    "    ~~ooooo~~    ",
    "      ~~~~~      ",
    "                 ",
]

BYAKUGAN = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.....~~    ",
    "   ~.........~   ",
    "  ~.*..ooo....~  ",
    "  ~...o...o...~  ",
    " ~...o.....o...~ ",
    " ~..o.......o..~ ",
    " ~..o...+...o..~ ",
    " ~..o.......o..~ ",
    " ~...o.....o...~ ",
    "  ~...o...o...~  ",
    "  ~....ooo....~  ",
    "   ~.........~   ",
    "    ~~.....~~    ",
    "      ~~~~~      ",
    "                 ",
]

BYAKUGAN_EVO = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.....~~    ",
    "   ~.+.....+.~   ",
    "  ~.+*.ooo..+.~  ",
    "  ~...o...o...~  ",
    " ~...o.....o...~ ",
    " ~..o.......o..~ ",
    " ~..o...+...o..~ ",
    " ~..o.......o..~ ",
    " ~...o.....o...~ ",
    "  ~...o...o...~  ",
    "  ~.+..ooo..+.~  ",
    "   ~.+.....+.~   ",
    "    ~~.....~~    ",
    "      ~~~~~      ",
    "                 ",
]

TENSEIGAN = [
    "                 ",
    "      ~~~~~      ",
    "    ~~oo+oo~~    ",
    "   ~o...+...o~   ",
    "  ~o*+..+..+.o~  ",
    "  ~o..++++++.o~  ",
    " ~o...++,,++..o~ ",
    " ~o..++,##,++.o~ ",
    " ~++++++#.#+++++~",
    " ~o..++,##,++.o~ ",
    " ~o...++,,++..o~ ",
    "  ~o..++++++.o~  ",
    "  ~o.+..+..+.o~  ",
    "   ~o...+...o~   ",
    "    ~~oo+oo~~    ",
    "      ~~~~~      ",
    "                 ",
]

CEGO = [
    "                 ",
    "      ~~~~~      ",
    "    ~~.....~~    ",
    "   ~.........~   ",
    "  ~.*.........~  ",
    "  ~...........~  ",
    " ~......,......~ ",
    " ~.....,,,.....~ ",
    " ~....,,,,,....~ ",
    " ~.....,,,.....~ ",
    " ~......,......~ ",
    "  ~...........~  ",
    "  ~...........~  ",
    "   ~.........~   ",
    "    ~~.....~~    ",
    "      ~~~~~      ",
    "                 ",
]

from sharingan_hand import SHARINGAN
from obito_hand import OBITO as MGK_OBITO

GRADES = {
    "sharingan": (SHARINGAN, "sharingan"),
    "mgk_itachi": (MGK_ITACHI, "sharingan"),
    "mgk_obito": (MGK_OBITO, "sharingan"),
    "mgk_sasuke": (MGK_SASUKE, "sharingan"),
    "rinnegan": (RINNEGAN, "rinnegan"),
    "byakugan": (BYAKUGAN, "byakugan"),
    "byakugan_evoluido": (BYAKUGAN_EVO, "byakugan_evo"),
    "tenseigan": (TENSEIGAN, "tenseigan"),
    "cego": (CEGO, "cego"),
}

for k, (g, _) in GRADES.items():
    assert len(g) == 17 and all(len(l) == 17 for l in g), (k, [len(l) for l in g])
