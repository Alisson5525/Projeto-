// Combat mode systems: shoulder camera + control scheme, hotbar slots as
// buttons, M1 combo (M1CombatServer/M1HitReactions), guard (GuardServer, on
// sneak) and dodge rolls (RollServer).
import { ControlScheme, EntitySwingSource, type Entity, type Player, system, world } from "@minecraft/server";
import { M1, type ComboEvents } from "../core/combo";
import { physicalMult } from "../core/progression";
import { ROLL, rollDirectionFromVector, rollSpeed, rollVector, type RollDir } from "../core/roll";
import { dot, forwardOf, rightOf, sub, type V3 } from "../core/vec";
import { CAMERA } from "../ids";
import { type AnimName, playAnim, stopAnim } from "./anim";
import { leaveCombat, onEnterCombat, onLeaveCombat } from "./combatMode";
import { dealDamage } from "./damage";
import { moveTechniqueToHome } from "./items";
import { onSettingsChanged } from "./menu/menus";
import { casts, isCasting, isRolling, now, rt, type Runtime } from "./players";
import { clearAllSlows, clearSlow, setSlow } from "./speed";
import { clearStun, isStunned, protectFinisher, stun } from "./stun";

// ---- slot buttons ----------------------------------------------------------
type SlotHandler = (r: Runtime) => void;
type SlotGuard = (r: Runtime) => boolean;
const slotHandlers: { handler: SlotHandler; when?: SlotGuard }[][] = Array.from({ length: 8 }, () => []);
/** Registers a hotbar button; with `when`, only while it holds (e.g. awakened variants). */
export const onSlot = (index: number, handler: SlotHandler, when?: SlotGuard): void => void slotHandlers[index]!.push({ handler, when });

function pressSlot(r: Runtime, index: number): void {
  for (const h of slotHandlers[index] ?? []) {
    if (h.when && !h.when(r)) continue;
    h.handler(r);
    return;
  }
}

const stunEscapeListeners: ((p: Player) => void)[] = [];
export const onStunEscape = (fn: (p: Player) => void): void => void stunEscapeListeners.push(fn);

function snapHome(r: Runtime): void {
  r.hotbar.expectSelfChange(8);
  r.player.selectedSlotIndex = 8;
}

// ---- camera -----------------------------------------------------------------
const PRESETS = [CAMERA.shoulderNear, CAMERA.shoulder, CAMERA.shoulderFar];

export function applyCombatCamera(r: Runtime): void {
  const p = r.player;
  try {
    p.camera.setCamera(PRESETS[r.profile.settings.camDist] ?? CAMERA.shoulder, {
      viewOffset: { x: 0.7 * r.profile.settings.camSide, y: 0.25 },
      entityOffset: { x: 0, y: 1.6, z: 0 },
    });
    p.setControlScheme(ControlScheme.CameraRelativeStrafe);
  } catch (e) {
    console.warn(`[JJK] camera: ${String(e)}`);
  }
}

export function clearCombatCamera(p: Player): void {
  try {
    p.setControlScheme();
    p.camera.clear();
  } catch {
    // player left
  }
}

// ---- M1 combo ---------------------------------------------------------------
const ATTACK_ANIMS: AnimName[] = ["attack1", "attack2", "attack3", "attack4"];

function canAttack(r: Runtime): boolean {
  return r.combat && r.player.isValid && !isStunned(r.player) && !r.guarding && !isRolling(r) && !isCasting(r);
}

function flatLook(p: Player): V3 {
  const d = p.getViewDirection();
  const l = Math.hypot(d.x, d.z) || 1;
  return { x: d.x / l, y: 0, z: d.z / l };
}

export function hasLineOfSight(from: Player, to: Entity): boolean {
  const eye = from.getHeadLocation();
  const target = { x: to.location.x, y: to.location.y + 0.9, z: to.location.z };
  const dir = sub(target, eye);
  const dist = Math.hypot(dir.x, dir.y, dir.z);
  if (dist < 0.5) return true;
  const hit = from.dimension.getBlockFromRay(eye, { x: dir.x / dist, y: dir.y / dist, z: dir.z / dist }, { maxDistance: dist, includePassableBlocks: false });
  return !hit;
}

