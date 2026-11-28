// Slot 3 — Barrage (GojoBarrageServer): grab at 0.25 s, pin the victim in
// front of Gojo, 13 punches and a launching kick. Gojo is invulnerable while
// punching; the victim escapes by rolling out of the stun.
import type { Entity, Player } from "@minecraft/server";
import { COOLDOWN } from "../../core/constants";
import { physicalMult } from "../../core/progression";
import { BARRAGE, grabOrder, HitPool, pinAnchor, pinStep, PunchCursor, turnToward, type GrabCandidate } from "../../core/skillRules";
import { TL } from "../../core/timelines";
import { add, distanceSq, forwardOf, lerp, rad, scale, type V3 } from "../../core/vec";
import { PARTICLE, VANILLA_SOUND } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { hasLineOfSight, onSlot, onStunEscape } from "../combat";
import { dealDamage } from "../damage";
import { commitExact } from "../energy";
import { COLOR, fx } from "../fx";
import { casts, find, isRolling, now, type Runtime } from "../players";
import { playAt, type SoundDef } from "../sound";
import { SND } from "../sounds";
import { clearSlow, setSlow } from "../speed";
import { clearStun, isStunned, stun, stunUntil } from "../stun";
import { canBegin, centerOf, extentOf, isAlive, isTarget, offCooldown, setVelocity, unlocked } from "./common";

interface BarrageCast {
  start: number;
  victim: Entity | null;
  oldStunUntil: number;
  appliedStunUntil: number;
  yOffset: number;
  pinYaw: number;
  openingChecked: boolean;
  hitStarted: boolean;
  kickDone: boolean;
  invulnerableUntil: number;
  punches: PunchCursor;
  pool: HitPool;
}

const PUNCH: SoundDef = { id: VANILLA_SOUND.punch, channel: "sfx", range: 16 };
const KICK: SoundDef = { id: VANILLA_SOUND.kick, channel: "sfx", range: 24 };
/** victim id -> caster id */
const victims = new Map<string, string>();

function guardsAgainst(victim: Entity, attacker: Player): boolean {
  if (victim.typeId !== "minecraft:player" || !find(victim.id)?.guarding) return false;
  const look = (victim as Player).getViewDirection();
  const dx = attacker.location.x - victim.location.x;
  const dz = attacker.location.z - victim.location.z;
  const l1 = Math.hypot(look.x, look.z);
  const l2 = Math.hypot(dx, dz);
  return l1 > 1e-6 && l2 > 1e-6 && (look.x * dx + look.z * dz) / (l1 * l2) >= 0.5;
}

function acquire(p: Player): Entity | null {
  const center = centerOf(p);
  const byId = new Map<string, Entity>();
  const candidates: GrabCandidate[] = [];
  for (const e of p.dimension.getEntities({ location: center, maxDistance: BARRAGE.grabSearch + 1, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, p) || victims.has(e.id)) continue;
    byId.set(e.id, e);
    candidates.push({ id: e.id, center: centerOf(e), halfWidth: extentOf(e).x });
  }
  for (const id of grabOrder(center, p.getViewDirection(), candidates)) {
    const e = byId.get(id)!;
    if (hasLineOfSight(p, e) && !guardsAgainst(e, p)) return e;
  }
  return null;
}

function contactPoint(p: Player, victim: Entity): V3 {
  return lerp(centerOf(p), centerOf(victim), 0.5);
}

/** Hit through the pool so Bedrock's hurt immunity never eats a punch. */
function hit(r: Runtime, c: BarrageCast, victim: Entity, amount: number): boolean {
  const dmg = c.pool.add(amount * physicalMult(r.profile.str), now());
  return dmg <= 0 || dealDamage(victim, dmg, r.player);
}

function start(r: Runtime): void {
  if (r.cast.has("barrage") || !unlocked(r, 3) || !canBegin(r) || !offCooldown(r, "barrage")) return;
  const p = r.player;
  const t = now();
  const cast: BarrageCast = {
    start: t,
    victim: null,
    oldStunUntil: 0,
    appliedStunUntil: 0,
    yOffset: 0,
    pinYaw: Number.NaN,
    openingChecked: false,
    hitStarted: false,
    kickDone: false,
    invulnerableUntil: 0,
    punches: new PunchCursor(),
    pool: new HitPool(),
  };
  r.cast.set("barrage", cast);
  casts.set(r.id, "barrage", () => finish(r, cast, true));
  setSlow(p, "barrage", BARRAGE.slow);
  playAnim(p, "barrageStart", 0.05);
  commitExact(r, 0, 0);
  r.ready.barrage = t + COOLDOWN.barrage;
  r.hudDirty = true;
}

function finish(r: Runtime, c: BarrageCast, interrupted: boolean): void {
  r.cast.delete("barrage");
  casts.clear(r.id, "barrage");
  const p = r.player;
  if (p.isValid) clearSlow(p, "barrage");
  if (c.invulnerableUntil > now() && r.invulnerableUntil === c.invulnerableUntil) r.invulnerableUntil = now();
  const v = c.victim;
  if (v) {
    if (victims.get(v.id) === r.id) victims.delete(v.id);
    if (interrupted && v.isValid && isAlive(v) && stunUntil(v.id) === c.appliedStunUntil) {
      clearStun(v);
      if (c.oldStunUntil > now()) stun(v, c.oldStunUntil - now());
    }
    const pending = c.pool.flush();
    if (!interrupted && pending > 0 && v.isValid) dealDamage(v, pending, p);
  }
  if (interrupted && p.isValid) stopAnim(p);
  r.hudDirty = true;
}

