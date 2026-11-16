import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    if(!advancementsEnabled) return;
    const player = e.player
    const target = e.target;
    if (player.hasTag("aly:mm_enabled") == false) return;
    if (player.hasTag("adv:mm:brewing_buddies")) return;
    if (target.typeId !== "mm:booze") return;
    const beforeType = target.getProperty("mm:potion")
    system.runTimeout(() => {
        if (beforeType == "none" && target.getProperty("mm:potion") !== beforeType) grantAdvancement(player, "mm:brewing_buddies")
    }, 1)
})