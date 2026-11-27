#!/usr/bin/env python3
"""Gera o lado cliente do add-on: animacoes, controladores de animacao,
render controllers e o player.entity.json (vanilla + heroi Solaris).

Convencoes de rotacao do Bedrock (verificadas no visualizador):
  bracos/pernas: x negativo = para frente, x positivo = para tras
                 z positivo = para fora no lado direito, negativo no esquerdo
  waist (quadril): x positivo = inclina o tronco para frente
  head: x positivo = olha para baixo, y positivo = olha para a direita
  sm_pitch: x positivo = deita de barriga para baixo (voo)
  posicao: y para cima, z positivo = para tras, x positivo = esquerda
"""
import copy
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "superman_addon", "resource_pack")
VANILLA = os.path.join(ROOT, "tools", "vanilla")

ANIMS = {}
NS = "animation.superman."

# Valores sincronizados pelo servidor (propriedade superman:fly)
FLY = dict(NONE=0, CHARGE=1, LAUNCH=2, HOVER=3, FLY=4, FAST=5, DIVE=6, LANDPREP=7,
           LANDSOFT=8, LANDHERO=9, AIRSTART=10, SPEED=11)
# (propriedade superman:power)
POW = dict(NONE=0, TRANSFORM=1, DETRANSFORM=2, HEAT=3, FREEZE=4, CHARGE=5, PUNCH=6,
           CLAP=7, SLAM=8, COMBO1=9, COMBO2=10, COMBO3=11, COMBO4=12, COMBO5=13, COMBO6=14,
           AIR1=15, AIR2=16, AIR3=17, NOVA_CHARGE=18, NOVA=19)

ARMS = {"rightArm", "leftArm", "rightForearm", "leftForearm"}
LEGS = {"rightLeg", "leftLeg", "rightShin", "leftShin"}


# ---------------------------------------------------------------------------
# Mini-linguagem de poses
# ---------------------------------------------------------------------------
def R(x=0, y=0, z=0):
    return {"r": [x, y, z]}


def T(x=0, y=0, z=0):
    return {"p": [x, y, z]}


def RT(r, p):
    return {"r": list(r), "p": list(p)}


def SC(x, y=None, z=None):
    """Escala (deformacao): SC(1.05, 0.9) = achata; SC(0.95, 1.1) = estica."""
    return {"s": [x, y if y is not None else x, z if z is not None else x]}


def pose(**bones):
    return bones


def blend_pose(a, b, t):
    """Mistura duas poses numericas (para poses intermediarias)."""
    out = {}
    for k in set(a) | set(b):
        pa, pb = a.get(k, {}), b.get(k, {})
        d = {}
        for ch in ("r", "p"):
            va, vb = pa.get(ch, [0, 0, 0]), pb.get(ch, [0, 0, 0])
            if va != [0, 0, 0] or vb != [0, 0, 0]:
                d[ch] = [va[i] + (vb[i] - va[i]) * t for i in range(3)]
        out[k] = d
    return out


def num(v):
    if isinstance(v, str):
        return v
    v = round(float(v), 3)
    return int(v) if v == int(v) else v


def timeline(name, length, frames, loop=False, mode="catmullrom", extra=None):
    """Cria uma animacao a partir de [(tempo, pose)]. Ossos ausentes num quadro
    voltam a 0 naquele quadro (poses sao descricoes completas)."""
    bones = []
    for _, p in frames:
        for b in p:
            if b not in bones:
                bones.append(b)
    out = {}
    for b in bones:
        for ch, key, dflt in (("r", "rotation", 0), ("p", "position", 0), ("s", "scale", 1)):
            vals = [(t, p.get(b, {}).get(ch, [dflt, dflt, dflt])) for t, p in frames]
            if all(all((not isinstance(x, str)) and abs(x - dflt) < 1e-6 for x in v) for _, v in vals):
                continue
            d = {}
            for t, v in vals:
                key_t = f"{round(t, 4):g}"
                vv = [num(x) for x in v]
                d[key_t] = {"post": vv, "lerp_mode": mode} if mode != "linear" else vv
            out.setdefault(b, {})[key] = d
    if extra:
        for b, chans in extra.items():
            out.setdefault(b, {}).update(chans)
    a = {"animation_length": length, "bones": out}
    if loop is True:
        a["loop"] = True
    elif loop == "hold":
        a["loop"] = "hold_on_last_frame"
    ANIMS[NS + name] = a
    return a


def proc(name, bones, length=None, loop=True):
    """Animacao procedural (expressoes Molang)."""
    out = {}
    for b, chans in bones.items():
        o = {}
        for ch, v in chans.items():
            o[{"r": "rotation", "p": "position", "s": "scale"}[ch]] = [num(x) for x in v] if isinstance(v, list) else v
        out[b] = o
    a = {"bones": out}
    if loop:
        a["loop"] = True
    if length:
        a["animation_length"] = length
    ANIMS[NS + name] = a
    return a


def split(name, groups):
    """Divide uma animacao em partes por grupo de ossos (para pesos independentes).
    groups: {sufixo: set_de_ossos | None (=resto)}"""
    full = ANIMS.pop(NS + name)
    used = set()
    for suf, bset in groups.items():
        if bset is None:
            continue
        used |= bset
    for suf, bset in groups.items():
        part = copy.deepcopy(full)
        part["bones"] = {b: v for b, v in full["bones"].items()
                         if (b in bset if bset is not None else b not in used)}
        ANIMS[NS + name + "." + suf] = part


# ---------------------------------------------------------------------------
# POSES BASE (modelo articulado: cotovelos e joelhos)
#   antebraco x negativo = dobra o cotovelo; y gira o antebraco dobrado para dentro/fora
#   canela x positivo = dobra o joelho (canela para tras)
# ---------------------------------------------------------------------------
NEUTRAL = {}


def squat(drop, spread=4, lean=0):
    """Agachamento com os pes embaixo do quadril: abaixa `drop` unidades dobrando joelhos."""
    c = max(-1.0, min(1.0, (12 - drop) / 12))
    th = math.degrees(math.acos(c))
    return dict(sm_yaw=T(0, -drop, 0), waist=R(lean),
                rightLeg=R(-th, 0, spread), rightShin=R(2 * th), leftLeg=R(-th, 0, -spread), leftShin=R(2 * th))


def merge(*poses):
    out = {}
    for p in poses:
        for k, v in p.items():
            if k in out:
                d = dict(out[k])
                for ch, vals in v.items():
                    if ch in d:
                        d[ch] = [a + b if not isinstance(a, str) and not isinstance(b, str) else b for a, b in zip(d[ch], vals)]
                    else:
                        d[ch] = vals
                out[k] = d
            else:
                out[k] = v
    return out


HERO = pose(waist=R(-4), head=R(-7), body=SC(1.0),
            rightArm=R(8, 0, 42), rightForearm=R(0, 0, -105), leftArm=R(8, 0, -42), leftForearm=R(0, 0, 105),
            rightLeg=R(0, 0, 6), leftLeg=R(0, 0, -6))
GUARD = pose(sm_yaw=T(0, -1, 0), waist=R(8), body=R(0, 18, 0), head=R(-2, -14, 0),
             rightArm=R(-40, -20, 0), rightForearm=R(-115), leftArm=R(-60, 15, 0), leftForearm=R(-95),
             rightLeg=R(14, 0, 5), rightShin=R(22), leftLeg=R(-24, 0, -5), leftShin=R(26))
HGUARD = pose(rightArm=R(-40, -20, 0), rightForearm=R(-115), leftArm=R(-60, 15, 0), leftForearm=R(-95),
              rightLeg=R(4, 0, 3), rightShin=R(12), leftLeg=R(-20, 0, -3), leftShin=R(40))
HOVER = pose(waist=R(3), rightArm=R(-5, 0, 12), rightForearm=R(-15), leftArm=R(0, 0, -10), leftForearm=R(-12),
             rightLeg=R(2, 0, 3), rightShin=R(6), leftLeg=R(-24, 0, -3), leftShin=R(44))
FLYP = pose(rightArm=R(-172, 0, 6), leftArm=R(18, 0, -8), leftForearm=R(-25),
            rightLeg=R(4, 0, 1.5), rightShin=R(4), leftLeg=R(8, 0, -1.5), leftShin=R(22))
FASTP = pose(rightArm=R(-177, 0, 4), leftArm=R(-174, 0, -4),
             rightLeg=R(3, 0, 0.8), rightShin=R(2), leftLeg=R(4, 0, -0.8), leftShin=R(6))
LANDPREP = pose(waist=R(4), rightArm=R(-10, 0, 26), rightForearm=R(-15), leftArm=R(-10, 0, -26), leftForearm=R(-15),
                rightLeg=R(-12, 0, 4), rightShin=R(18), leftLeg=R(-8, 0, -4), leftShin=R(14))
CHARGE = merge(squat(4.5, 8, 30), pose(head=R(-35), rightArm=R(45, 0, 14), rightForearm=R(-20),
                                       leftArm=R(40, 0, -14), leftForearm=R(-20)))
KNEEL = pose(sm_yaw=T(0, -6.2, 0), waist=R(55), head=R(22),
             rightLeg=R(5, 0, 5), rightShin=R(85), leftLeg=R(-88, 0, -6), leftShin=R(88),
             rightArm=R(-75, 0, 8), rightForearm=R(-5), leftArm=R(50, 0, -35), leftForearm=R(-20))
CROSSED = pose(rightArm=R(-30, -10, -8), rightForearm=R(-90, -70, 0), leftArm=R(-26, 10, 8), leftForearm=R(-90, 70, 0))
CURLED = pose(waist=R(22), head=R(26), rightArm=R(-36, -12, -8), rightForearm=R(-95, -72, 0),
              leftArm=R(-32, 12, 8), leftForearm=R(-95, 72, 0),
              rightLeg=R(-70, 0, 6), rightShin=R(110), leftLeg=R(-64, 0, -6), leftShin=R(104))


