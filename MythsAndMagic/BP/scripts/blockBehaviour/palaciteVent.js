import {
    world,
    system,
    BlockVolume
} from "@minecraft/server";

function deactivate(block) {
    const perm = block.permutation
    if (block.typeId == "mm:palacite_vent") {
        block.setPermutation(perm.withState("mm:active", false))
        if (block.below().typeId == "mm:palacite") block.dimension.playSound("block.palacite_vent.rumble", block.center(), { pitch: 1.8 })
    }

}
function activate(block) {
    const perm = block.permutation
    if (block.typeId == "mm:palacite_vent") {
        block.setPermutation(perm.withState("mm:active", true))
        block.dimension.playSound("block.palacite_vent.rumble", block.center())
    }
}

function lungCancer(dim, block) {
    for (let i = 0; i < 5; i++) {
        system.runTimeout(() => {
            if (dim.isChunkLoaded(block.location) == false) return;
            const check = block.above(i + 1)
            if (!check.isAir && !check.isLiquid) return;
            for (const entity of dim.getEntities({ location: check.location, maxDistance: 1.5, excludeFamilies: ["undead", "magmacube", "ghast"] })) {
                if (entity.getEffect("fire_resistance")) continue;
                const headLoc = dim.getBlock(entity.getHeadLocation()).center()
                const center = check.center()
                if (headLoc.x == center.x && headLoc.y == center.y && headLoc.z == center.z) {
                    entity.addEffect("wither", 55, { amplifier: 1 })
                    entity.applyDamage(1, { cause: "wither" })
                }
            }
        }, i)
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:palacite_vent", {
        onPlace(e) {
            const block = e.block;
            if (block.below().typeId == "mm:palacite") activate(block)
        },
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            const perm = block.permutation
            const active = perm.getState("mm:active")
            if (active) {
                if (block.below().typeId !== "mm:palacite") {
                    return deactivate(block)
                } else {
                    const corner1 = { x: block.x - 5, y: block.y - 5, z: block.z - 5 }
                    const corner2 = { x: block.x + 5, y: block.y - 1, z: block.z + 5 }
                    if (!dim.isChunkLoaded(corner1) || !dim.isChunkLoaded(corner2)) return
                    try {
                        const nearbyLava = dim.getBlocks(new BlockVolume(corner1, corner2), { includeTypes: ["lava"] }, false)
                        if (!nearbyLava) return;
                        var count = 0
                        for (const testBlock of nearbyLava.getBlockLocationIterator()) {
                            count += 1
                        }
                        if (count < 4 && block.below(2).typeId !== "minecraft:magma" && block.below(2).typeId !== "minecraft:lava") {
                            return deactivate(block)
                        } else {
                            dim.spawnParticle("mm:palacite_vent_main", { x: block.center().x, y: block.center().y + 0.25, z: block.center().z })
                            dim.spawnParticle("mm:palacite_vent_smoke_particle", { x: block.center().x, y: block.center().y + 0.25, z: block.center().z })
                            if (Math.random() > 0.9) dim.spawnParticle("minecraft:lava_particle", { x: block.center().x, y: block.center().y + 0.25, z: block.center().z })
                            if (dim.id == "minecraft:nether") lungCancer(dim, block)
                        }
                    } catch {
                        return;
                    }
                }
            } else {
                if (block.below().typeId == "mm:palacite") {
                    const corner1 = { x: block.x - 5, y: block.y - 5, z: block.z - 5 }
                    const corner2 = { x: block.x + 5, y: block.y - 1, z: block.z + 5 }
                    if (!dim.isChunkLoaded(corner1) || !dim.isChunkLoaded(corner2)) return

                    try {
                        const nearbyLava = dim.getBlocks(new BlockVolume(corner1, corner2), { includeTypes: ["lava"] }, false)
                        if (!nearbyLava) return;
                        var count = 0
                        for (const testBlock of nearbyLava.getBlockLocationIterator()) {
                            count += 1
                        }
                        if (count >= 4 || block.below(2).typeId == "minecraft:magma" || block.below(2).typeId == "minecraft:lava") {
                            return activate(block)
                        } else {
                            if (Math.random() > 0.8) dim.spawnParticle("mm:palacite_vent_main", { x: block.center().x, y: block.center().y + 0.25, z: block.center().z })
                        }
                    } catch {
                        return;
                    }
                }
            }
        }
    })
})