function pin(p: Player, c: BarrageCast, v: Entity): void {
  c.pinYaw = turnToward(c.pinYaw, p.getRotation().y);
  const anchor = pinAnchor(p.location, c.pinYaw, c.yOffset, extentOf(v).x);
  const next = pinStep(v.location, anchor);
  if (distanceSq(next, v.location) <= 1e-10) return;
  const isPlayer = v.typeId === "minecraft:player";
  const options = isPlayer ? { keepVelocity: false } : { keepVelocity: false, facingLocation: p.location };
  const from = v.location;
  try {
    if (v.tryTeleport(next, { ...options, checkForBlocks: true })) return;
    // Slide along walls one axis at a time (BarragePinMotion.slideToward).
    if (v.tryTeleport({ x: next.x, y: from.y, z: from.z }, { ...options, checkForBlocks: true })) return;
    v.tryTeleport({ x: from.x, y: from.y, z: next.z }, { ...options, checkForBlocks: true });
  } catch {
    // Victim removed this tick.
  }
}

function impactFx(p: Player, v: Entity, index: number): void {
  const at = add(contactPoint(p, v), scale(forwardOf(p.getRotation().y), 0.25));
  fx(p.dimension, PARTICLE.sparks, at, { count: 5, radius: 0.05, speed: 6, life: 0.22, size0: 0.22, color: COLOR.white });
  fx(p.dimension, PARTICLE.ring, at, { size0: 0.12, size1: 0.55, life: 0.16, color: COLOR.white });
  playAt(PUNCH, p.dimension, at, 0.9 + ((index * 7) % 5) * 0.08);
}

function kick(r: Runtime, c: BarrageCast, v: Entity): void {
  const p = r.player;
  const forward = forwardOf(p.getRotation().y);
  const amount = c.pool.flush() + TL.barrage.kickDamage * physicalMult(r.profile.str);
  if (amount > 0) dealDamage(v, amount, p);
  if (v.isValid) setVelocity(v, { x: forward.x * BARRAGE.kickHorizontal, y: BARRAGE.kickVertical, z: forward.z * BARRAGE.kickHorizontal });
  const at = contactPoint(p, v);
  fx(p.dimension, PARTICLE.ringFlat, at, { size0: 0.3, size1: 1.8, life: 0.28, color: COLOR.white, dir: forward });
  fx(p.dimension, PARTICLE.sparks, at, { count: 14, radius: 0.1, speed: 9, life: 0.3, size0: 0.3, color: COLOR.white });
  fx(p.dimension, PARTICLE.glow, at, { size0: 0.6, size1: 1.4, life: 0.18, color: COLOR.white });
  playAt(KICK, p.dimension, at);
}

function tick(r: Runtime): void {
  const c = r.cast.get("barrage") as BarrageCast | undefined;
  if (!c) return;
  const p = r.player;
  const t = now();
  const age = t - c.start;
  if (!isAlive(p) || !r.combat || isStunned(p)) return finish(r, c, true);

  if (!c.openingChecked && age >= TL.barrage.contact) {
    c.openingChecked = true;
    const chosen = acquire(p);
    if (chosen && hit(r, c, chosen, TL.barrage.openingDamage)) {
      c.victim = chosen;
      c.oldStunUntil = stunUntil(chosen.id);
      c.yOffset = Math.min(BARRAGE.yClamp, Math.max(-BARRAGE.yClamp, chosen.location.y - p.location.y));
      c.pinYaw = rad(p.getRotation().y);
      c.appliedStunUntil = c.start + TL.barrage.hitAt + TL.barrage.hit + TL.barrage.extraStun;
      victims.set(chosen.id, r.id);
      stun(chosen, Math.max(1, c.appliedStunUntil - t));
      playAt(SND.barrageGrab, p.dimension, contactPoint(p, chosen));
      impactFx(p, chosen, 0);
    }
  }

  const v = c.victim;
  if (!v) {
    if (age >= TL.barrage.start) finish(r, c, false);
    return;
  }
  const victimRt = v.typeId === "minecraft:player" ? find(v.id) : undefined;
  if (!v.isValid || !isAlive(v) || v.dimension.id !== p.dimension.id || !isStunned(v) || (victimRt && isRolling(victimRt))) {
    return finish(r, c, true);
  }
  if (age < TL.barrage.hitAt + TL.barrage.kick) pin(p, c, v);
  if (!c.hitStarted && age >= TL.barrage.hitAt) {
    c.hitStarted = true;
    c.invulnerableUntil = c.start + TL.barrage.hitAt + TL.barrage.hit;
    r.invulnerableUntil = Math.max(r.invulnerableUntil, c.invulnerableUntil);
    playAnim(p, "barrageHit", 0.05);
  }
  if (!c.hitStarted) return;
  const hitAge = age - TL.barrage.hitAt;
  for (const i of c.punches.advance(hitAge)) {
    if (!isAlive(v)) break;
    hit(r, c, v, TL.barrage.punchTotal / TL.barrage.punches.length);
    impactFx(p, v, i + 1);
  }
  if (!isAlive(v)) return finish(r, c, false);
  if (!c.kickDone && hitAge >= TL.barrage.kick) {
    c.kickDone = true;
    kick(r, c, v);
  }
  if (hitAge >= TL.barrage.hit) finish(r, c, false);
}

export function registerBarrage(): void {
  onSlot(2, start);
  // A victim that rolls out of the stun ends the barrage (onStunEscape).
  onStunEscape((escaped) => {
    const casterId = victims.get(escaped.id);
    if (!casterId) return;
    victims.delete(escaped.id);
    casts.interrupt(casterId, "barrage");
  });
}

export const tickBarrage = tick;
