// Slot 1 — Infinity (GojoInfinityServer): projectiles and falling blocks slow
// down as they approach and stop 0.42 blocks from the body, mobs are slowed
// and pushed out, and the damage pipeline cancels the hits it should block.
import { type Entity, type Player, system, world } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { boxGap, clearancePoint, INFINITY, infinitySpeedFactor, mobPushOptions, slowedProjectileVelocity } from "../../core/infinity";
import { add, dot, lengthSq, normalize, scale, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { onSlot } from "../combat";
import { onLeaveCombat } from "../combatMode";
import { onInfinityBlock } from "../damage";
import { commitExact } from "../energy";
import { COLOR, fx } from "../fx";
import { find, now, online, type Runtime } from "../players";
import { playAt } from "../sound";
import { SND } from "../sounds";
import { affordableExact, isAlive, offCooldown, setVelocity } from "./common";

const SLOW_TAG = "jjk_inf_slow";
const EXPLOSIONS = new Set(["entityExplosion", "blockExplosion", "fireworks"]);
const IGNORED = ["minecraft:item", "minecraft:xp_orb", "minecraft:player"];

const slowedMobs = new Map<string, Entity>();
const heardObjects = new Map<string, string>();
const lastDeflect = new Map<string, number>();

interface Box {
  min: V3;
  max: V3;
  center: V3;
}

function boxOf(e: Entity): Box {
  const { center, extent } = e.getAABB();
  return { min: sub(center, extent), max: add(center, extent), center };
}

// ---- toggle -------------------------------------------------------------------

function toggleFx(p: Player, on: boolean): void {
  const chest = add(p.location, { x: 0, y: 1.1, z: 0 });
  fx(p.dimension, PARTICLE.dots, chest, { count: 16, radius: on ? 0.5 : 1.5, speed: on ? 1.8 : -1.8, life: 0.55, size0: 0.05, color: COLOR.infinity });
  if (on) fx(p.dimension, PARTICLE.ring, chest, { size0: 0.3, size1: 1.5, life: 0.35, color: COLOR.infinity });
  playAt(SND.infinityToggle, p.dimension, chest, on ? 1 : 0.8);
}

export function raiseInfinity(r: Runtime): void {
  if (r.infinity || !r.combat || r.profile.technique !== "limitless" || !isAlive(r.player)) return;
  if (!offCooldown(r, "infinity")) return;
  const start = r.profile.sixEyes ? 0 : COST.infinityStart;
  if (!affordableExact(r, start)) return;
  commitExact(r, start, COST.infinityStart);
  r.infinity = true;
  r.hudDirty = true;
  toggleFx(r.player, true);
}

/** Lowers Infinity (toggle, energy ran out, left combat): 3 s cooldown. */
export function lowerInfinity(r: Runtime, silent = false): void {
  if (!r.infinity) return;
  r.infinity = false;
  r.lastTechniqueTick = now();
  r.ready.infinity = now() + COOLDOWN.infinity;
  r.hudDirty = true;
  if (!silent && r.player.isValid) toggleFx(r.player, false);
}

const toggle = (r: Runtime): void => (r.infinity ? lowerInfinity(r) : raiseInfinity(r));

// ---- deflection feedback ----------------------------------------------------------

function deflect(p: Player, source: V3 | undefined): void {
  const t = now();
  const prev = lastDeflect.get(p.id);
  if (prev !== undefined && t - prev < INFINITY.deflectSoundInterval && t >= prev) return;
  lastDeflect.set(p.id, t);
  const center = boxOf(p).center;
  const offset = source ? sub(source, center) : { x: 0, y: 0, z: 0 };
  const contact = lengthSq(offset) > 2.25 ? add(center, scale(normalize(offset), 1.5)) : add(center, offset);
  playAt(SND.infinityDeflect, p.dimension, contact);
  fx(p.dimension, PARTICLE.ring, contact, { size0: 0.12, size1: 0.8, life: 0.3, color: COLOR.infinity });
  fx(p.dimension, PARTICLE.dots, contact, { count: 5, radius: 0.05, speed: 1.4, life: 0.3, size0: 0.04, color: COLOR.infinity });
}

/** Sound once per object (HEARD_OBJECTS). */
function deflectObject(p: Player, object: Entity, contact: V3): void {
  if (heardObjects.get(object.id) === p.id) return;
  heardObjects.set(object.id, p.id);
  deflect(p, contact);
}

// ---- world update ---------------------------------------------------------------

function isMob(e: Entity): boolean {
  return e.typeId !== "minecraft:armor_stand" && !!e.getComponent("minecraft:movement") && !!e.getComponent("minecraft:health");
}

function slowMob(mob: Entity, factor: number): void {
  const movement = mob.getComponent("minecraft:movement");
  if (!movement) return;
  movement.setCurrentValue(movement.defaultValue * factor);
  if (!slowedMobs.has(mob.id)) {
    slowedMobs.set(mob.id, mob);
    mob.addTag(SLOW_TAG);
  }
}

function restoreMob(mob: Entity): void {
  slowedMobs.delete(mob.id);
  if (!mob.isValid) return;
  try {
    mob.getComponent("minecraft:movement")?.resetToDefaultValue();
    mob.removeTag(SLOW_TAG);
  } catch {
    // Removed while we were looking at it.
  }
}

function handleObject(p: Player, body: Box, e: Entity): void {
  const box = boxOf(e);
  const gap = boxGap(body.min, body.max, box.min, box.max);
  const velocity = e.getVelocity();
  if (gap < INFINITY.outerGap) {
    const toward = sub(body.center, e.location);
    const next = slowedProjectileVelocity(velocity, toward, gap);
    if (next) {
      if (gap < 1.25 && dot(velocity, toward) > 0 && lengthSq(next) <= 0.0016 && lengthSq(next) < lengthSq(velocity)) deflectObject(p, e, e.location);
      setVelocity(e, next);
    }
  }
  const inflate = INFINITY.minGap + Math.max(0.05, (box.max.x - box.min.x) / 2);
  const safe = clearancePoint(e.location, body.min, body.max, inflate, velocity);
  if (!safe) return;
  deflectObject(p, e, safe);
  try {
    e.teleport(safe, { keepVelocity: false });
    e.clearVelocity();
  } catch {
    // Entity removed this tick.
  }
}

function handleMob(body: Box, mob: Entity, touched: Set<string>): void {
  const box = boxOf(mob);
  const gap = boxGap(body.min, body.max, box.min, box.max);
  const factor = infinitySpeedFactor(gap);
  if (factor < 0.999) {
    slowMob(mob, Math.max(INFINITY.minMobFactor, factor));
    touched.add(mob.id);
  }
  if (gap > 1.5) return;
  for (const o of mobPushOptions(body.min, body.max, box.min, box.max)) {
    if (mob.tryTeleport(add(mob.location, { x: o.dx, y: 0, z: o.dz }), { checkForBlocks: true, keepVelocity: false })) return;
  }
}

/** Every tick: applies each active Infinity to nearby objects and mobs (nearest defender wins). */
export function tickInfinity(): void {
  const defenders: { p: Player; body: Box }[] = [];
  for (const r of online()) {
    if (r.infinity && r.combat && isAlive(r.player)) {
      defenders.push({ p: r.player, body: boxOf(r.player) });
    }
  }
  const touched = new Set<string>();
  if (defenders.length > 0) {
    const nearest = new Map<string, { e: Entity; d: (typeof defenders)[number]; dist: number }>();
    for (const d of defenders) {
      for (const e of d.p.dimension.getEntities({ location: d.body.center, maxDistance: INFINITY.searchRange + 1, excludeTypes: IGNORED })) {
        const dist = lengthSq(sub(e.location, d.body.center));
        const known = nearest.get(e.id);
        if (!known || dist < known.dist) nearest.set(e.id, { e, d, dist });
      }
    }
    for (const { e, d } of nearest.values()) {
      if (!e.isValid) continue;
      try {
        const projectile = e.getComponent("minecraft:projectile");
        if (projectile || e.typeId === "minecraft:falling_block") {
          if (projectile?.owner?.id !== d.p.id) handleObject(d.p, d.body, e);
        } else if (isMob(e)) handleMob(d.body, e, touched);
      } catch {
        // The entity left the world mid-update.
      }
    }
  }
  for (const [id, mob] of slowedMobs) if (!touched.has(id)) restoreMob(mob);
  if (now() % 200 === 0) {
    for (const id of heardObjects.keys()) if (!world.getEntity(id)) heardObjects.delete(id);
  }
}

export function registerInfinity(): void {
  onSlot(0, toggle);
  onLeaveCombat((r) => lowerInfinity(r, true));
  onInfinityBlock((victim, source, cause, v) => {
    if (!victim.isValid) return;
    deflect(victim, source);
    // Explosions from outside the body push nothing (ExplosionKnockbackEvent):
    // restore the motion the player had before the blast.
    if (!EXPLOSIONS.has(cause)) return;
    try {
      victim.applyKnockback({ x: v.x, z: v.z }, v.y);
    } catch {
      // ignore
    }
  });
  // Mobs left slowed by a previous session (world closed mid-fight).
  world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (!slowedMobs.has(entity.id) && entity.isValid && entity.hasTag(SLOW_TAG)) restoreMob(entity);
  });
  system.run(() => {
    for (const dim of ["overworld", "nether", "the_end"]) {
      try {
        for (const e of world.getDimension(dim).getEntities({ tags: [SLOW_TAG] })) restoreMob(e);
      } catch {
        // ignore
      }
    }
  });
}

/** Whether a player currently has Infinity raised (for other systems). */
export const hasInfinity = (id: string): boolean => !!find(id)?.infinity;
