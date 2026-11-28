// Menu Jujutsu (JJKMenuScreen): stats, innate technique, learned techniques,
// settings and help, built with server forms.
import type { Player, RawMessage } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { COST, STAT_CAP, UNLOCK_LEVEL } from "../../core/constants";
import { investStat, remainingPoints, type Stat } from "../../core/profile";
import { cursedMult, earnedPoints, energyMax, physicalMult, strengthAttackBonus, vitalityHealthBonus, vitalityReduction, xpToNext } from "../../core/progression";
import type { PerfProfile, TerrainMode } from "../../core/worldSettings";
import { refreshAttributes } from "../attributes";
import { toggleCombat } from "../combatMode";
import { show } from "../forms";
import { join, K, tr } from "../i18n";
import { cost } from "../energy";
import { isAwakened, rt, type Runtime, saveProfile } from "../players";
import { startTrial } from "../rct";
import { saveWorldSettings, worldSettings } from "../settings";
import { AWAKENED_SLOTS, descOf, nameOf, NORMAL_SLOTS, type SkillEntry, statsLine, unlockLine, UTILITY_SLOTS } from "./skillInfo";

const title = (key: string): RawMessage => tr(key);
const pct = (v: number): string => (Math.round(v * 1000) / 10).toString();

export async function openMainMenu(player: Player): Promise<void> {
  const r = rt(player);
  const p = r.profile;
  const form = new ActionFormData()
    .title(title(K.menuTitle))
    .body(tr(K.menuBody, p.level, p.xp, xpToNext(p.level), Math.floor(r.energy), energyMax(p.level, p.ce), remainingPoints(p)))
    .button(tr(K.menuStats), "textures/jjk/ui/nav_stats")
    .button(tr(K.menuInnate), "textures/jjk/icons/infinity")
    .button(tr(K.menuLearned), "textures/jjk/icons/rct")
    .button(tr(K.menuSettings), "textures/jjk/ui/nav_settings")
    .button(tr(r.combat ? K.menuCombatLeave : K.menuCombatEnter), "textures/jjk/icons/void")
    .button(tr(K.menuHelp), "textures/jjk/icons/none");
  const res = await show(player, form);
  if (res.canceled || res.selection === undefined) return;
  switch (res.selection) {
    case 0:
      return openStats(player);
    case 1:
      return openInnate(player, isAwakened(r));
    case 2:
      return openLearned(player);
    case 3:
      return openSettings(player);
    case 4:
      return toggleCombat(rt(player));
    case 5:
      return openHelp(player);
  }
}

async function openStats(player: Player): Promise<void> {
  const r = rt(player);
  const p = r.profile;
  const form = new ActionFormData()
    .title(title(K.statsTitle))
    .body(
      tr(
        K.statsBody,
        p.level,
        remainingPoints(p),
        earnedPoints(p.level),
        p.vit,
        vitalityHealthBonus(p.vit),
        pct(vitalityReduction(p.vit)),
        p.str,
        strengthAttackBonus(p.str).toFixed(2),
        pct(physicalMult(p.str) - 1),
        p.ce,
        energyMax(p.level, p.ce),
        pct(cursedMult(p.ce) - 1),
      ),
    )
    .button(tr(K.statVit, p.vit, STAT_CAP), "textures/jjk/icons/rct")
    .button(tr(K.statStr, p.str, STAT_CAP), "textures/jjk/icons/barrage")
    .button(tr(K.statCe, p.ce, STAT_CAP), "textures/jjk/icons/blue")
    .button(tr(K.statsSliders), "textures/jjk/ui/nav_stats")
    .button(tr(K.back), "textures/jjk/icons/none");
  const res = await show(player, form);
  if (res.canceled || res.selection === undefined) return;
  const stats: Stat[] = ["vit", "str", "ce"];
  if (res.selection <= 2) {
    const stat = stats[res.selection]!;
    const next = investStat(r.profile, stat);
    if (next !== r.profile) applyProfile(r, next);
    return openStats(player);
  }
  if (res.selection === 3) return openStatSliders(player);
  return openMainMenu(player);
}

async function openStatSliders(player: Player): Promise<void> {
  const r = rt(player);
  const p = r.profile;
  const total = earnedPoints(p.level);
  const form = new ModalFormData()
    .title(title(K.statsSlidersTitle))
    .slider(tr(K.statVit, p.vit, STAT_CAP), 0, Math.min(STAT_CAP, total), { defaultValue: p.vit, valueStep: 1 })
    .slider(tr(K.statStr, p.str, STAT_CAP), 0, Math.min(STAT_CAP, total), { defaultValue: p.str, valueStep: 1 })
    .slider(tr(K.statCe, p.ce, STAT_CAP), 0, Math.min(STAT_CAP, total), { defaultValue: p.ce, valueStep: 1 })
    .submitButton(tr(K.settingsSaved));
  const res = await show(player, form);
  if (res.canceled || !res.formValues) return openStats(player);
  const [vit, str, ce] = res.formValues.filter((v) => typeof v === "number") as number[];
  if (vit === undefined || str === undefined || ce === undefined) return openStats(player);
  if (vit + str + ce > total) {
    player.onScreenDisplay.setActionBar(tr(K.statsTooMany, total));
    return openStats(player);
  }
  applyProfile(r, { ...r.profile, vit, str, ce });
  return openStats(player);
}

function applyProfile(r: Runtime, next: Runtime["profile"]): void {
  r.profile = next;
  saveProfile(r);
  refreshAttributes(r);
}

