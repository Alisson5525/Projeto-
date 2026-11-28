// Domain rules ported from domain/DomainRules.java and DomainDefinition.
import { type V3 } from "./vec";

export const DOMAIN = {
  radius: 24,
  formingTicks: 70,
  activeTicks: 400,
  barrierHealth: 80,
  entryTicks: 44,
  fractureTicks: 18,
  arenaSpacing: 2048,
  arenaLimit: 384,
  floorY: 64,
  arrivalTimeout: 240,
  maxSessions: 8,
  maxTargets: 64,
  damage: { strike: 4, crossingCap: 20, projectile: 6, explosion: 12, purple: 40, maxRed: 20 },
  strikeInterval: 10,
} as const;

/** True when the segment a→b crosses the sphere surface (relative to the center). */
export function crossesSphere(a: V3, b: V3, radius: number): boolean {
  if (![a.x, a.y, a.z, b.x, b.y, b.z, radius].every(Number.isFinite) || radius <= 0) return false;
  const rr = radius * radius;
  const aa = a.x * a.x + a.y * a.y + a.z * a.z;
  const bb = b.x * b.x + b.y * b.y + b.z * b.z;
  if (aa < rr && bb < rr) return false;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = dx * dx + dy * dy + dz * dz;
  if (len < 1e-12) return false;
  const t = Math.min(1, Math.max(0, -(a.x * dx + a.y * dy + a.z * dz) / len));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  const z = a.z + t * dz;
  return x * x + y * y + z * z <= rr + 1e-8;
}

export function closureThreshold(longitude: number, latitude: number): number {
  const noise =
    Math.sin(longitude * 7 + Math.sin(latitude * 9) * 1.7) * 0.12 +
    Math.sin(longitude * 19 - latitude * 13) * 0.065 +
    Math.cos(longitude * 37 + latitude * 29) * 0.025;
  return 0.34 + 0.3 * Math.sin(latitude) + noise;
}

export function closureAt(progress: number, threshold: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const t = Math.min(1, Math.max(0, (progress - threshold) / 0.09));
  return t * t * (3 - 2 * t);
}

export const arenaOrigin = (slot: number): V3 => ({ x: slot * DOMAIN.arenaSpacing + 0.5, y: DOMAIN.floorY, z: 0.5 });

export function firstFreeArena(reserved: ReadonlySet<number>): number {
  let slot = 0;
  while (reserved.has(slot)) slot++;
  return slot;
}