def build_animations():
    # ------------------------------------------------------------------ camadas
    # Capa em 6 segmentos: onda que viaja do ombro para a ponta. v.sm_cl = levantamento
    # (com mola), v.sm_cf = amplitude, v.sm_cph = fase acumulada (sem saltos de frequencia).
    segs = {"cape2": (9.0, 55, 0.55, 0.18), "cape3": (8.0, 105, 0.66, 0.22), "cape4": (7.0, 155, 0.76, 0.26),
            "cape5": (6.0, 205, 0.86, 0.3), "cape6": (5.0, 255, 0.95, 0.34)}
    cape = {
        "sm_cape": {"r": ["math.sin(v.sm_cph * 0.5 + 20.0) * v.sm_cf * 0.10", 0, "math.sin(v.sm_cph * 0.5) * v.sm_cf * 0.10"]},
        "cape1": {"r": ["math.max(3.0, 4.0 + v.sm_cl * 56.0 + math.sin(v.sm_cph) * v.sm_cf * 0.28)", 0, 0]},
    }
    for i, (b, (lift, ph, amp, tw)) in enumerate(segs.items()):
        cape[b] = {"r": [f"v.sm_cl * {lift} + math.sin(v.sm_cph - {ph}.0) * v.sm_cf * {amp}",
                         f"math.sin(v.sm_cph * 0.7 - {60 * (i + 1)}.0) * v.sm_cf * {tw}", 0]}
    proc("cape", cape)
    proc("breath", {
        "waist": {"r": ["math.sin(q.life_time * 100.0) * 0.7", 0, 0]},
        "head": {"r": ["-math.sin(q.life_time * 100.0 - 30.0) * 0.6", 0, 0]},
        "rightArm": {"r": [0, 0, "math.sin(q.life_time * 100.0 + 30.0) * 1.1 + 0.8"]},
        "leftArm": {"r": [0, 0, "-math.sin(q.life_time * 100.0 + 30.0) * 1.1 - 0.8"]},
        "emblem": {"s": "1.0 + math.max(0.0, math.sin(q.life_time * 100.0)) * 0.03 + v.sm_glow * 0.06"},
    })
    # porte imponente: o heroi transformado e maior que um jogador comum
    proc("stature", {"root": {"s": [1.08, 1.1, 1.08]}})
    proc("orient", {
        "sm_yaw": {"r": [0, "q.target_y_rotation * v.sm_yw", 0]},
        "sm_pitch": {"r": ["v.sm_p", 0, 0]},
        "sm_roll": {"r": [0, "v.sm_bank", "v.sm_lean"]},
    })
    proc("look", {
        "head": {"r": ["math.clamp(q.target_x_rotation - v.sm_p, -85.0, 60.0)",
                       "q.target_y_rotation * (1.0 - v.sm_yw)", 0]},
    })
    # pernas e bracos ao andar com o vanilla desligado (durante poderes no chao)
    proc("walk_legs", {
        "rightLeg": {"r": ["variable.tcos0 * 1.4", 0, 0]},
        "leftLeg": {"r": ["variable.tcos0 * -1.4", 0, 0]},
        "rightShin": {"r": ["math.max(0.0, variable.tcos0) * 1.1 + 4.0", 0, 0]},
        "leftShin": {"r": ["math.max(0.0, -variable.tcos0) * 1.1 + 4.0", 0, 0]},
    })
    # estilo de caminhada sobre o vanilla: tronco gira, joelhos e cotovelos dobram
    proc("walk_style", {
        "body": {"r": [0, "-variable.tcos0 * 0.12", 0]},
        "head": {"r": [0, "variable.tcos0 * 0.10", 0]},
        "waist": {"r": ["math.clamp(q.modified_move_speed * 5.0, 0.0, 5.0)", 0, 0]},
        "rightShin": {"r": ["math.max(0.0, variable.tcos0) * 1.0 + 3.0", 0, 0]},
        "leftShin": {"r": ["math.max(0.0, -variable.tcos0) * 1.0 + 3.0", 0, 0]},
        "rightForearm": {"r": ["-12.0 - math.max(0.0, variable.tcos0) * 0.6", 0, 0]},
        "leftForearm": {"r": ["-12.0 - math.max(0.0, -variable.tcos0) * 0.6", 0, 0]},
    })
    proc("tremble", {
        "waist": {"r": [0, 0, "math.sin(q.life_time * 2900.0) * 0.7"]},
        "head": {"r": [0, 0, "math.sin(q.life_time * 3300.0 + 40.0) * 0.8"]},
        "rightArm": {"r": ["math.sin(q.life_time * 3100.0) * 1.3", 0, 0]},
        "leftArm": {"r": ["math.sin(q.life_time * 2700.0 + 70.0) * 1.3", 0, 0]},
        "sm_yaw": {"p": ["math.sin(q.life_time * 3500.0) * 0.12", 0, 0]},
    })
    proc("hover.vert", {
        "rightLeg": {"r": ["v.sm_vs > 0.0 ? math.min(v.sm_vs * 1.2, 8.0) : math.max(v.sm_vs * 3.0, -26.0)", 0, 0]},
        "leftLeg": {"r": ["v.sm_vs > 0.0 ? math.min(v.sm_vs * 1.4, 10.0) : math.max(v.sm_vs * 2.4, -20.0)", 0, 0]},
        "rightShin": {"r": ["v.sm_vs > 0.0 ? 0.0 : math.min(-v.sm_vs * 4.0, 40.0)", 0, 0]},
        "leftShin": {"r": ["v.sm_vs > 0.0 ? -math.min(v.sm_vs * 2.0, 14.0) : math.min(-v.sm_vs * 2.0, 20.0)", 0, 0]},
        "rightArm": {"r": [0, 0, "v.sm_vs > 0.0 ? -math.min(v.sm_vs * 1.0, 8.0) : math.min(-v.sm_vs * 3.0, 26.0)"]},
        "leftArm": {"r": [0, 0, "v.sm_vs > 0.0 ? math.min(v.sm_vs * 1.0, 8.0) : -math.min(-v.sm_vs * 3.0, 26.0)"]},
    })

    # ------------------------------------------------------------------ chao
    timeline("hero_idle", 3.2, [
        (0.0, HERO),
        (1.6, merge(HERO, pose(waist=R(-2), head=R(-2), rightArm=R(0, 0, 2), leftArm=R(0, 0, -2)))),
        (3.2, HERO),
    ], loop=True)
    timeline("idle_look", 3.0, [
        (0.0, NEUTRAL),
        (0.5, pose(head=R(-4, -36, 0), waist=R(0, -6, 0))),
        (1.3, pose(head=R(-2, -38, 0), waist=R(0, -7, 0))),
        (1.8, pose(head=R(-6, 32, 0), waist=R(0, 5, 0))),
        (2.5, pose(head=R(-5, 34, 0), waist=R(0, 6, 0))),
        (3.0, NEUTRAL),
    ], loop="hold")
    timeline("idle_stretch", 2.6, [
        (0.0, NEUTRAL),
        (0.6, pose(rightArm=R(-12, 0, 8), leftArm=R(-12, 0, -8), head=R(-6, 0, 14), waist=R(-5), body=SC(1.03))),
        (1.2, pose(rightArm=R(-8, 0, 6), leftArm=R(-8, 0, -6), head=R(-6, 0, -14), waist=R(-6), body=SC(1.04))),
        (1.8, pose(head=R(-8), waist=R(-7), body=SC(1.03))),
        (2.6, NEUTRAL),
    ], loop="hold")
    timeline("air_jump", 1.0, [
        (0.0, pose(rightLeg=R(-26, 0, 2), rightShin=R(48), leftLeg=R(6, 0, -2), leftShin=R(30),
                   rightArm=R(-8, 0, 18), rightForearm=R(-20), leftArm=R(-8, 0, -18), leftForearm=R(-20), waist=R(4))),
    ], loop=True)
    run = "v.sm_run"
    proc("superspeed", {
        "sm_yaw": {"p": [0, f"math.abs(math.sin({run})) * 1.4 - 1.2", 0]},
        "waist": {"r": [26, 0, 0]},
        "body": {"r": [0, f"math.sin({run}) * 12.0", 0]},
        "head": {"r": [-22, f"-math.sin({run}) * 8.0", 0]},
        "rightArm": {"r": [f"math.sin({run}) * 70.0 - 12.0", 0, 8]},
        "rightForearm": {"r": [f"-85.0 - math.max(0.0, -math.sin({run})) * 20.0", 0, 0]},
        "leftArm": {"r": [f"-math.sin({run}) * 70.0 - 12.0", 0, -8]},
        "leftForearm": {"r": [f"-85.0 - math.max(0.0, math.sin({run})) * 20.0", 0, 0]},
        "rightLeg": {"r": [f"-math.sin({run}) * 68.0 - 8.0", 0, 2]},
        "rightShin": {"r": [f"math.max(0.0, math.sin({run} + 60.0)) * 105.0 + 8.0", 0, 0]},
        "leftLeg": {"r": [f"math.sin({run}) * 68.0 - 8.0", 0, -2]},
        "leftShin": {"r": [f"math.max(0.0, -math.sin({run} + 60.0)) * 105.0 + 8.0", 0, 0]},
    })
    split("superspeed", {"arms": ARMS, "core": None})

    # ------------------------------------------------------------------ voo
    timeline("charge", 1.0, [
        (0.0, CHARGE),
        (0.5, merge(CHARGE, pose(sm_yaw=T(0, -0.4, 0), waist=R(2)))),
        (1.0, CHARGE),
    ], loop=True)
    split("charge", {"arms": ARMS, "core": None})

    timeline("launch", 0.6, [
        (0.0, CHARGE),
        (0.07, pose(sm_yaw=T(0, 1.6, 0), waist=R(-6), head=R(-32), rightArm=R(-178, 0, 6), leftArm=R(16, 0, -10),
                    leftForearm=R(-10), rightLeg=R(6, 0, 1), rightShin=R(8), leftLeg=R(12, 0, -1), leftShin=R(14),
                    root=SC(0.93, 1.12))),
        (0.3, pose(sm_yaw=T(0, 0.5, 0), waist=R(-3), head=R(-25), rightArm=R(-176, 0, 5), leftArm=R(12, 0, -8),
                   leftForearm=R(-15), rightLeg=R(4, 0, 1), rightShin=R(6), leftLeg=R(-10, 0, -1), leftShin=R(30))),
        (0.6, merge(HOVER, pose(head=R(-10), rightArm=R(-130, 0, -2)))),
    ], loop="hold")
    split("launch", {"arms": ARMS, "core": None})

    timeline("airstart", 0.5, [
        (0.0, pose(waist=R(12), rightLeg=R(-55, 0, 3), rightShin=R(95), leftLeg=R(-45, 0, -3), leftShin=R(90),
                   rightArm=R(-22, 0, 46), rightForearm=R(-30), leftArm=R(-22, 0, -46), leftForearm=R(-30))),
        (0.22, pose(waist=R(-2), rightLeg=R(-6, 0, 3), rightShin=R(10), leftLeg=R(-16, 0, -3), leftShin=R(30),
                    rightArm=R(-10, 0, 22), rightForearm=R(-15), leftArm=R(-8, 0, -20), leftForearm=R(-15))),
        (0.5, HOVER),
    ], loop="hold")
    split("airstart", {"arms": ARMS, "core": None})

    hov = "q.anim_time * 90.0"
    proc("hover", {
        "sm_yaw": {"p": [0, f"math.sin({hov}) * 0.9", 0]},
        "waist": {"r": [f"3.0 + math.sin({hov} - 40.0) * 1.2", 0, f"math.sin({hov} * 0.5) * 0.8"]},
        "rightLeg": {"r": [f"2.0 + math.sin({hov} + 30.0) * 3.0", 0, 3]},
        "rightShin": {"r": [f"6.0 + math.sin({hov} + 50.0) * 3.0", 0, 0]},
        "leftLeg": {"r": [f"-24.0 + math.sin({hov} + 80.0) * 4.0", 0, -3]},
        "leftShin": {"r": [f"44.0 + math.sin({hov} + 110.0) * 5.0", 0, 0]},
        "rightArm": {"r": [f"-5.0 + math.sin({hov} + 120.0) * 3.0", 0, f"12.0 + math.sin({hov}) * 2.5"]},
        "rightForearm": {"r": [f"-15.0 + math.sin({hov} + 150.0) * 4.0", 0, 0]},
        "leftArm": {"r": [f"math.sin({hov} + 160.0) * 3.0", 0, f"-10.0 - math.sin({hov}) * 2.5"]},
        "leftForearm": {"r": [f"-12.0 + math.sin({hov} + 190.0) * 4.0", 0, 0]},
    }, length=4.0)
    split("hover", {"arms": ARMS, "core": None})
    # bracos cruzados de verdade (antebracos sobre o peito)
    proc("hover.crossed", {
        "rightArm": {"r": [f"-30.0 + math.sin({hov}) * 1.5", -10, -8]},
        "rightForearm": {"r": [-90, -70, 0]},
        "leftArm": {"r": [f"-26.0 + math.sin({hov} + 40.0) * 1.5", 10, 8]},
        "leftForearm": {"r": [-90, 70, 0]},
        "body": {"r": [-2, 0, 0]},
    }, length=4.0)

    fl = "q.anim_time * 180.0"
    proc("fly", {
        "rightArm": {"r": [f"-172.0 + math.sin({fl}) * 2.0", 0, 6]},
        "leftArm": {"r": [f"18.0 + math.sin({fl} + 90.0) * 4.0", 0, -8]},
        "leftForearm": {"r": [f"-25.0 + math.sin({fl} + 120.0) * 5.0", 0, 0]},
        "rightLeg": {"r": [f"4.0 + math.sin({fl} + 40.0) * 3.0", 0, 1.5]},
        "rightShin": {"r": [f"4.0 + math.sin({fl} + 70.0) * 3.0", 0, 0]},
        "leftLeg": {"r": [f"8.0 + math.sin({fl} + 100.0) * 3.0", 0, -1.5]},
        "leftShin": {"r": [f"22.0 + math.sin({fl} + 130.0) * 6.0", 0, 0]},
        "waist": {"r": [f"math.sin({fl}) * 1.5", 0, 0]},
    }, length=2.0)
    split("fly", {"arms": ARMS, "core": None})

    fs = "q.anim_time * 720.0"
    proc("fast", {
        "rightArm": {"r": [f"-177.0 + math.sin({fs} * 2.0) * 0.8", 0, 4]},
        "leftArm": {"r": [f"-174.0 + math.sin({fs} * 2.0 + 90.0) * 0.8", 0, -4]},
        "rightLeg": {"r": [f"3.0 + math.sin({fs}) * 1.2", 0, 0.8]},
        "rightShin": {"r": [f"2.0 + math.abs(math.sin({fs})) * 2.0", 0, 0]},
        "leftLeg": {"r": [f"4.0 + math.sin({fs} + 120.0) * 1.2", 0, -0.8]},
        "leftShin": {"r": [f"6.0 + math.abs(math.sin({fs} + 90.0)) * 3.0", 0, 0]},
        "waist": {"r": [0, 0, f"math.sin({fs} * 4.0) * 0.7"]},
    }, length=0.5)
    split("fast", {"arms": ARMS, "core": None})

    proc("dive", {
        "rightArm": {"r": [f"-179.0 + math.sin({fs} * 2.0) * 0.8", 0, -3]},
        "leftArm": {"r": [f"-179.0 + math.sin({fs} * 2.0 + 90.0) * 0.8", 0, 3]},
        "rightLeg": {"r": [f"2.0 + math.sin({fs}) * 1.5", 0, 2]},
        "rightShin": {"r": [4, 0, 0]},
        "leftLeg": {"r": [f"2.0 + math.sin({fs} + 120.0) * 1.5", 0, -2]},
        "leftShin": {"r": [10, 0, 0]},
        "waist": {"r": [0, 0, f"math.sin({fs} * 4.0) * 1.0"]},
    }, length=0.5)
    split("dive", {"arms": ARMS, "core": None})

    timeline("boost", 0.45, [
        (0.0, FLYP),
        (0.12, pose(waist=R(10), sm_pitch=R(6), rightLeg=R(-30, 0, 2), rightShin=R(60), leftLeg=R(-18, 0, -2), leftShin=R(50),
                    rightArm=R(-165, 0, 6), leftArm=R(40, 0, -10), leftForearm=R(-60), root=SC(1.04, 0.95))),
        (0.28, pose(waist=R(-3), rightLeg=R(4, 0, 1), leftLeg=R(5, 0, -1), leftShin=R(4),
                    rightArm=R(-178, 0, 3), leftArm=R(-176, 0, -3), root=SC(0.97, 1.05))),
        (0.45, FASTP),
    ], loop="hold")
    split("boost", {"arms": ARMS, "core": None})

    timeline("brake", 0.7, [
        (0.0, FLYP),
        (0.18, pose(sm_pitch=R(-26), waist=R(-12), rightLeg=R(-55, 0, 4), rightShin=R(70), leftLeg=R(-42, 0, -4), leftShin=R(60),
                    rightArm=R(-32, 0, 70), rightForearm=R(-20), leftArm=R(-32, 0, -70), leftForearm=R(-20))),
        (0.4, pose(sm_pitch=R(-8), waist=R(-2), rightLeg=R(-18, 0, 3), rightShin=R(30), leftLeg=R(-20, 0, -3), leftShin=R(40),
                   rightArm=R(-14, 0, 34), rightForearm=R(-15), leftArm=R(-14, 0, -32), leftForearm=R(-15))),
        (0.7, HOVER),
    ], loop="hold")
    split("brake", {"arms": ARMS, "core": None})

    lp = "q.anim_time * 180.0"
    proc("landprep", {
        "waist": {"r": [4, 0, 0]},
        "rightLeg": {"r": [f"-12.0 + math.sin({lp}) * 2.0", 0, 4]},
        "rightShin": {"r": [f"18.0 + math.sin({lp} + 40.0) * 3.0", 0, 0]},
        "leftLeg": {"r": [f"-8.0 + math.sin({lp} + 90.0) * 2.0", 0, -4]},
        "leftShin": {"r": [f"14.0 + math.sin({lp} + 130.0) * 3.0", 0, 0]},
        "rightArm": {"r": [-10, 0, f"26.0 + math.sin({lp}) * 3.0"]},
        "rightForearm": {"r": [-15, 0, 0]},
        "leftArm": {"r": [-10, 0, f"-26.0 - math.sin({lp}) * 3.0"]},
        "leftForearm": {"r": [-15, 0, 0]},
    }, length=2.0)
    split("landprep", {"arms": ARMS, "core": None})

    timeline("land_soft", 0.9, [
        (0.0, LANDPREP),
        (0.08, merge(squat(3, 5, 20), pose(head=R(8), rightArm=R(-30, 0, 35), rightForearm=R(-25),
                                           leftArm=R(-30, 0, -35), leftForearm=R(-25), root=SC(1.04, 0.94)))),
        (0.3, merge(squat(1.2, 4, 8), pose(head=R(2), rightArm=R(-10, 0, 18), rightForearm=R(-15),
                                           leftArm=R(-10, 0, -18), leftForearm=R(-15)))),
        (0.6, pose(waist=R(1), rightArm=R(0, 0, 8), rightForearm=R(-10), leftArm=R(0, 0, -8), leftForearm=R(-10),
                   rightShin=R(4), leftShin=R(4))),
        (0.9, NEUTRAL),
    ], loop="hold")
    split("land_soft", {"arms": ARMS, "core": None})

    timeline("land_hero", 1.8, [
        (0.0, pose(sm_yaw=T(0, -1, 0), waist=R(10), rightLeg=R(-10, 0, 3), rightShin=R(20), leftLeg=R(-20, 0, -3), leftShin=R(30),
                   rightArm=R(-120, 0, 10), leftArm=R(-60, 0, -30), leftForearm=R(-30))),
        (0.07, merge(KNEEL, pose(root=SC(1.08, 0.88)))),
        (0.16, merge(KNEEL, pose(sm_yaw=T(0, 0.4, 0), waist=R(-3), head=R(-3)))),
        (0.75, merge(KNEEL, pose(sm_yaw=T(0, 0.3, 0), waist=R(-2), head=R(-1)))),
        (1.0, merge(KNEEL, pose(sm_yaw=T(0, 0.3, 0), waist=R(-6), head=R(-34)))),
        (1.45, merge(squat(2.2, 5, 12), pose(head=R(-8), rightArm=R(-8, 0, 16), rightForearm=R(-20),
                                             leftArm=R(6, 0, -18), leftForearm=R(-20)))),
        (1.8, HERO),
    ], loop="hold")
    split("land_hero", {"arms": ARMS, "core": None})

    # ------------------------------------------------------------------ poderes
    timeline("transform", 2.0, [
        (0.0, NEUTRAL),
        (0.25, merge(squat(2.0, 4, 18), CROSSED, pose(head=R(25)))),
        (0.85, merge(squat(2.8, 4, 24), CROSSED, pose(head=R(32), rightForearm=R(-6, -4, 0), leftForearm=R(-6, 4, 0)))),
        (1.0, pose(sm_yaw=T(0, 1.5, 0), waist=R(-18), head=R(-30), rightArm=R(-25, 0, 80), leftArm=R(-25, 0, -80),
                   rightForearm=R(-5), leftForearm=R(-5), rightLeg=R(0, 0, 8), leftLeg=R(0, 0, -8), root=SC(1.06))),
        (1.4, pose(sm_yaw=T(0, 1.0, 0), waist=R(-14), head=R(-24), rightArm=R(-20, 0, 72), leftArm=R(-20, 0, -72),
                   rightForearm=R(-15), leftForearm=R(-15), rightLeg=R(0, 0, 7), leftLeg=R(0, 0, -7))),
        (2.0, HERO),
    ], loop="hold")
    split("transform", {"legs": LEGS, "upper": None})

    timeline("detransform", 1.2, [
        (0.0, HERO),
        (0.3, merge(squat(0.8, 3, 12), pose(head=R(20), rightArm=R(-35, 0, -10), rightForearm=R(-40),
                                            leftArm=R(-35, 0, 10), leftForearm=R(-40)))),
        (0.62, pose(waist=R(8), head=R(12), rightArm=R(-15, 0, -6), rightForearm=R(-20), leftArm=R(-15, 0, 6), leftForearm=R(-20))),
        (1.2, NEUTRAL),
    ], loop="hold")
    split("detransform", {"legs": LEGS, "upper": None})

    HEAT = merge(squat(1.0, 6, -3), pose(rightArm=R(-4, 0, 16), rightForearm=R(-35), leftArm=R(-4, 0, -16), leftForearm=R(-35)))
    timeline("heat_in", 0.35, [
        (0.0, NEUTRAL),
        (0.15, pose(head=R(6), waist=R(2), rightArm=R(10, 0, 16), rightForearm=R(-50), leftArm=R(10, 0, -16), leftForearm=R(-50))),
        (0.35, HEAT),
    ], loop="hold")
    split("heat_in", {"legs": LEGS, "upper": None})
    proc("heat", {
        "sm_yaw": {"p": [0, -1, 0]},
        "waist": {"r": [-3, 0, 0]},
        "head": {"r": ["math.sin(q.life_time * 3300.0) * 0.6", 0, "math.sin(q.life_time * 2900.0) * 0.9"]},
        "rightArm": {"r": ["-6.0 + math.sin(q.life_time * 3100.0) * 1.0", 0, 16]},
        "rightForearm": {"r": ["-38.0 + math.sin(q.life_time * 2500.0) * 3.0", 0, 0]},
        "leftArm": {"r": ["-6.0 + math.sin(q.life_time * 2700.0) * 1.0", 0, -16]},
        "leftForearm": {"r": ["-38.0 + math.sin(q.life_time * 2300.0) * 3.0", 0, 0]},
        "rightLeg": {"r": [-24, 0, 6]}, "rightShin": {"r": [48, 0, 0]},
        "leftLeg": {"r": [-24, 0, -6]}, "leftShin": {"r": [48, 0, 0]},
    })
    split("heat", {"legs": LEGS, "upper": None})
    timeline("heat_out", 0.45, [
        (0.0, HEAT),
        (0.15, pose(head=R(4, 9, 0), rightArm=R(-2, 0, 8), rightForearm=R(-20), leftArm=R(-2, 0, -8), leftForearm=R(-20))),
        (0.3, pose(head=R(2, -7, 0), rightArm=R(0, 0, 4), rightForearm=R(-10), leftArm=R(0, 0, -4), leftForearm=R(-10))),
        (0.45, NEUTRAL),
    ], loop="hold")
    split("heat_out", {"legs": LEGS, "upper": None})

    FREEZE = merge(squat(1.5, 7, 14), pose(rightArm=R(35, 0, 25), rightForearm=R(-30), leftArm=R(35, 0, -25), leftForearm=R(-30)))
    timeline("freeze_in", 0.6, [
        (0.0, NEUTRAL),
        (0.45, pose(sm_yaw=T(0, 0.5, 0), waist=R(-18), head=R(-25), rightArm=R(30, 0, 18), rightForearm=R(-45),
                    leftArm=R(30, 0, -18), leftForearm=R(-45), body=SC(1.04, 1.02, 1.08),
                    rightLeg=R(-4, 0, 2), leftLeg=R(4, 0, -2))),
        (0.6, pose(sm_yaw=T(0, 0.4, 0), waist=R(-16), head=R(-22), rightArm=R(32, 0, 20), rightForearm=R(-45),
                   leftArm=R(32, 0, -20), leftForearm=R(-45), body=SC(1.05, 1.02, 1.1),
                   rightLeg=R(-5, 0, 2), leftLeg=R(5, 0, -2))),
    ], loop="hold")
    split("freeze_in", {"legs": LEGS, "upper": None})
    proc("freeze", {
        "sm_yaw": {"p": [0, -1.5, 0]},
        "waist": {"r": ["14.0 + math.sin(q.life_time * 400.0) * 1.0", 0, 0]},
        "head": {"r": ["4.0", 0, "math.sin(q.life_time * 2600.0) * 0.6"]},
        "rightArm": {"r": ["35.0 + math.sin(q.life_time * 3000.0) * 1.0", 0, 25]},
        "rightForearm": {"r": [-30, 0, 0]},
        "leftArm": {"r": ["35.0 + math.sin(q.life_time * 2800.0) * 1.0", 0, -25]},
        "leftForearm": {"r": [-30, 0, 0]},
        "rightLeg": {"r": [-20, 0, 7]}, "rightShin": {"r": [40, 0, 0]},
        "leftLeg": {"r": [-30, 0, -7]}, "leftShin": {"r": [52, 0, 0]},
    })
    split("freeze", {"legs": LEGS, "upper": None})
    timeline("freeze_out", 0.4, [
        (0.0, FREEZE),
        (0.2, pose(waist=R(4), rightArm=R(10, 0, 10), rightForearm=R(-15), leftArm=R(10, 0, -10), leftForearm=R(-15))),
        (0.4, NEUTRAL),
    ], loop="hold")
    split("freeze_out", {"legs": LEGS, "upper": None})

    PCH = pose(sm_yaw=T(0, -2, 0), waist=R(10, -15, 0), body=R(0, -35, 0), head=R(0, 25, 0),
               rightArm=R(30, 0, 22), rightForearm=R(-130), leftArm=R(-70, 15, -5), leftForearm=R(-30),
               rightLeg=R(22, 0, 3), rightShin=R(34), leftLeg=R(-34, 0, -3), leftShin=R(44))
    proc("punch_charge", {
        "sm_yaw": {"p": [0, -2, 0]},
        "waist": {"r": [10, -15, 0]},
        "body": {"r": [0, "-35.0 - v.sm_chg * 6.0", 0]},
        "head": {"r": [0, "25.0 + v.sm_chg * 5.0", 0]},
        "rightArm": {"r": ["30.0 + v.sm_chg * 12.0", 0, 22]},
        "rightForearm": {"r": ["-130.0 - v.sm_chg * 8.0", 0, 0]},
        "leftArm": {"r": [-70, 15, -5]},
        "leftForearm": {"r": [-30, 0, 0]},
        "rightLeg": {"r": [22, 0, 3]}, "rightShin": {"r": [34, 0, 0]},
        "leftLeg": {"r": [-34, 0, -3]}, "leftShin": {"r": [44, 0, 0]},
    })
    split("punch_charge", {"legs": LEGS, "upper": None})
    timeline("punch", 0.7, [
        (0.0, PCH),
        (0.06, merge(PCH, pose(body=R(0, -9, 0), rightArm=R(10, 0, 0), rightForearm=R(-10)))),
        (0.14, pose(sm_yaw=T(0, -2.5, -3), waist=R(18, 15, 0), body=R(0, 30, 0), head=R(0, -28, 0),
                    rightArm=R(-90, 0, -4), leftArm=R(40, 0, -15), leftForearm=R(-95),
                    rightLeg=R(35, 0, 3), rightShin=R(12), leftLeg=R(-48, 0, -3), leftShin=R(55), root=SC(0.97, 1.0, 1.06))),
        (0.32, pose(sm_yaw=T(0, -2.4, -2.6), waist=R(16, 12, 0), body=R(0, 26, 0), head=R(0, -24, 0),
                    rightArm=R(-95, 0, -4), leftArm=R(36, 0, -14), leftForearm=R(-90),
                    rightLeg=R(33, 0, 3), rightShin=R(12), leftLeg=R(-46, 0, -3), leftShin=R(54))),
        (0.7, NEUTRAL),
    ], loop="hold")
    split("punch", {"legs": LEGS, "upper": None})

    timeline("combo1", 0.35, [
        (0.0, GUARD),
        (0.08, merge(GUARD, pose(sm_yaw=T(0, 0, -1.2), body=R(0, 8, 0), head=R(0, -4, 0),
                                 leftArm=R(-30, -15, 8), leftForearm=R(95)))),
        (0.35, GUARD),
    ], loop="hold")
    timeline("combo2", 0.35, [
        (0.0, GUARD),
        (0.09, merge(GUARD, pose(sm_yaw=T(0, 0, -1.6), waist=R(2, 10, 0), body=R(0, -46, 0), head=R(0, 32, 0),
                                 rightArm=R(-50, 20, -8), rightForearm=R(115), rightLeg=R(4, 0, 0), rightShin=R(10)))),
        (0.35, GUARD),
    ], loop="hold")
    timeline("combo3", 0.5, [
        (0.0, merge(squat(2.2, 5, 16), pose(body=R(0, -12, 0), rightArm=R(25, 0, 10), rightForearm=R(-70),
                                            leftArm=R(-50, 10, 10), leftForearm=R(-90)))),
        (0.12, pose(sm_yaw=T(0, 1.2, 0), waist=R(-15), body=R(0, -20, 0), head=R(-20), rightArm=R(-155, 0, -10),
                    rightForearm=R(-35), leftArm=R(10, 0, -12), leftForearm=R(-60), rightLeg=R(6, 0, 3), leftLeg=R(-4, 0, -3),
                    root=SC(0.96, 1.06))),
        (0.26, pose(sm_yaw=T(0, 0.9, 0), waist=R(-12), body=R(0, -16, 0), head=R(-16), rightArm=R(-150, 0, -8),
                    rightForearm=R(-30), leftArm=R(8, 0, -12), leftForearm=R(-60))),
        (0.5, NEUTRAL),
    ], loop="hold")
    # gancho de esquerda: braco na horizontal com o cotovelo a 90 graus
    timeline("combo4", 0.42, [
        (0.0, GUARD),
        (0.08, merge(GUARD, pose(waist=R(0, -8, 0), body=R(0, -40, 0), head=R(0, 28, 0),
                                 leftArm=R(-25, -15, -50), leftForearm=R(5)))),
        (0.17, merge(GUARD, pose(sm_yaw=T(0, -0.2, -0.8), waist=R(2, 12, 0), body=R(0, 18, 0), head=R(0, -10, 0),
                                 leftArm=R(-25, -15, -55), leftForearm=R(5, 20, 0)))),
        (0.42, GUARD),
    ], loop="hold")
    # chute giratorio: joelho recolhido, extensao lateral e uma volta completa
    timeline("combo5", 0.62, [
        (0.0, GUARD),
        (0.12, pose(sm_yaw=RT((0, -100, 0), (0, -0.5, 0)), waist=R(4, 0, 10), rightLeg=R(-80, 0, 24), rightShin=R(110),
                    rightArm=R(-30, 0, 42), rightForearm=R(-40), leftArm=R(-30, 0, -42), leftForearm=R(-40),
                    leftLeg=R(-6, 0, -3), leftShin=R(12))),
        (0.24, pose(sm_yaw=RT((0, -210, 0), (0, 0.4, 0)), waist=R(2, 0, 22), rightLeg=R(-10, 0, 86), rightShin=R(4),
                    rightArm=R(-20, 0, 30), rightForearm=R(-30), leftArm=R(-20, 0, -64), leftForearm=R(-20),
                    leftLeg=R(-4, 0, -6), leftShin=R(14), head=R(0, 0, -14))),
        (0.38, pose(sm_yaw=RT((0, -320, 0), (0, 0.2, 0)), waist=R(2, 0, 18), rightLeg=R(-14, 0, 78), rightShin=R(10),
                    rightArm=R(-20, 0, 34), rightForearm=R(-30), leftArm=R(-20, 0, -58), leftForearm=R(-20),
                    leftLeg=R(-4, 0, -6), leftShin=R(14), head=R(0, 0, -10))),
        (0.62, merge(GUARD, pose(sm_yaw=R(0, -360, 0)))),
    ], loop="hold")
    # golpe final: investida com soco voador
    timeline("combo6", 0.85, [
        (0.0, GUARD),
        (0.16, merge(squat(2.8, 5, 22), pose(sm_yaw=T(0, 0, 1.5), body=R(0, -40, 0), head=R(0, 30, 0),
                                             rightArm=R(50, 0, 12), rightForearm=R(-70), leftArm=R(-62, 0, -10), leftForearm=R(-40)))),
        (0.3, pose(sm_yaw=T(0, 1.6, -7), sm_pitch=R(36), body=R(0, 24, 0), head=R(-28, -20, 0),
                   rightArm=R(-92, 0, -4), leftArm=R(42, 0, -22), leftForearm=R(-70),
                   rightLeg=R(42, 0, 2), rightShin=R(40), leftLeg=R(-30, 0, -2), leftShin=R(60), root=SC(0.95, 1.0, 1.1))),
        (0.5, pose(sm_yaw=T(0, -1.6, -6), sm_pitch=R(14), body=R(0, 20, 0), head=R(-10, -16, 0),
                   rightArm=R(-88, 0, -4), leftArm=R(38, 0, -20), leftForearm=R(-70),
                   rightLeg=R(30, 0, 3), rightShin=R(20), leftLeg=R(-46, 0, -3), leftShin=R(62))),
        (0.85, GUARD),
    ], loop="hold")
    # golpes aereos (pairando/voando)
    timeline("air1", 0.42, [
        (0.0, HGUARD),
        (0.08, pose(sm_pitch=R(24), rightArm=R(-92, 0, -4), leftArm=R(-30, 15, 0), leftForearm=R(-110),
                    rightLeg=R(26, 0, 2), rightShin=R(30), leftLeg=R(32, 0, -2), leftShin=R(50), sm_yaw=T(0, 0, -2))),
        (0.2, pose(sm_pitch=R(28), leftArm=R(-92, 0, 4), rightArm=R(-30, -20, 0), rightForearm=R(-110),
                   rightLeg=R(28, 0, 2), rightShin=R(40), leftLeg=R(34, 0, -2), leftShin=R(30), sm_yaw=T(0, 0, -3))),
        (0.42, HGUARD),
    ], loop="hold")
    timeline("air2", 0.55, [
        (0.0, HGUARD),
        (0.1, pose(sm_yaw=R(0, -90, 0), rightLeg=R(-60, 0, 40), rightShin=R(90), leftLeg=R(20, 0, -6), leftShin=R(40),
                   rightArm=R(-40, 0, 24), rightForearm=R(-60), leftArm=R(-40, 0, -24), leftForearm=R(-60))),
        (0.22, pose(sm_yaw=R(0, -200, 0), rightLeg=R(-6, 0, 84), rightShin=R(4), leftLeg=R(16, 0, -8), leftShin=R(50),
                    rightArm=R(-30, 0, 30), rightForearm=R(-40), leftArm=R(-30, 0, -50), leftForearm=R(-30), waist=R(0, 0, 18))),
        (0.36, pose(sm_yaw=R(0, -310, 0), rightLeg=R(-6, 0, 78), rightShin=R(8), leftLeg=R(16, 0, -8), leftShin=R(50),
                    rightArm=R(-30, 0, 30), rightForearm=R(-40), leftArm=R(-30, 0, -50), leftForearm=R(-30), waist=R(0, 0, 14))),
        (0.55, merge(HGUARD, pose(sm_yaw=R(0, -360, 0)))),
    ], loop="hold")
    timeline("air3", 0.6, [
        (0.0, HGUARD),
        (0.18, pose(sm_pitch=R(-16), rightArm=R(-168, 0, -14), rightForearm=R(-35), leftArm=R(-168, 0, 14), leftForearm=R(-35),
                    rightLeg=R(-30, 0, 3), rightShin=R(60), leftLeg=R(-22, 0, -3), leftShin=R(55), head=R(-12))),
        (0.3, pose(sm_pitch=R(46), rightArm=R(-28, 0, -8), rightForearm=R(-5), leftArm=R(-28, 0, 8), leftForearm=R(-5),
                   rightLeg=R(34, 0, 3), rightShin=R(30), leftLeg=R(40, 0, -3), leftShin=R(36), head=R(20))),
        (0.6, HGUARD),
    ], loop="hold")
    for c in ("combo1", "combo2", "combo3", "combo4", "combo5", "combo6", "air1", "air2", "air3"):
        split(c, {"legs": LEGS, "upper": None})

    # postura de luta (no chao) e guarda no ar
    st = "q.anim_time * 400.0"
    proc("combat_stance", {
        "sm_yaw": {"p": [0, f"-1.2 + math.abs(math.sin({st})) * 0.7", 0]},
        "waist": {"r": [8, 0, 0]},
        "body": {"r": [0, 18, 0]},
        "head": {"r": [-2, -14, 0]},
        "rightArm": {"r": [f"-40.0 + math.sin({st}) * 3.0", -20, 0]},
        "rightForearm": {"r": [f"-115.0 + math.sin({st} + 60.0) * 4.0", 0, 0]},
        "leftArm": {"r": [f"-60.0 + math.sin({st} + 90.0) * 4.0", 15, 0]},
        "leftForearm": {"r": [f"-95.0 + math.sin({st} + 150.0) * 4.0", 0, 0]},
        "rightLeg": {"r": [14, 0, 5]}, "rightShin": {"r": [f"22.0 + math.abs(math.sin({st})) * 6.0", 0, 0]},
        "leftLeg": {"r": [-24, 0, -5]}, "leftShin": {"r": [f"26.0 + math.abs(math.sin({st})) * 6.0", 0, 0]},
    }, length=0.9)
    proc("hover.combat", {
        "rightArm": {"r": [f"-40.0 + math.sin({st}) * 3.0", -20, 0]},
        "rightForearm": {"r": [-115, 0, 0]},
        "leftArm": {"r": [f"-60.0 + math.sin({st} + 90.0) * 4.0", 15, 0]},
        "leftForearm": {"r": [-95, 0, 0]},
    }, length=0.9)

    timeline("clap", 1.0, [
        (0.0, NEUTRAL),
        (0.33, merge(squat(1.0, 6, -10), pose(head=R(-10), rightArm=R(-20, 0, 95), rightForearm=R(-15),
                                              leftArm=R(-20, 0, -95), leftForearm=R(-15)))),
        (0.45, merge(squat(2.0, 6, 12), pose(sm_yaw=T(0, 0, -0.6), head=R(4), rightArm=R(-88, -30, 0), rightForearm=R(-10),
                                             leftArm=R(-88, 30, 0), leftForearm=R(-10), root=SC(1.03, 0.97)))),
        (0.62, merge(squat(2.0, 6, 13), pose(sm_yaw=T(0, 0, -0.6), head=R(5), rightArm=R(-86, -29, 0), rightForearm=R(-10),
                                             leftArm=R(-86, 29, 0), leftForearm=R(-10)))),
        (1.0, NEUTRAL),
    ], loop="hold")
    split("clap", {"legs": LEGS, "upper": None})

    timeline("slam", 1.2, [
        (0.0, NEUTRAL),
        (0.35, pose(sm_yaw=T(0, 1.5, 0), waist=R(-15), head=R(-15), rightArm=R(-165, 0, -18), rightForearm=R(-40),
                    leftArm=R(-165, 0, 18), leftForearm=R(-40), rightLeg=R(-6, 0, 4), leftLeg=R(6, 0, -4))),
        (0.55, merge(squat(5.5, 7, 50), pose(head=R(28), rightArm=R(-45, 0, -8), leftArm=R(-45, 0, 8), root=SC(1.06, 0.9)))),
        (0.8, merge(squat(5.2, 7, 48), pose(head=R(24), rightArm=R(-46, 0, -8), leftArm=R(-46, 0, 8)))),
        (1.2, NEUTRAL),
    ], loop="hold")
    split("slam", {"legs": LEGS, "upper": None})

    # ------------------------------------------------------------------ explosao solar (supremo)
    proc("nova_charge", {
        "sm_yaw": {"r": [0, "q.anim_time * 40.0", 0], "p": [0, "math.sin(q.anim_time * 360.0) * 0.6", 0]},
        "waist": {"r": ["22.0 + math.sin(q.life_time * 2900.0) * 1.0", 0, 0]},
        "head": {"r": [26, 0, "math.sin(q.life_time * 3100.0) * 1.0"]},
        "rightArm": {"r": [-36, -12, -8]}, "rightForearm": {"r": [-95, -72, 0]},
        "leftArm": {"r": [-32, 12, 8]}, "leftForearm": {"r": [-95, 72, 0]},
        "rightLeg": {"r": [-70, 0, 6]}, "rightShin": {"r": [110, 0, 0]},
        "leftLeg": {"r": [-64, 0, -6]}, "leftShin": {"r": [104, 0, 0]},
        "root": {"s": "0.96 + math.sin(q.life_time * 1600.0) * 0.012"},
    }, length=9.0)
    split("nova_charge", {"legs": LEGS, "upper": None})
    XPOSE = pose(waist=R(-20), head=R(-35), rightArm=R(-30, 0, 115), rightForearm=R(-4), leftArm=R(-30, 0, -115),
                 leftForearm=R(-4), rightLeg=R(0, 0, 25), rightShin=R(4), leftLeg=R(0, 0, -25), leftShin=R(4))
    timeline("nova_release", 1.2, [
        (0.0, CURLED),
        (0.08, merge(XPOSE, pose(root=SC(1.12)))),
        (0.5, merge(XPOSE, pose(waist=R(4), head=R(6)))),
        (1.2, HOVER),
    ], loop="hold")
    split("nova_release", {"legs": LEGS, "upper": None})

    # ------------------------------------------------------------------ 1a pessoa
    proc("fp.charge", {
        "rightArm": {"p": ["-1.0", "-3.5 + math.sin(q.life_time * 3000.0) * 0.3 * v.sm_chg", "4.0"],
                     "r": ["-8.0", 0, 0]},
    })
    timeline("fp.punch", 0.5, [
        (0.0, pose(rightArm=RT((-8, 0, 0), (-1, -3.5, 4)))),
        (0.08, pose(rightArm=RT((-25, 0, 0), (-3, 1, -9)))),
        (0.25, pose(rightArm=RT((-20, 0, 0), (-2.5, 0.5, -8)))),
        (0.5, NEUTRAL),
    ], loop="hold")
    proc("fp.fast", {
        "rightArm": {"p": [0, "math.sin(q.life_time * 2900.0) * 0.25", 0]},
    })


