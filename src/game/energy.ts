// Cursed energy: costs, spending and the 5-tick regeneration/upkeep step.
import { COST, ENERGY } from "../core/constants";
import { effectiveCost, energyRecovery } from "../core/progression";
import { maxEnergy, now, type Runtime } from "./players";
import { grantTechniqueXp } from "./xp";

export const cost = (r: Runtime, base: number): number => effectiveCost(base, r.profile.sixEyes);
export const canAfford = (r: Runtime, base: number): boolean => r.energy >= cost(r, base);

/** Spends a technique cost and grants technique XP (Java commitTechnique). */
export function commit(r: Runtime, base: number, xpBase = base): void {
  r.energy = Math.max(0, r.energy - cost(r, base));
  r.lastTechniqueTick = now();
  r.hudDirty = true;
  grantTechniqueXp(r, xpBase);
}

/** Runs every tick; acts every 5 ticks like ServerGame.tick. Returns true if Infinity ran dry. */
export function tickEnergy(r: Runtime, tick: number, alive: boolean): boolean {
  const max = maxEnergy(r);
  if (r.energy > max) {
    r.energy = max;
    r.hudDirty = true;
  }
  if (!alive || tick % ENERGY.regenInterval !== 0) return false;
  if (r.infinity && !r.profile.sixEyes) {
    const upkeep = (COST.infinityPerSecond * ENERGY.regenInterval) / 20;
    r.energy = Math.max(0, r.energy - upkeep);
    r.hudDirty = true;
    return r.energy === 0;
  }
  if (!r.infinity && r.energy < max) {
    const gain = energyRecovery(tick - r.lastTechniqueTick, r.profile.ce, r.combat);
    if (gain > 0) {
      r.energy = Math.min(max, r.energy + gain);
      r.hudDirty = true;
    }
  }
  return false;
}
