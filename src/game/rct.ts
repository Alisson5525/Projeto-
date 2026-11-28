// Reverse Cursed Technique: the Reversal Trial that teaches it (sneak to
// charge, stand up inside the green zone, 2 of 3 pulses) and the healing
// toggle on hotbar slot 8 (+4 health for 40 cursed energy, at most once a second).
import type { Player } from "@minecraft/server";
import { COOLDOWN, COST, UNLOCK_LEVEL } from "../core/constants";
import { movedTooFar, rctHealAmount, sneakEdge } from "../core/rctRules";
import { TRIAL } from "../core/rct";
import { add } from "../core/vec";
import { PARTICLE } from "../ids";
import { onSlot } from "./combat";
import { onPlayerHurt } from "./damage";
import { canAfford, commit } from "./energy";
import { fx } from "./fx";
import { K, tr } from "./i18n";
import { find, now, type Runtime, saveProfile } from "./players";

const wasSneaking = new Map<string, boolean>();
const bar = (p: Player, key: string, ...args: (string | number)[]): void => p.onScreenDisplay.setActionBar(tr(key, ...args));

/** Starts the Reversal Trial (menu button). Requires level 15 and not learned yet. */
export function startTrial(r: Runtime): void {
  const p = r.profile;
  if (p.rct) {
    bar(r.player, K.rctLearned);
    return;
  }
  if (p.level < UNLOCK_LEVEL.rctTrial) {
    bar(r.player, K.rctLocked, UNLOCK_LEVEL.rctTrial);
    return;
  }
  if (r.trial.isActive()) return;
  r.trial.start(now());
  r.trialOrigin = { ...r.player.location };
  wasSneaking.set(r.id, r.player.isSneaking);
  r.hudDirty = true;
  bar(r.player, K.trialBody);
}

function feedback(r: Runtime, previousAttempts: number, before: string): void {
  const p = r.player;
  const trial = r.trial;
  if (trial.stage === before && trial.attempts === previousAttempts) return;
  r.hudDirty = true;
  if (trial.stage === "INTERRUPTED") {
    bar(p, K.trialInterrupted);
    p.playSound("random.click", { pitch: 0.6 });
    return;
  }
  if (trial.attempts > previousAttempts) {
    const hit = (trial.successMask & (1 << previousAttempts)) !== 0;
    if (trial.stage === "PASSED") {
      r.profile = { ...r.profile, rct: true };
      saveProfile(r);
      bar(p, K.trialPassed);
      p.playSound("random.levelup", { volume: 0.6, pitch: 1.2 });
      fx(p.dimension, PARTICLE.dots, add(p.location, { x: 0, y: 1, z: 0 }), { count: 20, radius: 0.8, speed: 1.5, life: 0.8, size0: 0.08, color: [0.6, 1, 0.75, 0.9] });
      return;
    }
    if (trial.stage === "FAILED") {
      bar(p, K.trialFailed);
      p.playSound("random.break", { volume: 0.5 });
      return;
    }
    bar(p, hit ? K.trialHit : K.trialMiss);
    p.playSound(hit ? "random.orb" : "random.click", { volume: 0.5, pitch: hit ? 1 : 0.5 });
    return;
  }
  if (trial.stage === "CHARGING") bar(p, K.trialRelease);
  else if (trial.stage === "READY") bar(p, K.trialHold);
}

function tickTrial(r: Runtime): void {
  const trial = r.trial;
  if (!trial.isActive()) return;
  const p = r.player;
  const t = now();
  const before = trial.stage;
  const attempts = trial.attempts;
  const interrupted =
    !p.isValid || (p.getComponent("minecraft:health")?.currentValue ?? 0) <= 0 || !!p.getComponent("minecraft:riding") || !r.trialOrigin || movedTooFar(r.trialOrigin, p.location);
  if (interrupted) trial.cancel();
  else {
    const edge = sneakEdge(wasSneaking.get(r.id) ?? false, p.isSneaking);
    if (edge === "charge") trial.charge(t);
    else if (edge === "release") trial.release(t);
    else trial.tick(t);
  }
  wasSneaking.set(r.id, p.isSneaking);
  // The meter moves every tick while charging.
  if (trial.stage === "CHARGING" && t - trial.phaseAt <= TRIAL.maxHoldTicks) r.hudDirty = true;
  feedback(r, attempts, before);
}

// ---- healing ---------------------------------------------------------------

function toggleHealing(r: Runtime): void {
  const p = r.player;
  if (!r.profile.rct) {
    if (r.profile.level < UNLOCK_LEVEL.rctTrial) bar(p, K.rctLocked, UNLOCK_LEVEL.rctTrial);
    else bar(p, K.rctAvailable);
    return;
  }
  r.rctHealing = !r.rctHealing;
  r.hudDirty = true;
  bar(p, r.rctHealing ? K.rctHealOn : K.rctHealOff);
}

function tickHealing(r: Runtime): void {
  if (!r.rctHealing) return;
  const p = r.player;
  if (!r.combat || !r.profile.rct) {
    r.rctHealing = false;
    r.hudDirty = true;
    return;
  }
  const t = now();
  if (t < r.ready.rctHeal || r.trial.isActive()) return;
  const health = p.getComponent("minecraft:health");
  if (!health || health.currentValue <= 0) return;
  const amount = rctHealAmount(health.currentValue, health.effectiveMax);
  if (amount <= 0) return;
  if (!canAfford(r, COST.rctHeal)) {
    r.rctHealing = false;
    r.hudDirty = true;
    bar(p, K.noEnergy);
    return;
  }
  health.setCurrentValue(health.currentValue + amount);
  commit(r, COST.rctHeal);
  r.ready.rctHeal = t + COOLDOWN.rctHeal;
  fx(p.dimension, PARTICLE.dots, add(p.location, { x: 0, y: 1, z: 0 }), { count: 8, radius: 0.6, speed: 0.8, life: 0.6, size0: 0.07, color: [0.75, 1, 0.85, 0.85] });
}

export function tickRct(r: Runtime): void {
  tickTrial(r);
  tickHealing(r);
}

export function registerRct(): void {
  onSlot(7, toggleHealing);
  // Taking damage interrupts the trial (Java: hurtTime > 0).
  onPlayerHurt((victim) => {
    const r = find(victim.id);
    if (r?.trial.isActive() && r.trial.cancel()) feedback(r, r.trial.attempts, "READY");
  });
}