# ---------------------------------------------------------------------------
# Controladores
# ---------------------------------------------------------------------------
def anim_key(name):
    return "sm." + name


def build_controllers():
    C = {}
    W = "v.sm_full"
    WA = "v.sm_full * v.sm_arms"

    # base: camadas sempre ativas quando transformado
    C["controller.animation.superman.base"] = {
        "initial_state": "default",
        "states": {
            "default": {
                "animations": [
                    "sm.cape", "sm.breath", {"sm.stature": "v.sm_on"},
                    {"sm.orient": W},
                    {"sm.look": W},
                    {"sm.walk_legs": f"{W} * (v.sm_fly == 0 && q.is_on_ground ? 1.0 : 0.0)"},
                    {"sm.hero_idle": "v.sm_hero * (1.0 - v.sm_full)"},
                    {"sm.combat_stance": "v.sm_full * v.sm_arms * v.sm_cmbw * (v.sm_fly == 0 ? 1.0 : 0.0)"},
                    {"sm.air_jump": "v.sm_airw * (1.0 - v.sm_full)"},
                    {"sm.walk_style": "v.sm_on * (1.0 - v.sm_full)"},
                ],
            }
        },
    }

    # locomocao (voo e super velocidade)
    F = FLY
    loco = {
        "ground": ([], F["NONE"]),
        "charge": (["sm.charge.core", {"sm.charge.arms": WA}, {"sm.tremble": "0.3 + v.sm_chg"}], F["CHARGE"]),
        "launch": (["sm.launch.core", {"sm.launch.arms": WA}], F["LAUNCH"]),
        "airstart": (["sm.airstart.core", {"sm.airstart.arms": WA}], F["AIRSTART"]),
        "hover": (["sm.hover.core", {"sm.hover.arms": f"{WA} * (1.0 - v.sm_cross) * (1.0 - v.sm_cmbw)"},
                   {"sm.hover.combat": f"{WA} * v.sm_cmbw"},
                   {"sm.hover.crossed": f"{WA} * v.sm_cross"}, {"sm.hover.vert": W}], F["HOVER"]),
        "fly": (["sm.fly.core", {"sm.fly.arms": WA}], F["FLY"]),
        "fast": (["sm.fast.core", {"sm.fast.arms": WA}, {"sm.tremble": "0.35"}], F["FAST"]),
        "dive": (["sm.dive.core", {"sm.dive.arms": WA}, {"sm.tremble": "0.5"}], F["DIVE"]),
        "landprep": (["sm.landprep.core", {"sm.landprep.arms": WA}], F["LANDPREP"]),
        "land_soft": (["sm.land_soft.core", {"sm.land_soft.arms": WA}], F["LANDSOFT"]),
        "land_hero": (["sm.land_hero.core", {"sm.land_hero.arms": WA}], F["LANDHERO"]),
        "superspeed": (["sm.superspeed.core", {"sm.superspeed.arms": WA}], F["SPEED"]),
        "boost": (["sm.boost.core", {"sm.boost.arms": WA}], None),
        "brake": (["sm.brake.core", {"sm.brake.arms": WA}], None),
    }
    by_val = {v: k for k, (a, v) in loco.items() if v is not None}

    def go(state_from, val):
        """Estado de destino ao mudar para um valor, com estados de transicao."""
        if state_from in ("fly", "fast", "dive") and val == F["HOVER"]:
            return "brake"
        if state_from in ("hover", "fly", "airstart", "launch") and val == F["FAST"]:
            return "boost"
        return by_val[val]

    states = {}
    for name, (anims, val) in loco.items():
        st = {"animations": anims} if anims else {}
        trans = []
        if val is None:
            # estado de transicao: termina e segue para o estado atual do servidor,
            # mas sai imediatamente se o servidor mudar para outra coisa
            dest = "hover" if name == "brake" else "fast"
            dval = F["HOVER"] if name == "brake" else F["FAST"]
            for v2, s2 in sorted(by_val.items()):
                if v2 == dval:
                    trans.append({s2: f"v.sm_fly == {v2} && q.all_animations_finished"})
                else:
                    trans.append({s2: f"v.sm_fly == {v2}"})
        else:
            for v2 in sorted(by_val):
                if v2 == val:
                    continue
                trans.append({go(name, v2): f"v.sm_fly == {v2}"})
        st["transitions"] = trans
        bt = {"land_hero": 0.06, "land_soft": 0.12, "launch": 0.08, "boost": 0.1, "brake": 0.15,
              "ground": 0.3, "charge": 0.25, "superspeed": 0.25}.get(name, 0.3)
        st["blend_transition"] = bt
        st["blend_via_shortest_path"] = True
        states[name] = st
    C["controller.animation.superman.move"] = {"initial_state": "ground", "states": states}

    # poderes
    P = POW
    up = lambda n, w=W: {f"sm.{n}.upper": w}
    lg = lambda n: {f"sm.{n}.legs": f"{W} * (v.sm_air ? 0.0 : 1.0)"}
    pw = {
        "none": ([], P["NONE"]),
        "transform": ([up("transform"), lg("transform"), {"sm.tremble": "v.sm_full * 0.6"}], P["TRANSFORM"]),
        "detransform": ([up("detransform"), lg("detransform")], P["DETRANSFORM"]),
        "heat_in": ([up("heat_in"), lg("heat_in")], P["HEAT"]),
        "heat": ([up("heat"), lg("heat")], None),
        "heat_out": ([up("heat_out"), lg("heat_out")], None),
        "freeze_in": ([up("freeze_in"), lg("freeze_in")], P["FREEZE"]),
        "freeze": ([up("freeze"), lg("freeze"), {"sm.tremble": "0.4"}], None),
        "freeze_out": ([up("freeze_out"), lg("freeze_out")], None),
        "punch_charge": ([up("punch_charge"), lg("punch_charge"), {"sm.tremble": "v.sm_chg * 1.6"}], P["CHARGE"]),
        "punch": ([up("punch"), lg("punch")], P["PUNCH"]),
        "combo1": ([up("combo1"), lg("combo1")], P["COMBO1"]),
        "combo2": ([up("combo2"), lg("combo2")], P["COMBO2"]),
        "combo3": ([up("combo3"), lg("combo3")], P["COMBO3"]),
        "combo4": ([up("combo4"), lg("combo4")], P["COMBO4"]),
        "combo5": ([up("combo5"), lg("combo5")], P["COMBO5"]),
        "combo6": ([up("combo6"), lg("combo6"), {"sm.tremble": "0.4"}], P["COMBO6"]),
        "air1": ([up("air1"), lg("air1")], P["AIR1"]),
        "air2": ([up("air2"), lg("air2")], P["AIR2"]),
        "air3": ([up("air3"), lg("air3")], P["AIR3"]),
        "nova_charge": ([up("nova_charge", "1.0"), {"sm.nova_charge.legs": "1.0"}, {"sm.tremble": "0.8"}], P["NOVA_CHARGE"]),
        "nova": ([up("nova_release", "1.0"), {"sm.nova_release.legs": "1.0"}], P["NOVA"]),
        "clap": ([up("clap"), lg("clap")], P["CLAP"]),
        "slam": ([up("slam"), lg("slam")], P["SLAM"]),
    }
    entry = {v: k for k, (a, v) in pw.items() if v is not None}

    def pgo(v):
        return entry[v]

    pstates = {}
    for name, (anims, val) in pw.items():
        st = {"animations": anims} if anims else {}
        trans = []
        if name == "heat_in":
            trans += [{"heat": "q.all_animations_finished && v.sm_pow == 3"}, {"heat_out": "v.sm_pow != 3"}]
        elif name == "heat":
            trans += [{"heat_out": "v.sm_pow != 3"}]
        elif name == "heat_out":
            trans += [{"heat_in": "v.sm_pow == 3"}]
            trans += [{pgo(v): f"v.sm_pow == {v}"} for v in sorted(entry) if v not in (0, 3)]
            trans += [{"none": "q.all_animations_finished"}]
        elif name == "freeze_in":
            trans += [{"freeze": "q.all_animations_finished && v.sm_pow == 4"}, {"freeze_out": "v.sm_pow != 4"}]
        elif name == "freeze":
            trans += [{"freeze_out": "v.sm_pow != 4"}]
        elif name == "freeze_out":
            trans += [{"freeze_in": "v.sm_pow == 4"}]
            trans += [{pgo(v): f"v.sm_pow == {v}"} for v in sorted(entry) if v not in (0, 4)]
            trans += [{"none": "q.all_animations_finished"}]
        else:
            for v in sorted(entry):
                if v == val:
                    continue
                trans.append({pgo(v): f"v.sm_pow == {v}"})
        st["transitions"] = trans
        st["blend_transition"] = {"punch": 0.05, "combo1": 0.06, "combo2": 0.06, "combo3": 0.06, "combo4": 0.06,
                                  "combo5": 0.06, "combo6": 0.06, "air1": 0.06, "air2": 0.06, "air3": 0.06,
                                  "nova_charge": 0.3, "nova": 0.04,
                                  "clap": 0.12, "slam": 0.12, "none": 0.3}.get(name, 0.2)
        st["blend_via_shortest_path"] = True
        pstates[name] = st
    C["controller.animation.superman.power"] = {"initial_state": "none", "states": pstates}

    # variacoes ociosas: alternam a cada 9 s parado em pose de heroi
    C["controller.animation.superman.idle"] = {
        "initial_state": "wait",
        "states": {
            "wait": {"transitions": [
                {"look": "v.sm_still > 5.0 && v.sm_islot != v.sm_idone && math.mod(v.sm_islot, 2) == 0"},
                {"stretch": "v.sm_still > 5.0 && v.sm_islot != v.sm_idone && math.mod(v.sm_islot, 2) == 1"},
            ]},
            "look": {"animations": [{"sm.idle_look": "v.sm_hero * (1.0 - v.sm_full)"}],
                     "on_entry": ["v.sm_idone = v.sm_islot;"],
                     "transitions": [{"wait": "q.all_animations_finished || v.sm_still < 0.1"}],
                     "blend_transition": 0.4},
            "stretch": {"animations": [{"sm.idle_stretch": "v.sm_hero * (1.0 - v.sm_full)"}],
                        "on_entry": ["v.sm_idone = v.sm_islot;"],
                        "transitions": [{"wait": "q.all_animations_finished || v.sm_still < 0.1"}],
                        "blend_transition": 0.4},
        },
    }
    C["controller.animation.superman.first_person"] = {
        "initial_state": "none",
        "states": {
            "none": {"transitions": [{"charge": "v.sm_pow == 5"}, {"punch": "v.sm_pow == 6"},
                                     {"fast": "v.sm_fly == 5 || v.sm_fly == 6"}]},
            "charge": {"animations": ["sm.fp.charge"],
                       "transitions": [{"punch": "v.sm_pow == 6"}, {"none": "v.sm_pow != 5"}],
                       "blend_transition": 0.15},
            "punch": {"animations": ["sm.fp.punch"],
                      "transitions": [{"charge": "v.sm_pow == 5"}, {"none": "q.all_animations_finished"}],
                      "blend_transition": 0.05},
            "fast": {"animations": ["sm.fp.fast"],
                     "transitions": [{"none": "v.sm_fly != 5 && v.sm_fly != 6"}],
                     "blend_transition": 0.2},
        },
    }
    return C


