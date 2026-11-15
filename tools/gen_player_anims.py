#!/usr/bin/env python3
"""Gera RP/animations/valdoria/jogador.animation.json.

Cada animação tem trilhas separadas por perspectiva:
- 3ª pessoa: braços, corpo e cabeça (corpo e cabeça só em 3ª pessoa: em 1ª pessoa o braço é filho do corpo e girar o corpo
  desalinharia o braço visível).
- 1ª pessoa: apenas o braço direito (o único renderizado junto com o item), com rotação E posição próprias e amplitudes
  calibradas para o movimento ficar dentro do campo de visão.
Expressão usada: variable.is_first_person ? (1ª) : (3ª). O braço esquerdo, o corpo e a cabeça usam 0 em 1ª pessoa.
"""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "Cronicas_de_Valdoria_RP", "animations", "valdoria", "jogador.animation.json")
FP = "variable.is_first_person"


def num(v):
    return f"{v:g}" if isinstance(v, (int, float)) else f"({v})"


def both(tp, fp):
    """Vetor [x,y,z] com valor por perspectiva."""
    out = []
    for a, b in zip(tp, fp):
        if a == b:
            out.append(a)
        elif b == 0:
            out.append(f"{FP} ? 0 : {num(a)}")
        else:
            out.append(f"{FP} ? {num(b)} : {num(a)}")
    return out


def tp_only(v):
    return [a if a == 0 else f"{FP} ? 0 : {num(a)}" for a in v]


def track(frames, fn, smooth=True):
    """frames: lista de (tempo, valor...) -> dict de keyframes."""
    d = {}
    for f in frames:
        t = f"{f[0]:.2f}"
        v = fn(*f[1:])
        d[t] = {"post": v, "lerp_mode": "catmullrom"} if smooth else v
    return d


def anim(length, right, fp_pos=None, left=None, body=None, head=None, loop=False, smooth=True):
    """right: [(t, tp_rot, fp_rot)], fp_pos: [(t, [x,y,z])] posição do braço direito só em 1ª pessoa."""
    bones = {"rightArm": {"rotation": track(right, lambda tp, fp: both(tp, fp), smooth)}}
    if fp_pos:
        bones["rightArm"]["position"] = track(fp_pos, lambda p: [0 if c == 0 else f"{FP} ? {num(c)} : 0" for c in p], smooth)
    if left:
        bones["leftArm"] = {"rotation": track(left, tp_only, smooth)}
    if body:
        bones["body"] = {"rotation": track(body, tp_only, smooth)}
    if head:
        bones["head"] = {"rotation": track(head, tp_only, smooth)}
    a = {"loop": loop, "bones": bones}
    if length:
        a["animation_length"] = length
    return a


Z = [0, 0, 0]
A = {}

# ------------------------------------------------------------------ conjuração
A["conjurar_preparo"] = anim(1.0, loop="hold_on_last_frame", right=[
    (0, Z, Z), (0.25, [-100, 10, 5], [-35, 12, 8]), (1.0, [-112, 14, 8], [-42, 16, 10])],
    fp_pos=[(0, Z), (0.25, [-1, 1.5, -2]), (1.0, [-1.5, 2, -2.5])],
    left=[(0, Z), (0.25, [-65, -20, -20]), (1.0, [-72, -24, -24])], body=[(0, Z), (0.25, [-4, 6, 0])])
A["conjurar_lancar"] = anim(0.45, right=[
    (0, [-115, 14, 8], [-40, 14, 10]), (0.1, [-85, 0, 0], [-62, 4, 4]), (0.2, [-80, 0, 0], [-58, 0, 0]), (0.45, Z, Z)],
    fp_pos=[(0, [-1, 2, -2]), (0.1, [0, 1, -6]), (0.2, [0, 1, -5]), (0.45, Z)],
    left=[(0, [-70, -20, -20]), (0.12, [-30, 0, -10]), (0.45, Z)], body=[(0, [-4, 6, 0]), (0.1, [6, -8, 0]), (0.45, Z)])
