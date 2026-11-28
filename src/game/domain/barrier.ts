// The closed barrier (DomainServer while SEALED/TRANSFERRING/ACTIVE): nothing
// crosses it, blocks inside are protected, and everything thrown at it from
// outside wears down its 80 health (strike 4, crossing hit up to 20,
// projectile 6, explosion 12, Hollow Purple 40, Max Red 20).
import { type Entity, EntitySwingSource, type Player, system, world } from "@minecraft/server";
import { crossesSphere, DOMAIN, isClosedPhase } from "../../core/domainRules";
import { add, distanceSq, scale, sub, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { fx } from "../fx";
import { now } from "../players";
import { onMaxRedSweep } from "../skills/maxRed";
import { onPurpleSweep } from "../skills/purple";
import { isVoid } from "./arena";
import { endSession, occupantSession, type Session, sessions } from "./session";

const previous = new Map<string, V3>();
const strikes = new Map<string, number>();

const closed = (s: Session): boolean => isClosedPhase(s.phase);
const crosses = (s: Session, a: V3, b: V3, extra = 0): boolean => crossesSphere(sub(a, s.center), sub(b, s.center), DOMAIN.radius + extra);

/** Wears the barrier down; at 0 the domain collapses. */
export function damageBarrier(s: Session, amount: number, at?: V3): void {
  if (!(amount > 0) || !closed(s)) return;
  s.health -= amount;
  if (at) fx(s.exterior, PARTICLE.ring, at, { size0: 0.5, size1: 2.2, life: 0.3, color: [0.55, 0.3, 0.9, 0.8] });
  if (s.health <= 0) endSession(s);
}

function closedIn(dimId: string): Session[] {
  const out: Session[] = [];
  for (const s of sessions.values()) if (closed(s) && s.exterior.id === dimId) out.push(s);
  return out;
}

/** Per tick: walkers and projectiles may not cross a closed barrier. */
export function tickBarriers(): void {
  for (const s of sessions.values()) {
    if (!closed(s)) continue;
    let entities: Entity[];
    try {
      entities = s.exterior.getEntities({ location: s.center, maxDistance: DOMAIN.radius + 6 });
    } catch {
      continue;
    }
    for (const e of entities) {
      if (!e.isValid || s.occupants.has(e.id)) continue;
      const pos = e.location;
      const projectile = e.getComponent("minecraft:projectile");
      if (projectile) {
        const next = add(pos, e.getVelocity());
        if (crosses(s, pos, next)) {
          damageBarrier(s, DOMAIN.damage.projectile, pos);
          e.remove();
        }
        continue;
      }
      const before = previous.get(e.id);
      if (before && crosses(s, before, pos)) {
        try {
          e.teleport(before, { keepVelocity: false });
        } catch {
          // ignore
        }
        continue;
      }
      previous.set(e.id, pos);
    }
  }
  if (now() % 100 === 0 && previous.size > 512) previous.clear();
}

/** Purple / Max Red segments stop at a closed barrier and damage it. */
function intercept(dimId: string, a: V3, b: V3, width: number, damage: number): boolean {
  for (const s of closedIn(dimId)) {
    if (crosses(s, a, b, Math.max(0, width))) {
      damageBarrier(s, damage, b);
      return true;
    }
  }
  return false;
}

function inProtectedZone(dimId: string, pos: V3): boolean {
  for (const s of closedIn(dimId)) if (distanceSq(pos, s.center) < (DOMAIN.radius + 1) ** 2) return true;
  return false;
}

function strike(p: Player): void {
  const eye = p.getHeadLocation();
  const end = add(eye, scale(p.getViewDirection(), 5));
  for (const s of closedIn(p.dimension.id)) {
    if (s.occupants.has(p.id) || !crosses(s, eye, end)) continue;
    const last = strikes.get(p.id) ?? -Infinity;
    if (now() - last < DOMAIN.strikeInterval) return;
    strikes.set(p.id, now());
    damageBarrier(s, DOMAIN.damage.strike, end);
    return;
  }
}

export function registerBarrier(): void {
  onPurpleSweep((dim, a, b, width, damage) => intercept(dim.id, a, b, width, damage));
  onMaxRedSweep((dim, a, b, width, damage) => intercept(dim.id, a, b, width, damage));

  world.beforeEvents.entityHurt.subscribe((ev) => {
    const victim = ev.hurtEntity;
    const attacker = ev.damageSource.damagingEntity;
    // Occupants being moved cannot be hurt (DomainServer.isTransitioning).
    const moving = occupantSession(victim.id);
    if (moving && moving.phase === "transferring") {
      ev.cancel = true;
      return;
    }
    if (!attacker || attacker.dimension.id !== victim.dimension.id) return;
    for (const s of closedIn(victim.dimension.id)) {
      if (crosses(s, attacker.location, victim.location)) {
        ev.cancel = true;
        const amount = Math.min(ev.damage, DOMAIN.damage.crossingCap);
        const at = victim.location;
        // State changes are not allowed inside a before event.
        system.run(() => damageBarrier(s, amount, at));
        return;
      }
    }
  });

  world.beforeEvents.explosion.subscribe((ev) => {
    const sessionsHere = closedIn(ev.dimension.id);
    if (sessionsHere.length === 0) return;
    const blocks = ev.getImpactedBlocks();
    const kept = blocks.filter((b) => !sessionsHere.some((s) => distanceSq(b.center(), s.center) < (DOMAIN.radius + 1) ** 2));
    if (kept.length === blocks.length) return;
    ev.setImpactedBlocks(kept);
    system.run(() => sessionsHere.forEach((s) => damageBarrier(s, DOMAIN.damage.explosion)));
  });

  world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    if (isVoid(ev.dimension) || inProtectedZone(ev.dimension.id, ev.block.location)) ev.cancel = true;
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (!ev.itemStack) return;
    const dim = ev.block.dimension;
    if (isVoid(dim) || inProtectedZone(dim.id, ev.block.location)) ev.cancel = true;
  });

  world.afterEvents.playerSwingStart.subscribe(({ player, swingSource }) => {
    if (swingSource === EntitySwingSource.Attack && closedIn(player.dimension.id).length > 0) strike(player);
  });
}
