// Collision and block-volume helpers ported from PurpleGeometry,
// SelfPurpleTimeline and GojoRedServer.carveUpperDome.
import { dot, normalize, sub, type V3 } from "./vec";

/** Squared distance between segment a→b and the box [min, max] (exact port). */
export function segmentBoxDistanceSq(a: V3, b: V3, min: V3, max: V3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const t: number[] = [0, 1];
  const addCuts = (d: number, o: number, lo: number, hi: number) => {
    if (Math.abs(d) <= 1e-12) return;
    for (const v of [(lo - o) / d, (hi - o) / d]) if (v > 0 && v < 1) t.push(v);
  };
  addCuts(dx, a.x, min.x, max.x);
  addCuts(dy, a.y, min.y, max.y);
  addCuts(dz, a.z, min.z, max.z);
  t.sort((p, q) => p - q);
  const at = (s: number): number => {
    const x = a.x + dx * s;
    const y = a.y + dy * s;
    const z = a.z + dz * s;
    const px = x < min.x ? min.x - x : x > max.x ? x - max.x : 0;
    const py = y < min.y ? min.y - y : y > max.y ? y - max.y : 0;
    const pz = z < min.z ? min.z - z : z > max.z ? z - max.z : 0;
    return px * px + py * py + pz * pz;
  };
  let best = Infinity;
  for (let k = 0; k < t.length - 1; k++) {
    const begin = t[k]!;
    const end = t[k + 1]!;
    const mid = (begin + end) / 2;
    let qa = 0;
    let qb = 0;
    const x = a.x + dx * mid;
    const y = a.y + dy * mid;
    const z = a.z + dz * mid;
    if (x < min.x) { qa += dx * dx; qb += dx * (a.x - min.x); } else if (x > max.x) { qa += dx * dx; qb += dx * (a.x - max.x); }
    if (y < min.y) { qa += dy * dy; qb += dy * (a.y - min.y); } else if (y > max.y) { qa += dy * dy; qb += dy * (a.y - max.y); }
    if (z < min.z) { qa += dz * dz; qb += dz * (a.z - min.z); } else if (z > max.z) { qa += dz * dz; qb += dz * (a.z - max.z); }
    const critical = qa < 1e-12 ? begin : Math.max(begin, Math.min(end, -qb / qa));
    best = Math.min(best, at(critical), at(begin), at(end));
  }
  return best;
}

export function pointSegmentDistanceSq(p: V3, a: V3, b: V3): number {
  const d = sub(b, a);
  const sq = dot(d, d);
  const t = sq < 1e-12 ? 0 : Math.min(1, Math.max(0, dot(sub(p, a), d) / sq));
  const x = a.x + t * d.x - p.x;
  const y = a.y + t * d.y - p.y;
  const z = a.z + t * d.z - p.z;
  return x * x + y * y + z * z;
}

export function pointBoxDistanceSq(p: V3, min: V3, max: V3): number {
  const x = Math.max(min.x - p.x, p.x - max.x, 0);
  const y = Math.max(min.y - p.y, p.y - max.y, 0);
  const z = Math.max(min.z - p.z, p.z - max.z, 0);
  return x * x + y * y + z * z;
}

/** True when `target` lies within the cone around unit-ish `dir` from `origin`. */
export function inCone(origin: V3, dir: V3, target: V3, cosHalfAngle: number): boolean {
  const to = sub(target, origin);
  if (dot(to, to) < 1e-10) return false;
  return dot(normalize(to), normalize(dir)) >= cosHalfAngle;
}

/** An inclusive run of block cells along X at fixed (y, z). */
export interface Run {
  y: number;
  z: number;
  x0: number;
  x1: number;
}

export const countCells = (runs: readonly Run[]): number => runs.reduce((n, r) => n + r.x1 - r.x0 + 1, 0);

/** Block cells whose centers lie within `radius` of `center`, grouped into X runs (top layer first). */
export function sphereRuns(center: V3, radius: number, minY = -64, maxY = 319): Run[] {
  const runs: Run[] = [];
  const r2 = radius * radius;
  const yTop = Math.min(maxY, Math.floor(center.y + radius));
  const yBottom = Math.max(minY, Math.ceil(center.y - radius) - 1);
  for (let y = yTop; y >= yBottom; y--) {
    const dy = y + 0.5 - center.y;
    for (let z = Math.floor(center.z - radius) - 1; z <= Math.ceil(center.z + radius); z++) {
      const dz = z + 0.5 - center.z;
      const rest = r2 - dy * dy - dz * dz;
      if (rest < 0) continue;
      const half = Math.sqrt(rest);
      const x0 = Math.ceil(center.x - half - 0.5);
      const x1 = Math.floor(center.x + half - 0.5);
      if (x1 >= x0) runs.push({ y, z, x0, x1 });
    }
  }
  return runs;
}

/** Block cells (as unit boxes) within `radius` of the segment a→b, as X runs. */
export function capsuleRuns(a: V3, b: V3, radius: number, minY = -64, maxY = 319): Run[] {
  const rr = radius * radius;
  const runs: Run[] = [];
  const x0 = Math.floor(Math.min(a.x, b.x) - radius - 1);
  const x1 = Math.ceil(Math.max(a.x, b.x) + radius);
  const y0 = Math.max(minY, Math.floor(Math.min(a.y, b.y) - radius - 1));
  const y1 = Math.min(maxY, Math.ceil(Math.max(a.y, b.y) + radius));
  const z0 = Math.floor(Math.min(a.z, b.z) - radius - 1);
  const z1 = Math.ceil(Math.max(a.z, b.z) + radius);
  for (let y = y1; y >= y0; y--) {
    for (let z = z0; z <= z1; z++) {
      let start: number | null = null;
      for (let x = x0; x <= x1 + 1; x++) {
        const inside =
          x <= x1 && segmentBoxDistanceSq(a, b, { x, y, z }, { x: x + 1, y: y + 1, z: z + 1 }) <= rr;
        if (inside && start === null) start = x;
        if (!inside && start !== null) {
          runs.push({ y, z, x0: start, x1: x - 1 });
          start = null;
        }
      }
    }
  }
  return runs;
}

/** Red's carved dome (radius 5) above the ground, with the Java noisy ground ring. */
export function redDomeCells(origin: V3, groundY: number): V3[] {
  const r = 5;
  const cells: V3[] = [];
  const ox = Math.floor(origin.x);
  const oz = Math.floor(origin.z);
  for (let y = groundY; y <= groundY + r + 1; y++) {
    const height = Math.max(0, y - (groundY + 1));
    const layer2 = 25 - height * height;
    if (layer2 < 0) break;
    for (let x = ox - r; x <= ox + r; x++) {
      for (let z = oz - r; z <= oz + r; z++) {
        const dx = x + 0.5 - origin.x;
        const dz = z + 0.5 - origin.z;
        const radial2 = dx * dx + dz * dz;
        if (radial2 > layer2) continue;
        if (y === groundY && !groundPattern(x, z, radial2)) continue;
        cells.push({ x, y, z });
      }
    }
  }
  return cells;
}

function groundPattern(x: number, z: number, radial2: number): boolean {
  if (radial2 < 10.5) return true;
  let noise = Math.imul(x, 73428767) ^ Math.imul(z, 912931) ^ Math.imul(x + z, 27183);
  noise ^= noise >>> 16;
  return (noise & 7) < (radial2 > 20 ? 4 : 6);
}
