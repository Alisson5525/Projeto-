import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

system.runInterval(() => {
    if(!advancementsEnabled) return;
    for (const player of world.getPlayers({ excludeTags: ["adv:mm:i_dont_like_this"], tags: ["aly:mm_enabled"], excludeGameModes: ["Spectator"] })) {
        const dim = player.dimension;
        const loc = player.location
        const revoid = dim.getEntities({ location: loc, maxDistance: 15, type: "mm:revoid" })
        if (revoid.length > 0) {
            grantAdvancement(player, "mm:i_dont_like_this")
        }
    }
}, 100)