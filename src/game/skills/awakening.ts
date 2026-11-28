// Slot 6 — Awakening (GojoAwakeningServer). A 157-tick cinematic: Gojo rises
// up to 10 blocks (limited by the ceiling), hangs in the air and lands; he is
// invulnerable throughout. Then the awakening lasts 60 s and remaps slots
// 2/4/5/6 to the maximum techniques.
import { AWAKENING_TICKS, COOLDOWN, COST } from "../../core/constants";
import { ceilingLift } from "../../core/motion";
import { awakeningHeight, TL } from "../../core/timelines";
import { add, type V3 } from "../../core/vec";
import { PARTICLE } from "../../ids";
import { playAnim, stopAnim } from "../anim";
import { onSlot } from "../combat";
import { commit } from "../energy";
import { fx, type Rgba } from "../fx";
import { K, tr } from "../i18n";
import { headroom, holdCaster, lockCaster, releaseCaster, type CasterLock } from "../lock";
import { casts, isAwakened, now, type Runtime } from "../players";
import { playAt, stopFor } from "../sound";
import { SND } from "../sounds";
import { affordable, canBegin, isAlive, offCooldown, unlocked } from "./common";

/** gojo_awk.json: warm white-gold aura (255, 238, 169). */
const GOLD: Rgba = [1, 0.93, 0.66, 0.8];
const GOLD_SOFT: Rgba = [1, 0.93, 0.66, 0.45];

interface AwakeningCast {
  start: number;
  origin: V3;
  lift: number;
  lock: CasterLock;
}

function start(r: Runtime): void {
  if (r.cast.has("awakening") || !unlocked(r, 6) || !canBegin(r) || !offCooldown(r, "awakening") || !affordable(r, COST.awakening)) return;
  const p = r.player;
  const lift = ceilingLift(headroom(p, TL.awakening.maxLift + 0.5));
  const cast: AwakeningCast = { start: now(), origin: p.location, lift, lock: lockCaster(r, "awakening", lift) };
  r.cast.set("awakening", cast);
  casts.set(r.id, "awakening", () => finish(r, cast, false));
  playAt(SND.awakeningVoice, p.dimension, p.location);
  playAnim(p, "awakening", 0.1);
  commit(r, COST.awakening);
  r.ready.awakening = now() + COOLDOWN.awakening;
  r.domainUsed = false;
  r.hudDirty = true;
  fx(p.dimension, PARTICLE.ringFlat, add(p.location, { x: 0, y: 0.1, z: 0 }), { size0: 0.5, size1: 3.5, life: 0.6, color: GOLD, dir: { x: 0, y: 1, z: 0 } });
}

function finish(r: Runtime, c: AwakeningCast, completed: boolean): void {
  r.cast.delete("awakening");
  casts.clear(r.id, "awakening");
  releaseCaster(r, c.lock);
  const p = r.player;
  if (completed) {
    r.awakeningEnd = now() + AWAKENING_TICKS;
    if (p.isValid) fx(p.dimension, PARTICLE.ringFlat, add(p.location, { x: 0, y: 0.1, z: 0 }), { size0: 0.6, size1: 5, life: 0.5, color: GOLD, dir: { x: 0, y: 1, z: 0 } });
  } else if (p.isValid) {
    stopFor(SND.awakeningVoice, p.dimension, p.location);
    stopAnim(p);
  }
  r.hudDirty = true;
}

function visuals(r: Runtime, age: number): void {
  const p = r.player;
  const chest = add(p.location, { x: 0, y: 1.1, z: 0 });
  if (age % 3 === 0) fx(p.dimension, PARTICLE.dots, chest, { count: 8, radius: 1.1, speed: 0.7, life: 0.8, size0: 0.06, color: GOLD });
  if (age === 100) {
    fx(p.dimension, PARTICLE.glow, chest, { size0: 1, size1: 4.5, life: 0.5, color: GOLD_SOFT });
    fx(p.dimension, PARTICLE.ring, chest, { size0: 0.6, size1: 6, life: 0.45, color: GOLD });
  }
}

/** Per tick: the cinematic, and the end of an awakening. */
export function tickAwakening(r: Runtime): void {
  if (r.awakeningEnd > 0 && now() >= r.awakeningEnd) {
    r.awakeningEnd = 0;
    r.hudDirty = true;
    if (r.player.isValid) r.player.onScreenDisplay.setActionBar(tr(K.awakeningOver));
  }
  const c = r.cast.get("awakening") as AwakeningCast | undefined;
  if (!c) return;
  const p = r.player;
  if (!isAlive(p)) return finish(r, c, false);
  const age = now() - c.start;
  holdCaster(p, c.lock, awakeningHeight(age, c.lift));
  visuals(r, age);
  if (age >= TL.awakening.cinematic) finish(r, c, true);
}

export function registerAwakening(): void {
  onSlot(5, start, (r) => !isAwakened(r));
}
