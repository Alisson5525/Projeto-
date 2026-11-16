import {
    world,
    system,
    ItemStack,
    EntityDamageCause
} from "@minecraft/server";

world.afterEvents.entityHurt.subscribe((event) => {
    const hurt = event.hurtEntity;
    const damager = event.damageSource.damagingEntity;
    const cause = event.damageSource.cause;
    if (!damager || !hurt) return;
    if (hurt.typeId !== "mm:scrubel") return;
    if (cause !== EntityDamageCause.entityAttack) return;

    if (damager.typeId === "minecraft:player") {
        if (damager.getGameMode() == "Creative" || damager.getGameMode() == "Spectator") {
            return;
        }
        const tame = hurt.getComponent("minecraft:tameable")
        if (tame.tamedToPlayer == damager) {
            return;
        }
    }

    const rand = Math.floor(Math.random() * 100)
    if (rand < 40) return;
    const damage = 1 + Math.random() * 4
    damager.applyDamage(damage, { damagingEntity: hurt, cause: EntityDamageCause.thorns })
    damager.dimension.playSound("mob.scrubel.thorns", damager.location, { volume: 0.5 })
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    const entity = e.entity;
    if (entity.typeId !== "mm:scrubel") return;
    if (e.eventId == "mm:drop_item") {
        const itemDrop = new ItemStack("mm:scrubel_drop_item", 1)
        entity.dimension.spawnItem(itemDrop, entity.location)
    } else if (e.eventId == "mm:stored_item") {
        var nearbyPile = entity.dimension.getEntities({ type: "mm:scrubel_treasure_pile", maxDistance: 7, location: entity.location, closest: 1 })
        if (nearbyPile.length == 0) return
        nearbyPile = nearbyPile[0]
        var nearbyItem = entity.dimension.getEntities({ type: "minecraft:item", maxDistance: 7, location: entity.location, closest: 1 })
        if (nearbyItem.length == 0) return
        nearbyItem = nearbyItem[0]
        const itemComp = nearbyItem.getComponent("item")
        const inventory = nearbyPile.getComponent("inventory")

        const container = inventory.container;
        if (container.emptySlotsCount == 0) return;
        let firstEmpty = container.getSlot(container.firstEmptySlot())
        firstEmpty.setItem(itemComp.itemStack)
        nearbyItem.remove()
    }
})