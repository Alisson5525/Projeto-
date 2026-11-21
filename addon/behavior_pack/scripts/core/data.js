import { world } from "@minecraft/server";
import { DP, WDP, TAG, DEFAULT_WORLD_SETTINGS, XP_TABLE, MAX_LEVEL, VAMPIRE, WEREWOLF } from "./config.js";
import { safe } from "./util.js";

export const Faction = Object.freeze({
  HUMAN: "human",
  VAMPIRE: "vampire",
  WEREWOLF: "werewolf",
  HUNTER: "hunter",
});

// ---------------------------------------------------------------------------
// Generic dynamic property access
// ---------------------------------------------------------------------------

export function getNum(entity, key, def = 0) {
  const v = safe(() => entity.getDynamicProperty(key));
  return typeof v === "number" && Number.isFinite(v) ? v : def;
}

export function setNum(entity, key, value) {
  safe(() => entity.setDynamicProperty(key, value), "setNum " + key);
}

export function getStr(entity, key, def = "") {
  const v = safe(() => entity.getDynamicProperty(key));
  return typeof v === "string" ? v : def;
}

export function setStr(entity, key, value) {
  safe(() => entity.setDynamicProperty(key, value), "setStr " + key);
}

export function getJSON(entity, key, def) {
  const s = getStr(entity, key, "");
  if (!s) return structuredCloneSafe(def);
  try {
    return { ...structuredCloneSafe(def), ...JSON.parse(s) };
  } catch {
    return structuredCloneSafe(def);
  }
}

export function setJSON(entity, key, obj) {
  setStr(entity, key, JSON.stringify(obj));
}

function structuredCloneSafe(o) {
  return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
}

// ---------------------------------------------------------------------------
// Faction
// ---------------------------------------------------------------------------

export function getFaction(player) {
  if (player.hasTag(TAG.VAMPIRE)) return Faction.VAMPIRE;
  if (player.hasTag(TAG.WEREWOLF)) return Faction.WEREWOLF;
  if (player.hasTag(TAG.HUNTER)) return Faction.HUNTER;
  return Faction.HUMAN;
}

export const isVampire = (p) => safe(() => p.hasTag(TAG.VAMPIRE)) ?? false;
export const isWerewolf = (p) => safe(() => p.hasTag(TAG.WEREWOLF)) ?? false;
export const isHunter = (p) => safe(() => p.hasTag(TAG.HUNTER)) ?? false;
export const isSupernaturalPlayer = (p) => isVampire(p) || isWerewolf(p);

// ---------------------------------------------------------------------------
// Level / XP (shared by every faction)
// ---------------------------------------------------------------------------

export function getLevel(player) {
  return Math.max(1, Math.min(MAX_LEVEL, getNum(player, DP.LEVEL, 1)));
}

export function setLevel(player, level) {
  setNum(player, DP.LEVEL, Math.max(1, Math.min(MAX_LEVEL, Math.floor(level))));
}

export function getXp(player) {
  return getNum(player, DP.XP, 0);
}

export function xpForNext(level) {
  return XP_TABLE[Math.min(level, XP_TABLE.length - 1)];
}

/**
 * Adds XP and returns the number of levels gained.
 * Callers handle the level-up feedback (keeps this module UI-free).
 */
export function addXp(player, amount) {
  let level = getLevel(player);
  if (level >= MAX_LEVEL) return 0;
  let xp = getXp(player) + amount;
  let gained = 0;
  while (level < MAX_LEVEL && xp >= xpForNext(level)) {
    xp -= xpForNext(level);
    level++;
    gained++;
  }
  if (level >= MAX_LEVEL) xp = 0;
  setNum(player, DP.XP, xp);
  setLevel(player, level);
  return gained;
}

// ---------------------------------------------------------------------------
// Vampire blood
// ---------------------------------------------------------------------------

export function getBlood(player) {
  return getNum(player, DP.BLOOD, VAMPIRE.START_BLOOD);
}

export function setBlood(player, value) {
  setNum(player, DP.BLOOD, Math.max(0, Math.min(VAMPIRE.MAX_BLOOD, value)));
}

export function addBlood(player, delta) {
  setBlood(player, getBlood(player) + delta);
}

// ---------------------------------------------------------------------------
// Werewolf tier (legacy tags lbnI / lbnII / lbnIII)
// ---------------------------------------------------------------------------

export function getWolfTier(player) {
  if (player.hasTag(TAG.WOLF_TIER[2])) return 3;
  if (player.hasTag(TAG.WOLF_TIER[1])) return 2;
  return 1;
}

export function setWolfTier(player, tier) {
  TAG.WOLF_TIER.forEach((t) => safe(() => player.removeTag(t)));
  safe(() => player.addTag(TAG.WOLF_TIER[Math.max(1, Math.min(3, tier)) - 1]));
}

/** Tier the werewolf deserves by level (never downgrades). */
export function syncWolfTier(player) {
  const lvl = getLevel(player);
  let tier = 1;
  WEREWOLF.TIER_LEVEL.forEach((need, i) => {
    if (lvl >= need) tier = i + 1;
  });
  if (tier > getWolfTier(player)) {
    setWolfTier(player, tier);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// World settings
// ---------------------------------------------------------------------------

let settingsCache;

export function getSettings() {
  if (settingsCache) return settingsCache;
  let s = { ...DEFAULT_WORLD_SETTINGS };
  safe(() => {
    const raw = world.getDynamicProperty(WDP.SETTINGS);
    if (typeof raw === "string") s = { ...s, ...JSON.parse(raw) };
  });
  settingsCache = s;
  return s;
}

export function saveSettings(s) {
  settingsCache = { ...s };
  safe(() => world.setDynamicProperty(WDP.SETTINGS, JSON.stringify(settingsCache)));
}

export function playerHud(player) {
  return getNum(player, DP.HUD, 1) === 1;
}
