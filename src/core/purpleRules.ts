// Hollow Purple shot and Self Purple rules (GojoPurpleServer, PurpleTimeline,
// SelfPurpleServer, SelfPurpleTimeline).
import { capsuleRuns, pointSegmentDistanceSq, type Run, segmentBoxDistanceSq } from "./geometry";
import { purpleRadiusMultiplier, TL } from "./timelines";
import { add, scale, type V3 } from "./vec";

export const PURPLE = {
  fusion: TL.purple.fusion,
  charge: TL.purple.ready,
  windup: TL.purple.windup,
  /** Touch screens cannot "keep holding": the charge releases itself at 149. */
  launchAt: TL.purple.ready + TL.purple.windup,
  speed: TL.purple.blocksPerTick,
  maxTicks: TL.purple.maxTravel,
  fadeAt: TL.purple.maxTravel - TL.purple.fadeTicks,
  spawnDistance: TL.purple.spawnDistance,
  airRise: TL.purple.airRise,
  radius: TL.purple.radius,
  awakenedRadius: TL.purple.awakenedRadius,
  damage: TL.purple.damage,
  awakenedDamage: TL.purple.awakenedDamage,
  /** Tunnel radius with the "leve" terrain setting. */
  lightTerrainRadius: 2.2,
} as const;

export interface Segment {
  a: V3;
  b: V3;
}

/** One tick of the projectile: segment swept and its current radius. */
export function purpleShotSegment(center: V3, dir: V3, traveled: number, awakened: boolean): Segment & { radius: number } {
  const base = awakened ? PURPLE.awakenedRadius : PURPLE.radius;
  return { a: center, b: add(center, scale(dir, PURPLE.speed)), radius: base * purpleRadiusMultiplier(traveled, PURPLE.maxTicks) };
}

/** Cells within `r` of segment a→b that the previous segment did not already cover. */
export function sweptRuns(prev: Segment | null, a: V3, b: V3, r: number): Run[] {
  const runs = capsuleRuns(a, b, r);
  if (!prev) return runs;
  const rr = r * r;
  const out: Run[] = [];
  for (const run of runs) {
    let start: number | null = null;
    for (let x = run.x0; x <= run.x1 + 1; x++) {
      const fresh =
        x <= run.x1 && segmentBoxDistanceSq(prev.a, prev.b, { x, y: run.y, z: run.z }, { x: x + 1, y: run.y + 1, z: run.z + 1 }) > rr;
      if (fresh && start === null) start = x;
      if (!fresh && start !== null) {
        out.push({ y: run.y, z: run.z, x0: start, x1: x - 1 });
        start = null;
      }
    }
  }
  return out;
}

export const SELF_PURPLE = {
  hold: 100,
  impact: 20,
  fx: 216,
  radius: TL.selfPurple.radius,
  lightRadius: 16,
  damage: TL.selfPurple.damage,
  fuseReach: TL.maxRed.fuseReach,
  fallGuard: TL.selfPurple.fallGuard,
} as const;

/** SelfPurpleTimeline: Nuke window, detonation and end of the effect. */
export class SelfPurpleClock {
  private detonated = false;

  constructor(readonly startedAt: number) {}

  age(now: number): number {
    return Math.max(0, now - this.startedAt);
  }

  canStartNuke(now: number): boolean {
    return !this.detonated && now >= this.startedAt && this.age(now) < SELF_PURPLE.hold;
  }

  /** True once, on the detonation tick. */
  detonate(now: number): boolean {
    if (this.detonated || this.age(now) - SELF_PURPLE.hold < SELF_PURPLE.impact) return false;
    this.detonated = true;
    return true;
  }

  get hasDetonated(): boolean {
    return this.detonated;
  }

  fxEnded(now: number): boolean {
    return this.age(now) - SELF_PURPLE.hold >= SELF_PURPLE.fx;
  }
}

/** The Max Red beam segment a→b passes close enough to the stationary Max Blue. */
export const fusesWithBlue = (blue: V3, a: V3, b: V3): boolean => pointSegmentDistanceSq(blue, a, b) <= SELF_PURPLE.fuseReach * SELF_PURPLE.fuseReach;
