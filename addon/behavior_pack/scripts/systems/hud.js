import { world, system } from "@minecraft/server";
import { HUD_TICKS, VAMPIRE, MAX_LEVEL, DP } from "../core/config.js";
import { Faction, getFaction, getBlood, getLevel, getXp, xpForNext, getWolfTier, playerHud, getNum } from "../core/data.js";
import { safe, every, players, isNight } from "../core/util.js";
import { getSelected, cooldownLeft, skillDef } from "./skills.js";
import { isInSun, biteTarget } from "./vampire.js";
import { inForm, isFullMoon } from "./werewolf.js";
import { missionProgress } from "./hunter.js";
import { infectionLeft } from "./factions.js";
import { bloodMoon } from "./world_events.js";

// Custom font glyphs (RP/font/glyph_E1.png) — rendered by the vanilla actionbar,
// so the HUD works on every device without touching vanilla UI files.
const G = (i) => String.fromCharCode(0xe100 + i);
export const GLYPH = {
  DROP: G(0), DROP_HALF: G(1), DROP_EMPTY: G(2), SUN: G(3), FANG: G(4), PAW: G(5), CROSSBOW: G(6),
  XP_FULL: G(7), XP_EMPTY: G(8), HOURGLASS: G(9), SKULL: G(10), MOON: G(11), BLOOD_MOON: G(12),
  BITE: G(13), STAR: G(14), WOLF: G(15),
};

function xpBar(p) {
  const lvl = getLevel(p);
  if (lvl >= MAX_LEVEL) return GLYPH.STAR.repeat(5);
  const frac = getXp(p) / xpForNext(lvl);
  const full = Math.max(0, Math.min(5, Math.floor(frac * 5)));
  return GLYPH.XP_FULL.repeat(full) + GLYPH.XP_EMPTY.repeat(5 - full);
}

function bloodBar(blood) {
  let s = "";
  for (let i = 0; i < VAMPIRE.MAX_BLOOD / 2; i++) {
    const v = blood - i * 2;
    s += v >= 2 ? GLYPH.DROP : v >= 1 ? GLYPH.DROP_HALF : GLYPH.DROP_EMPTY;
  }
  return s;
}

function cooldownPart(p) {
  const sel = getSelected(p);
  if (!sel) return [];
  const left = cooldownLeft(p, sel);
  return left > 0 ? [{ text: ` §7${GLYPH.HOURGLASS}${left}s` }] : [];
}

const ROMAN = ["", "I", "II", "III"];

function build(p) {
  const f = getFaction(p);
  const lvl = getLevel(p);
  const raw = [];

  if (f === Faction.HUMAN) {
    const inf = infectionLeft(p);
    if (!inf) return undefined;
    const secs = Math.max(0, Math.ceil(inf.ticks / 20));
    raw.push({ text: `§c${GLYPH.SKULL} ` }, { translate: `vc.hud.infect.${inf.type}` }, { text: ` §f${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` });
    return raw;
  }

  if (f === Faction.VAMPIRE) {
    raw.push({ text: `§4${GLYPH.FANG} §f` }, { translate: "vc.hud.lvl" }, { text: `${lvl} ${xpBar(p)}  ${bloodBar(getBlood(p))}` });
    if (isInSun(p)) raw.push({ text: ` §6${GLYPH.SUN}` });
    if (biteTarget(p)) raw.push({ text: ` §c${GLYPH.BITE}` });
  } else if (f === Faction.WEREWOLF) {
    const tier = getWolfTier(p);
    raw.push({ text: `§6${inForm(p) ? GLYPH.WOLF : GLYPH.PAW} §f` }, { translate: "vc.hud.lvl" }, { text: `${lvl} §e${ROMAN[tier]} §f${xpBar(p)}` });
    if (isNight() && isFullMoon()) raw.push({ text: ` §f${GLYPH.MOON}` });
  } else if (f === Faction.HUNTER) {
    raw.push({ text: `§e${GLYPH.CROSSBOW} §f` }, { translate: "vc.hud.rank" }, { text: `${lvl} ${xpBarHunter(p)}` });
    const pts = getNum(p, DP.HUNTER_POINTS, 0);
    if (pts > 0) raw.push({ text: ` §a${GLYPH.STAR}${pts}` });
  }
  if (bloodMoon.active) raw.push({ text: ` §4${GLYPH.BLOOD_MOON}` });
  raw.push(...cooldownPart(p));
  return raw;
}

function xpBarHunter(p) {
  const m = missionProgress(p);
  if (!m) return GLYPH.STAR.repeat(5);
  const full = Math.floor((m.have / m.def.count) * 5);
  return `§f${GLYPH.XP_FULL.repeat(full)}${GLYPH.XP_EMPTY.repeat(5 - full)} §7${m.have}/${m.def.count}`;
}

every(HUD_TICKS, () => {
  for (const p of players()) {
    safe(() => {
      if (!playerHud(p)) return;
      const raw = build(p);
      if (raw) p.onScreenDisplay.setActionBar({ rawtext: raw });
    }, "hud");
  }
}, "hudLoop");

export { skillDef };
