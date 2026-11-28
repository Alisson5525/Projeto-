// Caster motion helpers: locked casts steer the player with velocity (smooth
// on the client) instead of teleporting every tick.
import { dot, scale, sub, type V3 } from "./vec";

/** Velocity that moves `pos` to `target` this tick, at most `maxSpeed` blocks. */
export function steerVelocity(pos: V3, target: V3, maxSpeed: number): V3 {
  const d = sub(target, pos);
  const len = Math.sqrt(dot(d, d));
  return len > maxSpeed ? scale(d, maxSpeed / len) : d;
}

/** Awakening lift: up to 10 blocks in 0.25 steps while the head still has room. */
export function ceilingLift(clearance: number): number {
  if (!(clearance >= 0.25)) return 0;
  return Math.min(10, Math.floor(clearance / 0.25) * 0.25);
}
