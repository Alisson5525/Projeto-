#!/usr/bin/env python3
"""Gera folhas de quadros (contact sheets) das animacoes para revisao visual."""
import json, subprocess, sys, os
SP = sys.argv[1] if len(sys.argv) > 1 else '.'
N = 'animation.superman.'
BASE = {'sm_p': 0, 'sm_yw': 0, 'sm_cl': 0.05, 'sm_cf': 2, 'sm_cph': 0, 'sm_full': 1, 'sm_arms': 1, 'sm_chg': 0.6, 'sm_vs': 0, 'sm_cross': 0}
def layers(names, t):
    return [{'anim': N + n, 'time': t} for n in names] + [{'anim': N + 'cape', 'time': t}, {'anim': N + 'orient', 'time': t}, {'anim': N + 'look', 'time': t}]
def cells(label, names, times, V=None, view=None, lift=0):
    out = []
    for t in times:
        v = dict(BASE); v.update(V or {}); v['sm_cph'] = t * 360 * v.get('cs', 1)
        out.append({'label': f'{label} t={t:.2f}', 'layers': layers(names, t), 'V': v, 't': t,
                    'Q': {'life_time': t}, 'view': view or {'yaw': 35}, 'lift': lift})
    return out
SHEETS = {
 'ground': cells('hero_idle', ['hero_idle'], [0, 1.6]) + cells('superspeed', ['superspeed.core', 'superspeed.arms'], [0.0, 0.25], {'sm_run': 0, 'sm_cl': 0.95, 'sm_cf': 12}, {'yaw': 80})
           + cells('charge', ['charge.core', 'charge.arms'], [0.0], {}, {'yaw': 70}) + cells('launch', ['launch.core', 'launch.arms'], [0.07, 0.3, 0.6], {}, {'yaw': 60}, 6),
 'hover': cells('hover', ['hover.core', 'hover.arms'], [0, 1, 2, 3], {'sm_cl': 0.1, 'sm_cf': 6}, {'yaw': 30}, 10)
          + cells('crossed', ['hover.core', 'hover.crossed'], [0, 2], {'sm_cl': 0.1, 'sm_cf': 6}, {'yaw': 25}, 10)
          + cells('airstart', ['airstart.core', 'airstart.arms'], [0, 0.22], {}, {'yaw': 40}, 10),
 'fly': cells('fly', ['fly.core', 'fly.arms'], [0, 0.5, 1.0], {'sm_p': 90, 'sm_cl': 0.04, 'sm_cf': 10}, {'yaw': 90, 'ty': 18}, 12)
        + cells('fly 3/4', ['fly.core', 'fly.arms'], [0.25], {'sm_p': 90, 'sm_cl': 0.04, 'sm_cf': 10}, {'yaw': 30, 'ty': 18, 'pitch': 25}, 12)
        + cells('fast', ['fast.core', 'fast.arms'], [0, 0.1], {'sm_p': 90, 'sm_cl': 0.04, 'sm_cf': 16}, {'yaw': 120, 'ty': 18}, 12)
        + cells('bank R', ['fly.core', 'fly.arms'], [0], {'sm_p': 90, 'sm_bank': -40, 'sm_cf': 10}, {'yaw': 180, 'ty': 18, 'pitch': 10}, 12)
        + cells('dive', ['dive.core', 'dive.arms'], [0], {'sm_p': 170, 'sm_cf': 16}, {'yaw': 90, 'ty': 18}, 16),
 'land': cells('brake', ['brake.core', 'brake.arms'], [0.18, 0.4], {'sm_p': 45, 'sm_cf': 8}, {'yaw': 90, 'ty': 18}, 10)
         + cells('land_soft', ['land_soft.core', 'land_soft.arms'], [0.08, 0.3]) 
         + cells('land_hero', ['land_hero.core', 'land_hero.arms'], [0.07, 0.75, 1.0, 1.45], {}, {'yaw': 60}),
 'powers1': cells('transform', ['transform.upper', 'transform.legs'], [0.25, 1.0, 1.4], {}, {'yaw': 25})
          + cells('heat', ['heat.upper', 'heat.legs'], [0]) + cells('freeze_in', ['freeze_in.upper', 'freeze_in.legs'], [0.45], {}, {'yaw': 70})
          + cells('freeze', ['freeze.upper', 'freeze.legs'], [0], {}, {'yaw': 70})
          + cells('punch_charge', ['punch_charge.upper', 'punch_charge.legs'], [0], {}, {'yaw': 50}) + cells('punch', ['punch.upper', 'punch.legs'], [0.14], {}, {'yaw': 60}),
 'powers2': cells('combo1', ['combo1.upper', 'combo1.legs'], [0.08], {}, {'yaw': 40}) + cells('combo2', ['combo2.upper', 'combo2.legs'], [0.09], {}, {'yaw': 40})
          + cells('combo3', ['combo3.upper', 'combo3.legs'], [0.12], {}, {'yaw': 40}) + cells('clap', ['clap.upper', 'clap.legs'], [0.33, 0.45], {}, {'yaw': 20})
          + cells('slam', ['slam.upper', 'slam.legs'], [0.35, 0.55], {}, {'yaw': 60}) + cells('detransform', ['detransform.upper', 'detransform.legs'], [0.3]),
}
which = sys.argv[2:] or list(SHEETS)
for name in which:
    spec = {'cols': 4, 'cw': 260, 'ch': 300, 'cells': SHEETS[name]}
    p = os.path.join(SP, f'sheet_{name}.json')
    json.dump(spec, open(p, 'w'))
    subprocess.run(['node', 'shoot.mjs', p, os.path.join(SP, f'sheet_{name}.png')], check=True)