# ---------------------------------------------------------------------------
# Variaveis calculadas a cada quadro (pre_animation)
# ---------------------------------------------------------------------------
SM_INIT = [
    "v.sm_full = 0.0;", "v.sm_arms = 1.0;", "v.sm_p = 0.0;", "v.sm_yw = 0.0;", "v.sm_yawp = 0.0;",
    "v.sm_turn = 0.0;", "v.sm_bank = 0.0;", "v.sm_lean = 0.0;", "v.sm_cl = 0.05;", "v.sm_cf = 2.0;",
    "v.sm_cs = 0.5;", "v.sm_cph = 0.0;", "v.sm_run = 0.0;", "v.sm_hero = 0.0;", "v.sm_still = 0.0;",
    "v.sm_clv = 0.0;", "v.sm_spdp = 0.0;", "v.sm_acc = 0.0;", "v.sm_idone = -1.0;", "v.sm_islot = 0.0;",
    "v.sm_airw = 0.0;", "v.sm_hidle = 0.0;", "v.sm_cross = 0.0;", "v.sm_cmbw = 0.0;", "v.sm_glow = 0.3;",
]

ITEMS = ["superman:emblema", "superman:voo", "superman:visao_calor", "superman:sopro_congelante",
         "superman:super_soco", "superman:impacto"]

