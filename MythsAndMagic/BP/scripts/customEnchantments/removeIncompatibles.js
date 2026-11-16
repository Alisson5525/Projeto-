import { world, system } from "@minecraft/server";
import { customData } from "customEnchantments/main.js"

var gameStart = false;
system.runTimeout(() => {
  gameStart = true   
}, 50)

var gameStart = false;
system.runTimeout(() => {
  gameStart = true   
}, 50)

world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    if (!gameStart) return;
    const item = e.itemStack;
    const player = e.player;
    if (!item || !player) return;
    const enchantable = item.getComponent("enchantable");
    if (!enchantable) return;

    let changed = false;
    for (const id of item.getDynamicPropertyIds()) {
        if (!id.startsWith("mm:ponder_enchant_")) continue;
        const name = id.replace("mm:ponder_enchant_", "");
        const lookup = customData.find(l => l.enchantName === name);
        if (!lookup) continue;
        for (const incompat of lookup.incompatibleWith) {
            try {
                if (enchantable.hasEnchantment(incompat)) {
                    enchantable.removeEnchantment(incompat);
                    changed = true;
                }
            } catch {}
        }
    }
    if (!changed) return;

    const container = player.getComponent("inventory")?.container;
    if (container) container.setItem(e.slot, item);
});