A["conjurar_area"] = anim(0.6, right=[
    (0, Z, Z), (0.18, [-170, -10, 20], [-75, -10, 20]), (0.32, [-20, 0, 10], [12, 0, 6]), (0.6, Z, Z)],
    fp_pos=[(0, Z), (0.18, [0, 4, -1]), (0.32, [0, -3, -3]), (0.6, Z)],
    left=[(0, Z), (0.18, [-170, 10, -20]), (0.32, [-20, 0, -10]), (0.6, Z)], body=[(0, Z), (0.18, [-8, 0, 0]), (0.32, [10, 0, 0]), (0.6, Z)])
A["conjurar_proprio"] = anim(0.7, right=[
    (0, Z, Z), (0.2, [-60, -30, 30], [-30, -35, 25]), (0.45, [-70, -40, 35], [-34, -42, 30]), (0.7, Z, Z)],
    fp_pos=[(0, Z), (0.2, [-3, 0, -1]), (0.45, [-4, 1, -1.5]), (0.7, Z)],
    left=[(0, Z), (0.2, [-60, 30, -30]), (0.45, [-70, 40, -35]), (0.7, Z)], head=[(0, Z), (0.25, [12, 0, 0]), (0.7, Z)])
# arremesso (fogo, arcana): puxa a mão para trás do ombro e lança em arco
A["conjurar_arremesso"] = anim(0.5, right=[
    (0, Z, Z), (0.12, [-150, 20, 30], [-55, 35, 25]), (0.24, [-60, -10, -5], [-10, -20, -10]), (0.5, Z, Z)],
    fp_pos=[(0, Z), (0.12, [2, 4, 1]), (0.24, [-1, 0, -5]), (0.5, Z)],
    left=[(0, Z), (0.12, [-40, 0, -20]), (0.5, Z)], body=[(0, Z), (0.12, [0, 20, 0]), (0.24, [6, -15, 0]), (0.5, Z)])
# raio (eletricidade): ergue a mão ao céu e aponta de uma vez
A["conjurar_raio"] = anim(0.55, right=[
    (0, Z, Z), (0.15, [-175, 0, 10], [-80, 0, 12]), (0.27, [-95, 0, 0], [-45, 0, 0]), (0.55, Z, Z)],
    fp_pos=[(0, Z), (0.15, [0, 6, 0]), (0.27, [0, 1, -5]), (0.55, Z)],
    left=[(0, Z), (0.2, [-30, 0, -25]), (0.55, Z)], head=[(0, Z), (0.15, [-15, 0, 0]), (0.3, Z)])
# canalizar (feixes: luz, sangue): braço estendido que treme enquanto o feixe sai
A["conjurar_canalizar"] = anim(0.7, right=[
    (0, Z, Z), (0.1, [-88, 0, 0], [-50, 0, 0]), (0.25, [-92, 3, 2], [-53, 3, 2]), (0.4, [-86, -3, -2], [-48, -3, -2]),
    (0.55, [-90, 0, 0], [-51, 0, 0]), (0.7, Z, Z)],
    fp_pos=[(0, Z), (0.1, [0, 1, -6]), (0.4, [0.3, 1.2, -6.5]), (0.55, [0, 1, -6]), (0.7, Z)],
    left=[(0, Z), (0.1, [-80, 20, 0]), (0.55, [-80, 20, 0]), (0.7, Z)], body=[(0, Z), (0.1, [4, -5, 0]), (0.6, [4, -5, 0]), (0.7, Z)])
# invocar: mão varre de baixo para cima, como quem ergue algo do chão
A["conjurar_invocar"] = anim(0.8, right=[
    (0, Z, Z), (0.2, [20, 0, 25], [25, -10, 25]), (0.5, [-140, 0, 20], [-70, 0, 20]), (0.8, Z, Z)],
    fp_pos=[(0, Z), (0.2, [1, -4, -2]), (0.5, [0, 5, -2]), (0.8, Z)],
    left=[(0, Z), (0.2, [20, 0, -25]), (0.5, [-140, 0, -20]), (0.8, Z)], body=[(0, Z), (0.2, [14, 0, 0]), (0.5, [-8, 0, 0]), (0.8, Z)])
