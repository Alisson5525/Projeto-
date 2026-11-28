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
