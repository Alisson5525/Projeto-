// Infinity rules ported from GojoInfinityServer / GojoInfinityDamagePolicy.

export const INFINITY = {
  outerGap: 5.2,
  minGap: 0.42,
  searchRange: 7.2,
  minMobFactor: 0.015,
  mobPadding: 0.44,
  deflectSoundInterval: 5,
  approachLimit: 0.38,
} as const;

/** Fraction of an approaching object's speed that survives at `gap` blocks. */
export function infinitySpeedFactor(gap: number): number {
  if (gap <= INFINITY.minGap) return 0;
  if (gap >= INFINITY.outerGap) return 1;
  return Math.pow((gap - INFINITY.minGap) / (INFINITY.outerGap - INFINITY.minGap), 1.55);
}

/**
 * Whether Infinity cancels damage of a Bedrock damage `cause`.
 * `projectile`: the direct damager is a projectile entity.
 * `outsideBody`: the damage source position is outside the defender's body.
 */
export function infinityBlocks(cause: string, projectile: boolean, outsideBody: boolean): boolean {
  switch (cause) {
    case "entityAttack":
    case "ramAttack":
    case "charging":
    case "maceSmash":
      return true;
    case "anvil":
    case "fallingBlock":
    case "stalactite":
      return true;
    case "entityExplosion":
    case "blockExplosion":
    case "fireworks":
      return outsideBody;
    case "projectile":
      return projectile || outsideBody;
    default:
      return false;
  }
}

type P3 = { x: number; y: number; z: number };

/** Euclidean gap between two boxes (0 when they touch or overlap). */
export function boxGap(aMin: P3, aMax: P3, bMin: P3, bMax: P3): number {
  const dx = Math.max(0, aMin.x - bMax.x, bMin.x - aMax.x);
  const dy = Math.max(0, aMin.y - bMax.y, bMin.y - aMax.y);
  const dz = Math.max(0, aMin.z - bMax.z, bMin.z - aMax.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * New velocity of a projectile/falling block near a defender (beforeEntityTick):
 * slowed by the gap and with its approach speed capped. null = leave it alone.
 * `toDefender` points from the object to the defender's center.
 */
export function slowedProjectileVelocity(velocity: P3, toDefender: P3, gap: number): P3 | null {
  if (gap >= INFINITY.outerGap) return null;
  const approaching = velocity.x * toDefender.x + velocity.y * toDefender.y + velocity.z * toDefender.z > 0;
  if (gap >= 1.25 && !approaching) return null;
  const f = infinitySpeedFactor(gap);
  let v = { x: velocity.x * f, y: velocity.y * f, z: velocity.z * f };
  const len = Math.hypot(toDefender.x, toDefender.y, toDefender.z);
  if (gap > INFINITY.minGap && len > 1e-4) {
    const approach = (v.x * toDefender.x + v.y * toDefender.y + v.z * toDefender.z) / len;
    const permitted = INFINITY.approachLimit * (gap - INFINITY.minGap);
    if (approach > permitted) {
      const s = permitted / approach;
      v = { x: v.x * s, y: v.y * s, z: v.z * s };
    }
  }
  return v;
}

/**
 * If `pos` is inside the body box inflated by `inflate`, the point on that
 * boundary along the ray from the body center (+0.02); otherwise null.
 */
export function clearancePoint(pos: P3, bodyMin: P3, bodyMax: P3, inflate: number, motion: P3): P3 | null {
  const min = { x: bodyMin.x - inflate, y: bodyMin.y - inflate, z: bodyMin.z - inflate };
  const max = { x: bodyMax.x + inflate, y: bodyMax.y + inflate, z: bodyMax.z + inflate };
  if (pos.x < min.x || pos.x > max.x || pos.y < min.y || pos.y > max.y || pos.z < min.z || pos.z > max.z) return null;
  const c = { x: (bodyMin.x + bodyMax.x) / 2, y: (bodyMin.y + bodyMax.y) / 2, z: (bodyMin.z + bodyMax.z) / 2 };
  let ray = { x: pos.x - c.x, y: pos.y - c.y, z: pos.z - c.z };
  if (ray.x * ray.x + ray.y * ray.y + ray.z * ray.z < 1e-8) {
    const m2 = motion.x * motion.x + motion.y * motion.y + motion.z * motion.z;
    ray = m2 > 1e-8 ? { x: -motion.x, y: -motion.y, z: -motion.z } : { x: 1, y: 0, z: 0 };
  }
  const l = Math.hypot(ray.x, ray.y, ray.z);
  ray = { x: ray.x / l, y: ray.y / l, z: ray.z / l };
  const axis = (r: number, lo: number, hi: number, center: number) =>
    r === 0 ? Infinity : (r > 0 ? hi - center : center - lo) / Math.abs(r);
  const boundary = Math.min(axis(ray.x, min.x, max.x, c.x), axis(ray.y, min.y, max.y, c.y), axis(ray.z, min.z, max.z, c.z)) + 0.02;
  return { x: c.x + ray.x * boundary, y: c.y + ray.y * boundary, z: c.z + ray.z * boundary };
}

/**
 * Horizontal moves that push a mob out of the padded body box, shortest first
 * (enforceMobClearance). Empty when the mob is not pressing against the body.
 */
export function mobPushOptions(bodyMin: P3, bodyMax: P3, enemyMin: P3, enemyMax: P3, padding: number = INFINITY.mobPadding): { dx: number; dz: number }[] {
  if (enemyMax.y <= bodyMin.y || enemyMin.y >= bodyMax.y) return [];
  const left = bodyMin.x - padding - enemyMax.x;
  const right = bodyMax.x + padding - enemyMin.x;
  const back = bodyMin.z - padding - enemyMax.z;
  const front = bodyMax.z + padding - enemyMin.z;
  if (left >= 0 || right <= 0 || back >= 0 || front <= 0) return [];
  const options = [
    { dx: left, dz: 0 },
    { dx: right, dz: 0 },
    { dx: 0, dz: back },
    { dx: 0, dz: front },
  ];
  return options
    .map((o, i) => ({ o, i, d: Math.abs(o.dx) + Math.abs(o.dz) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.o);
}
