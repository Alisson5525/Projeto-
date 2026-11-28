// Combat stun (CombatStun / CombatStunEvents): stunned entities cannot move,
// attack, use items or interact. Players lose movement input; mobs get max
// Slowness. Finisher protection makes a stunned target immune for a moment.
import { type Entity, InputPermissionCategory, type Player } from "@minecraft/server";
import { now } from "./players";

const until = new Map<string, number>();
const protection = new Map<string, number>();
const entities = new Map<string, Entity>();

const isPlayer = (e: Entity): e is Player => e.typeId === "minecraft:player";

function lockPlayer(p: Player, locked: boolean): void {
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, !locked);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, !locked);
  } catch {
    // player left
  }
}

export function stun(e: Entity, ticks: number): void {
  if (!e.isValid || ticks <= 0) return;
  const end = Math.max(until.get(e.id) ?? 0, now() + ticks);
  until.set(e.id, end);
  entities.set(e.id, e);
  if (isPlayer(e)) lockPlayer(e, true);
  else {
    e.addEffect("slowness", Math.max(1, end - now()), { amplifier: 255, showParticles: false });
    try {
      e.clearVelocity();
    } catch {
      // some entities have no physics
    }
  }
}

export function stunUntil(id: string): number {
  return until.get(id) ?? 0;
}

export function isStunned(e: Entity | string): boolean {
  const id = typeof e === "string" ? e : e.id;
  return (until.get(id) ?? 0) > now();
}

export function remainingStun(id: string): number {
  return Math.max(0, (until.get(id) ?? 0) - now());
}

export function clearStun(e: Entity): void {
  until.delete(e.id);
  protection.delete(e.id);
  entities.delete(e.id);
  if (!e.isValid) return;
  if (isPlayer(e)) lockPlayer(e, false);
  else e.removeEffect("slowness");
}

export function protectFinisher(e: Entity, ticks: number): void {
  protection.set(e.id, now() + ticks);
}

export function hasFinisherProtection(e: Entity): boolean {
  return (protection.get(e.id) ?? 0) > now() && isStunned(e);
}

/** Expires stuns every tick. */
export function tickStuns(): void {
  const t = now();
  for (const [id, end] of until) {
    if (end > t) continue;
    const e = entities.get(id);
    until.delete(id);
    protection.delete(id);
    entities.delete(id);
    if (e?.isValid && isPlayer(e)) lockPlayer(e, false);
  }
}
