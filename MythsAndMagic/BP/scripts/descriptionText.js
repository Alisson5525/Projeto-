import { world, system } from "@minecraft/server";

// just exists to remove the old stuff

let gameStart = false;
system.runTimeout(() => {
    gameStart = true;
}, 50);

world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    if (!gameStart) return;

    const player = e.player;
    if (!player || !e.itemStack) return;

    if (!e.itemStack.typeId.startsWith("mm:")) return;

    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    const item = container.getItem(e.slot);
    if (!item || !item.typeId.startsWith("mm:")) return;

    const lore = item.getLore();
    if (lore.length === 0) return;
    if (!lore[0].includes("desc." + item.typeId.replace("mm:", ""))) return;
    item.setLore(lore.slice(1));
    container.setItem(e.slot, item);
});