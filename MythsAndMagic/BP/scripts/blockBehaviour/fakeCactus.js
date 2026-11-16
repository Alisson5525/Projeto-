import {
    world,
    system
} from "@minecraft/server";

function transformToScrubel(block, dim, id) {
    if (id !== "mm:fake_cactus") return;
    var flower = false
    const above = block.above()
    if (above.typeId == "mm:fake_cactus") transformToScrubel(above, dim, above.typeId)

    if (above.typeId == "minecraft:cactus_flower") flower = true
    const impulse = {
        x: 1.2 * Math.random() * 1 - 0.5,
        y: 0.3,
        z: 1.2 * Math.random() * 1 - 0.5
    }

    if (flower == true) {
        above.setType("minecraft:air")
        block.setType("air")
        const entity = dim.spawnEntity("mm:scrubel", block.bottomCenter(), { spawnEvent: "mm:spawn_flowered" })
        dim.playSound("mob.scrubel.uncover", entity.location)
        entity.applyImpulse(impulse)
    } else {
        block.setType("air")
        const entity = dim.spawnEntity("mm:scrubel", block.bottomCenter(), { spawnEvent: "mm:spawn_default" })
        dim.playSound("mob.scrubel.uncover", entity.location)
        entity.applyImpulse(impulse)
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:fake_cactus", {
        onPlayerBreak(e) {
            const block = e.block;
            const dim = e.dimension;

            transformToScrubel(block, dim, e.brokenBlockPermutation.type.id)
        },
        onTick(e) {

            const block = e.block;
            if (block.above().typeId == "mm:fake_cactus") return;
            const dim = e.dimension;
            const players = dim.getPlayers({ location: block.location, maxDistance: 4.4, excludeGameModes: ["Spectator", "Creative"] })
            if (players.length == 0) return;
            transformToScrubel(block, dim, block.typeId)
        }
    })
})