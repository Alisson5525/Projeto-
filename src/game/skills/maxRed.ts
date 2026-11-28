// Awakened slot 4 — Maximum Output: Red (MaxRedServer). Gojo rises 1.7 blocks
// and charges while aiming; the second tap fires (the Java key release; it also
// fires by itself after 10 s). The beam sweeps 3 blocks per tick for 48 blocks,
// radius 2.36: 22 x cursed damage and a hard push. Crossing the caster's
// stationary Max Blue fuses them into Self Purple.
import type { Dimension, Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { segmentBoxDistanceSq } from "../../core/geometry";
import { MAX_RED, maxRedSegment } from "../../core/maxRedRules";
import { cursedMult } from "../../core/progression";
import { type Segment, sweptRuns } from "../../core/purpleRules";
import { maxRedLift } from "../../core/timelines";
import { add, directionFromRotation, lerp, normalize, scale, smoothstep, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { onSlot } from "../combat";
import { dealDamage } from "../damage";
import { commit } from "../energy";
import { COLOR, fx, type Rgba } from "../fx";
import { holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, isAwakened, now, type Runtime } from "../players";
import { currentBudget, worldSettings } from "../settings";
import { playAt, stopFor } from "../sound";
import { SND } from "../sounds";
import { eraseRuns } from "../terrain";
import { affordable, canBegin, isAlive, isTarget, offCooldown } from "./common";
import { fuse } from "./selfPurple";

const BEAM: Rgba = [1, 0.14, 0.14, 0.85];
const BEAM_SOFT: Rgba = [1, 0.56, 0.56, 0.55];
const CHARGE_SOUND_EVERY = 25;

interface MaxRedCast {
  start: number;
  lock: CasterLock;
  released: number;
  yaw: number;
  pitch: number;
  dir: V3;
  root: V3;
  swept: number;
  prev: Segment | null;
  victims: Set<string>;
  damage: number;
  fused: boolean;
  dim: Dimension;
}

/** Domain barriers can stop the beam (Task 12): return true to cancel it. */
type Interceptor = (dim: Dimension, a: V3, b: V3, radius: number, damage: number) => boolean;
const interceptors: Interceptor[] = [];
export const onMaxRedSweep = (fn: Interceptor): void => void interceptors.push(fn);

function aimPoint(p: Player, yaw: number, pitch: number): V3 {
  return add(p.getHeadLocation(), scale(directionFromRotation(pitch, yaw), MAX_RED.forward));
}

function start(r: Runtime): void {
  const existing = r.cast.get("maxRed") as MaxRedCast | undefined;
  if (existing) {
    if (existing.released < 0) fire(r, existing);
    return;
  }
  if (!canBegin(r) || !offCooldown(r, "red") || !affordable(r, COST.maxRed)) return;
  const p = r.player;
  const rot = p.getRotation();
  const c: MaxRedCast = {
    start: now(),
    lock: lockCaster(r, "maxRed", 1.7),
    released: -1,
    yaw: rot.y,
    pitch: rot.x,
    dir: { x: 0, y: 0, z: 1 },
    root: p.location,
    swept: 0,
    prev: null,
    victims: new Set(),
    damage: MAX_RED.damage * cursedMult(r.profile.ce),
    fused: false,
    dim: p.dimension,
  };
  r.cast.set("maxRed", c);
  casts.set(r.id, "maxRed", () => abort(r, c));
  playAt(SND.maxRedVoice, p.dimension, p.location);
  playAt(SND.maxRedCharge, p.dimension, p.location);
  playAnim(p, "maxRedReady", 0.1);
  commit(r, COST.maxRed);
  r.ready.red = now() + COOLDOWN.maxRed;
  r.redCooldownMax = COOLDOWN.maxRed;
  r.hudDirty = true;
}

function fire(r: Runtime, c: MaxRedCast): void {
  const p = r.player;
  c.released = now();
  c.dir = normalize(directionFromRotation(c.pitch, c.yaw));
  c.root = aimPoint(p, c.yaw, c.pitch);
  stopFor(SND.maxRedVoice, p.dimension, p.location);
  stopFor(SND.maxRedCharge, p.dimension, p.location);
  playAt(SND.maxRedFire, p.dimension, c.root);
  playAnim(p, "maxRedShoot", 0.05);
  r.holdProgress = 0;
  r.hudDirty = true;
  fx(c.dim, PARTICLE.glow, c.root, { size0: 1.2, size1: 3.5, life: 0.25, color: COLOR.redHot });
  fx(c.dim, PARTICLE.ringFlat, c.root, { size0: 0.6, size1: 4.5, life: 0.3, color: BEAM, dir: c.dir });
}

function finish(r: Runtime, c: MaxRedCast): void {
  r.cast.delete("maxRed");
  casts.clear(r.id, "maxRed");
  releaseCaster(r, c.lock);
  r.holdProgress = 0;
  r.hudDirty = true;
}

function abort(r: Runtime, c: MaxRedCast): void {
  finish(r, c);
  const p = r.player;
  if (!p.isValid) return;
  if (c.released < 0) {
    stopFor(SND.maxRedVoice, p.dimension, p.location);
    stopFor(SND.maxRedCharge, p.dimension, p.location);
  }
  stopAnim(p);
}

function hit(r: Runtime, c: MaxRedCast, a: V3, b: V3): void {
  const p = r.player;
  for (const e of c.dim.getEntities({ location: lerp(a, b, 0.5), maxDistance: MAX_RED.radius + 4, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (c.victims.has(e.id) || !isTarget(e, p)) continue;
    const box = e.getAABB();
    if (segmentBoxDistanceSq(a, b, sub(box.center, box.extent), add(box.center, box.extent)) > MAX_RED.radius * MAX_RED.radius) continue;
    c.victims.add(e.id);
    dealDamage(e, c.damage, p);
    if (!e.isValid) continue;
    try {
      const push = scale(c.dir, MAX_RED.push);
      if (e.typeId === "minecraft:player") (e as Player).applyKnockback({ x: push.x, z: push.z }, push.y);
      else e.applyImpulse(push);
    } catch {
      // Immovable entity.
    }
  }
}

function advance(r: Runtime, c: MaxRedCast): void {
  const seg = maxRedSegment(c.root, c.dir, c.swept);
  if (!seg) return;
  if (interceptors.some((fn) => fn(c.dim, seg.a, seg.b, MAX_RED.radius, 20))) {
    casts.interrupt(r.id, "maxRed");
    return;
  }
  const fusion = fuse(r, seg.a, seg.b);
  if (fusion) {
    c.fused = true;
    fx(c.dim, PARTICLE.glow, fusion, { size0: 3, size1: 8, life: 0.4, color: [0.8, 0.5, 1, 0.9] });
    return;
  }
  if (currentBudget().destroyTerrain) {
    const radius = worldSettings().terrain === "completa" ? MAX_RED.radius : MAX_RED.lightTerrainRadius;
    eraseRuns(c.dim, sweptRuns(c.prev, seg.a, seg.b, radius));
  }
  hit(r, c, seg.a, seg.b);
  fx(c.dim, PARTICLE.redOrb, seg.b, { size0: 1.4, life: 0.12, color: [1, 1, 1, 1] });
  fx(c.dim, PARTICLE.glow, seg.a, { size0: 2.4, size1: 0.3, life: 0.45, color: BEAM_SOFT });
  fx(c.dim, PARTICLE.glow, lerp(seg.a, seg.b, 0.5), { size0: 2.2, size1: 0.3, life: 0.45, color: BEAM });
  if (c.swept % 2 === 0) fx(c.dim, PARTICLE.sparks, seg.b, { count: 6, radius: 0.8, speed: 9, life: 0.3, size0: 0.6, color: COLOR.redWisp });
  c.prev = { a: seg.a, b: seg.b };
  c.swept++;
}

function chargeVisuals(p: Player, c: MaxRedCast, age: number): void {
  if (age % 2 !== 0) return;
  const at = aimPoint(p, c.yaw, c.pitch);
  const grow = smoothstep(age / MAX_RED.ready);
  fx(c.dim, PARTICLE.redOrb, at, { size0: 0.3 + 0.9 * grow + 0.04 * Math.sin(age), life: 0.13, color: [1, 1, 1, 1] });
  if (age % 4 === 0) fx(c.dim, PARTICLE.suction, at, { count: 3, radius: 1.6, speed: 5, life: 0.3, size0: 0.25, color: COLOR.redWisp });
}

export function tickMaxRed(r: Runtime): void {
  const c = r.cast.get("maxRed") as MaxRedCast | undefined;
  if (!c) return;
  const p = r.player;
  if (!isAlive(p) || !r.combat || p.dimension.id !== c.dim.id) {
    casts.interrupt(r.id, "maxRed");
    return;
  }
  const t = now();
  const age = t - c.start;
  if (c.released < 0) {
    holdCaster(p, c.lock, maxRedLift(age));
    const rot = p.getRotation();
    c.yaw = rot.y;
    c.pitch = rot.x;
    const progress = Math.min(1, age / MAX_RED.ready);
    if (Math.abs(progress - r.holdProgress) > 0.02) {
      r.holdProgress = progress;
      r.hudDirty = true;
    }
    if (age % CHARGE_SOUND_EVERY === 0 && age > 0) playAt(SND.maxRedCharge, p.dimension, p.location);
    chargeVisuals(p, c, age);
    if (age >= MAX_RED.autoFire) fire(r, c);
    return;
  }
  const since = t - c.released;
  if (since < MAX_RED.lockAfterShot) holdCaster(p, c.lock, maxRedLift(age));
  else if (!c.lock.released) {
    releaseCaster(r, c.lock);
    // Still invulnerable until the beam is over (MaxRedServer.isActive).
    r.invulnerableUntil = Math.max(r.invulnerableUntil, c.released + MAX_RED.shootFx);
  }
  if (!c.fused) advance(r, c);
  if (since >= MAX_RED.shootFx) finish(r, c);
}

export function registerMaxRed(): void {
  onSlot(3, start, (r) => isAwakened(r) || r.cast.has("maxRed"));
}