A["rugido"] = anim(0.9, right=[
    (0, Z, Z), (0.2, [-40, 0, 60], [-20, -20, 35]), (0.6, [-45, 0, 65], [-22, -22, 38]), (0.9, Z, Z)],
    fp_pos=[(0, Z), (0.2, [3, -1, 0]), (0.6, [3.5, -1, 0]), (0.9, Z)],
    left=[(0, Z), (0.2, [-40, 0, -60]), (0.6, [-45, 0, -65]), (0.9, Z)], body=[(0, Z), (0.2, [-12, 0, 0]), (0.6, [-14, 0, 0]), (0.9, Z)],
    head=[(0, Z), (0.2, [-25, 0, 0]), (0.6, [-28, 0, 0]), (0.9, Z)])

# ------------------------------------------------------------------ combate genérico (mantidos para habilidades)
A["preparar_golpe"] = anim(1.0, loop="hold_on_last_frame", right=[
    (0, Z, Z), (0.3, [-150, 10, 15], [-55, 15, 20]), (1.0, [-160, 12, 18], [-60, 18, 22])],
    fp_pos=[(0, Z), (0.3, [1.5, 4, 1]), (1.0, [1.8, 4.5, 1.2])],
    left=[(0, Z), (0.3, [-40, 0, -15])], body=[(0, Z), (0.3, [-5, 15, 0])])
A["ataque_varredura"] = anim(0.45, right=[
    (0, [-90, 60, 0], [-30, 45, 10]), (0.15, [-80, -70, 0], [-38, -50, -15]), (0.45, Z, Z)],
    fp_pos=[(0, [3, 1, 0]), (0.15, [-4, 0, -3]), (0.45, Z)], body=[(0, [0, 25, 0]), (0.15, [0, -30, 0]), (0.45, Z)])
A["ataque_impacto"] = anim(0.6, right=[
    (0, [-170, 0, 10], [-75, 5, 10]), (0.18, [-30, 0, 0], [15, 0, 0]), (0.6, Z, Z)],
    fp_pos=[(0, [0, 6, 1]), (0.18, [0, -4, -4]), (0.6, Z)],
    left=[(0, [-170, 0, -10]), (0.18, [-30, 0, 0]), (0.6, Z)], body=[(0, [-10, 0, 0]), (0.18, [20, 0, 0]), (0.6, Z)])
A["ataque_estocada"] = anim(0.4, right=[
    (0, [-60, 0, 0], [-20, 0, 0]), (0.1, [-95, 0, 0], [-55, 0, 0]), (0.4, Z, Z)],
    fp_pos=[(0, [0, 0, 2]), (0.1, [0, 1, -8]), (0.4, Z)], body=[(0, [0, 10, 0]), (0.1, [8, -10, 0]), (0.4, Z)])
A["ataque_giro"] = anim(0.6, right=[
    (0, [-90, 0, 0], [-35, 50, 0]), (0.3, [-90, 0, 0], [-40, -55, -10]), (0.6, Z, Z)],
    fp_pos=[(0, [4, 0, 0]), (0.3, [-5, 0, -2]), (0.6, Z)],
    left=[(0, [-90, 0, 0]), (0.3, [-90, 0, 0]), (0.6, Z)], body=[(0, Z), (0.3, [0, 180, 0]), (0.6, [0, 360, 0])], smooth=False)
A["ataque_vertical"] = anim(0.55, right=[
    (0, [-175, 0, 5], [-80, 0, 5]), (0.2, [-10, 0, 0], [20, 0, 0]), (0.55, Z, Z)],
    fp_pos=[(0, [0, 7, 1]), (0.2, [0, -5, -3]), (0.55, Z)],
    left=[(0, [-175, 0, -5]), (0.2, [-10, 0, 0]), (0.55, Z)], body=[(0, [-12, 0, 0]), (0.2, [18, 0, 0]), (0.55, Z)])
A["guarda"] = anim(None, loop=True, right=[(0, [-70, -40, -10], [-30, -40, -20])], fp_pos=[(0, [-3, 1, -1])],
                   left=[(0, [-60, 30, 10])], body=[(0, [0, 10, 0])], smooth=False)
