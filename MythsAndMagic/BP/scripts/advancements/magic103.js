import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if(!advancementsEnabled) return;
    const player = e.sourceEntity;
    const id = e.id;
    if (!player) return;
    if (player.typeId !== "minecraft:player") return;
    if (!player.hasTag("aly:mm_enabled")) return;
    if (id == "mm:spell_cast_staffless") {
        const spellInfo = e.message.split("|")
        if (spellInfo[0] == "3") {
            if (player.hasTag("adv:mm:magic_103") == false) grantAdvancement(player, "mm:magic_103")
        }
    }
})