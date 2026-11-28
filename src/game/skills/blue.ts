// Slot 2 — Lapse: Blue (GojoBlueServer). Tap: the target under the crosshair
// is stunned and pulled in front of Gojo at 1.5 s. Tapping again before that
// (the Java "hold") pulls Gojo to the target instead, or — with no target —
// makes him fly where he aims (energy charged only then).
import type { Entity, Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { BLUE, bluePullDestination, bluePullVelocity, palmAnchor, pickBlueTarget, selfPullMomentum, type BlueCandidate } from "../../core/skillRules";
import { TL } from "../../core/timelines";
import { distanceSq, smoothstep, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { stopAnim, playAnim } from "../anim";
import { hasLineOfSight, onSlot } from "../combat";
import { commit } from "../energy";
import { COLOR, fx } from "../fx";
import { K } from "../i18n";
import { casts, find, isAwakened, isRolling, now, type Runtime } from "../players";
import { playAt } from "../sound";
import { SND } from "../sounds";
import { clearSlow, setSlow } from "../speed";
import { isStunned, stun } from "../stun";
import { affordable, canBegin, centerOf, extentOf, hint, isAlive, isTarget, offCooldown, setVelocity } from "./common";

interface BlueCast {
  start: number;
  target: Entity | null;
  /** Second tap arrived before the pull (Java: key still held). */
  pullCaster: boolean;
  pullStarted: boolean;
  pullInterrupted: boolean;
  stunApplied: boolean;
  freeOrigin: V3 | null;
  momentum: V3;
  anchor: V3;
  lockedYaw: number;
}

const ZERO = { x: 0, y: 0, z: 0 };

function chooseTarget(p: Player): Entity | null {
  const eye = p.getHeadLocation();
  const look = p.getViewDirection();
  const byId = new Map<string, Entity>();
  const candidates: BlueCandidate[] = [];
  for (const e of p.dimension.getEntities({ location: eye, maxDistance: BLUE.range + 2, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, p)) continue;
    byId.set(e.id, e);
    candidates.push({ id: e.id, center: centerOf(e) });
  }
  // Raycasts are the expensive part: only for the best candidates, in order.
  while (candidates.length > 0) {
    const id = pickBlueTarget(eye, look, candidates);
    if (!id) return null;
    const e = byId.get(id)!;
    if (hasLineOfSight(p, e)) return e;
    candidates.splice(candidates.findIndex((c) => c.id === id), 1);
  }
  return null;
}

function isGuarding(e: Entity): boolean {
  return e.typeId === "minecraft:player" && !!find(e.id)?.guarding;
}

function start(r: Runtime): void {
  const existing = r.cast.get("blue") as BlueCast | undefined;
  if (existing) {
    if (!existing.pullStarted) existing.pullCaster = true;
    return;
  }
  if (!canBegin(r) || !offCooldown(r, "blue") || !affordable(r, COST.blue)) return;
  const p = r.player;
  const target = chooseTarget(p);
  const t = now();
  const cast: BlueCast = {
    start: t,
    target,
    pullCaster: false,
    pullStarted: false,
    pullInterrupted: false,
    stunApplied: false,
    freeOrigin: null,
    momentum: ZERO,
    anchor: palmAnchor(p.getHeadLocation(), p.getRotation().y),
    lockedYaw: p.getRotation().y,
  };
  r.cast.set("blue", cast);
  casts.set(r.id, "blue", () => finish(r, cast));
  setSlow(p, "blue", BLUE.slow);
  playAnim(p, "blue", 0.1);
  if (target) {
    commit(r, COST.blue);
    r.ready.blue = t + COOLDOWN.blue;
    r.blueCooldownMax = COOLDOWN.blue;
    hint(r, K.hintBlueTarget);
  } else hint(r, K.hintBlueFree);
  r.hudDirty = true;
}

/** Charges an untargeted Blue when the flight starts (activateUntargetedBlue). */
function activateUntargeted(r: Runtime): boolean {
  if (now() < r.ready.blue || !affordable(r, COST.blue)) return false;
  commit(r, COST.blue);
  r.ready.blue = now() + COOLDOWN.blue;
  r.blueCooldownMax = COOLDOWN.blue;
  r.hudDirty = true;
  return true;
}

function finish(r: Runtime, c: BlueCast): void {
  r.cast.delete("blue");
  casts.clear(r.id, "blue");
  const p = r.player;
  if (!p.isValid) return;
  clearSlow(p, "blue");
  if (!c.target && c.pullStarted && c.pullCaster) {
    // stopFreePull: keep falling, drop the horizontal speed.
    setVelocity(p, { x: 0, y: Math.min(0, p.getVelocity().y), z: 0 });
  }
  if (now() - c.start < TL.blue.cast - 1) stopAnim(p);
  r.hudDirty = true;
}

function halt(p: Player, c: BlueCast): void {
  c.momentum = ZERO;
  setVelocity(p, ZERO);
}

function selfPull(p: Player, c: BlueCast, destination: V3, remaining: number): void {
  const m = selfPullMomentum(c.momentum, p.location, destination, remaining, p.isOnGround, p.getRotation().y);
  if (!m) return halt(p, c);
  c.momentum = m;
  setVelocity(p, m);
}

function pullCasterToTarget(p: Player, c: BlueCast, target: Entity): void {
  if (!hasLineOfSight(p, target)) return halt(p, c);
  const toward = sub(target.location, p.location);
  const horizontal = Math.hypot(toward.x, toward.z);
  const stopAt = Math.max(BLUE.stopGap, extentOf(p).x + extentOf(target).x + BLUE.stopExtra);
  const remaining = horizontal - stopAt;
  if (remaining <= BLUE.haltGap || horizontal < 1e-6) return halt(p, c);
  const dir = { x: toward.x / horizontal, z: toward.z / horizontal };
  const destination = { x: target.location.x - dir.x * stopAt, y: target.location.y + 0.35, z: target.location.z - dir.z * stopAt };
  selfPull(p, c, destination, remaining);
}

function pullAlongAim(r: Runtime, c: BlueCast): void {
  const p = r.player;
  const origin = c.freeOrigin!;
  const remaining = BLUE.freeDistance - Math.sqrt(distanceSq(p.location, origin));
  if (remaining <= BLUE.haltGap) return finish(r, c);
  let dir = p.getViewDirection();
  if (p.isOnGround && dir.y < 0) {
    const flat = Math.hypot(dir.x, dir.z);
    dir = flat > 1e-4 ? { x: dir.x / flat, y: 0, z: dir.z / flat } : { x: 0, y: 0, z: 1 };
  }
  selfPull(p, c, { x: p.location.x + dir.x * remaining, y: p.location.y + dir.y * remaining, z: p.location.z + dir.z * remaining }, remaining);
}

function visuals(r: Runtime, c: BlueCast, age: number): void {
  const p = r.player;
  if (age < TL.blue.pull) c.anchor = palmAnchor(p.getHeadLocation(), p.getRotation().y);
  if (age >= TL.blue.fx && age <= TL.blue.pull + 4 && (age - TL.blue.fx) % 2 === 0) {
    const grow = smoothstep((age - TL.blue.fx) / 8) * (1 + 0.05 * Math.sin(age * 1.7));
    fx(p.dimension, PARTICLE.blueOrb, c.anchor, { size0: 0.7 * grow, life: 0.13, color: [1, 1, 1, 1] });
    fx(p.dimension, PARTICLE.suction, c.anchor, { count: 4, radius: 1.5, speed: 4.5, life: 0.3, size0: 0.24, color: COLOR.blueLight });
  }
  if (age === TL.blue.pull + 5) {
    fx(p.dimension, PARTICLE.glow, c.anchor, { size0: 1.6, size1: 0.1, life: 0.25, color: COLOR.blueDeep });
  }
  const target = c.target;
  if (c.stunApplied && !c.pullInterrupted && target?.isValid && age % 3 === 0) {
    fx(p.dimension, PARTICLE.suction, centerOf(target), { count: 3, radius: 1, speed: 3, life: 0.3, size0: 0.18, color: COLOR.blueLight });
  }
}

function tick(r: Runtime): void {
  const c = r.cast.get("blue") as BlueCast | undefined;
  if (!c) return;
  const p = r.player;
  const age = now() - c.start;
  if (!isAlive(p) || !r.combat || age >= TL.blue.cast) return finish(r, c);
  visuals(r, c, age);
  if (age < TL.blue.pull) return;

  if (!c.pullStarted) {
    c.pullStarted = true;
    c.lockedYaw = p.getRotation().y;
    if (!c.target) {
      if (!c.pullCaster || !activateUntargeted(r)) return finish(r, c);
      c.freeOrigin = p.location;
      playAt(SND.bluePull, p.dimension, p.location);
    } else if (c.target.isValid && isAlive(c.target)) {
      if (isGuarding(c.target)) c.pullInterrupted = true;
      else {
        stun(c.target, TL.blue.targetStun);
        c.stunApplied = true;
        playAt(SND.bluePull, p.dimension, c.target.location);
      }
    }
  }

  if (!c.target) return pullAlongAim(r, c);
  const target = c.target;
  if (!c.stunApplied || c.pullInterrupted || !target.isValid || !isAlive(target) || target.dimension.id !== p.dimension.id) return;
  const victim = target.typeId === "minecraft:player" ? find(target.id) : undefined;
  if (!isStunned(target) || (victim && isRolling(victim))) {
    c.pullInterrupted = true;
    return;
  }
  if (c.pullCaster) pullCasterToTarget(p, c, target);
  else setVelocity(target, bluePullVelocity(target.location, bluePullDestination(p.location, c.lockedYaw), target.getVelocity()));
}

export function registerBlue(): void {
  onSlot(1, start, (r) => !isAwakened(r));
}

export const tickBlue = tick;