export function isLiving(e: Entity): boolean {
  return e.isValid && !!e.getComponent("minecraft:health");
}

function m1Target(p: Player, combo: number): Entity | undefined {
  const range = M1.range[combo - 1]!;
  const facing = flatLook(p);
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const e of p.dimension.getEntities({ location: p.location, maxDistance: range + 1.5 })) {
    if (e.id === p.id || !isLiving(e)) continue;
    const off = sub(e.location, p.location);
    const d = Math.hypot(off.x, off.z);
    if (d > range + 0.27 || d < 0.001 || Math.abs(off.y) > 2.4) continue;
    if (dot(facing, { x: off.x / d, y: 0, z: off.z / d }) < 0.5 || d >= bestD) continue;
    if (!hasLineOfSight(p, e)) continue;
    best = e;
    bestD = d;
  }
  return best;
}

export function knockback(target: Entity, dir: { x: number; z: number }, horizontal: number, vertical: number): void {
  try {
    if (target.typeId === "minecraft:player") (target as Player).applyKnockback({ x: dir.x * horizontal, z: dir.z * horizontal }, vertical);
    else {
      target.clearVelocity();
      target.applyImpulse({ x: dir.x * horizontal, y: vertical, z: dir.z * horizontal });
    }
  } catch {
    // immovable entity
  }
}

function m1Hit(r: Runtime, combo: number): void {
  const p = r.player;
  const target = m1Target(p, combo);
  if (!target) return;
  const damage = M1.damage[combo - 1]! * physicalMult(r.profile.str);
  if (!dealDamage(target, damage, p)) return;
  const off = sub(target.location, p.location);
  const len = Math.hypot(off.x, off.z) || 1;
  const dir = len > 1e-3 ? { x: off.x / len, z: off.z / len } : flatLook(p);
  const strength = M1.knockback[combo - 1]!;
  knockback(target, dir, strength, combo === 4 ? Math.min(0.4, strength) : 0);
  stun(target, M1.stun[combo - 1]!);
  if (combo === 4) protectFinisher(target, M1.finisherProtection);
  p.dimension.spawnParticle("minecraft:critical_hit_emitter", { x: target.location.x, y: target.location.y + 1, z: target.location.z });
}

function handleCombo(r: Runtime, ev: ComboEvents): void {
  if (ev.started) {
    playAnim(r.player, ATTACK_ANIMS[ev.started - 1]!);
    setSlow(r.player, "m1", -M1.slow);
  }
  if (ev.contact) m1Hit(r, ev.contact);
  if (ev.actionEnded) clearSlow(r.player, "m1");
}

// ---- guard (sneak) -------------------------------------------------------------
function tickGuard(r: Runtime): void {
  const p = r.player;
  const want = r.combat && p.isSneaking && !isStunned(p) && !isRolling(r) && !isCasting(r) && !r.combo.isAttacking(now()) && !r.trial.isActive();
  if (want === r.guarding) return;
  r.guarding = want;
  if (want) {
    playAnim(p, "blockStart", 0);
    system.runTimeout(() => r.guarding && playAnim(p, "blocking", 0.1), 2);
  } else playAnim(p, "blockEnd", 0.1);
}

// ---- dodge roll ---------------------------------------------------------------------
interface RollCast {
  start: number;
  vec: { x: number; z: number };
}

function localInput(p: Player): { forward: number; right: number } {
  const yaw = p.getRotation().y;
  const v = p.getVelocity();
  const f = forwardOf(yaw);
  const rt_ = rightOf(yaw);
  const vf = v.x * f.x + v.z * f.z;
  const vr = v.x * rt_.x + v.z * rt_.z;
  if (Math.hypot(vf, vr) > 0.05) return { forward: vf, right: vr };
  const mv = p.inputInfo.getMovementVector();
  return { forward: mv.y, right: -mv.x };
}

const ROLL_ANIMS: Record<RollDir, AnimName> = { 0: "rollFront", 1: "rollBack", 2: "rollLeft", 3: "rollRight" };