async function openInnate(player: Player, awakened: boolean): Promise<void> {
  const r = rt(player);
  const slots: SkillEntry[] = [...(awakened ? AWAKENED_SLOTS : NORMAL_SLOTS), ...UTILITY_SLOTS];
  const form = new ActionFormData().title(title(K.innateTitle)).body(tr(K.innateBody));
  for (const s of slots) form.button(join(`${s.slot} · `, nameOf(s.skill)), s.icon);
  form.button(tr(awakened ? K.innateNormal : K.innateAwakened), awakened ? "textures/jjk/icons/infinity" : "textures/jjk/icons/void");
  form.button(tr(K.back), "textures/jjk/icons/none");
  const res = await show(player, form);
  if (res.canceled || res.selection === undefined) return;
  if (res.selection < slots.length) return openSkill(player, slots[res.selection]!, awakened, r);
  if (res.selection === slots.length) return openInnate(player, !awakened);
  return openMainMenu(player);
}

async function openSkill(player: Player, s: SkillEntry, awakened: boolean, r: Runtime): Promise<void> {
  const unlock = s.slot <= 6 ? unlockLine(r, s.slot) : s.skill === "rct" && !r.profile.rct ? tr(K.rctLocked, UNLOCK_LEVEL.rctTrial) : tr(K.innateUnlocked);
  const form = new ActionFormData()
    .title(nameOf(s.skill))
    .body(join(descOf(s.skill), "\n\n§b", statsLine(r, s.skill), "§r\n\n", unlock))
    .button(tr(K.back), "textures/jjk/icons/none");
  await show(player, form);
  return openInnate(player, awakened);
}

async function openLearned(player: Player): Promise<void> {
  const r = rt(player);
  const p = r.profile;
  const status = p.rct ? tr(K.rctLearned) : p.level >= UNLOCK_LEVEL.rctTrial ? tr(K.rctAvailable) : tr(K.rctLocked, UNLOCK_LEVEL.rctTrial);
  const form = new ActionFormData()
    .title(title(K.learnedTitle))
    .body(join(tr(K.learnedBody), "\n\n§b", tr(K.rctName), "§r: ", status, "\n", tr(K.rctInfo, 2, cost(r, COST.rctHeal)), "\n\n§7", tr(K.blackFlash), " · ", tr(K.planned), "\n", tr(K.simpleDomain), " · ", tr(K.planned)))
    .button(tr(K.trialStart), "textures/jjk/icons/rct")
    .button(tr(K.back), "textures/jjk/icons/none");
  const res = await show(player, form);
  if (res.canceled || res.selection === undefined) return;
  if (res.selection === 0) return startTrial(r);
  return openMainMenu(player);
}

async function openSettings(player: Player): Promise<void> {
  const r = rt(player);
  const s = r.profile.settings;
  const op = player.playerPermissionLevel >= 2;
  const ws = worldSettings();
  const perfs: PerfProfile[] = ["leve", "medio", "alto"];
  const terrains: TerrainMode[] = ["desligada", "leve", "completa"];
  const form = new ModalFormData()
    .title(title(K.settingsTitle))
    .slider(tr(K.settingsSfx), 0, 100, { defaultValue: s.sfx, valueStep: 10 })
    .slider(tr(K.settingsVoice), 0, 100, { defaultValue: s.voice, valueStep: 10 })
    .slider(tr(K.settingsMusic), 0, 100, { defaultValue: s.music, valueStep: 10 })
    .dropdown(tr(K.settingsCamDist), [tr(K.settingsCamNear), tr(K.settingsCamNormal), tr(K.settingsCamFar)], { defaultValueIndex: s.camDist })
    .toggle(tr(K.settingsCamLeft), { defaultValue: s.camSide === -1 })
    .toggle(tr(K.settingsSlotNumbers), { defaultValue: s.slotNumbers })
    .dropdown(join(tr(K.settingsPerf), op ? "" : join(" ", tr(K.settingsWorldOnlyOp))), [tr(K.settingsPerfLow), tr(K.settingsPerfMid), tr(K.settingsPerfHigh)], {
      defaultValueIndex: perfs.indexOf(ws.perf),
    })
    .dropdown(join(tr(K.settingsTerrain), op ? "" : join(" ", tr(K.settingsWorldOnlyOp))), [tr(K.settingsTerrainOff), tr(K.settingsTerrainLight), tr(K.settingsTerrainFull)], {
      defaultValueIndex: terrains.indexOf(ws.terrain),
    })
    .submitButton(tr(K.settingsSaved));
  const res = await show(player, form);
  if (res.canceled || !res.formValues) return;
  const v = res.formValues.filter((x) => x !== undefined);
  const [sfx, voice, music, camDist, left, numbers, perf, terrain] = v as [number, number, number, number, boolean, boolean, number, number];
  r.profile = {
    ...r.profile,
    settings: { sfx, voice, music, camDist: Math.min(2, Math.max(0, camDist)) as 0 | 1 | 2, camSide: left ? -1 : 1, slotNumbers: numbers },
  };
  saveProfile(r);
  if (op) saveWorldSettings({ perf: perfs[perf] ?? ws.perf, terrain: terrains[terrain] ?? ws.terrain });
  settingsListeners.forEach((fn) => fn(r));
  player.onScreenDisplay.setActionBar(tr(K.settingsSaved));
}

const settingsListeners: ((r: Runtime) => void)[] = [];
export const onSettingsChanged = (fn: (r: Runtime) => void): void => void settingsListeners.push(fn);

async function openHelp(player: Player): Promise<void> {
  const form = new ActionFormData().title(title(K.helpTitle)).body(tr(K.helpBody)).button(tr(K.back), "textures/jjk/icons/none");
  const res = await show(player, form);
  if (!res.canceled) return openMainMenu(player);
}
