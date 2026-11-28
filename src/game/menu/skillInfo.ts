// Text data for the innate technique pages (Java innate.jujutsukaisen.gojo.*).
import type { RawMessage } from "@minecraft/server";
import { AWAKENING_TICKS, COST, RCT_HEAL_AMOUNT } from "../../core/constants";
import { lockReason, skillLevel } from "../../core/progression";
import { TL } from "../../core/timelines";
import { cost } from "../energy";
import { K, type SkillName, skillDescKey, skillNameKey, skillStatsKey, tr } from "../i18n";
import type { Runtime } from "../players";

export interface SkillEntry {
  slot: number;
  skill: SkillName;
  icon: string;
}

export const NORMAL_SLOTS: SkillEntry[] = [
  { slot: 1, skill: "infinity", icon: "textures/jjk/icons/infinity" },
  { slot: 2, skill: "blue", icon: "textures/jjk/icons/blue" },
  { slot: 3, skill: "barrage", icon: "textures/jjk/icons/barrage" },
  { slot: 4, skill: "red", icon: "textures/jjk/icons/red" },
  { slot: 5, skill: "purple", icon: "textures/jjk/icons/purple" },
  { slot: 6, skill: "awakening", icon: "textures/jjk/icons/awakening" },
];

export const AWAKENED_SLOTS: SkillEntry[] = [
  { slot: 1, skill: "infinity", icon: "textures/jjk/icons/infinity" },
  { slot: 2, skill: "max_blue", icon: "textures/jjk/icons/max_blue" },
  { slot: 3, skill: "barrage", icon: "textures/jjk/icons/barrage" },
  { slot: 4, skill: "max_red", icon: "textures/jjk/icons/max_red" },
  { slot: 5, skill: "awakened_purple", icon: "textures/jjk/icons/awakened_purple" },
  { slot: 6, skill: "void", icon: "textures/jjk/icons/void" },
];

export const UTILITY_SLOTS: SkillEntry[] = [
  { slot: 7, skill: "dodge", icon: "textures/jjk/icons/dodge" },
  { slot: 8, skill: "rct", icon: "textures/jjk/icons/rct" },
];

export function statsLine(r: Runtime, skill: SkillName): RawMessage {
  const c = (base: number) => cost(r, base);
  switch (skill) {
    case "infinity":
      return r.profile.sixEyes ? tr(K.innateSixEyes) : tr(skillStatsKey(skill), c(COST.infinityStart), COST.infinityPerSecond);
    case "blue":
      return tr(skillStatsKey(skill), c(COST.blue), TL.blue.range);
    case "barrage":
      return tr(skillStatsKey(skill), TL.barrage.openingDamage + TL.barrage.punchTotal + TL.barrage.kickDamage);
    case "red":
      return tr(skillStatsKey(skill), c(COST.red), TL.red.edgeDamage, TL.red.maxDamage);
    case "purple":
      return tr(skillStatsKey(skill), c(COST.purple), TL.purple.damage);
    case "awakening":
      return tr(skillStatsKey(skill), c(COST.awakening), AWAKENING_TICKS / 20);
    case "max_blue":
      return tr(skillStatsKey(skill), c(COST.maxBlue), TL.maxBlue.damage * TL.maxBlue.maxHits);
    case "max_red":
      return tr(skillStatsKey(skill), c(COST.maxRed), TL.maxRed.damage);
    case "awakened_purple":
      return tr(skillStatsKey(skill), c(COST.purple), TL.purple.awakenedDamage, TL.selfPurple.damage, c(COST.nuke));
    case "void":
      return tr(skillStatsKey(skill), c(COST.domain), TL.domain.active / 20);
    case "dodge":
      return tr(skillStatsKey(skill));
    case "rct":
      return tr(skillStatsKey(skill), RCT_HEAL_AMOUNT / 2, c(COST.rctHeal));
  }
}

export function unlockLine(r: Runtime, slot: number): RawMessage {
  const reason = lockReason(slot, r.profile.level, r.profile.rct);
  if (!reason) return tr(K.innateUnlocked);
  if (reason === "rct") return tr(K.needRct, skillLevel(4));
  if (reason === "red") return tr(K.needRed, skillLevel(5));
  return tr(K.needLevel, skillLevel(slot));
}

export const nameOf = (skill: SkillName): RawMessage => tr(skillNameKey(skill));
export const descOf = (skill: SkillName): RawMessage => tr(skillDescKey(skill));
