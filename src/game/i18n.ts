// Lang keys used by the scripts (texts/pt_BR.lang + en_US.lang in the RP)
// and a helper to build translated raw messages.
import type { RawMessage } from "@minecraft/server";

export const K = {
  levelUp: "jjk.progress.level_up",
  xpGain: "jjk.progress.xp_gain",
  needLevel: "jjk.progress.skill_level",
  needRct: "jjk.progress.need_rct",
  needRed: "jjk.progress.need_red",
  noEnergy: "jjk.combat.no_energy",
  cooldown: "jjk.combat.cooldown",
  combatOn: "jjk.combat.on",
  combatOff: "jjk.combat.off",
  needTechnique: "jjk.combat.need_technique",
  awakeningOver: "jjk.combat.awakening_over",
  menuTitle: "jjk.menu.title",
  menuBody: "jjk.menu.body",
  menuStats: "jjk.menu.stats",
  menuInnate: "jjk.menu.innate",
  menuLearned: "jjk.menu.learned",
  menuSettings: "jjk.menu.settings",
  menuCombatEnter: "jjk.menu.combat_enter",
  menuCombatLeave: "jjk.menu.combat_leave",
  menuHelp: "jjk.menu.help",
  menuClose: "jjk.menu.close",
  back: "jjk.menu.back",
  statsTitle: "jjk.stats.title",
  statsBody: "jjk.stats.body",
  statVit: "jjk.stats.vit",
  statStr: "jjk.stats.str",
  statCe: "jjk.stats.ce",
  statRemove: "jjk.stats.remove",
  statsSliders: "jjk.stats.sliders",
  statsSlidersTitle: "jjk.stats.sliders_title",
  statsTooMany: "jjk.stats.too_many",
  innateTitle: "jjk.innate.title",
  innateBody: "jjk.innate.body",
  innateAwakened: "jjk.innate.awakened",
  innateNormal: "jjk.innate.normal",
  innateLocked: "jjk.innate.locked",
  innateUnlocked: "jjk.innate.unlocked",
  innateSixEyes: "jjk.innate.six_eyes",
  learnedTitle: "jjk.learned.title",
  learnedBody: "jjk.learned.body",
  rctName: "jjk.learned.rct",
  rctLearned: "jjk.learned.rct_learned",
  rctAvailable: "jjk.learned.rct_available",
  rctLocked: "jjk.learned.rct_locked",
  rctInfo: "jjk.learned.rct_info",
  blackFlash: "jjk.learned.black_flash",
  simpleDomain: "jjk.learned.simple_domain",
  planned: "jjk.learned.planned",
  trialStart: "jjk.trial.start",
  trialBody: "jjk.trial.body",
  trialPulse: "jjk.trial.pulse",
  trialHold: "jjk.trial.hold",
  trialRelease: "jjk.trial.release",
  trialHit: "jjk.trial.hit",
  trialMiss: "jjk.trial.miss",
  trialPassed: "jjk.trial.passed",
  trialFailed: "jjk.trial.failed",
  trialInterrupted: "jjk.trial.interrupted",
  settingsTitle: "jjk.settings.title",
  settingsSfx: "jjk.settings.sfx",
  settingsVoice: "jjk.settings.voice",
  settingsMusic: "jjk.settings.music",
  settingsCamDist: "jjk.settings.cam_dist",
  settingsCamNear: "jjk.settings.cam_near",
  settingsCamNormal: "jjk.settings.cam_normal",
  settingsCamFar: "jjk.settings.cam_far",
  settingsCamLeft: "jjk.settings.cam_left",
  settingsSlotNumbers: "jjk.settings.slot_numbers",
  settingsPerf: "jjk.settings.perf",
  settingsPerfLow: "jjk.settings.perf_low",
  settingsPerfMid: "jjk.settings.perf_mid",
  settingsPerfHigh: "jjk.settings.perf_high",
  settingsTerrain: "jjk.settings.terrain",
  settingsTerrainOff: "jjk.settings.terrain_off",
  settingsTerrainLight: "jjk.settings.terrain_light",
  settingsTerrainFull: "jjk.settings.terrain_full",
  settingsWorldOnlyOp: "jjk.settings.world_only_op",
  settingsSaved: "jjk.settings.saved",
  chooseTitle: "jjk.choose.title",
  chooseBody: "jjk.choose.body",
  chooseLimitless: "jjk.choose.limitless",
  chooseDone: "jjk.choose.done",
  chooseDoneSub: "jjk.choose.done_sub",
  chooseRetry: "jjk.choose.retry",
  helpTitle: "jjk.help.title",
  helpBody: "jjk.help.body",
  cmdLevel: "jjk.cmd.level",
  cmdRct: "jjk.cmd.rct",
  cmdReset: "jjk.cmd.reset",
  cmdXp: "jjk.cmd.xp",
  techniqueItemGiven: "jjk.item.technique_given",
  sixEyesConfirm: "jjk.six_eyes.confirm",
  sixEyesDone: "jjk.six_eyes.done",
  sixEyesHas: "jjk.six_eyes.has",
  domainOverlap: "jjk.domain.overlap",
  domainTargets: "jjk.domain.targets",
  domainTimeout: "jjk.domain.timeout",
  domainTitle: "jjk.domain.title",
  domainSub: "jjk.domain.sub",
  domainBusy: "jjk.domain.busy",
  rctHealOn: "jjk.rct.heal_on",
  rctHealOff: "jjk.rct.heal_off",
  hintBlueTarget: "jjk.hint.blue_target",
  hintBlueFree: "jjk.hint.blue_free",
} as const;

export const SKILL_KEYS = [
  "infinity",
  "blue",
  "barrage",
  "red",
  "purple",
  "awakening",
  "max_blue",
  "max_red",
  "awakened_purple",
  "void",
  "dodge",
  "rct",
] as const;
export type SkillName = (typeof SKILL_KEYS)[number];

export const skillNameKey = (s: SkillName): string => `jjk.skill.${s}.name`;
export const skillDescKey = (s: SkillName): string => `jjk.skill.${s}.desc`;
export const skillStatsKey = (s: SkillName): string => `jjk.skill.${s}.stats`;

export const LANG_KEYS: readonly string[] = [
  ...Object.values(K),
  ...SKILL_KEYS.flatMap((s) => [skillNameKey(s), skillDescKey(s), skillStatsKey(s)]),
];

type Arg = string | number | RawMessage;

export function tr(key: string, ...args: Arg[]): RawMessage {
  if (!args.length) return { translate: key };
  return { translate: key, with: { rawtext: args.map((a) => (typeof a === "object" ? a : { text: String(a) })) } };
}

/** Concatenate raw messages / plain strings. */
export function join(...parts: (string | RawMessage)[]): RawMessage {
  return { rawtext: parts.map((p) => (typeof p === "string" ? { text: p } : p)) };
}