SM_PRE = [
    "v.sm_hp = q.has_property('superman:on');",
    "v.sm_on = v.sm_hp ? q.property('superman:on') : 0.0;",
    "v.sm_fly = v.sm_hp ? q.property('superman:fly') : 0.0;",
    "v.sm_pow = v.sm_hp ? q.property('superman:power') : 0.0;",
    "v.sm_chg = v.sm_hp ? q.property('superman:charge') : 0.0;",
    "v.sm_inp = v.sm_hp ? q.property('superman:input') : 4.0;",
    "v.sm_cmb = v.sm_hp ? q.property('superman:combat') : 0.0;",
    "v.sm_act = v.sm_on || v.sm_pow == 1;",
    "v.sm_dt = math.clamp(q.delta_time, 0.0, 0.1);",
    "v.sm_k = math.min(1.0, v.sm_dt * 6.0);",
    "v.sm_kf = math.min(1.0, v.sm_dt * 12.0);",
    "v.sm_ks = math.min(1.0, v.sm_dt * 3.0);",
    "v.sm_air = v.sm_fly == 2 || v.sm_fly == 3 || v.sm_fly == 4 || v.sm_fly == 5 || v.sm_fly == 6 || v.sm_fly == 7 || v.sm_fly == 10;",
    "v.sm_full = v.sm_full + (((v.sm_act && !v.is_first_person && (v.sm_fly > 0 || v.sm_pow > 0 || v.sm_cmb)) ? 1.0 : 0.0) - v.sm_full) * v.sm_kf;",
    "v.sm_vanilla = 1.0 - v.sm_full;",
    "v.sm_arms = v.sm_arms + ((v.sm_pow == 0 ? 1.0 : 0.0) - v.sm_arms) * v.sm_kf;",
    "v.sm_inf = math.floor(v.sm_inp / 3.0) - 1.0;",
    "v.sm_ins = math.mod(v.sm_inp, 3.0) - 1.0;",
    "v.sm_vs = q.vertical_speed;",
    "v.sm_gs = q.ground_speed;",
    # orientacao do corpo no voo
    "v.sm_tx = math.clamp(q.target_x_rotation, -89.0, 89.0);",
    "v.sm_pt = (v.sm_fly == 4 || v.sm_fly == 5) ? math.clamp(90.0 + v.sm_tx, 8.0, 172.0) : (v.sm_fly == 6 ? math.clamp(90.0 + v.sm_tx, 120.0, 178.0) : (v.sm_fly == 3 ? v.sm_inf * 14.0 : 0.0));",
    "v.sm_p = v.sm_p + (v.sm_pt - v.sm_p) * ((v.sm_fly == 4 || v.sm_fly == 5 || v.sm_fly == 6) ? math.min(1.0, v.sm_dt * 5.0) : ((v.sm_fly == 8 || v.sm_fly == 9) ? math.min(1.0, v.sm_dt * 30.0) : v.sm_k));",
    "v.sm_yw = v.sm_yw + ((((v.sm_fly >= 2 && v.sm_fly <= 7) || v.sm_fly == 10) ? 1.0 : 0.0) - v.sm_yw) * v.sm_k;",
    # velocidade de curva -> inclinacao lateral (bank)
    "v.sm_yawn = q.body_y_rotation + q.target_y_rotation;",
    "v.sm_dy = math.mod(v.sm_yawn - v.sm_yawp + 540.0, 360.0) - 180.0;",
    "v.sm_yawp = v.sm_yawn;",
    "v.sm_turn = v.sm_turn + (math.clamp(v.sm_dy / math.max(v.sm_dt, 0.01), -360.0, 360.0) - v.sm_turn) * v.sm_ks;",
    "v.sm_bank = v.sm_bank + (((v.sm_fly == 4 || v.sm_fly == 5) ? math.clamp(-v.sm_turn * 0.22 - v.sm_ins * 18.0, -60.0, 60.0) : 0.0) - v.sm_bank) * v.sm_k;",
    "v.sm_lean = v.sm_lean + ((v.sm_fly == 3 ? math.clamp(-v.sm_ins * 14.0 - v.sm_turn * 0.04, -24.0, 24.0) : 0.0) - v.sm_lean) * v.sm_k;",
    # capa
    "v.sm_clt = (v.sm_fly == 2 || v.sm_fly == 4 || v.sm_fly == 5 || v.sm_fly == 6) ? 0.04 : (v.sm_fly == 3 ? 0.1 + math.max(v.sm_inf, 0.0) * 0.25 + math.clamp(-v.sm_vs * 0.04, 0.0, 0.6) : (v.sm_fly == 11 ? 0.95 : ((!q.is_on_ground && v.sm_vs < -2.0) ? math.clamp(-v.sm_vs * 0.07, 0.0, 1.5) : 0.04 + math.clamp(v.sm_gs * 0.06, 0.0, 0.55))));",
    # capa com mola amortecida: passa um pouco do ponto e volta (balanco natural)
    "v.sm_spd = math.sqrt(v.sm_gs * v.sm_gs + v.sm_vs * v.sm_vs);",
    "v.sm_acc = v.sm_acc + (math.clamp((v.sm_spd - v.sm_spdp) / math.max(v.sm_dt, 0.01), -120.0, 120.0) - v.sm_acc) * v.sm_k;",
    "v.sm_spdp = v.sm_spd;",
    "v.sm_clv = (v.sm_clv + ((v.sm_clt - v.sm_cl) * 38.0 - v.sm_clv * 7.5) * v.sm_dt) * (v.sm_dt > 0.09 ? 0.0 : 1.0);",
    "v.sm_cl = math.clamp(v.sm_cl + v.sm_clv * v.sm_dt, -0.3, 1.8);",
    "v.sm_cf = v.sm_cf + (((v.sm_fly == 5 || v.sm_fly == 6) ? 16.0 : (v.sm_fly == 4 ? 10.0 : (v.sm_fly == 3 ? 6.0 : (v.sm_fly == 11 ? 12.0 : 2.0 + math.clamp(v.sm_gs, 0.0, 8.0)))) + math.clamp(math.abs(v.sm_acc) * 0.12, 0.0, 10.0)) - v.sm_cf) * v.sm_ks;",
    "v.sm_cs = v.sm_cs + (((v.sm_fly == 5 || v.sm_fly == 6) ? 4.5 : (v.sm_fly == 4 ? 2.4 : (v.sm_fly == 3 ? 0.7 : (v.sm_fly == 11 ? 3.5 : 0.45 + math.clamp(v.sm_gs * 0.25, 0.0, 1.5))))) - v.sm_cs) * v.sm_ks;",
    "v.sm_cph = math.mod(v.sm_cph + v.sm_dt * v.sm_cs * 360.0, 3600.0);",
    "v.sm_run = math.mod(v.sm_run + v.sm_dt * math.clamp(v.sm_gs * 0.45, 0.0, 4.0) * 360.0, 3600.0);",
    # sobreposicoes no chao
    "v.sm_still = (v.sm_on && v.sm_fly == 0 && v.sm_pow == 0 && q.is_on_ground && v.sm_gs < 0.3 && !q.is_sneaking && (q.get_equipped_item_name == '' || q.is_item_name_any('slot.weapon.mainhand', 0, "
    + ", ".join(f"'{i}'" for i in ITEMS) + "))) ? v.sm_still + v.sm_dt : 0.0;",
    "v.sm_hero = v.sm_hero + ((v.is_paperdoll || v.sm_still > 1.2 ? 1.0 : 0.0) - v.sm_hero) * v.sm_ks;",
    "v.sm_islot = math.floor((v.sm_still - 5.0) / 9.0);",
    "v.sm_idone = v.sm_still < 0.1 ? -1.0 : v.sm_idone;",
    "v.sm_airw = v.sm_airw + (((v.sm_on && v.sm_fly == 0 && !q.is_on_ground && !q.is_in_water && !q.is_riding) ? 1.0 : 0.0) - v.sm_airw) * v.sm_k;",
    "v.sm_hidle = (v.sm_fly == 3 && v.sm_inp == 4 && v.sm_pow == 0 && math.abs(v.sm_vs) < 0.5) ? v.sm_hidle + v.sm_dt : 0.0;",
    "v.sm_cross = v.sm_cross + ((v.sm_hidle > 2.5 ? 1.0 : 0.0) - v.sm_cross) * v.sm_ks;",
    "v.sm_cmbw = v.sm_cmbw + ((v.sm_cmb && v.sm_on ? 1.0 : 0.0) - v.sm_cmbw) * v.sm_k;",
    # brilho do emblema, olhos e frisos: sobe com os poderes e no voo supersonico
    "v.sm_glowt = 0.3 + ((v.sm_pow == 1 || v.sm_pow == 3 || v.sm_pow >= 18) ? 0.7 : 0.0) + (v.sm_pow == 5 ? 0.2 + v.sm_chg * 0.5 : 0.0) + ((v.sm_pow == 6 || v.sm_pow == 14 || v.sm_pow == 7 || v.sm_pow == 8) ? 0.5 : 0.0) + ((v.sm_fly == 5 || v.sm_fly == 6 || v.sm_fly == 2) ? 0.45 : 0.0);",
    "v.sm_glow = v.sm_glow + (math.clamp(v.sm_glowt, 0.0, 1.0) - v.sm_glow) * v.sm_k;",
]


