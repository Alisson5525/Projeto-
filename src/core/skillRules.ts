// Pure rules of the base techniques, ported from GojoBlueServer,
// BlueTargeting, GojoRedServer, GojoBarrageServer and BarragePinMotion.
import { TL } from "./timelines";
import { add, dot, forwardOf, length, normalize, rad, rightOf, scale, sub, type V3 } from "./vec";

export const BLUE = {
  range: TL.blue.range,
  coneCos: Math.cos(rad(TL.blue.coneDeg)),
  pullDistance: 1.55,
  pullLift: 0.35,
  maxSpeed: 1.35,
  accel: 0.3,
  retainGround: 0.995,
  retainAir: 0.99,
  freeDistance: 16,
  stopGap: 1.2,
  stopExtra: 0.35,
  haltGap: 0.12,
  slow: -0.55,
} as const;

export const RED = { radius: TL.red.radius, slow: -0.7 } as const;

export const BARRAGE = {
  slow: -0.72,
  pinDistance: TL.barrage.pinDistance,
  follow: 0.42,
  maxMove: 0.58,
  yClamp: 0.45,
  kickHorizontal: 1.2,
  kickVertical: 0.46,
  grabSearch: 3.45,
  maxDy: 1.8,
} as const;

/** Palm position used by Blue/Red (eye + forward 0.74 + right 0.29 - 0.28 up). */
export function palmAnchor(eye: V3, yawDeg: number): V3 {
  const f = forwardOf(yawDeg);
  const r = rightOf(yawDeg);
  return { x: eye.x + f.x * 0.74 + r.x * 0.29, y: eye.y - 0.28, z: eye.z + f.z * 0.74 + r.z * 0.29 };
}

// ---- Blue -------------------------------------------------------------------

export interface BlueCandidate {
  id: string;
  center: V3;
}

/**
 * Target under the crosshair: within 16 blocks and the 22 degree cone, ranked by
 * angular distance from the crosshair plus a tiny distance term (BlueTargeting).
 */
export function pickBlueTarget(eye: V3, look: V3, candidates: readonly BlueCandidate[]): string | null {
  const dir = normalize(look);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const to = sub(c.center, eye);
    const distSq = dot(to, to);
    if (distSq > BLUE.range * BLUE.range) continue;
    const depth = dot(to, dir);
    if (depth <= 0.05 || depth / Math.sqrt(distSq) < BLUE.coneCos) continue;
    const tanSq = (distSq - depth * depth) / (depth * depth);
    const score = tanSq + distSq * 2.5e-5;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}

/** Velocity that pulls `pos` toward `dest` (GojoBlueServer.bluePullVelocity). */
export function bluePullVelocity(pos: V3, dest: V3, prior: V3): V3 {
  const delta = sub(dest, pos);
  const distance = length(delta);
  if (distance < 0.18) return { x: prior.x * 0.12, y: prior.y * 0.2, z: prior.z * 0.12 };
  const speed = Math.min(BLUE.maxSpeed, 0.19 + distance * 0.48);
  return scale(delta, Math.min(speed, distance) / distance);
}

/** Where a pulled target ends: 1.55 blocks in front of the caster, 0.35 up. */
export function bluePullDestination(casterPos: V3, yawDeg: number): V3 {
  const f = forwardOf(yawDeg);
  return { x: casterPos.x + f.x * BLUE.pullDistance, y: casterPos.y + BLUE.pullLift, z: casterPos.z + f.z * BLUE.pullDistance };
}

/**
 * Next self-pull velocity of the caster (applyInertialSelfPull without the
 * collision sweep, which Bedrock's own movement resolves). null = halt.
 */
export function selfPullMomentum(momentum: V3, from: V3, destination: V3, remainingGap: number, onGround: boolean, yawDeg: number): V3 | null {
  if (remainingGap <= BLUE.haltGap) return null;
  let direction = sub(destination, from);
  if (onGround && direction.y < 0) direction = { x: direction.x, y: 0, z: direction.z };
  if (dot(direction, direction) < 1e-8) {
    const carry = { x: momentum.x, y: 0, z: momentum.z };
    direction = dot(carry, carry) > 1e-8 ? carry : forwardOf(yawDeg);
  }
  direction = normalize(direction);
  let next = add(scale(momentum, onGround ? BLUE.retainGround : BLUE.retainAir), scale(direction, BLUE.accel));
  const speed = length(next);
  if (speed > BLUE.maxSpeed) next = scale(next, BLUE.maxSpeed / speed);
  const allowed = Math.min(remainingGap, Math.min(BLUE.maxSpeed, Math.sqrt(0.6 * remainingGap)));
  if (dot(next, next) > allowed * allowed) next = scale(normalize(next), allowed);
  return next;
}

// ---- Red --------------------------------------------------------------------

