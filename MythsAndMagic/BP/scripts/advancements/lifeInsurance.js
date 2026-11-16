import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    if(!advancementsEnabled) return;
    const player = e.player;
    const beforeItem = e.itemStack;
    const entity = e.target;

    if (entity.typeId == "mm:flickerwick") {
        if (!beforeItem) return;
        if (beforeItem.typeId == "minecraft:honeycomb") {
            if (player.hasTag("adv:mm:life_insurance")) return;
            const wax = entity.getProperty("mm:wax_remaining")
            if (wax == 20) return;
            system.run(() => {
                grantAdvancement(player, "mm:life_insurance")
            })
        }
    }
})