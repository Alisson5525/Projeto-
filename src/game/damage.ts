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

type P3 = { x: number; y: number; z: number };
/** `velocity`: the victim's motion when the hit arrived (before any knockback). */
type Listener = (victim: Player, source: P3 | undefined, cause: string, velocity: P3) => void;
const infinityBlockListeners: Listener[] = [];
export const onInfinityBlock = (fn: Listener): void => void infinityBlockListeners.push(fn);

/** Damage a player really took (after every cancellation), e.g. to interrupt casts. */
type HurtListener = (victim: Player, amount: number, cause: string, attacker: Entity | undefined) => void;
const hurtListeners: HurtListener[] = [];
export const onPlayerHurt = (fn: HurtListener): void => void hurtListeners.push(fn);

// Fall protection after a technique that lifted the caster (Purple, Max Blue/Red,
// Self Purple, Nuke): ends after `ticks` or 3 ticks standing on the ground.
const fallGuards = new Map<string, { player: Player; until: number; grounded: number; keep?: () => boolean }>();

/** `keep`: while true, landing does not end the guard (ground still being erased). */
export function guardFall(player: Player, ticks: number, keep?: () => boolean): void {
  const prev = fallGuards.get(player.id);
  fallGuards.set(player.id, { player, until: Math.max(prev?.until ?? 0, now() + ticks), grounded: 0, keep });
}

export function tickFallGuards(): void {
  const t = now();
  for (const [id, g] of fallGuards) {
    if (!g.player.isValid || t >= g.until) {
      fallGuards.delete(id);
      continue;
    }
    g.grounded = g.player.isOnGround && !g.keep?.() ? g.grounded + 1 : 0;
    if (g.grounded >= 3) fallGuards.delete(id);
  }
}

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
    if (cause === "fall" && fallGuards.has(victim.id)) {
      ev.cancel = true;
      return;
    }
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
            const velocity = victim.getVelocity();
            system.run(() => infinityBlockListeners.forEach((fn) => fn(victim, at, cause, velocity)));
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

  world.afterEvents.entityHurt.subscribe(
    ({ hurtEntity, damage, damageSource }) => {
      if (!isPlayer(hurtEntity) || damage <= 0) return;
      for (const fn of hurtListeners) fn(hurtEntity, damage, damageSource.cause as string, damageSource.damagingEntity);
    },
    { entityTypes: ["minecraft:player"] },
  );
}