A["esquiva"] = anim(0.35, right=[
    (0, Z, Z), (0.12, [-30, 0, 50], [10, -20, 30]), (0.35, Z, Z)], fp_pos=[(0, Z), (0.12, [3, -5, 1]), (0.35, Z)],
    left=[(0, Z), (0.12, [-30, 0, -50]), (0.35, Z)], body=[(0, Z), (0.12, [15, 0, 20]), (0.35, Z)])
A["transformacao"] = anim(1.25, right=[
    (0, Z, Z), (0.4, [-30, 0, 100], [-15, -30, 45]), (0.9, [-170, 0, 20], [-75, 0, 20]), (1.25, Z, Z)],
    fp_pos=[(0, Z), (0.4, [4, -2, 0]), (0.9, [0, 6, -1]), (1.25, Z)],
    left=[(0, Z), (0.4, [-30, 0, -100]), (0.9, [-170, 0, -20]), (1.25, Z)], body=[(0, Z), (0.4, [20, 0, 0]), (0.9, [-15, 0, 0]), (1.25, Z)],
    head=[(0, Z), (0.4, [30, 0, 0]), (0.9, [-35, 0, 0]), (1.25, Z)])

# ------------------------------------------------------------------ golpes pesados por categoria de arma
# adaga: duas estocadas curtas e rápidas, cotovelo junto ao corpo
A["arma_adaga"] = anim(0.5, right=[
    (0, [-40, 0, 0], [-10, 0, 0]), (0.08, [-95, -10, 0], [-50, -8, 0]), (0.18, [-45, 0, 0], [-15, 0, 0]),
    (0.26, [-100, 15, 0], [-55, 10, 0]), (0.5, Z, Z)],
    fp_pos=[(0, [0, -1, 2]), (0.08, [0, 1, -6]), (0.18, [0, 0, 1]), (0.26, [1, 1, -7]), (0.5, Z)],
    body=[(0, [0, 15, 0]), (0.08, [5, -10, 0]), (0.18, [0, 10, 0]), (0.26, [6, -12, 0]), (0.5, Z)])
# espada curta: corte horizontal rápido com retorno
A["arma_espada_curta"] = anim(0.42, right=[
    (0, [-85, 50, 0], [-30, 40, 10]), (0.12, [-85, -55, 0], [-35, -45, -12]), (0.42, Z, Z)],
    fp_pos=[(0, [3, 0.5, 0]), (0.12, [-4, 0, -3]), (0.42, Z)], body=[(0, [0, 20, 0]), (0.12, [0, -25, 0]), (0.42, Z)])
# espada grande: as duas mãos erguem a lâmina às costas e descem com o peso do corpo
A["arma_espada_grande"] = anim(0.9, right=[
    (0, Z, Z), (0.3, [-185, -20, 25], [-85, 10, 25]), (0.45, [-20, -5, 0], [22, 0, -5]), (0.9, Z, Z)],
    fp_pos=[(0, Z), (0.3, [1, 8, 3]), (0.45, [-1, -6, -4]), (0.9, Z)],
    left=[(0, Z), (0.3, [-185, 20, -25]), (0.45, [-20, 5, 0]), (0.9, Z)],
    body=[(0, Z), (0.3, [-15, 10, 0]), (0.45, [25, -5, 0]), (0.9, Z)])
# katana: saque a partir do quadril esquerdo, corte diagonal ascendente, embainhar
A["arma_katana"] = anim(0.6, right=[
    (0, [10, 70, 40], [15, 50, 30]), (0.1, [-120, -40, -20], [-60, -40, -25]), (0.35, [-110, -45, -20], [-55, -45, -25]), (0.6, Z, Z)],
    fp_pos=[(0, [-4, -4, 0]), (0.1, [3, 5, -3]), (0.35, [3, 5, -3]), (0.6, Z)],
    left=[(0, [-20, 40, 0]), (0.1, [-10, 0, 0]), (0.6, Z)], body=[(0, [0, 30, 0]), (0.1, [0, -25, 0]), (0.6, Z)])
