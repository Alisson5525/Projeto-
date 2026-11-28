// Unlimited Void sessions (DomainServer): forming (caster frozen, barrier
// closing) → sealed (targets captured, comic panel) → transferring (everyone
// moved into the arena, journal written first) → active (20 s, everyone but
// Gojo paralysed) → ending (fracture) → everyone returned to where they stood.
import { type Dimension, type Entity, GameMode, type Player, world } from "@minecraft/server";
import { COST } from "../../core/constants";
import { type ReturnEntry, reservedSlots, staleEntries } from "../../core/domainJournal";
import { arenaOrigin, CAPTURE_TICK, closureProgress, DOMAIN, type DomainPhase, firstFreeArena, keepInArena } from "../../core/domainRules";
import { add, distanceSq, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { commit } from "../energy";
import { fx } from "../fx";
import { hideHud, resumeHud, showTitle } from "../hud";
import { K, tr } from "../i18n";
import { holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, find, isCasting, now, rt, type Runtime } from "../players";
import { playFor } from "../sound";
import { SND } from "../sounds";
import { clearStun, isStunned, stun } from "../stun";
import { affordable, extentOf, isAlive } from "../skills/common";
import { ARENA_HALF, BARRIER, hasRoom, isVoid, loadArenaForRecovery, popVoidFog, prepareArena, pushVoidFog, releaseArena, VOID_SKY, voidDimension } from "./arena";
import { entryOf, forgetEntry, journal, markDead, recordEntries } from "./journal";

export interface Session {
  id: string;
  caster: Player;
  casterId: string;
  exterior: Dimension;
  center: V3;
  slot: number;
  arena: V3;
  phase: DomainPhase;
  phaseAt: number;
  health: number;
  occupants: Map<string, Entity>;
  lock: CasterLock;
  barrier: Entity | undefined;
  sky: Entity | undefined;
  arenaReady: boolean;
  arenaFailed: boolean;
}

export const sessions = new Map<string, Session>();
const COMIC = "jjkvoid:";
const IGNORED = new Set(["minecraft:item", "minecraft:xp_orb", "jjk:debris", BARRIER, VOID_SKY]);
let counter = 0;

const isPlayer = (e: Entity): e is Player => e.typeId === "minecraft:player";
const bar = (p: Player | undefined, key: string): void => void p?.onScreenDisplay.setActionBar(tr(key));

function phase(s: Session, next: DomainPhase): void {
  s.phase = next;
  s.phaseAt = now();
}

/** Session whose barrier currently protects `pos` in `dim`, if any. */
export function sessionAt(dim: Dimension, pos: V3, margin = 0): Session | undefined {
  for (const s of sessions.values()) {
    if (s.exterior.id === dim.id && distanceSq(pos, s.center) <= (DOMAIN.radius + margin) ** 2) return s;
  }
  return undefined;
}

export function occupantSession(id: string): Session | undefined {
  for (const s of sessions.values()) if (s.occupants.has(id)) return s;
  return undefined;
}

// ---- start -----------------------------------------------------------------

export function castDomain(r: Runtime): void {
  const p = r.player;
  if (r.domainUsed || !r.combat || !isAlive(p) || isStunned(p) || isCasting(r) || isVoid(p.dimension)) return;
  if (!affordable(r, COST.domain)) return;
  const center = add(p.location, { x: 0, y: 1, z: 0 });
  for (const s of sessions.values()) {
    if (s.casterId === r.id || (s.exterior.id === p.dimension.id && Math.sqrt(distanceSq(s.center, center)) < DOMAIN.radius * 2 + 2)) {
      bar(p, K.domainOverlap);
      return;
    }
  }
  const reserved = reservedSlots(journal());
  for (const s of sessions.values()) reserved.add(s.slot);
  const slot = firstFreeArena(reserved);
  if (sessions.size >= DOMAIN.maxSessions || !hasRoom(p.dimension, center, slot)) {
    bar(p, K.domainBusy);
    return;
  }
  commit(r, COST.domain);
  r.domainUsed = true;
  r.hudDirty = true;
  const s: Session = {
    id: `${now()}_${counter++}`,
    caster: p,
    casterId: r.id,
    exterior: p.dimension,
    center,
    slot,
    arena: arenaOrigin(slot),
    phase: "forming",
    phaseAt: now(),
    health: DOMAIN.barrierHealth,
    occupants: new Map(),
    lock: lockCaster(r, "domain", 0),
    barrier: undefined,
    sky: undefined,
    arenaReady: false,
    arenaFailed: false,
  };
  sessions.set(s.id, s);
  r.cast.set("domain", s);
  casts.set(r.id, "domain", () => endSession(s));
  try {
    s.barrier = p.dimension.spawnEntity(BARRIER, center);
    s.barrier.setProperty("jjk:radius", DOMAIN.radius);
    s.barrier.setProperty("jjk:closure", 0);
  } catch {
    // The barrier is only visual.
  }
  for (const listener of p.dimension.getPlayers({ location: center, maxDistance: DOMAIN.radius })) {
    playFor(SND.voidStart, listener);
    playFor(SND.voidVoice, listener);
  }
  playAnim(p, "domainStart", 0.1);
  prepareArena(slot, p.dimension, center).then(
    (sky) => {
      s.sky = sky;
      s.arenaReady = true;
    },
    () => {
      s.arenaFailed = true;
    },
  );
}

// ---- phases -----------------------------------------------------------------

function targets(s: Session): Map<string, Entity> | null {
  const out = new Map<string, Entity>();
  const known = journal().entries;
  for (const e of s.exterior.getEntities({ location: s.center, maxDistance: DOMAIN.radius })) {
    if (!e.isValid || IGNORED.has(e.typeId) || known[e.id] || !e.getComponent("minecraft:health") || !isAlive(e)) continue;
    if (isPlayer(e) && e.getGameMode() === GameMode.Spectator) continue;
    out.set(e.id, e);
  }
  if (out.size > DOMAIN.maxTargets) {
    bar(s.caster, K.domainTargets);
    endSession(s);
    return null;
  }
  if (!out.has(s.casterId)) {
    endSession(s);
    return null;
  }
  return out;
}

function showComic(s: Session): void {
  for (const e of s.occupants.values()) {
    if (!isPlayer(e) || !e.isValid) continue;
    const r = rt(e);
    hideHud(r, 60);
    e.onScreenDisplay.setTitle(COMIC, { fadeInDuration: 0, stayDuration: 40, fadeOutDuration: 4 });
  }
}

function seal(s: Session, caught: Map<string, Entity>): void {
  s.occupants = caught;
  phase(s, "sealed");
  showComic(s);
}

function capture(s: Session): void {
  const dim = voidDimension();
  if (!dim) {
    endSession(s);
    return;
  }
  const entries: ReturnEntry[] = [];
  for (const [id, e] of s.occupants) {
    if (!e.isValid || !isAlive(e)) {
      s.occupants.delete(id);
      continue;
    }
    const offset = sub(e.location, s.center);
    const clamp = (v: number) => Math.max(-(ARENA_HALF - 2), Math.min(ARENA_HALF - 2, v));
    const rot = e.getRotation();
    entries.push({
      id,
      session: s.id,
      slot: s.slot,
      dimension: s.exterior.id,
      origin: e.location,
      yaw: rot.y,
      pitch: rot.x,
      arrival: { x: s.arena.x + clamp(offset.x), y: s.arena.y, z: s.arena.z + clamp(offset.z) },
      player: isPlayer(e),
      deceased: false,
    });
  }
  // Written before anyone moves: a crash from here on still returns everyone.
  recordEntries(entries);
  for (const entry of entries) {
    const e = s.occupants.get(entry.id)!;
    // DomainCombatTransitions.interrupt: nobody keeps casting through the transfer
    // (a Max Red lock would otherwise pull its caster back out of the void).
    if (isPlayer(e) && entry.id !== s.casterId) interruptTechniques(e);
    try {
      e.teleport(entry.arrival, { dimension: dim, keepVelocity: false, rotation: { x: entry.pitch, y: entry.yaw } });
    } catch {
      s.occupants.delete(entry.id);
      forgetEntry(entry.id);
      continue;
    }
    if (isPlayer(e)) pushVoidFog(e);
    if (entry.id !== s.casterId) stun(e, DOMAIN.arrivalTimeout + 40);
  }
  phase(s, "transferring");
}

function interruptTechniques(p: Player): void {
  const r = rt(p);
  casts.interruptAll(r.id);
  r.combo.interrupt();
}

function arrived(s: Session): boolean {
  for (const e of s.occupants.values()) {
    if (!isPlayer(e) || !e.isValid) continue;
    if (!isVoid(e.dimension) || distanceSq(e.location, s.arena) > 64 * 64) return false;
  }
  return true;
}

function activate(s: Session): void {
  phase(s, "active");
  const r = find(s.casterId);
  if (r) {
    releaseCaster(r, s.lock);
    r.cast.delete("domain");
    r.hudDirty = true;
    stopAnim(s.caster);
    showTitle(r, tr(K.domainTitle), tr(K.domainSub), 50);
  }
  for (const [id, e] of s.occupants) {
    if (isPlayer(e) && e.isValid && id !== s.casterId) {
      resumeHud(rt(e));
      e.onScreenDisplay.setTitle(" ", { fadeInDuration: 0, stayDuration: 1, fadeOutDuration: 0 });
    }
    if (id !== s.casterId && e.isValid) stun(e, DOMAIN.activeTicks + DOMAIN.fractureTicks + 20);
  }
}

function keepOccupants(s: Session, elapsed: number): void {
  for (const [id, e] of s.occupants) {
    if (!e.isValid) continue;
    if (!isVoid(e.dimension)) {
      // Someone left the void (command, portal...): the domain collapses.
      endSession(s);
      return;
    }
    if (elapsed % 5 === 0) {
      const fix = keepInArena(sub(e.location, s.arena), ARENA_HALF);
      if (fix) {
        try {
          e.teleport(add(s.arena, fix), { keepVelocity: false });
        } catch {
          // ignore
        }
      }
    }
    // Re-applied so occupants who reconnect mid-domain are paralysed again.
    if (id !== s.casterId && elapsed % 20 === 0) stun(e, DOMAIN.activeTicks - elapsed + DOMAIN.fractureTicks + 20);
    if (id !== s.casterId && elapsed % 4 === 0) {
      const head = add(e.location, { x: 0, y: extentOf(e).y * 2 + 0.35, z: 0 });
      fx(e.dimension, PARTICLE.voidOverload, head, { count: 3, radius: 0.45, speed: 0.5, life: 0.4, size0: 0.16, color: [0.85, 0.9, 1, 0.95] });
    }
  }
}

function updateBarrier(s: Session, elapsed: number): void {
  if (!s.barrier?.isValid || elapsed % 2 !== 0) return;
  try {
    s.barrier.setProperty("jjk:closure", closureProgress(s.phase, elapsed));
  } catch {
    // ignore
  }
}

/** Per tick, for every session. */
export function tickSession(s: Session): void {
  const elapsed = now() - s.phaseAt;
  updateBarrier(s, elapsed);
  if (s.phase === "ending") {
    if (elapsed % 3 === 0) {
      fx(s.exterior, PARTICLE.dots, s.center, { count: 18, radius: DOMAIN.radius, speed: 4, life: 0.8, size0: 0.4, color: [0.35, 0.15, 0.55, 0.9] });
    }
    if (elapsed >= DOMAIN.fractureTicks) finishSession(s);
    return;
  }
  const caster = s.caster;
  if (!caster.isValid || !isAlive(caster)) return endSession(s);
  switch (s.phase) {
    case "forming": {
      if (caster.dimension.id !== s.exterior.id || distanceSq(caster.location, s.center) > DOMAIN.radius ** 2) return endSession(s);
      holdCaster(caster, s.lock, 0);
      if (elapsed >= CAPTURE_TICK) {
        const caught = targets(s);
        if (caught) seal(s, caught);
      }
      return;
    }
    case "sealed": {
      if (caster.dimension.id !== s.exterior.id) return endSession(s);
      holdCaster(caster, s.lock, 0);
      if (elapsed % 20 === 0) showComic(s);
      if (s.arenaFailed || elapsed > DOMAIN.entryTicks + DOMAIN.arrivalTimeout) {
        bar(caster, K.domainTimeout);
        return endSession(s);
      }
      if (elapsed >= DOMAIN.entryTicks && s.arenaReady) capture(s);
      return;
    }
    case "transferring": {
      if (elapsed % 20 === 0) showComic(s);
      if (arrived(s)) activate(s);
      else if (elapsed > DOMAIN.arrivalTimeout) {
        bar(caster, K.domainTimeout);
        endSession(s);
      }
      return;
    }
    case "active": {
      if (!isVoid(caster.dimension) || elapsed >= DOMAIN.activeTicks) return endSession(s);
      keepOccupants(s, elapsed);
      return;
    }
  }
}

// ---- end and return -------------------------------------------------------------

/** Barrier broken, time up, caster gone: fracture when active, otherwise end right away. */
export function endSession(s: Session): void {
  if (!sessions.has(s.id) || s.phase === "ending") return;
  if (s.phase === "active") phase(s, "ending");
  else finishSession(s);
}

function dimensionOf(id: string): Dimension {
  try {
    return world.getDimension(id);
  } catch {
    return world.getDimension("overworld");
  }
}

/** Returns one entity to where it stood before the domain. */
export function restore(e: Entity, entry: ReturnEntry): void {
  const dim = isVoid(dimensionOf(entry.dimension)) ? world.getDimension("overworld") : dimensionOf(entry.dimension);
  if (isStunned(e)) clearStun(e);
  if (isPlayer(e) && !sessions.has(entry.session)) interruptTechniques(e);
  try {
    e.teleport(entry.origin, { dimension: dim, keepVelocity: false, rotation: { x: entry.pitch, y: entry.yaw } });
  } catch {
    return; // try again later
  }
  if (isPlayer(e)) {
    popVoidFog(e);
    resumeHud(rt(e));
    e.onScreenDisplay.setTitle(" ", { fadeInDuration: 0, stayDuration: 1, fadeOutDuration: 0 });
  }
  forgetEntry(entry.id);
}

function finishSession(s: Session): void {
  if (!sessions.delete(s.id)) return;
  casts.clear(s.casterId, "domain");
  const r = find(s.casterId);
  if (r) {
    releaseCaster(r, s.lock);
    r.cast.delete("domain");
    r.hudDirty = true;
  }
  for (const entry of Object.values(journal().entries)) {
    if (entry.session !== s.id) continue;
    const e = s.occupants.get(entry.id) ?? world.getEntity(entry.id);
    if (e?.isValid && isAlive(e)) restore(e, entry);
    else if (!entry.player) forgetEntry(entry.id);
  }
  // Loose items and orbs left in the arena go back with their owners.
  const dim = voidDimension();
  if (dim) {
    try {
      for (const e of dim.getEntities({ location: s.arena, maxDistance: ARENA_HALF + 24 })) {
        if (e.typeId === "minecraft:item" || e.typeId === "minecraft:xp_orb") e.teleport(s.center, { dimension: s.exterior });
        else if (e.typeId === VOID_SKY) e.remove();
      }
    } catch {
      // ignore
    }
  }
  for (const e of [s.barrier, s.sky]) {
    try {
      if (e?.isValid) e.remove();
    } catch {
      // ignore
    }
  }
  releaseArena(s.slot);
}

// ---- deaths, logins and leftovers ------------------------------------------------

export function onOccupantDeath(e: Entity): void {
  const entry = entryOf(e.id);
  const s = occupantSession(e.id);
  if (entry) {
    if (isPlayer(e)) markDead(e.id);
    else forgetEntry(e.id);
  }
  if (!s) return;
  s.occupants.delete(e.id);
  if (e.id === s.casterId) endSession(s);
}

/** Login or respawn: return players stranded by a finished session or a crash. */
export function recoverPlayer(p: Player): void {
  const entry = entryOf(p.id);
  if (entry) {
    const s = sessions.get(entry.session);
    if (s && !entry.deceased) {
      s.occupants.set(p.id, p);
      if (isVoid(p.dimension)) pushVoidFog(p);
      return;
    }
    if (entry.deceased) {
      forgetEntry(p.id);
      popVoidFog(p);
      return;
    }
    restore(p, entry);
    return;
  }
  if (isVoid(p.dimension)) {
    const overworld = world.getDimension("overworld");
    const spawn = world.getDefaultSpawnLocation();
    const top = overworld.getTopmostBlock({ x: spawn.x, z: spawn.z });
    p.teleport({ x: spawn.x + 0.5, y: top ? top.y + 1 : Math.max(spawn.y, 80), z: spawn.z + 0.5 }, { dimension: overworld });
    popVoidFog(p);
  }
}

const recoveryTries = new Map<string, number>();

/** Every second: returns entities of sessions that no longer exist (world reopened, script reloaded). */
export function tickRecovery(): void {
  const live = new Set(sessions.keys());
  let budget = 4;
  for (const entry of staleEntries(journal(), live)) {
    if (budget <= 0) break;
    if (entry.player) {
      const p = world.getEntity(entry.id);
      if (p?.isValid) {
        budget--;
        recoverPlayer(p as Player);
      }
      continue;
    }
    budget--;
    const e = world.getEntity(entry.id);
    if (e?.isValid) {
      restore(e, entry);
      recoveryTries.delete(entry.id);
      continue;
    }
    const tries = (recoveryTries.get(entry.id) ?? 0) + 1;
    recoveryTries.set(entry.id, tries);
    if (tries === 1) void loadArenaForRecovery(entry.slot).catch(() => undefined);
    if (tries > 15) {
      // Not found after the arena was loaded for a while: it is gone for good.
      forgetEntry(entry.id);
      recoveryTries.delete(entry.id);
      if (!Object.values(journal().entries).some((x) => x.slot === entry.slot)) releaseArena(entry.slot);
    }
  }
}

/** Startup: ticking areas of sessions that died with the script. */
export function cleanupAreas(): void {
  const needed = new Set(Object.values(journal().entries).map((e) => e.slot));
  for (const area of world.tickingAreaManager.getAllTickingAreas()) {
    const m = /^jjk_void_(ext_)?(\d+)$/.exec(area.identifier);
    if (!m) continue;
    if (m[1] || !needed.has(Number(m[2]))) world.tickingAreaManager.removeTickingArea(area.identifier);
  }
}

/** Visual entities of sessions that no longer exist. */
export function cleanupLeftover(e: Entity): void {
  if (e.typeId !== BARRIER && e.typeId !== VOID_SKY) return;
  for (const s of sessions.values()) if (s.barrier?.id === e.id || s.sky?.id === e.id) return;
  try {
    e.remove();
  } catch {
    // ignore
  }
}
