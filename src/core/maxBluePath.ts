// Maximum Output: Blue flight path, ported from MaxBluePath / MaxBlueDistance.
import { TL } from "./timelines";
import { add, cross, directionFromRotation, lerp, rad, scale, smootherstep, type V3, v3 } from "./vec";

const SPEED = 0.65;
const TIMES = [0, 4, 7, 10, 14, 18, 21, 24, 27, 30, 32, 35];
const KEYS: V3[] = [
  v3(0, 1.25, 0.4),
  v3(0, 1.3, 0.5),
  v3(-0.25, 1.55, 0.65),
  v3(-0.75, 1.55, 0.75),
  v3(-1.45, 1.5, 0.15),
  v3(-1.65, 1.44, -1.05),
  v3(-0.85, 1.4, -2.0),
  v3(0.55, 1.4, -2.15),
  v3(2.05, 1.42, -1.3),
  v3(3.12, 1.43, 0.75),
  v3(3.02, 1.45, 4.1),
  v3(0, 1.45, 9.0),
];
const ORBIT_BEGIN = 7;
const SOURCE_ORBIT_END = 45;
const ARC_SAMPLES = 512;

function tangent(i: number): V3 {
  if (i === 0 || i === 2 || i === KEYS.length - 1) return v3(0, 0, 0);
  const span = TIMES[i + 1]! - TIMES[i - 1]!;
  return scale(add(KEYS[i + 1]!, scale(KEYS[i - 1]!, -1)), 1 / span);
}

function raw(age: number): V3 {
  if (age <= 0) return KEYS[0]!;
  if (age >= TIMES[TIMES.length - 1]!) return KEYS[KEYS.length - 1]!;
  let i = 0;
  while (age > TIMES[i + 1]!) i++;
  const span = TIMES[i + 1]! - TIMES[i]!;
  const u = (age - TIMES[i]!) / span;
  const u2 = u * u;
  const u3 = u2 * u;
  return add(
    add(scale(KEYS[i]!, 2 * u3 - 3 * u2 + 1), scale(tangent(i), (u3 - 2 * u2 + u) * span)),
    add(scale(KEYS[i + 1]!, -2 * u3 + 3 * u2), scale(tangent(i + 1), (u3 - u2) * span)),
  );
}

const ARC_POINTS: V3[] = [];
const ARC_LENGTHS: number[] = [];
for (let i = 0; i <= ARC_SAMPLES; i++) {
  ARC_POINTS.push(raw(7 + (28 * i) / ARC_SAMPLES));
  const prev = ARC_POINTS[i - 1];
  const p = ARC_POINTS[i]!;
  ARC_LENGTHS.push(i === 0 || !prev ? 0 : ARC_LENGTHS[i - 1]! + Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z));
}
const ARC_TOTAL = ARC_LENGTHS[ARC_SAMPLES]!;

/** Local offset (x right, y up, z forward) from the caster's feet at `realAge` ticks. */
export function maxBlueLocal(realAge: number): V3 {
  const age = realAge * (SOURCE_ORBIT_END / TL.maxBlue.orbit);
  if (age <= ORBIT_BEGIN) return raw(age);
  if (age >= SOURCE_ORBIT_END) return KEYS[KEYS.length - 1]!;
  const phase = Math.min(1, Math.max(0, (age - ORBIT_BEGIN) / 38));
  const distance = ARC_TOTAL * (0.5 - 0.5 * Math.cos(Math.PI * phase));
  let lo = 0;
  let hi = ARC_SAMPLES;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ARC_LENGTHS[mid]! < distance) lo = mid + 1;
    else hi = mid;
  }
  if (lo <= 0) return ARC_POINTS[0]!;
  const delta = ARC_LENGTHS[lo]! - ARC_LENGTHS[lo - 1]!;
  const alpha = delta <= 1e-10 ? 0 : (distance - ARC_LENGTHS[lo - 1]!) / delta;
  return lerp(ARC_POINTS[lo - 1]!, ARC_POINTS[lo]!, alpha);
}

/** Java MaxBluePath.transform: local → world around the caster's feet. */
export function maxBlueTransform(feet: V3, local: V3, yaw: number, pitch: number, roll: number): V3 {
  const y = rad(yaw);
  const r = rad(roll);
  const right = v3(-Math.cos(y), 0, -Math.sin(y));
  const forward = directionFromRotation(pitch, yaw);
  const up = cross(right, forward);
  const x = local.x * Math.cos(r) - (local.y - 0.98) * Math.sin(r);
  const h = local.x * Math.sin(r) + (local.y - 0.98) * Math.cos(r);
  return add(add(add(feet, v3(0, 0.98, 0)), add(scale(right, x), scale(up, h))), scale(forward, local.z));
}

export function orbitWeight(age: number, orbitTicks: number): number {
  const begin = orbitTicks * (7 / 45);
  if (age <= begin) return 0;
  if (age >= orbitTicks) return 1;
  const t = (age - begin) / (orbitTicks - begin);
  return t * t * (3 - 2 * t);
}

/** World position of the sphere during the cast, including the distance adjustment. */
export function maxBlueWorld(feet: V3, age: number, yaw: number, pitch: number, distance: number): V3 {
  const point = maxBlueTransform(feet, maxBlueLocal(age), yaw, pitch, 0);
  const offset = (distance - TL.maxBlue.distance) * orbitWeight(age, TL.maxBlue.orbit);
  return add(point, scale(directionFromRotation(pitch, yaw), offset));
}

export const adjustDistance = (distance: number, steps: number): number =>
  Math.max(TL.maxBlue.minDistance, Math.min(TL.maxBlue.maxDistance, distance + Math.max(-4, Math.min(4, steps))));

export const maxBlueRise = (age: number): number => 1.7 * smootherstep((age * SPEED) / 22);

const GROWTH_T = [0, 4, 7, 10, 20, 25, 35, 60, 82, 474.33, 510];
const GROWTH_S = [0.1025, 0.1054, 0.1156, 0.1322, 0.2276, 0.2934, 0.4482, 0.8459, 1.0, 1.0, 0];

/** Size factor of the field over its life (real ticks). */
export function maxBlueGrowth(realAge: number): number {
  const age = realAge * SPEED;
  if (age <= 0) return GROWTH_S[0]!;
  if (age >= 510) return 0;
  let i = 0;
  while (age > GROWTH_T[i + 1]!) i++;
  const u = (age - GROWTH_T[i]!) / (GROWTH_T[i + 1]! - GROWTH_T[i]!);
  return GROWTH_S[i]! + (GROWTH_S[i + 1]! - GROWTH_S[i]!) * u;
}

/** Debris pull acceleration (MaxBluePull). */
export function debrisAcceleration(distance: number, radius: number): number {
  if (!Number.isFinite(distance) || radius <= 0) return 0;
  const proximity = 1 - Math.min(1, Math.max(0, distance / radius));
  return (0.105 + 0.7 * proximity * proximity) * SPEED * SPEED;
}
export const DEBRIS_DRAG = Math.pow(0.88, SPEED);
export const DEBRIS_MAX_SPEED = 1.4 * SPEED;
