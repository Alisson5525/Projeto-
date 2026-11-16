import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    if(!advancementsEnabled) return;
    const block = e.block;
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (player.hasTag("adv:mm:key_keeper")) return;
    if (!player.hasTag("aly:mm_enabled")) return;
    if (block.typeId !== "mm:sanctuary_vault" || item.typeId !== "mm:sanctuary_key") return;

    system.run(() => {
        grantAdvancement(player, "mm:key_keeper")
    })
})