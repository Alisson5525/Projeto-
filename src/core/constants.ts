// Gameplay constants from the Java mod (docs/analise/analise-mod-java.md).
// Times are in game ticks (20 per second).

export const LEVEL_CAP = 100;
export const STAT_CAP = 100;
export const POINTS_PER_LEVEL = 3;

export const ENERGY = {
  base: 240,
  perLevel: 3,
  perPoint: 4.6,
  cap: 1000,
  regenInterval: 5,
  regenDelay: 15,
  regenRampTicks: 225,
  outOfCombatBonus: 1.3,
} as const;

export const ATTR = {
  healthPerVit: 0.25,
  reductionPerVit: 0.002,
  attackPerStr: 0.04,
  physicalPerStr: 0.008,
  cursedPerCe: 0.0065,
} as const;

export const XP = {
  killBase: 22,
  killPerHealth: 0.65,
  killHealthCap: 160,
  wither: 750,
  dragon: 1200,
} as const;

/** Base cursed-energy costs (before Six Eyes). */
export const COST = {
  infinityStart: 45,
  infinityPerSecond: 28,
  blue: 60,
  barrage: 0,
  red: 100,
  purple: 200,
  nuke: 120,
  awakening: 100,
  domain: 280,
  maxBlue: 140,
  maxRed: 160,
  rctHeal: 40,
} as const;

/** Cooldowns in ticks. */
export const COOLDOWN = {
  infinity: 60,
  blue: 100,
  barrage: 200,
  red: 160,
  purple: 400,
  awakening: 2000,
  maxBlue: 800,
  maxRed: 240,
  rctHeal: 20,
  roll: 40,
  rollStunEscape: 240,
} as const;

export const UNLOCK_LEVEL = { barrage: 6, rctTrial: 15, red: 18, purple: 32, awakening: 48 } as const;

export const AWAKENING_TICKS = 1200;
export const RCT_HEAL_AMOUNT = 4;
