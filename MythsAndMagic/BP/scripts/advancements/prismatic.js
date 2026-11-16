import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if(!advancementsEnabled) return;
    const id = e.id;
    if (id == ("mm:prismatic")) {
    const player = e.sourceEntity;
    if (!player) return;
    if (player.typeId !== "minecraft:player") return;
    if (!player.hasTag("aly:mm_enabled")) return;
        if (player.hasTag("adv:mm:prismatic") == false) grantAdvancement(player, "mm:prismatic")
    }
})