export function closestPointOnBox(p: V3, center: V3, extent: V3): V3 {
  const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    x: c(p.x, center.x - extent.x, center.x + extent.x),
    y: c(p.y, center.y - extent.y, center.y + extent.y),
    z: c(p.z, center.z - extent.z, center.z + extent.z),
  };
}

export interface RedHit {
  weight: number;
  /** Damage before the cursed energy multiplier (13 center .. 6 edge). */
  damage: number;
  horizontal: number;
  vertical: number;
}

/** Blast falloff by distance from the palm to the target's box. */
export function redBlast(distance: number): RedHit | null {
  if (distance > RED.radius) return null;
  const weight = 1 - Math.min(1, distance / RED.radius);
  return {
    weight,
    damage: TL.red.edgeDamage + (TL.red.maxDamage - TL.red.edgeDamage) * weight,
    horizontal: 0.65 + weight * 1.45,
    vertical: 0.24 + 0.35 * weight,
  };
}

/** Horizontal push direction away from the blast (along the look when centered). */
export function redPushDirection(targetCenter: V3, origin: V3, yawDeg: number): { x: number; z: number } {
  let push = sub(targetCenter, origin);
  if (dot(push, push) < 1e-4) {
    const f = forwardOf(yawDeg);
    push = { x: f.x, y: 0.3, z: f.z };
  }
  const h = Math.hypot(push.x, push.z);
  if (h * h < 1e-4) return { x: 0, z: 1 };
  return { x: push.x / h, z: push.z / h };
}

// ---- Barrage ----------------------------------------------------------------

export interface GrabCandidate {
  id: string;
  center: V3;
  halfWidth: number;
}

/** Grab candidates in the narrow frontal cone, closest first (acquireOpeningTarget). */
export function grabOrder(casterCenter: V3, look: V3, candidates: readonly GrabCandidate[]): string[] {
  const flatLen = Math.hypot(look.x, look.z);
  if (flatLen < 1e-3) return [];
  const lx = look.x / flatLen;
  const lz = look.z / flatLen;
  const hits: { id: string; d: number }[] = [];
  for (const c of candidates) {
    const dx = c.center.x - casterCenter.x;
    const dz = c.center.z - casterCenter.z;
    const dy = c.center.y - casterCenter.y;
    const d = Math.hypot(dx, dz);
    if (d < 0.02 || d > TL.barrage.range + c.halfWidth * 2 * 0.25 || Math.abs(dy) > BARRAGE.maxDy) continue;
    if ((lx * dx + lz * dz) / d < TL.barrage.coneDot) continue;
    hits.push({ id: c.id, d });
  }
  return hits.sort((a, b) => a.d - b.d).map((h) => h.id);
}

/** Turns the pin yaw (radians) 42% toward the caster's yaw (degrees). */
export function turnToward(yawRadians: number, casterYawDeg: number): number {
  const wanted = rad(casterYawDeg);
  if (!Number.isFinite(yawRadians)) return wanted;
  const diff = Math.atan2(Math.sin(wanted - yawRadians), Math.cos(wanted - yawRadians));
  return yawRadians + diff * BARRAGE.follow;
}

/** Where the pinned victim is held, in front of the caster. */
export function pinAnchor(casterPos: V3, yawRadians: number, yOffset: number, targetHalfWidth: number): V3 {
  const d = Math.max(BARRAGE.pinDistance, 0.55 + targetHalfWidth);
  return { x: casterPos.x - Math.sin(yawRadians) * d, y: casterPos.y + yOffset, z: casterPos.z + Math.cos(yawRadians) * d };
}

/** One tick of the victim sliding toward the anchor (follow 0.42, max 0.58). */
export function pinStep(from: V3, anchor: V3): V3 {
  let step = scale(sub(anchor, from), BARRAGE.follow);
  const l = length(step);
  if (!Number.isFinite(l) || l < 1e-5) return from;
  if (l > BARRAGE.maxMove) step = scale(step, BARRAGE.maxMove / l);
  return add(from, step);
}

/** Fires each punch of the hit animation exactly once. */
export class PunchCursor {
  private next = 0;

  /** Indices of the punches whose tick is <= hitAge and not fired yet. */
  advance(hitAge: number): number[] {
    const out: number[] = [];
    const punches = TL.barrage.punches;
    while (this.next < punches.length && punches[this.next]! <= hitAge) out.push(this.next++);
    return out;
  }
}

/**
 * Bedrock ignores hits that land during the victim's hurt immunity (10 ticks),
 * so rapid punches are pooled and delivered together once it has passed.
 */
export class HitPool {
  private pending = 0;
  private last = -Infinity;

  constructor(private readonly cooldown = 10) {}

  /** Adds a hit; returns the damage to apply now (0 = pooled). */
  add(amount: number, tick: number): number {
    this.pending += amount;
    if (tick - this.last < this.cooldown) return 0;
    this.last = tick;
    return this.flush();
  }

  /** Everything still pooled. */
  flush(): number {
    const out = this.pending;
    this.pending = 0;
    return out;
  }
}
