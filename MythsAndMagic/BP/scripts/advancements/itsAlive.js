import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    if(!advancementsEnabled) return;
    const block = e.block;
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (!block.getComponent("mm:flickerwick_statue")) return;
    if (player.hasTag("adv:mm:its_alive")) return;
    if (!player.hasTag("aly:mm_enabled")) return;
    const id = item.typeId
    system.runTimeout(() => {
        if (block.isAir) {
            if (id == "minecraft:fire_charge" || id == "minecraft:flint_and_steel") grantAdvancement(player, "mm:its_alive")
        }
    }, 1)
})