export function dodge(r: Runtime): void {
  const p = r.player;
  const t = now();
  if (!r.combat || isRolling(r) || t < r.ready.roll || isCasting(r)) return;
  const stunned = isStunned(p);
  if (stunned && t < r.ready.rollEscape) return;
  if (stunned) {
    clearStun(p);
    r.ready.rollEscape = t + ROLL.stunEscapeLockout;
    stunEscapeListeners.forEach((fn) => fn(p));
  }
  r.combo.interrupt();
  clearSlow(p, "m1");
  const input = localInput(p);
  const dir = rollDirectionFromVector(input.forward, input.right);
  const vec = rollVector(dir, p.getRotation().y);
  r.cast.set("roll", { start: t, vec } satisfies RollCast);
  casts.set(r.id, "roll", () => r.cast.delete("roll"));
  r.ready.roll = t + ROLL.cooldown;
  r.invulnerableUntil = Math.max(r.invulnerableUntil, t + ROLL.ticks);
  r.hudDirty = true;
  playAnim(p, ROLL_ANIMS[dir], 0.05);
  try {
    p.applyKnockback({ x: vec.x * ROLL.speed, z: vec.z * ROLL.speed }, ROLL.lift);
  } catch {
    // ignore
  }
}

function tickRoll(r: Runtime): void {
  const cast = r.cast.get("roll") as RollCast | undefined;
  if (!cast) return;
  const age = now() - cast.start;
  if (age >= ROLL.ticks || !r.player.isValid) {
    r.cast.delete("roll");
    casts.clear(r.id, "roll");
    return;
  }
  if (age === 0) return;
  const speed = rollSpeed(age);
  try {
    r.player.applyKnockback({ x: cast.vec.x * speed, z: cast.vec.z * speed }, Math.min(0, r.player.getVelocity().y));
  } catch {
    // ignore
  }
}

// ---- wiring -------------------------------------------------------------------------
export function registerCombat(): void {
  onEnterCombat((r) => {
    applyCombatCamera(r);
    r.hotbar.expectSelfChange(8);
  });
  onLeaveCombat((r) => {
    clearCombatCamera(r.player);
    clearAllSlows(r.player);
    if (r.guarding) {
      r.guarding = false;
      stopAnim(r.player);
    }
    r.combo.interrupt();
    r.holdProgress = 0;
  });

  onSlot(6, dodge);
  onSettingsChanged((r) => {
    if (r.combat) applyCombatCamera(r);
  });

  world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({ player, previousSlotSelected, newSlotSelected }) => {
    const r = rt(player);
    if (!r.combat) return;
    const tapped = r.hotbar.onChange(previousSlotSelected, newSlotSelected, now());
    if (newSlotSelected !== 8) snapHome(r);
    if (tapped === null || tapped > 7) return;
    pressSlot(r, tapped);
  });

  world.afterEvents.playerSwingStart.subscribe(({ player, swingSource }) => {
    if (swingSource !== EntitySwingSource.Attack) return;
    const r = rt(player);
    if (!r.combat) return;
    handleCombo(r, r.combo.press(now(), canAttack(r)));
  });

  world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    if (deadEntity.typeId !== "minecraft:player") return;
    const r = rt(deadEntity as Player);
    clearStun(deadEntity);
    leaveCombat(r, true);
    r.infinity = false;
    r.awakeningEnd = 0;
  });

  // Stunned players cannot use items or interact (CombatStunEvents).
  world.beforeEvents.itemUse.subscribe((ev) => {
    if (isStunned(ev.source)) ev.cancel = true;
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (isStunned(ev.player)) ev.cancel = true;
  });
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    if (isStunned(ev.player)) ev.cancel = true;
  });
}

/** Per-tick combat update for one player. */
export function tickCombat(r: Runtime, tick: number): void {
  if (!r.combat) return;
  handleCombo(r, r.combo.tick(tick, canAttack(r)));
  tickGuard(r);
  tickRoll(r);
  if (tick % 20 === 0) {
    moveTechniqueToHome(r.player);
    if (r.player.selectedSlotIndex !== 8) snapHome(r);
  }
}
