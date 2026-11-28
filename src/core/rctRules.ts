// Touch adaptations of the Reverse Cursed Technique and the Six Eyes item
// (ServerGame trial input/heal, SixEyesItem confirmation).
import { RCT_HEAL_AMOUNT } from "./constants";
import { distanceSq, type V3 } from "./vec";

/** Sneak is the trial's hold key: pressing charges, letting go releases. */
export function sneakEdge(wasSneaking: boolean, sneaking: boolean): "charge" | "release" | null {
  if (!wasSneaking && sneaking) return "charge";
  if (wasSneaking && !sneaking) return "release";
  return null;
}

/** The trial is interrupted when the player moves more than 0.6 blocks. */
export const movedTooFar = (origin: V3, pos: V3): boolean => distanceSq(origin, pos) > 0.36;

/** Health restored by one healing pulse (0 at full health). */
export const rctHealAmount = (health: number, max: number): number => Math.max(0, Math.min(RCT_HEAL_AMOUNT, max - health));

/** Two uses from the same hotbar slot are needed to reborn with the Six Eyes. */
export class SixEyesConfirm {
  private readonly slots = new Map<string, number>();

  press(player: string, slot: number): "warn" | "rebirth" {
    if (this.slots.get(player) === slot) {
      this.slots.delete(player);
      return "rebirth";
    }
    this.slots.set(player, slot);
    return "warn";
  }

  /** Forgets the pending confirmation once the player switches slots. */
  check(player: string, slot: number): void {
    const pending = this.slots.get(player);
    if (pending !== undefined && pending !== slot) this.slots.delete(player);
  }

  pending(player: string): boolean {
    return this.slots.has(player);
  }

  clear(player: string): void {
    this.slots.delete(player);
  }
}
