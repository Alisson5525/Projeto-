// Awakened slot 2 — Maximum Output: Blue (MaxBlueServer). Gojo stays locked
// while the sphere orbits him and flies out (8.45 s); tapping again cancels it
// (the Java key release). A completed cast leaves a stationary field that pulls
// and hurts everything nearby and rips blocks into the core, until 39 s.
// Joystick forward/back moves the sphere (the Java mouse wheel).
import { type Dimension, type Entity, EntityDamageCause, type Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { debrisStep, debrisVariant, fieldPullVelocity, isPullableBlock, MAX_BLUE, MaxBluePhase, sortedOffsets } from "../../core/maxBlueRules";
import { adjustDistance, maxBlueGrowth, maxBlueRise, maxBlueWorld } from "../../core/maxBluePath";
import { cursedMult } from "../../core/progression";
import { TL } from "../../core/timelines";
import { add, directionFromRotation, lerp, scale, sub, type V3 } from "../../core/vec";
import { ENTITY, PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { onSlot } from "../combat";
import { dealDamage } from "../damage";
import { commit } from "../energy";
import { COLOR, fx } from "../fx";
import { holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, isAwakened, now, type Runtime } from "../players";
import { currentBudget } from "../settings";
import { playAt, stopFor } from "../sound";
import { SND } from "../sounds";
import { isProtectedBlock } from "../terrain";
import { affordable, canBegin, extentOf, isAlive, isTarget, offCooldown, setVelocity } from "./common";

interface Debris {
  entity: Entity;
  born: number;
  velocity: V3;
}

interface Field {
  owner: Player;
  dim: Dimension;
  phase: MaxBluePhase;
  lock: CasterLock;
  center: V3;
  yaw: number;
  pitch: number;
  distance: number;
  damage: number;
  debris: Debris[];
  hits: Map<string, number>;
  cursor: number;
  scanOrigin: string;
  scanBand: number;
}

const fields = new Map<string, Field>();
const OFFSETS = sortedOffsets(MAX_BLUE.pullRadius);
const SCAN_CHECKS = { leve: 64, medio: 128, alto: 256 } as const;

/** Center of the owner's field while it is stationary (Self Purple fusion target). */
export function stationaryCenter(ownerId: string): V3 | null {
  const f = fields.get(ownerId);
  return f && f.phase.phase(now()) === "stationary" ? f.center : null;
}

/** Ends a stationary field that fused into Self Purple. */
export function consumeForFusion(r: Runtime): boolean {
  const f = fields.get(r.id);
  if (!f || f.phase.phase(now()) !== "stationary") return false;
  endField(r, f);
  return true;
}

function totalDebris(): number {
  let n = 0;
  for (const f of fields.values()) n += f.debris.length;
  return n;
}

function start(r: Runtime): void {
  const existing = fields.get(r.id);
  if (existing) {
    // Second tap while casting = the Java key release: cancel.
    if (r.cast.has("maxBlue")) cancel(r, existing);
    return;
  }
  if (!canBegin(r) || !offCooldown(r, "blue") || !affordable(r, COST.maxBlue)) return;
  const p = r.player;
  const rot = p.getRotation();
  const lock = lockCaster(r, "maxBlue", 1.7);
  if (!lock.air) lock.maxRise = 0;
  const f: Field = {
    owner: p,
    dim: p.dimension,
    phase: new MaxBluePhase(now()),
    lock,
    center: maxBlueWorld(p.location, 0, rot.y, rot.x, TL.maxBlue.distance),
    yaw: rot.y,
    pitch: rot.x,
    distance: TL.maxBlue.distance,
    damage: MAX_BLUE.damage * cursedMult(r.profile.ce),
    debris: [],
    hits: new Map(),
    cursor: 0,
    scanOrigin: "",
    scanBand: 0,
  };
  fields.set(r.id, f);
  r.cast.set("maxBlue", f);
  casts.set(r.id, "maxBlue", () => endField(r, f));
  playAt(SND.maxBlueVoice, p.dimension, p.location);
  playAt(SND.maxBlueStart, p.dimension, p.location);
  playAnim(p, "maxBlue", 0.1);
  commit(r, COST.maxBlue);
  r.ready.blue = now() + COOLDOWN.maxBlue;
  r.blueCooldownMax = COOLDOWN.maxBlue;
  r.hudDirty = true;
}

function stopCasting(r: Runtime, f: Field): void {
  releaseCaster(r, f.lock);
  r.cast.delete("maxBlue");
  r.holdProgress = 0;
  r.hudDirty = true;
}

function cancel(r: Runtime, f: Field): void {
  if (!f.phase.release(now())) return;
  stopCasting(r, f);
  stopFor(SND.maxBlueStart, f.dim, f.center);
  if (r.player.isValid) stopAnim(r.player);
}

function endField(r: Runtime, f: Field): void {
  if (fields.get(r.id) !== f) return;
  fields.delete(r.id);
  casts.clear(r.id, "maxBlue");
  if (!f.lock.released) stopCasting(r, f);
  for (const d of f.debris) removeEntity(d.entity);
  f.debris = [];
  stopFor(SND.maxBlueStart, f.dim, f.center);
  r.hudDirty = true;
}

function removeEntity(e: Entity): void {
  try {
    if (e.isValid) e.remove();
  } catch {
    // Already gone.
  }
}

function aim(r: Runtime, f: Field, age: number): void {
  const p = r.player;
  const rot = p.getRotation();
  f.yaw = rot.y;
  f.pitch = rot.x;
  if (age % 5 === 0) {
    const move = p.inputInfo.getMovementVector();
    const steps = move.y > 0.5 ? 1 : move.y < -0.5 ? -1 : 0;
    if (steps !== 0) f.distance = adjustDistance(f.distance, steps);
  }
  if (age <= MAX_BLUE.orbit) f.center = maxBlueWorld(p.location, age, f.yaw, f.pitch, f.distance);
  else {
    const follow = add(p.getHeadLocation(), scale(directionFromRotation(f.pitch, f.yaw), f.distance));
    f.center = lerp(f.center, follow, MAX_BLUE.followRate);
  }
}

function fieldDamage(f: Field, age: number): void {
  const radius = MAX_BLUE.damageRadius * Math.max(0.18, Math.min(1, maxBlueGrowth(age)));
  for (const e of f.dim.getEntities({ location: f.center, maxDistance: radius + 2, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, f.owner)) continue;
    const box = e.getAABB();
    const delta = sub(f.center, box.center);
    const dist = Math.hypot(delta.x, delta.y, delta.z);
    if (dist > radius + extentOf(e).x) continue;
    if (dist > 0.3) setVelocity(e, fieldPullVelocity(e.getVelocity(), delta));
    const hits = f.hits.get(e.id) ?? 0;
    if (hits < MAX_BLUE.maxHits && dealDamage(e, f.damage, f.owner, EntityDamageCause.magic)) f.hits.set(e.id, hits + 1);
  }
}

function pullBlocks(f: Field, age: number, t: number): void {
  const budget = currentBudget();
  if (!budget.destroyTerrain) return;
  const slots = Math.min(budget.maxBlueBlocksPerScan, budget.maxDebris - totalDebris());
  if (slots <= 0) return;
  const radius = MAX_BLUE.pullRadius * Math.max(0.1, Math.min(1, maxBlueGrowth(age)));
  const ox = Math.floor(f.center.x);
  const oy = Math.floor(f.center.y);
  const oz = Math.floor(f.center.z);
  const key = `${ox},${oy},${oz}`;
  const band = Math.ceil(radius);
  if (key !== f.scanOrigin || band > f.scanBand) {
    f.scanOrigin = key;
    f.scanBand = band;
    f.cursor = 0;
  }
  const checks = budget.particles >= 1 ? SCAN_CHECKS.alto : budget.particles >= 0.7 ? SCAN_CHECKS.medio : SCAN_CHECKS.leve;
  const best: { pos: V3; d2: number }[] = [];
  for (let i = 0; i < checks; i++) {
    const o = OFFSETS[f.cursor]!;
    f.cursor = (f.cursor + 1) % OFFSETS.length;
    const pos = { x: ox + o.x, y: oy + o.y, z: oz + o.z };
    const d2 = (pos.x + 0.5 - f.center.x) ** 2 + (pos.y + 0.5 - f.center.y) ** 2 + (pos.z + 0.5 - f.center.z) ** 2;
    if (d2 > radius * radius || pos.y < -64 || pos.y > 319) continue;
    if (best.length >= slots && d2 >= best[best.length - 1]!.d2) continue;
    let block;
    try {
      block = f.dim.getBlock(pos);
    } catch {
      continue;
    }
    if (!block || block.isAir || block.isLiquid || !isPullableBlock(block.typeId) || isProtectedBlock(block.typeId)) continue;
    best.push({ pos, d2 });
    best.sort((a, b) => a.d2 - b.d2);
    if (best.length > slots) best.pop();
  }
  for (const { pos } of best) {
    try {
      const block = f.dim.getBlock(pos);
      if (!block || block.isAir || block.isLiquid) continue;
      const variant = debrisVariant(block.typeId);
      block.setType("minecraft:air");
      const entity = f.dim.spawnEntity(ENTITY.debris, { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 });
      entity.setProperty("jjk:variant", variant);
      f.debris.push({ entity, born: t, velocity: { x: 0, y: 0, z: 0 } });
    } catch {
      // Chunk unloaded or the spawn was refused.
    }
  }
}

function tickDebris(f: Field, t: number, dissolve: boolean): void {
  const keep: Debris[] = [];
  for (const d of f.debris) {
    if (!d.entity.isValid) continue;
    if (dissolve || t - d.born >= MAX_BLUE.debrisLife) {
      removeEntity(d.entity);
      continue;
    }
    const step = debrisStep(d.entity.location, d.velocity, f.center);
    if (step.arrived) {
      removeEntity(d.entity);
      continue;
    }
    d.velocity = step.velocity;
    try {
      d.entity.teleport(step.position);
      keep.push(d);
    } catch {
      removeEntity(d.entity);
    }
  }
  f.debris = keep;
}

function visuals(f: Field, age: number, t: number): void {
  if (age % 2 !== 0) return;
  let size = 2.45 * maxBlueGrowth(age);
  const cancelledAt = f.phase.cancelled;
  if (cancelledAt !== null) size *= Math.max(0, 1 - (t - cancelledAt) / MAX_BLUE.cancel);
  if (size < 0.05) return;
  fx(f.dim, PARTICLE.blueOrb, f.center, { size0: size * (1 + 0.04 * Math.sin(age * 0.9)), life: 0.13, color: [1, 1, 1, 1] });
  if (cancelledAt === null) {
    fx(f.dim, PARTICLE.suction, f.center, { count: 5, radius: Math.max(1.5, size * 2.2), speed: 9, life: 0.35, size0: 0.45, color: COLOR.blueLight });
    if (age % 20 === 0) fx(f.dim, PARTICLE.ring, f.center, { size0: size * 2.5, size1: size * 0.8, life: 0.5, color: COLOR.blueDeep });
  }
}

/** Per-player update of the owner's field. */
export function tickMaxBlue(r: Runtime): void {
  const f = fields.get(r.id);
  if (!f) return;
  const p = r.player;
  const t = now();
  if (!isAlive(p) || !r.combat || p.dimension.id !== f.dim.id) return endField(r, f);
  const phase = f.phase.phase(t);
  if (phase === "ended") return endField(r, f);
  const age = f.phase.age(t);
  if (phase === "casting") {
    holdCaster(p, f.lock, f.lock.air ? maxBlueRise(age) : 0);
    aim(r, f, age);
    const progress = Math.min(1, age / MAX_BLUE.cast);
    if (Math.abs(progress - r.holdProgress) > 0.02) {
      r.holdProgress = progress;
      r.hudDirty = true;
    }
  } else if (!f.lock.released) stopCasting(r, f);
  if (phase === "dissolving") tickDebris(f, t, true);
  else {
    if (age % MAX_BLUE.damageInterval === 0) fieldDamage(f, age);
    if (age % MAX_BLUE.scanInterval === 0) pullBlocks(f, age, t);
    tickDebris(f, t, false);
  }
  visuals(f, age, t);
}

export function registerMaxBlue(): void {
  onSlot(1, start, (r) => isAwakened(r) || r.cast.has("maxBlue"));
}

/** Removes ripped blocks left in the world by a previous session. */
export function cleanupDebris(e: Entity): void {
  if (e.typeId === ENTITY.debris) removeEntity(e);
}
