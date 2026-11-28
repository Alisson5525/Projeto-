// Awakened slot 5 during the Self Purple window — Nuke Purple (GojoNukeServer).
// A 21.3 s cinematic: Gojo rises 15 blocks while the Self Purple spirals over
// his head, a new Blue and Red are thrown into orbit and fused, the purples
// merge and charge, and at 19 s a radius-64 explosion pulses damage for 15 s
// and sweeps the terrain top-down. The camera follows the Java path.
import { type Dimension, EasingType, HudVisibility, type Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { sphereRuns } from "../../core/geometry";
import { cameraPose, NUKE_TICKS, nukeDamageAt, type Pose } from "../../core/nukeCinematic";
import { NUKE, nukeBlue, nukeChargeOpacity, nukeLift, nukeOverhead, nukePrimary, nukeRed, nukeSecondary } from "../../core/nukeTimeline";
import { cursedMult } from "../../core/progression";
import { add, directionFromRotation, distanceSq, rightOf, scale, smoothstep, toLocal, toWorld, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { applyCombatCamera, onSlot } from "../combat";
import { dealDamage, guardFall } from "../damage";
import { commit } from "../energy";
import { fx, type Rgba } from "../fx";
import { hideHud, resumeHud } from "../hud";
import { holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, isAwakened, now, type Runtime } from "../players";
import { currentBudget } from "../settings";
import { playFor, type SoundDef } from "../sound";
import { SND } from "../sounds";
import { isStunned } from "../stun";
import { eraseRuns, terrainPending } from "../terrain";
import { affordable, centerOf, isAlive, isTarget } from "./common";
import { consumeForNuke, nukeWindowOpen } from "./selfPurple";

const VIOLET: Rgba = [0.62, 0.15, 1, 0.8];
const LILAC: Rgba = [0.9, 0.78, 1, 0.85];
const WHITE: Rgba = [1, 0.97, 1, 0.95];
const ORB: Rgba = [1, 1, 1, 1];
const SOUNDS: SoundDef[] = [SND.nukeVoice, SND.nukeSfx, SND.nukeMusic];
/** Vanilla free camera preset (positioned by script every tick). */
const FREE_CAMERA = "minecraft:free";

interface NukeCast {
  start: number;
  dim: Dimension;
  origin: V3;
  yaw: number;
  primaryLocal: V3;
  center: V3;
  lock: CasterLock;
  released: boolean;
  initial: Pose;
  listeners: Player[];
  damage: number;
}

const world = (c: NukeCast, local: V3): V3 => toWorld(c.origin, c.yaw, local);

/** Approximation of the shoulder camera, to blend into and out of the cinematic. */
function shoulderPose(r: Runtime): Pose {
  const p = r.player;
  const rot = p.getRotation();
  const radius = [2, 2.8, 4.2][r.profile.settings.camDist] ?? 2.8;
  const pivot = add(p.location, { x: 0, y: 1.6, z: 0 });
  const back = scale(directionFromRotation(rot.x, rot.y), -radius);
  const side = scale(rightOf(rot.y), 0.7 * r.profile.settings.camSide);
  return { pos: add(add(pivot, back), add(side, { x: 0, y: 0.25, z: 0 })), yaw: rot.y, pitch: rot.x };
}

function start(r: Runtime): void {
  const p = r.player;
  if (r.cast.has("nuke") || !r.combat || !isAlive(p) || isStunned(p) || r.cast.has("purple") || r.cast.has("maxBlue")) return;
  if (!affordable(r, COST.nuke)) return;
  const selfPurple = consumeForNuke(r);
  if (!selfPurple) return;
  casts.interrupt(r.id, "maxRed");
  const yaw = p.getRotation().y;
  const origin = p.location;
  const c: NukeCast = {
    start: now(),
    dim: p.dimension,
    origin,
    yaw,
    primaryLocal: toLocal(origin, yaw, selfPurple),
    center: toWorld(origin, yaw, nukeOverhead()),
    lock: lockCaster(r, "nuke", NUKE.riseBlocks, { ignoreCeiling: true, teleport: true, rotation: { x: 0, y: yaw } }),
    released: false,
    initial: shoulderPose(r),
    listeners: [],
    damage: cursedMult(r.profile.ce),
  };
  r.cast.set("nuke", c);
  casts.set(r.id, "nuke", () => finish(r, c, true));
  commit(r, COST.nuke);
  r.ready.purple = now() + COOLDOWN.purple;
  r.invulnerableUntil = Math.max(r.invulnerableUntil, c.start + NUKE_TICKS.end);
  const radius2 = NUKE.damageRadius * NUKE.damageRadius;
  for (const listener of p.dimension.getPlayers()) {
    if (listener.id !== p.id && distanceSq(listener.location, c.center) > radius2) continue;
    c.listeners.push(listener);
    for (const s of SOUNDS) playFor(s, listener);
  }
  hideHud(r, NUKE_TICKS.end + 20);
  try {
    p.onScreenDisplay.setHudVisibility(HudVisibility.Hide);
  } catch {
    // ignore
  }
  playAnim(p, "nuke", 0.1);
}

function finish(r: Runtime, c: NukeCast, cancelled: boolean): void {
  r.cast.delete("nuke");
  casts.clear(r.id, "nuke");
  releaseCaster(r, c.lock);
  for (const listener of c.listeners) {
    if (!listener.isValid) continue;
    for (const s of SOUNDS) {
      try {
        listener.runCommand(`stopsound @s ${s.id}`);
      } catch {
        // ignore
      }
    }
  }
  const p = r.player;
  if (cancelled) r.invulnerableUntil = Math.min(r.invulnerableUntil, now());
  if (!p.isValid) return;
  try {
    p.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
    if (r.combat) applyCombatCamera(r);
    else p.camera.clear();
  } catch {
    // ignore
  }
  resumeHud(r);
  if (cancelled) stopAnim(p);
}

function release(r: Runtime, c: NukeCast): void {
  c.released = true;
  releaseCaster(r, c.lock);
  r.invulnerableUntil = Math.max(r.invulnerableUntil, c.start + NUKE_TICKS.end);
  const terrainEnd = c.start + NUKE_TICKS.effectEnd;
  guardFall(r.player, NUKE_TICKS.effectEnd - NUKE_TICKS.release + NUKE.fallProtectionSeconds * 20, () => now() < terrainEnd || terrainPending() > 0);
}

function camera(r: Runtime, c: NukeCast, secs: number): void {
  const pose = cameraPose(secs, { origin: c.origin, yaw: c.yaw, initial: c.initial, normal: shoulderPose(r) });
  try {
    r.player.camera.setCamera(FREE_CAMERA, {
      location: pose.pos,
      rotation: { x: Math.max(-89.9, Math.min(89.9, pose.pitch)), y: pose.yaw },
      easeOptions: { easeTime: 0.05, easeType: EasingType.Linear },
    });
  } catch {
    // ignore
  }
}

function choreography(c: NukeCast, secs: number, tick: number): void {
  if (tick % 2 !== 0) return;
  const dim = c.dim;
  if (secs < NUKE.explosionAt) {
    // Self Purple spirals overhead and charges there.
    const primary = world(c, secs <= NUKE.primaryArrive ? nukePrimary(secs, c.primaryLocal) : nukeOverhead());
    const charge = secs >= NUKE.chargeAt ? smoothstep((secs - NUKE.chargeAt) / (NUKE.explosionAt - NUKE.chargeAt)) : 0;
    fx(dim, PARTICLE.purpleOrb, primary, { size0: 3.2 + 4.5 * charge + 0.2 * Math.sin(tick * 0.4), life: 0.13, color: ORB });
    if (secs >= NUKE.blueAppear && secs < NUKE.fusionAt) {
      const grow = smoothstep((secs - NUKE.blueAppear) / 1);
      fx(dim, PARTICLE.blueOrb, world(c, nukeBlue(secs)), { size0: 0.7 * grow, life: 0.13, color: ORB });
    }
    if (secs >= NUKE.redAppear && secs < NUKE.fusionAt) {
      const grow = smoothstep((secs - NUKE.redAppear) / 1);
      fx(dim, PARTICLE.redOrb, world(c, nukeRed(secs)), { size0: 0.7 * grow, life: 0.13, color: ORB });
    }
    if (secs >= NUKE.fusionAt && secs < NUKE.chargeAt + NUKE.mergeOverlap) {
      const fade = 1 - nukeChargeOpacity(secs);
      fx(dim, PARTICLE.purpleOrb, world(c, nukeSecondary(secs)), { size0: 1.3 + 0.7 * smoothstep((secs - NUKE.fusionAt) / 2), life: 0.13, color: [1, 1, 1, fade] });
    }
    if (charge > 0 && tick % 4 === 0) {
      fx(dim, PARTICLE.suction, c.center, { count: 8, radius: 10 + 6 * charge, speed: 18, life: 0.5, size0: 1.2, color: VIOLET });
      if (tick % 20 === 0) fx(dim, PARTICLE.ring, c.center, { size0: 16, size1: 4, life: 0.6, color: LILAC });
    }
  }
}

function explode(r: Runtime, c: NukeCast): void {
  const p = r.player;
  const health = p.getComponent("minecraft:health");
  if (health && health.currentValue > 0) health.setCurrentValue(Math.max(1, health.currentValue * (1 - NUKE.casterHealthCost)));
  const budget = currentBudget();
  if (budget.destroyTerrain) eraseRuns(c.dim, sphereRuns(c.center, budget.nukeRadius));
  fx(c.dim, PARTICLE.glow, c.center, { size0: 8, size1: 80, life: 1.5, color: WHITE });
  fx(c.dim, PARTICLE.ring, c.center, { size0: 6, size1: 70, life: 1.2, color: LILAC });
  fx(c.dim, PARTICLE.ringFlat, c.center, { size0: 6, size1: 90, life: 2, color: VIOLET, dir: { x: 0, y: 1, z: 0 } });
  fx(c.dim, PARTICLE.sparks, c.center, { count: 60, radius: 4, speed: 50, life: 1.6, size0: 3, color: LILAC });
  fx(c.dim, PARTICLE.dots, c.center, { count: 40, radius: 6, speed: 25, life: 2.5, size0: 0.6, color: VIOLET });
}

function explosionPulse(c: NukeCast, since: number): void {
  if (since % 10 !== 0) return;
  const k = 1 - since / (NUKE_TICKS.effectEnd - NUKE_TICKS.explosion);
  const size = Math.min(NUKE.damageRadius, 20 + since * 0.8);
  fx(c.dim, PARTICLE.purpleOrb, c.center, { size0: size, life: 0.6, color: [1, 1, 1, 0.35 + 0.5 * k] });
  fx(c.dim, PARTICLE.glow, c.center, { size0: size * 0.6, size1: size * 1.1, life: 0.6, color: [0.75, 0.4, 1, 0.5 * k] });
  if (since % 40 === 0) fx(c.dim, PARTICLE.sparks, c.center, { count: 24, radius: size * 0.5, speed: 30, life: 1.2, size0: 2.5, color: LILAC });
}

function hurt(r: Runtime, c: NukeCast, amount: number): void {
  const p = r.player;
  const radius2 = NUKE.damageRadius * NUKE.damageRadius;
  for (const e of c.dim.getEntities({ location: c.center, maxDistance: NUKE.damageRadius + 2, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, p) || distanceSq(centerOf(e), c.center) > radius2) continue;
    dealDamage(e, amount * c.damage, p);
  }
}

/** Per-player update of a running Nuke. */
export function tickNuke(r: Runtime): void {
  const c = r.cast.get("nuke") as NukeCast | undefined;
  if (!c) return;
  const p = r.player;
  const tick = now() - c.start;
  if (!isAlive(p) || p.dimension.id !== c.dim.id) return finish(r, c, true);
  if (tick >= NUKE_TICKS.end) return finish(r, c, false);
  const secs = tick / 20;
  if (!c.released) {
    if (tick >= NUKE_TICKS.release) release(r, c);
    else holdCaster(p, c.lock, nukeLift(secs));
  }
  camera(r, c, secs);
  choreography(c, secs, tick);
  if (tick === NUKE_TICKS.explosion) explode(r, c);
  if (tick >= NUKE_TICKS.explosion && tick < NUKE_TICKS.effectEnd) explosionPulse(c, tick - NUKE_TICKS.explosion);
  const damage = nukeDamageAt(tick);
  if (damage > 0) hurt(r, c, damage);
}

export function registerNuke(): void {
  onSlot(4, start, (r) => isAwakened(r) && nukeWindowOpen(r));
}
