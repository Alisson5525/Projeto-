import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


system.runInterval(() => {
    if(!advancementsEnabled) return;
    for (const player of world.getPlayers({ excludeTags: ["adv:caves_and_cliffs"], tags:["mm:meteor_armour_drop_active"], excludeGameModes: ["Spectator"] })) {
        const formerHeight = player.getDynamicProperty("mm:former_height")
        if(player.isOnGround) {
            if(!formerHeight || formerHeight <= player.location.y + 80) {
                if(formerHeight) player.setDynamicProperty("mm:former_height", null)
            } else {
                player.setDynamicProperty("mm:former_height", null)
                grantAdvancement(player, "mm:terminal_velocity")
            }
        } else {
            const y = player.location.y
            if(!formerHeight || formerHeight < y) player.setDynamicProperty("mm:former_height", y)
        }
    }
}, 1);



