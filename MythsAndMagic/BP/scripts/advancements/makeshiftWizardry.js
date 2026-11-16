import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    if(!advancementsEnabled) return;
    const block = e.block;
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (player.hasTag("adv:mm:makeshift_wizardry")) return;
    if (!player.hasTag("aly:mm_enabled")) return;
    if (block.typeId !== "mm:reforged_spellcrafter" || item.typeId !== "mm:sparkling_crystal") return;
    if (block.permutation.getState("mm:power") !== 0) return;
    system.run(() => {
        grantAdvancement(player, "mm:makeshift_wizardry")
    })
})