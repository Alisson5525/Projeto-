// Six Eyes (SixEyesItem): crafted from 6 diamonds around an eye of ender.
// Using it warns; using it again from the same hotbar slot is the rebirth:
// back to the spawn point with no Jujutsu level, stats or vanilla XP, but with
// the Six Eyes forever (costs -95%, Infinity free).
import { type Player, world } from "@minecraft/server";
import { rebirth } from "../core/profile";
import { SixEyesConfirm } from "../core/rctRules";
import { add } from "../core/vec";
import { ITEM, PARTICLE } from "../ids";
import { refreshAttributes } from "./attributes";
import { leaveCombat } from "./combatMode";
import { isVoid } from "./domain/arena";
import { fx } from "./fx";
import { K, tr } from "./i18n";
import { container, ensureTechniqueItem } from "./items";
import { resetRuntime, rt, saveProfile } from "./players";
import { clearStun } from "./stun";

const confirm = new SixEyesConfirm();
const bar = (p: Player, key: string): void => p.onScreenDisplay.setActionBar(tr(key));

function spawnOf(p: Player): { dimension: ReturnType<typeof world.getDimension>; location: { x: number; y: number; z: number } } {
  const point = p.getSpawnPoint();
  if (point) return { dimension: point.dimension, location: { x: point.x + 0.5, y: point.y, z: point.z + 0.5 } };
  const overworld = world.getDimension("overworld");
  const spawn = world.getDefaultSpawnLocation();
  const top = overworld.getTopmostBlock({ x: spawn.x, z: spawn.z });
  return { dimension: overworld, location: { x: spawn.x + 0.5, y: top ? top.y + 1 : Math.max(spawn.y, 80), z: spawn.z + 0.5 } };
}

function consumeHeld(p: Player): boolean {
  const inv = container(p);
  if (!inv) return false;
  const slot = p.selectedSlotIndex;
  const stack = inv.getItem(slot);
  if (stack?.typeId !== ITEM.sixEyes) return false;
  if (stack.amount > 1) {
    stack.amount -= 1;
    inv.setItem(slot, stack);
  } else inv.setItem(slot, undefined);
  return true;
}

function reborn(p: Player): void {
  const old = { dimension: p.dimension, location: p.location };
  const target = spawnOf(p);
  try {
    p.teleport(target.location, { dimension: target.dimension, keepVelocity: false });
  } catch {
    return;
  }
  if (!consumeHeld(p)) return;
  const before = rt(p);
  leaveCombat(before, true);
  before.profile = rebirth(before.profile);
  saveProfile(before);
  clearStun(p);
  const r = resetRuntime(p);
  p.resetLevel();
  p.addExperience(-p.getTotalXp());
  for (const effect of p.getEffects()) p.removeEffect(effect.typeId);
  p.extinguishFire();
  p.getComponent("minecraft:player.hunger")?.resetToMaxValue();
  p.getComponent("minecraft:player.saturation")?.setCurrentValue(5);
  refreshAttributes(r);
  p.getComponent("minecraft:health")?.resetToMaxValue();
  ensureTechniqueItem(p);
  fx(old.dimension, PARTICLE.dots, add(old.location, { x: 0, y: 0.9, z: 0 }), { count: 35, radius: 0.5, speed: 1.5, life: 0.8, size0: 0.12, color: [0.9, 0.9, 1, 0.9] });
  p.playSound("game.player.die", { volume: 0.75 });
  bar(p, K.sixEyesDone);
}

function use(p: Player): void {
  const r = rt(p);
  if (r.profile.sixEyes) {
    bar(p, K.sixEyesHas);
    return;
  }
  if (isVoid(p.dimension) || r.cast.has("domain")) return;
  if (confirm.press(p.id, p.selectedSlotIndex) === "warn") {
    bar(p, K.sixEyesConfirm);
    return;
  }
  reborn(p);
}

export function registerSixEyes(): void {
  world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
    if (itemStack.typeId === ITEM.sixEyes) use(source);
  });
  world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({ player, newSlotSelected }) => confirm.check(player.id, newSlotSelected));
  world.afterEvents.playerLeave.subscribe(({ playerId }) => confirm.clear(playerId));
}

/** Keeps reminding while a rebirth waits for confirmation (Java: every 10 ticks). */
export function tickSixEyes(p: Player, tick: number): void {
  if (tick % 10 === 0 && confirm.pending(p.id)) bar(p, K.sixEyesConfirm);
}
