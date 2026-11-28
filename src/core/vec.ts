// Minimal 3D vector helpers in Minecraft conventions (yaw 0 = south/+Z,
// pitch > 0 = looking down). Local frames are (x = right, y = up, z = forward).

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const lengthSq = (a: V3): number => dot(a, a);
export const length = (a: V3): number => Math.sqrt(dot(a, a));
export const distanceSq = (a: V3, b: V3): number => lengthSq(sub(a, b));
export const lerp = (a: V3, b: V3, t: number): V3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
export function normalize(a: V3): V3 {
  const l = length(a);
  return l < 1e-9 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l);
}

export const rad = (deg: number): number => (deg * Math.PI) / 180;
export const deg = (r: number): number => (r * 180) / Math.PI;

/** Java Vec3.directionFromRotation(pitch, yaw). */
export function directionFromRotation(pitchDeg: number, yawDeg: number): V3 {
  const p = rad(pitchDeg);
  const y = rad(yawDeg);
  return { x: -Math.sin(y) * Math.cos(p), y: -Math.sin(p), z: Math.cos(y) * Math.cos(p) };
}

/** Yaw (degrees) that looks along a horizontal direction. */
export const yawOf = (d: V3): number => deg(Math.atan2(-d.x, d.z));
export const pitchOf = (d: V3): number => deg(-Math.atan2(d.y, Math.hypot(d.x, d.z)));

export const rightOf = (yawDeg: number): V3 => ({ x: -Math.cos(rad(yawDeg)), y: 0, z: -Math.sin(rad(yawDeg)) });
export const forwardOf = (yawDeg: number): V3 => ({ x: -Math.sin(rad(yawDeg)), y: 0, z: Math.cos(rad(yawDeg)) });

/** origin + right*l.x + up*l.y + forward*l.z (horizontal frame of `yaw`). */
export function toWorld(origin: V3, yawDeg: number, local: V3): V3 {
  const r = rightOf(yawDeg);
  const f = forwardOf(yawDeg);
  return { x: origin.x + r.x * local.x + f.x * local.z, y: origin.y + local.y, z: origin.z + r.z * local.x + f.z * local.z };
}

export function toLocal(origin: V3, yawDeg: number, world: V3): V3 {
  const d = sub(world, origin);
  const r = rightOf(yawDeg);
  const f = forwardOf(yawDeg);
  return { x: d.x * r.x + d.z * r.z, y: d.y, z: d.x * f.x + d.z * f.z };
}

export const smoothstep = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
export const smootherstep = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
