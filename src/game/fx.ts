// Spawns the parameterized particle effects (tools/gen_particles.py). Every
// effect reads its look from Molang variables; the world performance profile
// scales particle counts and a per-tick cap protects weak phones.
import { type Dimension, MolangVariableMap } from "@minecraft/server";
import type { V3 } from "../core/vec";
import { PARTICLE } from "../ids";
import { now } from "./players";
import { currentBudget } from "./settings";

export type Rgba = readonly [number, number, number, number];

/** Palette taken from the Java Photon effects. */
export const COLOR = {
  blue: [0.09, 0.51, 1, 1],
  blueLight: [0.4, 0.75, 1, 0.37],
  blueDeep: [0.19, 0.43, 0.85, 0.9],
  red: [0.9, 0.1, 0.29, 1],
  redWisp: [0.98, 0.22, 0.38, 0.9],
  redBloom: [1, 0.15, 0.34, 0.6],
  redHot: [1, 0.82, 0.85, 0.75],
  redRing: [1, 0.43, 0.53, 0.55],
  infinity: [0.78, 0.92, 1, 0.75],
  white: [1, 1, 1, 0.85],
} as const satisfies Record<string, Rgba>;

export interface FxParams {
  /** Particles before the density scale (emitters with many particles). */
  count?: number;
  /** Half-size of the billboard at birth / at death (blocks). */
  size0?: number;
  size1?: number;
  /** Particle lifetime in seconds. */
  life?: number;
  color?: Rgba;
  /** Blocks per second (negative = inward for dots). */
  speed?: number;
  /** Emitter sphere radius. */
  radius?: number;
  /** Facing of oriented effects (ringFlat). */
  dir?: V3;
}

const CAP_PER_TICK = { leve: 24, medio: 48, alto: 96 } as const;
let spentTick = -1;
let spent = 0;

function allowed(): boolean {
  const t = now();
  if (t !== spentTick) {
    spentTick = t;
    spent = 0;
  }
  const b = currentBudget();
  const cap = b.particles >= 1 ? CAP_PER_TICK.alto : b.particles >= 0.7 ? CAP_PER_TICK.medio : CAP_PER_TICK.leve;
  return spent++ < cap;
}

/** Spawns one effect; silently skipped when over budget or in an unloaded chunk. */
export function fx(dim: Dimension, id: (typeof PARTICLE)[keyof typeof PARTICLE], at: V3, p: FxParams = {}): void {
  if (!allowed()) return;
  const vars = new MolangVariableMap();
  const color = p.color ?? COLOR.white;
  vars.setFloat("variable.jjk_density", currentBudget().particles);
  vars.setFloat("variable.jjk_count", p.count ?? 1);
  vars.setFloat("variable.jjk_size0", p.size0 ?? 0.5);
  vars.setFloat("variable.jjk_size1", p.size1 ?? p.size0 ?? 0.5);
  vars.setFloat("variable.jjk_life", p.life ?? 0.3);
  vars.setFloat("variable.jjk_r", color[0]);
  vars.setFloat("variable.jjk_g", color[1]);
  vars.setFloat("variable.jjk_b", color[2]);
  vars.setFloat("variable.jjk_a", color[3]);
  vars.setFloat("variable.jjk_speed", p.speed ?? 0);
  vars.setFloat("variable.jjk_radius", p.radius ?? 0.5);
  const d = p.dir ?? { x: 0, y: 1, z: 0 };
  vars.setFloat("variable.jjk_dx", d.x);
  vars.setFloat("variable.jjk_dy", d.y);
  vars.setFloat("variable.jjk_dz", d.z);
  try {
    dim.spawnParticle(id, at, vars);
  } catch {
    // Unloaded chunk or the dimension went away.
  }
}
