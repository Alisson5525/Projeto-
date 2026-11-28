// Damage pipeline (Java LivingIncomingDamageEvent handlers): invulnerable
// casts, stunned attackers, guard, Infinity, combat-mode melee replacement,
// strength bonus and vitality reduction. Technique damage goes through
// dealDamage so it is never mistaken for vanilla melee.
import { type Entity, EntityDamageCause, type Player, system, world } from "@minecraft/server";
import { infinityBlocks } from "../core/infinity";
import { strengthAttackBonus, vitalityReduction } from "../core/progression";
import { find, now } from "./players";
import { hasFinisherProtection, isStunned } from "./stun";

const own = new Map<string, number>();
const BYPASS = new Set<string>(["selfDestruct", "override"]);
const MELEE = new Set<string>(["entityAttack", "ramAttack", "charging", "maceSmash"]);

type Listener = (victim: Player, source: { x: number; y: number; z: number } | undefined) => void;
const infinityBlockListeners: Listener[] = [];
export const onInfinityBlock = (fn: Listener): void => void infinityBlockListeners.push(fn);

/** Applies technique damage that the pipeline will not treat as vanilla melee. */
export function dealDamage(target: Entity, amount: number, attacker?: Entity, cause: EntityDamageCause = EntityDamageCause.entityAttack): boolean {
  if (!target.isValid || amount <= 0) return false;
  own.set(target.id, now());
  try {
    return target.applyDamage(amount, attacker ? { cause, damagingEntity: attacker } : { cause });
  } catch {
    return false;
  }
}

function isPlayer(e: Entity | undefined): e is Player {
  return e?.typeId === "minecraft:player";
}

function inFront(victim: Player, attacker: Entity): boolean {
  const look = victim.getViewDirection();
  const fx = look.x;
  const fz = look.z;
  const dx = attacker.location.x - victim.location.x;
  const dz = attacker.location.z - victim.location.z;
  const lf = Math.hypot(fx, fz);
  const ld = Math.hypot(dx, dz);
  if (lf < 1e-6 || ld < 1e-6) return false;
  return (fx * dx + fz * dz) / (lf * ld) >= 0.5;
}

function insideBody(victim: Entity, p: { x: number; y: number; z: number }): boolean {
  const l = victim.location;
  return Math.abs(p.x - l.x) <= 0.301 && Math.abs(p.z - l.z) <= 0.301 && p.y >= l.y - 0.001 && p.y <= l.y + 1.801;
}

export function registerDamagePipeline(): void {
  world.beforeEvents.entityHurt.subscribe((ev) => {
    const victim = ev.hurtEntity;
    const src = ev.damageSource;
    const cause = src.cause as string;
    if (BYPASS.has(cause)) return;
    const attacker = src.damagingEntity;
    const projectile = src.damagingProjectile;
    const t = now();
    const isOwn = own.get(victim.id) === t;

    if (hasFinisherProtection(victim) && attacker) {
      ev.cancel = true;
      return;
    }
    if (attacker && isStunned(attacker)) {
      ev.cancel = true;
      return;
    }

    if (isPlayer(victim)) {
      const r = find(victim.id);
      if (r) {
        if (r.invulnerableUntil > t) {
          ev.cancel = true;
          return;
        }
        if (r.guarding && attacker && attacker.id !== victim.id && MELEE.has(cause) && !projectile && inFront(victim, attacker)) {
          ev.cancel = true;
          return;
        }
        if (r.infinity && r.combat && attacker?.id !== victim.id) {
          const at = projectile?.location ?? attacker?.location;
          const outside = at ? !insideBody(victim, at) : false;
          if (infinityBlocks(cause, !!projectile, outside)) {
            ev.cancel = true;
            system.run(() => infinityBlockListeners.forEach((fn) => fn(victim, at)));
            return;
          }
        }
        if (r.profile.vit > 0) ev.damage = ev.damage * (1 - vitalityReduction(r.profile.vit));
      }
    }

    if (isPlayer(attacker) && !isOwn && !projectile && cause === "entityAttack") {
      const ar = find(attacker.id);
      if (ar?.combat) {
        // Combat mode replaces vanilla melee with the M1 combo.
        ev.cancel = true;
        return;
      }
      if (ar && ar.profile.str > 0) ev.damage = ev.damage + strengthAttackBonus(ar.profile.str);
    }
  });
  system.runInterval(() => own.clear(), 20);
}
