import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

world.afterEvents.entityDie.subscribe((e) => {
    const entity = e.deadEntity;
    if (!entity) return;
    if (!entity.isValid) return;
    if (entity.typeId !== "minecraft:player") return;
    const damager = e.damageSource.damagingEntity;
    if (!damager) return;
    if (!damager.isValid) return;
    if (damager.typeId !== "minecraft:player") return;

    if (entity.name == "BlazingFurnace1" && Math.random() > 0.5 && !entity.hasTag("mm:ignore_special_drops")) {
        const item = new ItemStack("mm:music_disc_what", 1)
        entity.dimension.spawnItem(item, entity.location)
    }
})