#!/usr/bin/env python3
"""Renderiza GIFs das animacoes (com transicoes suaves entre estados) para docs/preview."""
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "docs", "preview")
TMP = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
FPS = 15
N = "animation.superman."
BASE_V = {"sm_p": 0, "sm_yw": 0, "sm_cl": 0.05, "sm_cf": 2, "cs": 0.5, "sm_full": 1, "sm_arms": 1,
          "sm_chg": 0, "sm_vs": 0, "sm_cross": 0, "sm_bank": 0, "sm_lean": 0, "sm_run": 0}


def seg(layers, dur, V=None, lift=(0, 0), loop_t=False):
    return {"layers": layers, "dur": dur, "V": V or {}, "lift": lift}


def frames(segs, blend=0.22):
    out = []
    starts = []
    T = 0
    for s in segs:
        starts.append(T)
        T += s["dur"]
    n = int(T * FPS)
    for i in range(n):
        t = i / FPS
        k = max(j for j, st in enumerate(starts) if st <= t + 1e-9)
        s = segs[k]
        lt = t - starts[k]
        a = 1.0
        if k > 0 and lt < blend:
            a = lt / blend
        layers = [{"anim": N + l, "time": lt, "weight": a} for l in s["layers"]]
        V = dict(BASE_V)
        V.update(s["V"])
        if a < 1.0:
            p = segs[k - 1]
            layers += [{"anim": N + l, "time": p["dur"] + lt, "weight": 1 - a} for l in p["layers"]]
            PV = dict(BASE_V)
            PV.update(p["V"])
            for key in V:
                V[key] = PV.get(key, 0) * (1 - a) + V[key] * a
        V["sm_cph"] = t * 360 * V.get("cs", 0.5)
        V["sm_run"] = t * 360 * 2.6
        lift = s["lift"][0] + (s["lift"][1] - s["lift"][0]) * min(1, lt / max(s["dur"], 1e-6))
        layers += [{"anim": N + "cape", "time": t}, {"anim": N + "orient", "time": t}, {"anim": N + "look", "time": t},
                   {"anim": N + "breath", "time": t}, {"anim": N + "curl", "time": t}]
        out.append({"layers": layers, "V": V, "t": t, "Q": {"life_time": t}, "lift": lift})
    return out


HOVER = ["hover.core", "hover.arms"]
FLYV = {"sm_p": 90, "sm_cl": 0.04, "sm_cf": 10, "cs": 2.4, "sm_yw": 1}
FASTV = {"sm_p": 90, "sm_cl": 0.04, "sm_cf": 16, "cs": 4.5, "sm_yw": 1}
HOVV = {"sm_cl": 0.1, "sm_cf": 6, "cs": 0.7, "sm_yw": 1}

