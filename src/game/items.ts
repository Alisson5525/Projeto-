// The technique item ("Ilimitado"): always kept in the inventory.
import { type Container, type EntityInventoryComponent, ItemLockMode, ItemStack, type Player } from "@minecraft/server";
import { ITEM } from "../ids";

export function container(player: Player): Container | undefined {
  return (player.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined)?.container;
}

export function findItemSlot(player: Player, typeId: string): number {
  const inv = container(player);
  if (!inv) return -1;
  for (let i = 0; i < inv.size; i++) if (inv.getItem(i)?.typeId === typeId) return i;
  return -1;
}

export function techniqueStack(): ItemStack {
  const stack = new ItemStack(ITEM.limitless, 1);
  stack.keepOnDeath = true;
  stack.lockMode = ItemLockMode.inventory;
  return stack;
}

/** Gives the technique item if the player lost it. Returns true when given. */
export function ensureTechniqueItem(player: Player): boolean {
  const inv = container(player);
  if (!inv || findItemSlot(player, ITEM.limitless) >= 0) return false;
  const selected = player.selectedSlotIndex;
  if (!inv.getItem(selected)) {
    inv.setItem(selected, techniqueStack());
    return true;
  }
  const left = inv.addItem(techniqueStack());
  return left === undefined;
}

/** Moves the technique item to hotbar slot 9 (index 8), swapping with what is there. */
export function moveTechniqueToHome(player: Player): boolean {
  const inv = container(player);
  if (!inv) return false;
  const slot = findItemSlot(player, ITEM.limitless);
  if (slot < 0) return false;
  if (slot === 8) return true;
  try {
    inv.swapItems(slot, 8, inv);
    return true;
  } catch {
    // A locked slot or a full stack: combat still works from where the item is.
    return false;
  }
}
