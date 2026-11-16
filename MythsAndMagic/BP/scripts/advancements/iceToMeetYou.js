import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.afterEvents.playerInteractWithEntity.subscribe((e) => {
    if(!advancementsEnabled) return;
    const player = e.player;
    const beforeItem = e.beforeItemStack;
    const entity = e.target;

    if (entity.typeId == "mm:slushbuckler") {
        if (!beforeItem) return;
        if (beforeItem.typeId == "mm:popsicle") {
            if (player.hasTag("adv:mm:ice_to_meet_you")) return;
            grantAdvancement(player, "mm:ice_to_meet_you")
        }
    }
})