def build_entity():
    with open(os.path.join(VANILLA, "player.entity.json")) as f:
        ent = json.load(f)
    d = ent["minecraft:client_entity"]["description"]
    d["textures"]["superman"] = "textures/entity/superman/superman"
    d["textures"]["superman_glow"] = "textures/entity/superman/superman_glow"
    d["materials"]["sm_glow"] = "warden_bioluminescent_layer"
    d["geometry"]["superman"] = "geometry.superman"
    sc = d["scripts"]
    sc["initialize"] = sc["initialize"] + SM_INIT
    sc["pre_animation"] = sc["pre_animation"] + SM_PRE
    sc["animate"] = [
        {"root": "v.sm_vanilla"},
        {"sm_base": "v.sm_act && !v.is_first_person"},
        {"sm_move": "v.sm_act && !v.is_first_person"},
        {"sm_power": "v.sm_act && !v.is_first_person"},
        {"sm_idle": "v.sm_on && !v.is_first_person"},
        {"sm_fp": "v.sm_on && v.is_first_person"},
    ]
    anims = d["animations"]
    for full in ANIMS:
        anims["sm." + full[len(NS):]] = full
    anims["sm_base"] = "controller.animation.superman.base"
    anims["sm_move"] = "controller.animation.superman.move"
    anims["sm_power"] = "controller.animation.superman.power"
    anims["sm_idle"] = "controller.animation.superman.idle"
    anims["sm_fp"] = "controller.animation.superman.first_person"
    # render controllers: vanilla so quando nao transformado
    new_rc = []
    for rc in d["render_controllers"]:
        (k, cond), = rc.items()
        if k in ("controller.render.player.first_person", "controller.render.player.third_person"):
            cond = f"({cond}) && !v.sm_on"
        new_rc.append({k: cond})
    new_rc.insert(3, {"controller.render.superman.first_person": "variable.is_first_person && !query.is_spectator && v.sm_on"})
    tp = "!variable.is_first_person && !variable.map_face_icon && !query.is_spectator && v.sm_on"
    new_rc.insert(5, {"controller.render.superman.third_person": tp})
    new_rc.insert(6, {"controller.render.superman.glow": tp})
    d["render_controllers"] = new_rc
    return ent


