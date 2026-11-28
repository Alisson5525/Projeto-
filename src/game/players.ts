// Per-player runtime state (ServerGame.RuntimeState) plus the persisted profile.
import { type Player, system, world } from "@minecraft/server";
import { CastRegistry } from "../core/castRegistry";
import { ComboState } from "../core/combo";
import { HotbarTrigger } from "../core/hotbarTrigger";
import { parseProfile, type ProfileData, serializeProfile } from "../core/profile";
import { energyMax } from "../core/progression";
import { ReversalTrial } from "../core/rct";
import type { V3 } from "../core/vec";

export const PROFILE_PROPERTY = "jjk:profile";

/** Cooldown ids tracked as "ready at tick". */
export type CooldownId = "infinity" | "blue" | "barrage" | "red" | "purple" | "awakening" | "roll" | "rollEscape" | "rctHeal";

export interface Runtime {
  player: Player;
  id: string;
  profile: ProfileData;
  energy: number;
  combat: boolean;
  infinity: boolean;
  /** Tick at which the awakening ends (0 = not awakened). */
  awakeningEnd: number;
  domainUsed: boolean;
  lastTechniqueTick: number;
  ready: Record<CooldownId, number>;
  /** Cooldown lengths currently shown on the HUD for slots 2 and 4 (normal or maximum). */
  blueCooldownMax: number;
  redCooldownMax: number;
  trial: ReversalTrial;
  trialOrigin: V3 | null;
  rctHealing: boolean;
  hotbar: HotbarTrigger;
  combo: ComboState;
  guarding: boolean;
  /** Charge/hold progress (0..1) of the technique being held, shown under the crosshair. */
  holdProgress: number;
  /** While > now, real titles are on screen and the HUD title channel waits. */
  hudSuspendUntil: number;
  /** Ticks while the player is invulnerable (casts, rolls, cinematics). */
  invulnerableUntil: number;
  /** Free-form per-skill state owned by the skill modules. */
  cast: Map<string, unknown>;
  hudDirty: boolean;
  lastHud: string;
  lastHudTick: number;
  /** Selection screen shown / technique offered. */
  offerAt: number;
}

const runtimes = new Map<string, Runtime>();
export const casts = new CastRegistry<string>();

export const now = (): number => system.currentTick;

function load(player: Player): ProfileData {
  const raw = player.getDynamicProperty(PROFILE_PROPERTY);
  return parseProfile(typeof raw === "string" ? raw : undefined);
}

function create(player: Player): Runtime {
  const profile = load(player);
  return {
    player,
    id: player.id,
    profile,
    energy: energyMax(profile.level, profile.ce),
    combat: false,
    infinity: false,
    awakeningEnd: 0,
    domainUsed: false,
    lastTechniqueTick: -1000,
    ready: { infinity: 0, blue: 0, barrage: 0, red: 0, purple: 0, awakening: 0, roll: 0, rollEscape: 0, rctHeal: 0 },
    blueCooldownMax: 100,
    redCooldownMax: 160,
    trial: new ReversalTrial(),
    trialOrigin: null,
    rctHealing: false,
    hotbar: new HotbarTrigger(8),
    combo: new ComboState(),
    guarding: false,
    holdProgress: 0,
    hudSuspendUntil: 0,
    invulnerableUntil: 0,
    cast: new Map(),
    hudDirty: true,
    lastHud: "",
    lastHudTick: 0,
    offerAt: 0,
  };
}

export function rt(player: Player): Runtime {
  let r = runtimes.get(player.id);
  if (!r) {
    r = create(player);
    runtimes.set(player.id, r);
  } else if (r.player !== player) {
    r.player = player;
  }
  return r;
}

export const find = (id: string): Runtime | undefined => runtimes.get(id);

export function online(): Runtime[] {
  const out: Runtime[] = [];
  for (const p of world.getAllPlayers()) out.push(rt(p));
  return out;
}

export function saveProfile(r: Runtime): void {
  r.player.setDynamicProperty(PROFILE_PROPERTY, serializeProfile(r.profile));
  r.hudDirty = true;
}

/** Fresh runtime (respawn / rebirth / reset): keeps the profile on disk. */
export function resetRuntime(player: Player): Runtime {
  casts.interruptAll(player.id);
  const r = create(player);
  runtimes.set(player.id, r);
  return r;
}

export function forget(id: string): void {
  casts.interruptAll(id);
  runtimes.delete(id);
}

export const isAwakened = (r: Runtime): boolean => r.awakeningEnd > now();

/** Casts (keys in Runtime.cast) that block M1, guard, dodge and other techniques. */
export const BLOCKING_CASTS = ["blue", "red", "barrage", "purple", "maxBlue", "maxRed", "awakening", "nuke", "domain"] as const;
export type CastName = (typeof BLOCKING_CASTS)[number] | "roll";
export const isCasting = (r: Runtime): boolean => BLOCKING_CASTS.some((c) => r.cast.has(c));
/** Casts during which the Java mod ignores the combat toggle (locked techniques and cinematics). */
const NO_TOGGLE = ["purple", "maxBlue", "maxRed", "awakening", "nuke", "domain"] as const;
export const blocksCombatToggle = (r: Runtime): boolean => NO_TOGGLE.some((c) => r.cast.has(c));
export const isRolling = (r: Runtime): boolean => r.cast.has("roll");
export const maxEnergy = (r: Runtime): number => energyMax(r.profile.level, r.profile.ce);
