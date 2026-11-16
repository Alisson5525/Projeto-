import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"


world.afterEvents.entitySpawn.subscribe((e) => {
    if(!advancementsEnabled) return;
    const entity = e.entity
    if (entity.typeId !== "mm:fangangler_projectile") return;
    system.runTimeout(() => {
        if (entity.isValid) entity.addTag("adv:mm:fangangler_spawned")
    }, 2)
    const buddies = entity.dimension.getEntities({ maxDistance: 2, type: entity.typeId, location: entity.location, excludeTags: ["adv:fangangler_spawned"] })
    const owner = entity.getComponent("projectile").owner;
    if (buddies.length == 16 && owner.hasTag("adv:mm:big_shot") == false) grantAdvancement(owner, "mm:big_shot")
})