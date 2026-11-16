import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    if(!advancementsEnabled) return;
    const item = e.itemStack;
    const player = e.player;
    const block = e.block

    if (!item || !player || !block) return;
    if (!player.hasTag("aly:mm_enabled")) return;
    if (block.permutation.getState("ominous") === true && item.typeId === 'mm:ominous_polar_trial_key' && block.typeId === 'minecraft:vault' && !player.hasTag('adv:mm:recooling')) grantAdvancement(player, "mm:recooling")
})

