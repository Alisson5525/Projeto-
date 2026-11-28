// Maximum Output: Red (MaxRedServer, MaxRedTimeline, MaxRedSettings).
import { TL } from "./timelines";
import { add, scale, type V3 } from "./vec";

export const MAX_RED = {
  ready: TL.maxRed.ready,
  /** Touch screens cannot hold: the charge fires itself after 10 s. */
  autoFire: 200,
  shootAnim: TL.maxRed.shootAnim,
  shootFx: TL.maxRed.shootFx,
  /** The caster stays locked for this long after firing. */
  lockAfterShot: 10,
  forward: TL.maxRed.forward,
  length: TL.maxRed.length,
  radius: TL.maxRed.radius,
  sweep: TL.maxRed.sweep,
  damage: TL.maxRed.damage,
  push: TL.maxRed.push,
  /** Beam tunnel radius with the "leve" terrain setting. */
  lightTerrainRadius: 1.6,
} as const;

const SWEEP_TICKS = Math.ceil(MAX_RED.length / MAX_RED.sweep);

/** Segment swept by the beam on its `sweptTicks`-th tick (null once 48 blocks are covered). */
export function maxRedSegment(root: V3, dir: V3, sweptTicks: number): { a: V3; b: V3 } | null {
  if (sweptTicks >= SWEEP_TICKS) return null;
  const d0 = Math.min(MAX_RED.length, Math.max(0, sweptTicks) * MAX_RED.sweep);
  const d1 = Math.min(MAX_RED.length, (Math.max(0, sweptTicks) + 1) * MAX_RED.sweep);
  return { a: add(root, scale(dir, d0)), b: add(root, scale(dir, d1)) };
}
