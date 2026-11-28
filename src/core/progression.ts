// Progression, energy and unlock rules ported from MenuProgression/ServerGame.
import { ATTR, ENERGY, LEVEL_CAP, POINTS_PER_LEVEL, UNLOCK_LEVEL, XP } from "./constants";

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function xpToNext(level: number): number {
  if (level >= LEVEL_CAP) return 0;
  const l = Math.max(0, level);
  return 40 + 3 * l + Math.floor((l * l) / 24);
}

export function killXp(maxHealth: number): number {
  return XP.killBase + Math.round(clamp(maxHealth, 0, XP.killHealthCap) * XP.killPerHealth);
}

export function techniqueXp(baseCost: number): number {
  return clamp(3 + Math.floor(baseCost / 12), 4, 24);
}

export function earnedPoints(level: number): number {
  return clamp(level, 0, LEVEL_CAP) * POINTS_PER_LEVEL;
}

export function energyMax(level: number, cursedPoints: number): number {
  return Math.min(
    ENERGY.cap,
    ENERGY.base + clamp(level, 0, LEVEL_CAP) * ENERGY.perLevel + Math.round(cursedPoints * ENERGY.perPoint),
  );
}

export function effectiveCost(baseCost: number, sixEyes: boolean): number {
  return sixEyes ? Math.floor((baseCost + 19) / 20) : baseCost;
}

/** Energy restored on one regen step (every 5 ticks) after `idleTicks` without techniques. */
export function energyRecovery(idleTicks: number, cursedPoints: number, combat: boolean): number {
  if (idleTicks < ENERGY.regenDelay) return 0;
  const p = clamp((idleTicks - ENERGY.regenDelay) / ENERGY.regenRampTicks, 0, 1);
  const ramp = p * p * (3 - 2 * p);
  const recovery = 2 + ramp * (12 + cursedPoints / 25);
  return Math.round(recovery * (combat ? 1 : ENERGY.outOfCombatBonus));
}

export const physicalMult = (strength: number): number => 1 + strength * ATTR.physicalPerStr;
export const cursedMult = (cursed: number): number => 1 + cursed * ATTR.cursedPerCe;
export const vitalityHealthBonus = (vitality: number): number => vitality * ATTR.healthPerVit;
export const vitalityReduction = (vitality: number): number => vitality * ATTR.reductionPerVit;
export const strengthAttackBonus = (strength: number): number => strength * ATTR.attackPerStr;

export type Slot = 1 | 2 | 3 | 4 | 5 | 6;

export function skillLevel(slot: number): number {
  switch (slot) {
    case 3:
      return UNLOCK_LEVEL.barrage;
    case 4:
      return UNLOCK_LEVEL.red;
    case 5:
      return UNLOCK_LEVEL.purple;
    case 6:
      return UNLOCK_LEVEL.awakening;
    default:
      return 0;
  }
}

export function isSkillUnlocked(slot: number, level: number, rct: boolean): boolean {
  if (slot < 1 || slot > 6 || level < skillLevel(slot)) return false;
  if (slot === 4) return rct;
  if (slot === 5) return isSkillUnlocked(4, level, rct);
  return true;
}

export type LockReason = "level" | "rct" | "red";

export function lockReason(slot: number, level: number, rct: boolean): LockReason | null {
  if (isSkillUnlocked(slot, level, rct)) return null;
  if (level < skillLevel(slot)) return "level";
  if (slot === 4) return "rct";
  if (slot === 5) return "red";
  return "level";
}
