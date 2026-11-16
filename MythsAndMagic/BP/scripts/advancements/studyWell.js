import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.afterEvents.itemUse.subscribe((e) => {
    if(!advancementsEnabled) return;
    const item = e.itemStack;
    const player = e.source;
    if (player.hasTag("adv:mm:study_well")) return;
    if (!player.hasTag("aly:mm_enabled")) return;
    if (!item) return;
    if (item.typeId == "mm:ancient_texts") grantAdvancement(player, "mm:study_well")
})