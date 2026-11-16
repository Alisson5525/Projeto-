import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if(!advancementsEnabled) return;
    const player = e.sourceEntity;
    const id = e.id;
    if (id == ("mm:spellcast_staff")) {
        if (!player) return;
        if (player.typeId !== "minecraft:player") return;
        if (!player.hasTag("aly:mm_enabled")) return;
        if (player.hasTag("adv:mm:you_shall_not_pass") == false) grantAdvancement(player, "mm:you_shall_not_pass")
    }
})