# lança: as duas mãos empurram a haste para frente, com o passo do corpo
A["arma_lanca"] = anim(0.55, right=[
    (0, [-50, 10, 0], [-15, 5, 0]), (0.12, [-90, 0, 0], [-48, 0, 0]), (0.3, [-88, 0, 0], [-46, 0, 0]), (0.55, Z, Z)],
    fp_pos=[(0, [0, 0, 4]), (0.12, [0, 1, -10]), (0.3, [0, 1, -9]), (0.55, Z)],
    left=[(0, [-40, 30, 0]), (0.12, [-85, 25, 0]), (0.55, Z)], body=[(0, [-5, 20, 0]), (0.12, [10, -5, 0]), (0.55, Z)])
# machado: golpe diagonal pesado de cima-direita para baixo-esquerda
A["arma_machado"] = anim(0.65, right=[
    (0, Z, Z), (0.22, [-170, 30, 40], [-75, 35, 30]), (0.38, [-30, -35, -20], [18, -35, -20]), (0.65, Z, Z)],
    fp_pos=[(0, Z), (0.22, [3, 7, 1]), (0.38, [-4, -5, -3]), (0.65, Z)],
    left=[(0, Z), (0.22, [-60, 0, -20]), (0.65, Z)], body=[(0, Z), (0.22, [-10, 25, 0]), (0.38, [18, -25, 0]), (0.65, Z)])
# martelo: ergue acima da cabeça com as duas mãos, pausa e esmaga o chão (peso)
A["arma_martelo"] = anim(1.0, right=[
    (0, Z, Z), (0.35, [-190, 0, 10], [-88, 0, 10]), (0.5, [-195, 0, 10], [-90, 0, 10]), (0.62, [5, 0, 0], [30, 0, 0]), (1.0, Z, Z)],
    fp_pos=[(0, Z), (0.35, [0, 9, 3]), (0.5, [0, 9.5, 3]), (0.62, [0, -8, -4]), (1.0, Z)],
    left=[(0, Z), (0.35, [-190, 0, -10]), (0.5, [-195, 0, -10]), (0.62, [5, 0, 0]), (1.0, Z)],
    body=[(0, Z), (0.35, [-18, 0, 0]), (0.5, [-20, 0, 0]), (0.62, [30, 0, 0]), (1.0, Z)])
# maça: arco lateral por cima do ombro, uma mão
A["arma_maca"] = anim(0.55, right=[
    (0, Z, Z), (0.18, [-150, 40, 60], [-60, 40, 40]), (0.32, [-45, -20, -10], [10, -25, -15]), (0.55, Z, Z)],
    fp_pos=[(0, Z), (0.18, [4, 6, 0]), (0.32, [-2, -4, -3]), (0.55, Z)], body=[(0, Z), (0.18, [-5, 20, 0]), (0.32, [12, -15, 0]), (0.55, Z)])
# alabarda: varredura larga baixa com as duas mãos
A["arma_alabarda"] = anim(0.7, right=[
    (0, [-60, 80, 0], [-20, 60, 10]), (0.3, [-55, -80, 0], [-22, -65, -15]), (0.7, Z, Z)],
    fp_pos=[(0, [5, -1, 1]), (0.3, [-6, -1, -3]), (0.7, Z)],
    left=[(0, [-50, 60, 0]), (0.3, [-50, -60, 0]), (0.7, Z)], body=[(0, [0, 40, 0]), (0.3, [0, -45, 0]), (0.7, Z)])
# foice: a lâmina vai à frente e é puxada de volta, ceifando
A["arma_foice"] = anim(0.65, right=[
    (0, Z, Z), (0.15, [-120, -40, -30], [-60, -40, -30]), (0.38, [-40, 50, 30], [-5, 50, 25]), (0.65, Z, Z)],
    fp_pos=[(0, Z), (0.15, [-3, 4, -6]), (0.38, [4, -2, 2]), (0.65, Z)],
    left=[(0, Z), (0.15, [-80, -20, 0]), (0.38, [-40, 20, 0]), (0.65, Z)], body=[(0, Z), (0.15, [5, -20, 0]), (0.38, [-5, 25, 0]), (0.65, Z)])


def main():
    data = {"format_version": "1.8.0", "animations": {f"animation.valdoria.player.{k}": v for k, v in A.items()}}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"{len(A)} animações do jogador geradas em {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
