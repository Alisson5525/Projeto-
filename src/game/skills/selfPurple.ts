// Self Purple (SelfPurpleServer): a Max Red beam that crosses the caster's
// stationary Max Blue fuses them. The purple mass crackles for 5 s (the Nuke
// window), then detonates: 40 x cursed damage to everything within 24 blocks,
// half of Gojo's health if he is inside, and a spherical crater.
import type { Dimension, Player } from "@minecraft/server";
import { sphereRuns } from "../../core/geometry";
import { cursedMult } from "../../core/progression";
import { fusesWithBlue, SELF_PURPLE, SelfPurpleClock } from "../../core/purpleRules";
import { distanceSq, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { dealDamage, guardFall } from "../damage";
import { fx, type Rgba } from "../fx";
import { now, type Runtime } from "../players";
import { currentBudget } from "../settings";
import { playAt, stopFor } from "../sound";
import { SND } from "../sounds";
import { eraseRuns, terrainPending } from "../terrain";
import { grantTechniqueXp } from "../xp";
import { centerOf, isAlive, isTarget } from "./common";
import { consumeForFusion, stationaryCenter } from "./maxBlue";

/** self_purple_end2.json palette. */
const FLASH: Rgba = [1, 0.96, 1, 0.9];
const CORONA: Rgba = [0.62, 0.15, 1, 0.75];
const RING: Rgba = [0.91, 0.74, 1, 0.7];
const SPARK: Rgba = [0.76, 0.47, 1, 0.9];

interface Blast {
  owner: Player;
  dim: Dimension;
  center: V3;
  clock: SelfPurpleClock;
  damage: number;
  impactStarted: boolean;
  /** Taken over by the Nuke (Task 11): no detonation of its own. */
  nukeOwned: boolean;
}

const blasts = new Map<string, Blast>();

/** Tries to fuse the beam segment a→b with the caster's stationary Max Blue. */
export function fuse(r: Runtime, a: V3, b: V3): V3 | null {
  if (blasts.has(r.id)) return null;
  const center = stationaryCenter(r.id);
  if (!center || !fusesWithBlue(center, a, b) || !consumeForFusion(r)) return null;
  const p = r.player;
  blasts.set(r.id, {
    owner: p,
    dim: p.dimension,
    center,
    clock: new SelfPurpleClock(now()),
    damage: SELF_PURPLE.damage * cursedMult(r.profile.ce),
    impactStarted: false,
    nukeOwned: false,
  });
  grantTechniqueXp(r, 120);
  playAt(SND.selfSparking, p.dimension, center);
  fx(p.dimension, PARTICLE.glow, center, { size0: 2, size1: 6, life: 0.35, color: FLASH });
  return center;
}

/** The Nuke can start during the 100-tick hold of an un-detonated Self Purple. */
export function nukeWindowOpen(r: Runtime): boolean {
  const b = blasts.get(r.id);
  return !!b && !b.nukeOwned && !b.impactStarted && b.dim.id === r.player.dimension.id && b.clock.canStartNuke(now());
}

/** Hands the Self Purple over to the Nuke; returns its center. */
export function consumeForNuke(r: Runtime): V3 | null {
  if (!nukeWindowOpen(r)) return null;
  const b = blasts.get(r.id)!;
  blasts.delete(r.id);
  stopFor(SND.selfSparking, b.dim, b.center);
  return b.center;
}

function detonate(b: Blast): void {
  b.impactStarted = true;
  stopFor(SND.selfSparking, b.dim, b.center);
  playAt(SND.selfExplosion, b.dim, b.center);
  const owner = b.owner;
  const inside = distanceSq(centerOf(owner), b.center) <= SELF_PURPLE.radius * SELF_PURPLE.radius;
  if (inside) guardFall(owner, SELF_PURPLE.fallGuard, () => terrainPending() > 0);
  for (const e of b.dim.getEntities({ location: b.center, maxDistance: SELF_PURPLE.radius + 2, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, owner)) continue;
    if (distanceSq(centerOf(e), b.center) > SELF_PURPLE.radius * SELF_PURPLE.radius) continue;
    dealDamage(e, b.damage, owner);
  }
  if (inside && isAlive(owner)) {
    const health = owner.getComponent("minecraft:health");
    health?.setCurrentValue(Math.max(1, health.currentValue * 0.5));
  }
  const budget = currentBudget();
  if (budget.destroyTerrain) eraseRuns(b.dim, sphereRuns(b.center, budget.selfPurpleRadius));
  fx(b.dim, PARTICLE.glow, b.center, { size0: 4, size1: 26, life: 0.7, color: FLASH });
  fx(b.dim, PARTICLE.glow, b.center, { size0: 8, size1: 25, life: 1.2, color: CORONA });
  fx(b.dim, PARTICLE.ring, b.center, { size0: 3, size1: 31, life: 0.8, color: RING });
  fx(b.dim, PARTICLE.ringFlat, b.center, { size0: 3, size1: 35, life: 1, color: CORONA, dir: { x: 0, y: 1, z: 0 } });
  fx(b.dim, PARTICLE.sparks, b.center, { count: 40, radius: 2, speed: 32, life: 0.9, size0: 1.4, color: SPARK });
  fx(b.dim, PARTICLE.dots, b.center, { count: 30, radius: 3, speed: 14, life: 1.4, size0: 0.25, color: RING });
}

function visuals(b: Blast, age: number): void {
  if (!b.impactStarted) {
    if (age % 2 === 0) {
      fx(b.dim, PARTICLE.purpleOrb, b.center, { size0: 3.2 + 0.35 * Math.sin(age * 0.8), life: 0.13, color: [1, 1, 1, 1] });
    }
    if (age % 3 === 0) fx(b.dim, PARTICLE.sparks, b.center, { count: 6, radius: 2.4, speed: 6, life: 0.25, size0: 0.5, color: SPARK });
    return;
  }
  const since = age - SELF_PURPLE.hold - SELF_PURPLE.impact;
  if (since > 0 && since < 80 && since % 8 === 0) {
    const k = 1 - since / 80;
    fx(b.dim, PARTICLE.glow, b.center, { size0: 18 * k, size1: 10 * k, life: 0.5, color: [0.62, 0.15, 1, 0.5 * k] });
  }
}

/** World update of every Self Purple, once per tick. */
export function tickSelfPurple(): void {
  const t = now();
  for (const [id, b] of blasts) {
    if (!b.owner.isValid || !isAlive(b.owner) || b.owner.dimension.id !== b.dim.id) {
      if (!b.impactStarted) stopFor(SND.selfSparking, b.dim, b.center);
      blasts.delete(id);
      continue;
    }
    if (b.clock.detonate(t)) detonate(b);
    visuals(b, b.clock.age(t));
    if (b.clock.fxEnded(t)) blasts.delete(id);
  }
}
