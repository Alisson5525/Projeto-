// Dodge roll rules, ported from server/RollServer.java.

/** 0 forward, 1 back, 2 left, 3 right (Java direction ids). */
export type RollDir = 0 | 1 | 2 | 3;

export const ROLL = {
  ticks: 10,
  speed: 0.72,
  lift: 0.16,
  cooldown: 40,
  stunEscapeLockout: 240,
  landingBuffer: 7,
  landingMaxDistance: 2.62,
};

/**
 * Picks the roll direction from input expressed in the player's local frame
 * (forward > 0 means forward, right > 0 means right). Neutral input rolls back.
 */
export function rollDirectionFromVector(forward: number, right: number): RollDir {
  if (Math.abs(forward) < 0.2 && Math.abs(right) < 0.2) return 1;
  if (Math.abs(forward) >= Math.abs(right)) return forward > 0 ? 0 : 1;
  return right > 0 ? 3 : 2;
}

export function rollSpeed(tick: number): number {
  if (tick >= ROLL.ticks) return 0;
  return ROLL.speed * Math.pow(1 - tick / ROLL.ticks, 1.25);
}

/** Unit horizontal vector for a roll direction given the locked yaw in degrees (Bedrock convention). */
export function rollVector(dir: RollDir, yawDeg: number): { x: number; z: number } {
  const a = (yawDeg * Math.PI) / 180;
  const f = { x: -Math.sin(a), z: Math.cos(a) };
  const r = { x: -Math.cos(a), z: -Math.sin(a) };
  switch (dir) {
    case 1:
      return { x: -f.x, z: -f.z };
    case 2:
      return { x: -r.x, z: -r.z };
    case 3:
      return r;
    default:
      return f;
  }
}
