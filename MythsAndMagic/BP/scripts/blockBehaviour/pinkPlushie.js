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

    if (entity.name == "Axolot4342") {
        const item = new ItemStack("mm:pink_plushie", 1)
        item.setLore([{ translate: "desc.pink_plushie.easter_egg" }])
        entity.dimension.spawnItem(item, entity.location)
    }
})