// Slot 5 — Hollow Purple (GojoPurpleServer). Gojo stays locked and invulnerable
// while Blue and Red fuse (6.15 s); at 7.45 s the charge releases itself (the
// Java "release the key" — touch screens cannot hold), and after a 1 s windup
// the purple mass flies 2 blocks per tick for 160 blocks, erasing everything.
import type { Dimension, Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { segmentBoxDistanceSq } from "../../core/geometry";
import { cursedMult } from "../../core/progression";
import { PURPLE, purpleShotSegment, type Segment, sweptRuns } from "../../core/purpleRules";
import { liftFraction } from "../../core/timelines";
import { add, directionFromRotation, lerp, normalize, rightOf, scale, smoothstep, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { onSlot } from "../combat";
import { dealDamage } from "../damage";
import { commit } from "../energy";
import { fx, type Rgba } from "../fx";
import { holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, isAwakened, now, type Runtime } from "../players";
import { currentBudget, worldSettings } from "../settings";
import { playAt, stopFor } from "../sound";
import { SND } from "../sounds";
import { eraseRuns } from "../terrain";
import { affordable, canBegin, isAlive, isTarget, offCooldown, unlocked } from "./common";

const PURPLE_COLOR: Rgba = [0.78, 0.45, 1, 0.9];
const PURPLE_LIGHT: Rgba = [0.95, 0.85, 1, 0.8];

interface PurpleCharge {
  start: number;
  awakened: boolean;
  lock: CasterLock;
  releasedAt: number;
  yaw: number;
  pitch: number;
}

interface PurpleShot {
  owner: Player;
  dim: Dimension;
  center: V3;
  dir: V3;
  traveled: number;
  awakened: boolean;
  /** Damage per victim (cursed energy multiplier applied at launch). */
  damage: number;
  victims: Set<string>;
  prev: Segment | null;
}

const shots = new Map<string, PurpleShot>();

/** Domain barriers can stop the shot (Task 12): return true to cancel it. */
type Interceptor = (dim: Dimension, a: V3, b: V3, radius: number, damage: number) => boolean;
const interceptors: Interceptor[] = [];
export const onPurpleSweep = (fn: Interceptor): void => void interceptors.push(fn);

export const isPurpleCharging = (r: Runtime): boolean => r.cast.has("purple");

function spawnPoint(p: Player, yaw: number, pitch: number): V3 {
  return add(p.getHeadLocation(), scale(directionFromRotation(pitch, yaw), PURPLE.spawnDistance));
}

function start(r: Runtime): void {
  if (r.cast.has("purple") || shots.has(r.id)) return;
  if (!unlocked(r, 5) || !canBegin(r) || !offCooldown(r, "purple") || !affordable(r, COST.purple)) return;
  const p = r.player;
  const rot = p.getRotation();
  const charge: PurpleCharge = {
    start: now(),
    awakened: isAwakened(r),
    lock: lockCaster(r, "purple", PURPLE.airRise),
    releasedAt: -1,
    yaw: rot.y,
    pitch: rot.x,
  };
  if (!charge.lock.air) charge.lock.maxRise = 0;
  r.cast.set("purple", charge);
  casts.set(r.id, "purple", () => abort(r, charge));
  playAt(SND.purpleStartVoice, p.dimension, p.location);
  playAnim(p, "purpleStart", 0.1);
  commit(r, COST.purple);
  r.ready.purple = now() + COOLDOWN.purple;
  r.hudDirty = true;
}

function endCharge(r: Runtime, c: PurpleCharge): void {
  r.cast.delete("purple");
  casts.clear(r.id, "purple");
  releaseCaster(r, c.lock);
  r.holdProgress = 0;
  r.hudDirty = true;
}

function abort(r: Runtime, c: PurpleCharge): void {
  endCharge(r, c);
  const p = r.player;
  if (!p.isValid) return;
  stopFor(SND.purpleStartVoice, p.dimension, p.location);
  stopAnim(p);
}

function chargeVisuals(p: Player, c: PurpleCharge, age: number): void {
  if (age % 2 !== 0) return;
  const at = spawnPoint(p, c.yaw, c.pitch);
  const dim = p.dimension;
  if (age < PURPLE.fusion) {
    if (age < 30) return;
    // Blue (left) and Red (right) drift together and fuse at 6.15 s.
    const k = smoothstep((age - 30) / (PURPLE.fusion - 30));
    const side = scale(rightOf(c.yaw), 1.7 * (1 - k));
    const size = 0.25 + 0.3 * k;
    fx(dim, PARTICLE.blueOrb, sub(at, side), { size0: size, life: 0.13, color: [1, 1, 1, 1] });
    fx(dim, PARTICLE.redOrb, add(at, side), { size0: size, life: 0.13, color: [1, 1, 1, 1] });
    if (age > PURPLE.fusion - 30 && age % 6 === 0) fx(dim, PARTICLE.sparks, at, { count: 4, radius: 0.2, speed: 4, life: 0.2, size0: 0.15, color: PURPLE_LIGHT });
    return;
  }
  if (age === PURPLE.fusion) {
    fx(dim, PARTICLE.glow, at, { size0: 0.6, size1: 3.2, life: 0.35, color: PURPLE_LIGHT });
    fx(dim, PARTICLE.ring, at, { size0: 0.4, size1: 3, life: 0.3, color: PURPLE_COLOR });
  }
  const grow = smoothstep((age - PURPLE.fusion) / 26);
  fx(dim, PARTICLE.purpleOrb, at, { size0: 0.6 + 0.9 * grow + 0.05 * Math.sin(age), life: 0.13, color: [1, 1, 1, 1] });
  if (age % 4 === 0) fx(dim, PARTICLE.suction, at, { count: 3, radius: 2.2, speed: 6, life: 0.3, size0: 0.3, color: PURPLE_COLOR });
}

function launch(r: Runtime, c: PurpleCharge): void {
  const p = r.player;
  endCharge(r, c);
  const dir = normalize(directionFromRotation(c.pitch, c.yaw));
  const origin = spawnPoint(p, c.yaw, c.pitch);
  const damage = (c.awakened ? PURPLE.awakenedDamage : PURPLE.damage) * cursedMult(r.profile.ce);
  shots.set(r.id, { owner: p, dim: p.dimension, center: origin, dir, traveled: 0, awakened: c.awakened, damage, victims: new Set(), prev: null });
  casts.set(r.id, "purpleShot", () => shots.delete(r.id));
  stopFor(SND.purpleStartVoice, p.dimension, p.location);
  playAt(SND.purpleFireVoice, p.dimension, p.location);
  playAt(SND.purpleFire, p.dimension, origin);
  fx(p.dimension, PARTICLE.glow, origin, { size0: 2, size1: 5, life: 0.25, color: PURPLE_LIGHT });
  fx(p.dimension, PARTICLE.ringFlat, origin, { size0: 1, size1: 6, life: 0.3, color: PURPLE_COLOR, dir });
}

function tickCharge(r: Runtime): void {
  const c = r.cast.get("purple") as PurpleCharge | undefined;
  if (!c) return;
  const p = r.player;
  if (!isAlive(p) || !r.combat) {
    casts.interrupt(r.id, "purple");
    return;
  }
  const age = now() - c.start;
  holdCaster(p, c.lock, c.lock.air ? PURPLE.airRise * liftFraction(age) : 0);
  const rot = p.getRotation();
  c.yaw = rot.y;
  c.pitch = rot.x;
  const progress = Math.min(1, age / PURPLE.charge);
  if (Math.abs(progress - r.holdProgress) > 0.02 || progress === 1) {
    r.holdProgress = progress;
    r.hudDirty = true;
  }
  chargeVisuals(p, c, age);
  if (c.releasedAt < 0 && age >= PURPLE.charge) {
    c.releasedAt = now();
    playAnim(p, "purpleShoot", 0.1);
  }
  if (c.releasedAt >= 0 && now() - c.releasedAt >= PURPLE.windup) launch(r, c);
}

function hurt(s: PurpleShot, a: V3, b: V3, radius: number): void {
  const mid = lerp(a, b, 0.5);
  for (const e of s.dim.getEntities({ location: mid, maxDistance: radius + 3, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (s.victims.has(e.id) || !isTarget(e, s.owner)) continue;
    const box = e.getAABB();
    const min = sub(box.center, box.extent);
    const max = add(box.center, box.extent);
    if (segmentBoxDistanceSq(a, b, min, max) > radius * radius) continue;
    s.victims.add(e.id);
    dealDamage(e, s.damage, s.owner);
  }
}

function tickShot(id: string, s: PurpleShot): void {
  if (!s.owner.isValid || !isAlive(s.owner) || s.traveled >= PURPLE.maxTicks) {
    shots.delete(id);
    casts.clear(id, "purpleShot");
    return;
  }
  const seg = purpleShotSegment(s.center, s.dir, s.traveled, s.awakened);
  if (interceptors.some((fn) => fn(s.dim, seg.a, seg.b, seg.radius, 40))) {
    shots.delete(id);
    casts.clear(id, "purpleShot");
    return;
  }
  if (currentBudget().destroyTerrain) {
    const r = worldSettings().terrain === "completa" ? seg.radius : Math.min(seg.radius, PURPLE.lightTerrainRadius);
    eraseRuns(s.dim, sweptRuns(s.prev, seg.a, seg.b, r));
  }
  hurt(s, seg.a, seg.b, seg.radius);
  const fade = s.traveled >= PURPLE.fadeAt ? 1 - (s.traveled - PURPLE.fadeAt) / (PURPLE.maxTicks - PURPLE.fadeAt) : 1;
  fx(s.dim, PARTICLE.purpleOrb, seg.b, { size0: seg.radius * 1.1, life: 0.1, color: [1, 1, 1, Math.max(0.15, fade)] });
  if (s.traveled % 2 === 0) {
    fx(s.dim, PARTICLE.sparks, seg.a, { count: 6, radius: seg.radius * 0.6, speed: 7, life: 0.35, size0: 0.5, color: PURPLE_COLOR });
    fx(s.dim, PARTICLE.glow, seg.a, { size0: seg.radius * 0.9, size1: seg.radius * 0.2, life: 0.4, color: [0.55, 0.2, 0.9, 0.5 * fade] });
  }
  s.prev = { a: seg.a, b: seg.b };
  s.center = seg.b;
  s.traveled++;
}

export function registerPurple(): void {
  onSlot(4, start);
}

export function tickPurple(r: Runtime): void {
  tickCharge(r);
}

/** Flying shots, once per tick. */
export function tickPurpleShots(): void {
  for (const [id, s] of shots) tickShot(id, s);
}
