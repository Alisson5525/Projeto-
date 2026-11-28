// Slot 4 — Reversal: Red (GojoRedServer). 1.15 s cast; at 1.0 s a repulsive
// blast of radius 5 in front of the palm damages, launches and carves a dome
// out of the terrain. Taking damage while casting cancels it.
import { EntityDamageCause, type Player } from "@minecraft/server";
import { COOLDOWN, COST } from "../../core/constants";
import { redDomeCells } from "../../core/geometry";
import { cursedMult } from "../../core/progression";
import { closestPointOnBox, palmAnchor, RED, redBlast, redPushDirection } from "../../core/skillRules";
import { TL } from "../../core/timelines";
import { add, forwardOf, length, smoothstep, sub } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { onSlot } from "../combat";
import { dealDamage, onPlayerHurt } from "../damage";
import { commit } from "../energy";
import { COLOR, fx } from "../fx";
import { casts, find, isAwakened, now, type Runtime } from "../players";
import { playAt } from "../sound";
import { SND } from "../sounds";
import { clearSlow, setSlow } from "../speed";
import { isStunned } from "../stun";
import { eraseCells } from "../terrain";
import { affordable, canBegin, isAlive, isTarget, offCooldown, unlocked } from "./common";

interface RedCast {
  start: number;
  impacted: boolean;
  lockedYaw: number;
}

/** Damage that does not cancel the cast (GojoRedServer.isInternalTickDamage). */
const INTERNAL = new Set(["wither", "fireTick", "starve"]);

function start(r: Runtime): void {
  if (r.cast.has("red") || !unlocked(r, 4) || !canBegin(r) || !offCooldown(r, "red") || !affordable(r, COST.red)) return;
  const p = r.player;
  const t = now();
  const cast: RedCast = { start: t, impacted: false, lockedYaw: p.getRotation().y };
  r.cast.set("red", cast);
  casts.set(r.id, "red", () => finish(r, cast));
  playAt(SND.redStart, p.dimension, palmAnchor(p.getHeadLocation(), cast.lockedYaw));
  setSlow(p, "red", RED.slow);
  playAnim(p, "red", 0.05);
  commit(r, COST.red);
  r.ready.red = t + COOLDOWN.red;
  r.redCooldownMax = COOLDOWN.red;
  r.hudDirty = true;
}

function finish(r: Runtime, c: RedCast): void {
  r.cast.delete("red");
  casts.clear(r.id, "red");
  const p = r.player;
  if (!p.isValid) return;
  clearSlow(p, "red");
  if (!c.impacted) stopAnim(p);
  r.hudDirty = true;
}

function blast(r: Runtime, yaw: number): void {
  const p = r.player;
  const dim = p.dimension;
  const origin = palmAnchor(p.getHeadLocation(), yaw);
  const mult = cursedMult(r.profile.ce);
  for (const e of dim.getEntities({ location: origin, maxDistance: RED.radius + 3, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    if (!isTarget(e, p)) continue;
    const box = e.getAABB();
    const h = redBlast(length(sub(closestPointOnBox(origin, box.center, box.extent), origin)));
    if (!h) continue;
    dealDamage(e, h.damage * mult, p, EntityDamageCause.entityExplosion);
    if (!e.isValid) continue;
    const dir = redPushDirection(box.center, origin, yaw);
    try {
      if (e.typeId === "minecraft:player") (e as Player).applyKnockback({ x: dir.x * h.horizontal, z: dir.z * h.horizontal }, h.vertical);
      else e.applyImpulse({ x: dir.x * h.horizontal, y: h.vertical, z: dir.z * h.horizontal });
    } catch {
      // Immovable entity.
    }
  }
  eraseCells(dim, redDomeCells(origin, Math.floor(p.location.y) - 1));

  const forward = forwardOf(yaw);
  fx(dim, PARTICLE.glow, origin, { size0: 1.6, size1: 2.4, life: 0.2, color: COLOR.redHot });
  fx(dim, PARTICLE.glow, origin, { size0: 0.8, size1: 3.6, life: 0.3, color: COLOR.redBloom });
  fx(dim, PARTICLE.ring, origin, { size0: 0.6, size1: 6, life: 0.3, color: COLOR.redRing });
  fx(dim, PARTICLE.ringFlat, add(origin, forward), { size0: 0.5, size1: 4.5, life: 0.25, color: COLOR.redHot, dir: forward });
  fx(dim, PARTICLE.ringFlat, add(p.location, { x: 0, y: 0.1, z: 0 }), { size0: 0.8, size1: 6, life: 0.35, color: COLOR.redRing, dir: { x: 0, y: 1, z: 0 } });
  fx(dim, PARTICLE.sparks, origin, { count: 22, radius: 0.3, speed: 14, life: 0.4, size0: 0.5, color: COLOR.redWisp });
}

function visuals(p: Player, c: RedCast, age: number): void {
  if (age % 2 !== 0 || age > TL.red.impact) return;
  const anchor = palmAnchor(p.getHeadLocation(), c.lockedYaw);
  const pulse = age >= 16 ? 1.25 : 1;
  const size = 0.55 * smoothstep(age / 10) * pulse;
  fx(p.dimension, PARTICLE.redOrb, anchor, { size0: Math.max(0.05, size), life: 0.13, color: [1, 1, 1, 1] });
  if (age < 16) fx(p.dimension, PARTICLE.suction, anchor, { count: 3, radius: 1.2, speed: 4.5, life: 0.25, size0: 0.2, color: COLOR.redWisp });
  else fx(p.dimension, PARTICLE.glow, anchor, { size0: 0.9, size1: 1.3, life: 0.15, color: COLOR.redBloom });
}

function tick(r: Runtime): void {
  const c = r.cast.get("red") as RedCast | undefined;
  if (!c) return;
  const p = r.player;
  const age = now() - c.start;
  if (!isAlive(p) || !r.combat || isStunned(p) || age >= TL.red.cast) return finish(r, c);
  if (age < TL.red.impact) c.lockedYaw = p.getRotation().y;
  visuals(p, c, age);
  if (!c.impacted && age >= TL.red.impact) {
    c.impacted = true;
    blast(r, c.lockedYaw);
  }
}

export function registerRed(): void {
  onSlot(3, start, (r) => !isAwakened(r));
  onPlayerHurt((victim, _amount, cause, attacker) => {
    const r = find(victim.id);
    if (!r?.cast.has("red")) return;
    if (INTERNAL.has(cause) || (cause === "magic" && !attacker)) return;
    casts.interrupt(r.id, "red");
  });
}

export const tickRed = tick;
