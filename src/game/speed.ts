// Movement slow-downs of casts and attacks (Java attribute modifiers), applied
// through the movement attribute so the camera FOV does not zoom like Slowness.
import type { EntityMovementComponent, Player } from "@minecraft/server";

const modifiers = new Map<string, Map<string, number>>();

function movement(p: Player): EntityMovementComponent | undefined {
  return p.getComponent("minecraft:movement") as EntityMovementComponent | undefined;
}

function apply(p: Player): void {
  const m = movement(p);
  if (!m) return;
  const mods = modifiers.get(p.id);
  if (!mods || mods.size === 0) {
    m.resetToDefaultValue();
    return;
  }
  let factor = 1;
  for (const v of mods.values()) factor *= 1 + v;
  m.setCurrentValue(m.defaultValue * Math.max(0.02, factor));
}

/** amount like Java ADD_MULTIPLIED_TOTAL: -0.55 = 55% slower. */
export function setSlow(p: Player, id: string, amount: number): void {
  let mods = modifiers.get(p.id);
  if (!mods) {
    mods = new Map();
    modifiers.set(p.id, mods);
  }
  if (mods.get(id) === amount) return;
  mods.set(id, amount);
  apply(p);
}

export function clearSlow(p: Player, id: string): void {
  const mods = modifiers.get(p.id);
  if (!mods?.delete(id)) return;
  if (p.isValid) apply(p);
}

export function clearAllSlows(p: Player): void {
  modifiers.delete(p.id);
  if (p.isValid) movement(p)?.resetToDefaultValue();
}
