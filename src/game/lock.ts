// Caster lock of the big techniques (Java setNoGravity + setPos every tick):
// the player cannot walk or jump, takes no damage and hovers at a fixed point,
// optionally rising. Steered with velocity so the motion stays smooth on the
// client; teleports only to recover from a large drift.
import { InputPermissionCategory, type Player } from "@minecraft/server";
import { steerVelocity } from "../core/motion";
import { distanceSq, type V3 } from "../core/vec";
import { guardFall } from "./damage";
import { now, type Runtime } from "./players";
import { clearSlow, setSlow } from "./speed";

/** Marker stored in Runtime.invulnerableUntil while a lock holds. */
const LOCKED = 1e12;

export interface CasterLock {
  name: string;
  start: V3;
  air: boolean;
  rise: number;
  /** Highest rise the room above the head allows. */
  maxRise: number;
  released: boolean;
  /** Teleport every tick (cinematics with a detached camera) instead of steering. */
  teleport: boolean;
  /** Fixed body rotation while teleporting. */
  rotation?: { x: number; y: number };
}

export interface LockOptions {
  /** Rise through the ceiling (the Nuke clips like the Java setPos). */
  ignoreCeiling?: boolean;
  teleport?: boolean;
  rotation?: { x: number; y: number };
}

/** Free space between the top of the player's head and the ceiling (capped at `max`). */
export function headroom(p: Player, max: number): number {
  const top = { x: p.location.x, y: p.location.y + 1.8, z: p.location.z };
  try {
    const hit = p.dimension.getBlockFromRay(top, { x: 0, y: 1, z: 0 }, { maxDistance: max + 0.5, includePassableBlocks: false });
    return hit ? Math.max(0, hit.block.location.y - top.y) : max;
  } catch {
    return 0;
  }
}

export function lockCaster(r: Runtime, name: string, maxRise: number, options: LockOptions = {}): CasterLock {
  const p = r.player;
  const lock: CasterLock = {
    name,
    start: p.location,
    air: !p.isOnGround,
    rise: 0,
    maxRise: options.ignoreCeiling ? maxRise : Math.min(maxRise, headroom(p, maxRise)),
    released: false,
    teleport: !!options.teleport,
    rotation: options.rotation,
  };
  setSlow(p, `lock:${name}`, -1);
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, false);
  } catch {
    // ignore
  }
  r.invulnerableUntil = LOCKED;
  r.hudDirty = true;
  return lock;
}

/** Keeps the caster at start + rise (the rise is limited by the headroom). */
export function holdCaster(p: Player, lock: CasterLock, rise: number): void {
  if (lock.released || !p.isValid) return;
  lock.rise = Math.max(0, Math.min(rise, lock.maxRise));
  const target = { x: lock.start.x, y: lock.start.y + lock.rise, z: lock.start.z };
  const d2 = distanceSq(p.location, target);
  try {
    if (lock.teleport) {
      p.teleport(target, lock.rotation ? { keepVelocity: false, rotation: lock.rotation } : { keepVelocity: false });
      return;
    }
    if (d2 > 4) {
      p.teleport(target, { keepVelocity: false });
      return;
    }
    if (!lock.air && lock.rise === 0 && d2 < 0.01) return; // standing still on the ground
    const v = steerVelocity(p.location, target, 0.9);
    p.applyKnockback({ x: v.x, z: v.z }, v.y);
  } catch {
    // Player left this tick.
  }
}

export function releaseCaster(r: Runtime, lock: CasterLock): void {
  if (lock.released) return;
  lock.released = true;
  const p = r.player;
  clearSlow(p, `lock:${lock.name}`);
  if (r.invulnerableUntil === LOCKED) r.invulnerableUntil = now();
  if (!p.isValid) return;
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, true);
  } catch {
    // ignore
  }
  if (lock.air || lock.rise > 0.01) guardFall(p, 400);
}

/** Undoes anything a lock may have left behind (logout mid-cast, script reload). */
export function recoverPlayer(p: Player): void {
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, true);
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
    p.getComponent("minecraft:movement")?.resetToDefaultValue();
  } catch {
    // ignore
  }
}
