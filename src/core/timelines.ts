// Tick timelines of every technique, taken from the Java animation markers
// (jjk_timeline) and *Settings/*Timeline classes. 20 ticks = 1 second.
import { smootherstep } from "./vec";

const slowed = (ticks: number): number => Math.round(ticks / 0.65);

export const TL = {
  blue: { cast: 45, fx: 5, pull: 30, highlightEnd: 10, targetStun: 40, range: 16, coneDeg: 22, pullTicks: 15 },
  red: { cast: 23, fx: 0, impact: 20, radius: 5, maxDamage: 13, edgeDamage: 6 },
  barrage: {
    start: 20,
    contact: 5,
    hitAt: 10,
    hit: 119,
    punches: [12, 26, 30, 34, 38, 41, 45, 49, 53, 56, 60, 64, 68] as const,
    kick: 84,
    extraStun: 20,
    openingDamage: 1,
    punchTotal: 2.6,
    kickDamage: 2.4,
    range: 2.65,
    coneDot: 0.72,
    pinDistance: 1.42,
  },
  purple: {
    fusion: 123,
    ready: 149,
    windup: 20,
    airRiseTicks: 22,
    airRise: 1.7,
    spawnDistance: 3.771,
    blocksPerTick: 2,
    maxTravel: 80,
    radius: 3.4,
    awakenedRadius: 5.3,
    damage: 24,
    awakenedDamage: 34,
    fadeTicks: 18,
  },
  awakening: { cinematic: 157, voiceFade: 151, maxLift: 10, active: 1200 },
  maxBlue: {
    cast: slowed(110),
    orbit: slowed(45),
    life: slowed(510),
    cancel: slowed(18),
    scan: slowed(3),
    debrisLife: slowed(36),
    riseTicks: slowed(22),
    distance: 9,
    minDistance: 2.5,
    maxDistance: 24,
    pullRadius: 10,
    damageRadius: 4.5,
    damage: 1.5,
    maxHits: 16,
    damageInterval: 10,
    blockBudget: 8,
    maxDebris: 256,
    fov: 90,
    cameraDistance: 4.5,
  },
  maxRed: { ready: 140, shootAnim: 10, shootFx: 24, heartbeat: 12, riseTicks: 22, rise: 1.7, forward: 2.25, length: 48, radius: 2.36, sweep: 3, damage: 22, push: 1.8, fuseReach: 6.86 },
  selfPurple: { hold: 100, impact: 20, fx: 216, radius: 24, damage: 40, fallGuard: 400 },
  nuke: { total: 426, explosionAt: 380 },
  domain: { forming: 70, entry: 44, active: 400, fracture: 18 },
} as const;

/** Purple/Max Red lift curve: smootherstep over 22 ticks. */
export const liftFraction = (ticks: number): number => smootherstep(ticks / 22);

/** Last 5 ticks of the purple projectile shrink its radius to 50%. */
export function purpleRadiusMultiplier(traveled: number, maxTicks: number): number {
  const remaining = maxTicks - traveled;
  if (remaining >= 5) return 1;
  const u = Math.min(1, Math.max(0, (5 - remaining) / 5));
  return 1 - 0.5 * smootherstep(u);
}

/** Awakening cinematic height (AwakeningTimeline.height). */
export function awakeningHeight(ticks: number, lift: number): number {
  if (ticks < 100) return lift * smootherstep((ticks - 20) / 80);
  if (ticks <= 120) return lift;
  return lift * (1 - smootherstep((ticks - 120) / 37));
}

/** Max Red lift: smoothstep over 22 ticks up to 1.7 blocks. */
export function maxRedLift(age: number): number {
  const t = Math.min(1, Math.max(0, age / 22));
  return 1.7 * t * t * (3 - 2 * t);
}