def build_render_controllers():
    vanilla_fp_right = "query.get_equipped_item_name(0, 1) == '' || query.get_equipped_item_name(0, 1) == 'filled_map'"
    holding_power = "q.is_item_name_any('slot.weapon.mainhand', 0, " + ", ".join(f"'{i}'" for i in ITEMS) + ")"
    vanilla_fp_left = ("(query.get_equipped_item_name(0, 1) == 'filled_map' && query.get_equipped_item_name('off_hand') != 'shield') || "
                       "(query.get_equipped_item_name('off_hand') == 'filled_map' && !query.item_is_charged) || "
                       "(!query.item_is_charged && (variable.item_use_normalized > 0 && variable.item_use_normalized < 1.0))")
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.superman.third_person": {
                "geometry": "Geometry.superman",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.superman"],
                "part_visibility": [
                    {"*": True},
                    {"eye_glow": "v.sm_pow == 3"},
                    {"eyelids": "v.sm_pow != 3 && math.mod(q.life_time, 4.3) < 0.13"},
                ],
            },
            # camada que brilha no escuro (mesma tecnica da bioluminescencia do warden)
            "controller.render.superman.glow": {
                "geometry": "Geometry.superman",
                "materials": [{"*": "Material.sm_glow"}],
                "textures": ["Texture.superman_glow"],
                "ignore_lighting": True,
                "color": {"r": 1.0, "g": 1.0, "b": 1.0, "a": "v.sm_glow * (0.85 + math.sin(q.life_time * 240.0) * 0.15)"},
                "part_visibility": [
                    {"*": True},
                    {"eye_glow": "v.sm_pow == 3"},
                    {"eyelids": False},
                ],
            },
            "controller.render.superman.first_person": {
                "geometry": "Geometry.superman",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.superman"],
                "part_visibility": [
                    {"*": False},
                    {"rightArm": f"{vanilla_fp_right} || {holding_power}"},
                    {"rightForearm": f"{vanilla_fp_right} || {holding_power}"},
                    {"leftArm": vanilla_fp_left},
                    {"leftForearm": vanilla_fp_left},
                ],
            },
        },
    }


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    build_animations()
    write(os.path.join(RP, "animations", "superman.animation.json"),
          {"format_version": "1.10.0", "animations": ANIMS})
    write(os.path.join(RP, "animation_controllers", "superman.animation_controllers.json"),
          {"format_version": "1.10.0", "animation_controllers": build_controllers()})
    write(os.path.join(RP, "entity", "player.entity.json"), build_entity())
    write(os.path.join(RP, "render_controllers", "superman.render_controllers.json"), build_render_controllers())
    print(f"{len(ANIMS)} animacoes geradas")


if __name__ == "__main__":
    main()
