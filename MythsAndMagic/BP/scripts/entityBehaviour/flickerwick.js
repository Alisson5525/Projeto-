import {
    world,
    system,
    DimensionTypes
} from "@minecraft/server";

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    if (event.eventId !== "mm:create_light") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:flickerwick" || !entity.isValid) return;
    const dim = entity.dimension;
    const blockSpace = dim.getBlock(entity.location).above()
    if (blockSpace.isAir || blockSpace.getComponent("mm:flickerwick_light")) {
        const variant = entity.getComponent("minecraft:variant").value
        var particleId = "mm:";
        if (variant == 1) particleId += "soul_"
        if (variant == 2) particleId += "copper_"
        if (variant == 3) particleId += "sparkling_"
        blockSpace.setType(particleId + "flickerwick_light")
    }
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    if (event.eventId !== "mm:begin_expire") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:flickerwick") return;
    const dim = entity.dimension;
    dim.playSound("mob.flickerwick.expire", entity.location, { volume: 1 })
})

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "mm:flickerwick_expire") return;
    const entity = event.sourceEntity;
    if (entity.typeId !== "mm:flickerwick") return;
    const dim = entity.dimension;
    const variant = entity.getComponent("minecraft:variant").value
    var particleId = "mm:flickerwick_expire_";
    if (variant == 0) particleId += "standard"
    if (variant == 1) particleId += "soul"
    if (variant == 2) particleId += "copper"
    if (variant == 3) particleId += "sparkling"
    dim.spawnParticle(particleId, entity.location)
    dim.playSound("mob.flickerwick.expire", entity.location, { volume: 0.2, pitch: 0.3 })
    dim.spawnEntity("minecraft:xp_orb", entity.location)
    entity.remove()
})

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "mm:flickerwick_melt") return;
    const entity = event.sourceEntity;
    if (entity.typeId !== "mm:flickerwick") return;
    const dim = entity.dimension;
    const variant = entity.getComponent("minecraft:variant").value
    var particleId = "mm:flickerwick_melt_";
    if (variant == 0) particleId += "standard"
    if (variant == 1) particleId += "soul"
    if (variant == 2) particleId += "copper"
    if (variant == 3) particleId += "sparkling"
    dim.spawnParticle(particleId, entity.location)
    const waxLvl = entity.getProperty("mm:wax_remaining");
    if (waxLvl < 20 && waxLvl > 12) entity.dimension.playSound("mob.flickerwick.melt0", entity.location, { volume: 0.5 })
    if (waxLvl < 12 && waxLvl > 6) entity.dimension.playSound("mob.flickerwick.melt1", entity.location, { volume: 0.5 })
    if (waxLvl < 6 && waxLvl > 1) entity.dimension.playSound("mob.flickerwick.melt2", entity.location, { volume: 0.5 })
})

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "mm:flickerwick_wax") return;
    const entity = event.sourceEntity;
    if (entity.typeId !== "mm:flickerwick") return;
    const dim = entity.dimension;
    const waxLvl = entity.getProperty("mm:wax_remaining");
    dim.playSound("copper.wax.on", entity.location)
    if (waxLvl < 17) {
        entity.setProperty("mm:wax_remaining", waxLvl + 3)
    } else {
        entity.setProperty("mm:wax_remaining", 20)
    }
    const variant = entity.getComponent("minecraft:variant").value
    var effect = ""
    if (variant == 0) effect = "haste"
    if (variant == 1) effect = "fire_resistance"
    if (variant == 2) effect = "resistance"
    if (variant == 3) effect = "strength"
    const players = dim.getPlayers({ maxDistance: 4.5, location: entity.location })
    for (const player of players) {
        player.addEffect(effect, 800, { amplifier: 0 })
    }

})

system.runInterval(() => {
    for (const dimId of DimensionTypes.getAll()) {
        const dim = world.getDimension(dimId.typeId)
        const flickerwicks = dim.getEntities({ type: "mm:flickerwick" })
        for (const flicker of flickerwicks) {
            const waxLvl = flicker.getProperty("mm:wax_remaining");
            if (waxLvl == 1) {
                dim.playSound("mob.flickerwick.panic", flicker.location, { volume: 0.5 })
            }
        }
    }
}, 28)