SCENES = {
    "01_transformacao": (frames([
        seg([], 0.4),
        seg(["transform.upper", "transform.legs"], 2.0),
        seg(["hero_idle"], 1.0, {"sm_full": 0}),
    ]), {"yaw": 25, "dist": 70}),
    "02_decolagem": (frames([
        seg(["hero_idle"], 0.4, {"sm_full": 0}),
        seg(["charge.core", "charge.arms"], 0.8, {"sm_chg": 0.8}),
        seg(["launch.core", "launch.arms"], 0.6, {}, (0, 14)),
        seg(HOVER, 1.4, HOVV, (14, 15)),
    ]), {"yaw": 55, "dist": 90, "ty": 22}),
    "03_pairar_bracos_cruzados": (frames([
        seg(HOVER, 2.0, HOVV, (10, 10)),
        seg(["hover.core", "hover.crossed"], 2.0, HOVV, (10, 10)),
    ], blend=0.5), {"yaw": 30, "dist": 70, "ty": 15}),
    "04_voo": (frames([
        seg(HOVER, 0.6, HOVV, (12, 12)),
        seg(["fly.core", "fly.arms"], 2.0, FLYV, (12, 12)),
    ], blend=0.45), {"yaw": 75, "dist": 80, "ty": 16, "pitch": 15}),
    "05_supersonico_e_curva": (frames([
        seg(["fly.core", "fly.arms"], 0.5, FLYV, (12, 12)),
        seg(["boost.core", "boost.arms"], 0.45, FASTV, (12, 12)),
        seg(["fast.core", "fast.arms"], 0.8, FASTV, (12, 12)),
        seg(["fast.core", "fast.arms"], 1.0, dict(FASTV, sm_bank=-45), (12, 12)),
        seg(["fast.core", "fast.arms"], 0.6, FASTV, (12, 12)),
    ], blend=0.35), {"yaw": 145, "dist": 80, "ty": 16, "pitch": 18}),
    "06_freada_e_pouso_suave": (frames([
        seg(["fly.core", "fly.arms"], 0.4, FLYV, (8, 8)),
        seg(["brake.core", "brake.arms"], 0.7, dict(HOVV, sm_p=0), (8, 6)),
        seg(["landprep.core", "landprep.arms"], 0.8, {"sm_yw": 1}, (6, 0.3)),
        seg(["land_soft.core", "land_soft.arms"], 0.9, {}, (0, 0)),
    ], blend=0.3), {"yaw": 70, "dist": 80, "ty": 14}),
    "07_pouso_de_heroi": (frames([
        seg(["dive.core", "dive.arms"], 0.5, {"sm_p": 175, "sm_cf": 16, "cs": 4.5, "sm_yw": 1}, (20, 2)),
        seg(["land_hero.core", "land_hero.arms"], 1.8, {}, (0, 0)),
        seg(["hero_idle"], 0.6, {"sm_full": 0}),
    ], blend=0.08), {"yaw": 50, "dist": 80, "ty": 16}),
    "08_visao_de_calor": (frames([
        seg([], 0.3),
        seg(["heat_in.upper", "heat_in.legs"], 0.35),
        seg(["heat.upper", "heat.legs"], 1.2),
        seg(["heat_out.upper", "heat_out.legs"], 0.45),
    ]), {"yaw": 20, "dist": 55, "ty": 20}),
    "09_sopro_congelante": (frames([
        seg([], 0.3),
        seg(["freeze_in.upper", "freeze_in.legs"], 0.6),
        seg(["freeze.upper", "freeze.legs"], 1.2),
        seg(["freeze_out.upper", "freeze_out.legs"], 0.4),
    ]), {"yaw": 60, "dist": 65, "ty": 17}),
    "10_super_soco": (frames([
        seg([], 0.3),
        seg(["punch_charge.upper", "punch_charge.legs"], 1.0, {"sm_chg": 0.9}),
        seg(["punch.upper", "punch.legs"], 0.7),
        seg([], 0.4),
    ], blend=0.12), {"yaw": 60, "dist": 70, "ty": 15}),
    "11_combo_de_socos": (frames([
        seg(["combo1.upper", "combo1.legs"], 0.35),
        seg(["combo2.upper", "combo2.legs"], 0.35),
        seg(["combo3.upper", "combo3.legs"], 0.5),
        seg([], 0.4),
    ], blend=0.06), {"yaw": 40, "dist": 70, "ty": 16}),
    "12_palma_trovao": (frames([
        seg([], 0.3),
        seg(["clap.upper", "clap.legs"], 1.0),
        seg([], 0.3),
    ]), {"yaw": 20, "dist": 70, "ty": 15}),
    "13_pancada_no_chao": (frames([
        seg([], 0.3),
        seg(["slam.upper", "slam.legs"], 1.2),
        seg([], 0.3),
    ]), {"yaw": 60, "dist": 75, "ty": 14}),
    "15_combo_de_6_golpes": (frames([
        seg(["combat_stance"], 0.5, {"sm_cmbw": 1}),
        seg(["combo1.upper", "combo1.legs"], 0.35),
        seg(["combo2.upper", "combo2.legs"], 0.35),
        seg(["combo4.upper", "combo4.legs"], 0.42),
        seg(["combo3.upper", "combo3.legs"], 0.5),
        seg(["combo5.upper", "combo5.legs"], 0.62),
        seg(["combo6.upper", "combo6.legs"], 0.85),
        seg(["combat_stance"], 0.5),
    ], blend=0.06), {"yaw": 45, "dist": 80, "ty": 15}),
    "16_combo_aereo": (frames([
        seg(["hover.core", "hover.combat"], 0.4, HOVV, (10, 10)),
        seg(["hover.core", "air1.upper"], 0.42, HOVV, (10, 10)),
        seg(["hover.core", "air2.upper", "air2.legs"], 0.55, HOVV, (10, 10)),
        seg(["hover.core", "air3.upper"], 0.6, HOVV, (10, 10)),
        seg(["hover.core", "hover.combat"], 0.4, HOVV, (10, 10)),
    ], blend=0.06), {"yaw": 55, "dist": 80, "ty": 16}),
    "14_super_velocidade": (frames([
        seg(["superspeed.core", "superspeed.arms"], 1.6, {"sm_cl": 0.95, "sm_cf": 12, "cs": 3.5}),
    ]), {"yaw": 80, "dist": 75, "ty": 14}),
}


def render(name, cells, view):
    for c in cells:
        c["view"] = view
        c["label"] = ""
    cw, ch = 300, 340
    spec = {"cols": 10, "cw": cw, "ch": ch, "cells": cells}
    sp = os.path.join(TMP, f"gif_{name}.json")
    png = os.path.join(TMP, f"gif_{name}.png")
    json.dump(spec, open(sp, "w"))
    subprocess.run(["node", os.path.join(HERE, "shoot.mjs"), sp, png], check=True, cwd=HERE)
    sheet = Image.open(png).convert("RGB")
    frs = []
    for i in range(len(cells)):
        x, y = (i % 10) * cw, (i // 10) * ch
        frs.append(sheet.crop((x, y + 16, x + cw, y + ch)))
    os.makedirs(OUT, exist_ok=True)
    pal = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT) for f in frs]
    pal[0].save(os.path.join(OUT, f"{name}.gif"), save_all=True, append_images=pal[1:], duration=int(1000 / FPS), loop=0,
                optimize=True)
    return frs


def main():
    which = sys.argv[2:] or list(SCENES)
    thumbs = []
    for name in which:
        cells, view = SCENES[name]
        frs = render(name, cells, view)
        thumbs.append((name, frs[len(frs) // 2]))
        print("gif:", name, len(frs), "quadros")
    if len(which) == len(SCENES):
        cols = 5
        tw, th = 240, 256
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * th), (24, 26, 34))
        from PIL import ImageDraw
        d = ImageDraw.Draw(sheet)
        for i, (name, fr) in enumerate(thumbs):
            x, y = (i % cols) * tw, (i // cols) * th
            sheet.paste(fr.resize((tw, int(tw * fr.height / fr.width))).crop((0, 0, tw, th - 20)), (x, y))
            d.text((x + 6, y + th - 17), name[3:].replace("_", " "), fill=(235, 235, 245))
        sheet.save(os.path.join(OUT, "visao_geral.png"))


if __name__ == "__main__":
    main()
