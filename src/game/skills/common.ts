// Shared start checks of the techniques, with touch-friendly feedback on the
// action bar (the Java HUD only showed cooldowns; on a phone a silent tap
// feels broken).
import { type Entity, GameMode, type Player } from "@minecraft/server";
import { lockReason, skillLevel } from "../../core/progression";
import { add, type V3 } from "../../core/vec";
import { canAfford } from "../energy";
import { K, tr } from "../i18n";
import { type CooldownId, isCasting, isRolling, now, type Runtime } from "../players";
import { isStunned } from "../stun";

export const isAlive = (e: Entity): boolean => e.isValid && (e.getComponent("minecraft:health")?.currentValue ?? 1) > 0;

/** Free to start a technique: in combat, alive, not stunned/rolling/guarding/attacking/casting. */
export function canBegin(r: Runtime): boolean {
  const p = r.player;
  return (
    r.combat &&
    r.profile.technique === "limitless" &&
    isAlive(p) &&
    !isStunned(p) &&
    !isRolling(r) &&
    !isCasting(r) &&
    !r.guarding &&
    !r.combo.isAttacking(now()) &&
    !r.trial.isActive()
  );
}

const bar = (p: Player, key: string, ...args: (string | number)[]): void => p.onScreenDisplay.setActionBar(tr(key, ...args));

/** Slot unlocked by level/RCT/Red; tells the player what is missing. */
export function unlocked(r: Runtime, slot: number): boolean {
  const reason = lockReason(slot, r.profile.level, r.profile.rct);
  if (!reason) return true;
  const key = reason === "rct" ? K.needRct : reason === "red" ? K.needRed : K.needLevel;
  bar(r.player, key, skillLevel(slot));
  return false;
}

export function offCooldown(r: Runtime, id: CooldownId): boolean {
  const left = r.ready[id] - now();
  if (left <= 0) return true;
  bar(r.player, K.cooldown, (left / 20).toFixed(1));
  return false;
}

export function affordable(r: Runtime, base: number): boolean {
  if (canAfford(r, base)) return true;
  bar(r.player, K.noEnergy);
  return false;
}

/** Exact energy amount (used where the Java cost ignores the Six Eyes 95% rule). */
export function affordableExact(r: Runtime, amount: number): boolean {
  if (r.energy >= amount) return true;
  bar(r.player, K.noEnergy);
  return false;
}

export const hint = (r: Runtime, key: string): void => bar(r.player, key);

/** Center of an entity's collision box. */
export function centerOf(e: Entity): V3 {
  try {
    return e.getAABB().center;
  } catch {
    return add(e.location, { x: 0, y: 0.9, z: 0 });
  }
}

/** Half-sizes of an entity's collision box. */
export function extentOf(e: Entity): V3 {
  try {
    return e.getAABB().extent;
  } catch {
    return { x: 0.3, y: 0.9, z: 0.3 };
  }
}

/** Sets an entity's velocity: knockback for players, impulse for everything else. */
export function setVelocity(e: Entity, v: V3): void {
  try {
    if (e.typeId === "minecraft:player") (e as Player).applyKnockback({ x: v.x, z: v.z }, v.y);
    else {
      e.clearVelocity();
      e.applyImpulse(v);
    }
  } catch {
    // Entities without physics.
  }
}

/** Entities that can be hit by techniques (living, not the caster, not spectators). */
export function isTarget(e: Entity, caster: Entity): boolean {
  if (e.id === caster.id || !isAlive(e) || !e.getComponent("minecraft:health")) return false;
  if (e.typeId !== "minecraft:player") return true;
  try {
    return (e as Player).getGameMode() !== GameMode.Spectator;
  } catch {
    return false;
  }
}
