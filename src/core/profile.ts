// Persistent player data (dynamic property "jjk:profile"), ported from
// PlayerProfile + MenuStats, plus the Bedrock-only player settings.
import { LEVEL_CAP, STAT_CAP } from "./constants";
import { clamp, earnedPoints, xpToNext } from "./progression";

export type Technique = "none" | "limitless";
export type Stat = "vit" | "str" | "ce";

export interface PlayerSettings {
  /** Volumes 0..100 for effects, voices and music (Java sound channels). */
  sfx: number;
  voice: number;
  music: number;
  /** Shoulder camera distance preset: 0 near, 1 normal, 2 far. */
  camDist: 0 | 1 | 2;
  /** Shoulder side: 1 right, -1 left. */
  camSide: 1 | -1;
  /** Show slot numbers on the combat HUD. */
  slotNumbers: boolean;
}

export interface ProfileData {
  v: 1;
  level: number;
  xp: number;
  technique: Technique;
  sixEyes: boolean;
  rct: boolean;
  vit: number;
  str: number;
  ce: number;
  settings: PlayerSettings;
}

export function defaultSettings(): PlayerSettings {
  return { sfx: 100, voice: 100, music: 100, camDist: 1, camSide: 1, slotNumbers: true };
}

export function defaultProfile(): ProfileData {
  return { v: 1, level: 0, xp: 0, technique: "none", sixEyes: false, rct: false, vit: 0, str: 0, ce: 0, settings: defaultSettings() };
}

const int = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? clamp(Math.trunc(v), lo, hi) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

function parseSettings(raw: unknown): PlayerSettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Record<string, unknown>;
  const camDist = int(s.camDist, 0, 2, d.camDist) as 0 | 1 | 2;
  return {
    sfx: int(s.sfx, 0, 100, d.sfx),
    voice: int(s.voice, 0, 100, d.voice),
    music: int(s.music, 0, 100, d.music),
    camDist,
    camSide: s.camSide === -1 ? -1 : 1,
    slotNumbers: bool(s.slotNumbers, d.slotNumbers),
  };
}

export function parseProfile(raw: string | undefined): ProfileData {
  if (!raw) return defaultProfile();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultProfile();
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return defaultProfile();
  const o = data as Record<string, unknown>;
  return {
    v: 1,
    level: int(o.level, 0, LEVEL_CAP, 0),
    xp: int(o.xp, 0, 2_000_000_000, 0),
    technique: o.technique === "limitless" ? "limitless" : "none",
    sixEyes: bool(o.sixEyes, false),
    rct: bool(o.rct, false),
    vit: int(o.vit, 0, STAT_CAP, 0),
    str: int(o.str, 0, STAT_CAP, 0),
    ce: int(o.ce, 0, STAT_CAP, 0),
    settings: parseSettings(o.settings),
  };
}

export const serializeProfile = (p: ProfileData): string => JSON.stringify(p);

export const spentPoints = (p: ProfileData): number => p.vit + p.str + p.ce;
export const remainingPoints = (p: ProfileData): number => Math.max(0, earnedPoints(p.level) - spentPoints(p));

export function investStat(p: ProfileData, stat: Stat): ProfileData {
  if (remainingPoints(p) <= 0 || p[stat] >= STAT_CAP) return p;
  return { ...p, [stat]: p[stat] + 1 };
}

export function removeStat(p: ProfileData, stat: Stat): ProfileData {
  if (p[stat] <= 0) return p;
  return { ...p, [stat]: p[stat] - 1 };
}

export interface XpGain {
  profile: ProfileData;
  leveledUp: boolean;
  gainedPoints: number;
}

export function grantXp(p: ProfileData, amount: number): XpGain {
  if (p.level >= LEVEL_CAP) return { profile: p, leveledUp: false, gainedPoints: 0 };
  let level = p.level;
  let progress = p.xp + Math.max(0, amount);
  while (level < LEVEL_CAP) {
    const threshold = xpToNext(level);
    if (progress < threshold) break;
    progress -= threshold;
    level++;
  }
  if (level >= LEVEL_CAP) progress = 0;
  const leveledUp = level !== p.level;
  return {
    profile: { ...p, level, xp: Math.min(2_000_000_000, progress) },
    leveledUp,
    gainedPoints: earnedPoints(level) - earnedPoints(p.level),
  };
}

export function rebirth(p: ProfileData): ProfileData {
  return { ...p, level: 0, xp: 0, sixEyes: true, rct: false, vit: 0, str: 0, ce: 0 };
}
