import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.afterEvents.entitySpawn.subscribe((e) => {
    if(!advancementsEnabled) return;
    const entity = e.entity
    if (entity.typeId !== "mm:longshot_projectile") return;
    const owner = entity.getComponent("projectile").owner;
    if (owner.hasTag("adv:mm:thwip") == false) grantAdvancement(owner, "mm:thwip")
})