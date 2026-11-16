import {
    system,
    BlockVolume,
    world
} from "@minecraft/server";
import {leavesTicked} from "./twistedRoots.js"

const logBlocks = [
    "minecraft:oak_log",
    "minecraft:oak_wood",
    "minecraft:stripped_oak_log",
    "minecraft:stripped_oak_wood",
    "minecraft:birch_log",
    "minecraft:birch_wood",
    "minecraft:stripped_birch_log",
    "minecraft:stripped_birch_wood",
    "minecraft:spruce_log",
    "minecraft:spruce_wood",
    "minecraft:stripped_spruce_log",
    "minecraft:stripped_spruce_wood",
    "minecraft:jungle_log",
    "minecraft:jungle_wood",
    "minecraft:stripped_jungle_log",
    "minecraft:stripped_jungle_wood",
    "minecraft:dark_oak_log",
    "minecraft:dark_oak_wood",
    "minecraft:stripped_dark_oak_log",
    "minecraft:stripped_dark_oak_wood",
    "minecraft:acacia_log",
    "minecraft:acacia_wood",
    "minecraft:stripped_acacia_log",
    "minecraft:stripped_acacia_wood",
    "minecraft:mangrove_log",
    "minecraft:mangrove_wood",
    "minecraft:stripped_mangrove_log",
    "minecraft:stripped_mangrove_wood",
    "minecraft:cherry_log",
    "minecraft:cherry_wood",
    "minecraft:stripped_cherry_log",
    "minecraft:stripped_cherry_wood",
    "minecraft:pale_oak_log",
    "minecraft:pale_oak_wood",
    "minecraft:stripped_pale_oak_log",
    "minecraft:stripped_pale_oak_wood",
    "minecraft:poplar_log",
    "minecraft:poplar_wood",
    "minecraft:stripped_poplar_log",
    "minecraft:stripped_poplar_wood",
    "minecraft:crimson_stem",
    "minecraft:crimson_hyphae",
    "minecraft:stripped_crimson_stem",
    "minecraft:stripped_crimson_hyphae",
    "minecraft:warped_stem",
    "minecraft:warped_hyphae",
    "minecraft:stripped_warped_stem",
    "minecraft:stripped_warped_hyphae"
]
function isLeavesBlock(block) {
    if (block.hasTag("mm:custom_leaves")) return true;
    if (block.hasTag("minecraft:leaves")) return true;
    if (block.typeId.includes("leaves")) return true;
    if(block.typeId.includes("leaves")) console.warn(block.typeId)
    return false;
}
function isLog(block) {
    if (block.hasTag("mm:custom_log")) return true;
    if (logBlocks.includes(block.typeId)) return true;
    return false;
}

function tryOpaque(block, dim) {
    if (!block.getComponent("mm:custom_leaves")) return;
    const perm = block.permutation
    var newPerm = perm
    const opaque = perm.getState("mm:opaque")
    const checks = [
        block.above(),
        block.below(),
        block.east(),
        block.south(),
        block.west(),
        block.north()
    ]
    var makeOpaque = true
    for (const target of checks) {
        if (!target) continue;
        if (!dim.isChunkLoaded(target.location)) return
        if (isLeavesBlock(target) == false && isLog(target) == false) makeOpaque = false
    }
    if (makeOpaque && !opaque) {
        newPerm = newPerm.withState("mm:opaque", true)
    } else if (!makeOpaque && opaque) {
        newPerm = newPerm.withState("mm:opaque", false)
    }
    block.setPermutation(newPerm)
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:custom_leaves", {
        beforeOnPlayerPlace(e) {
            const permutationtoPlace = e.permutationToPlace;
            e.permutationToPlace = permutationtoPlace.withState("mm:persistent", true)
        },
        onRandomTick(e) {
            const block = e.block;
            const dim = e.dimension;
            const radius = 6;
            const perm = block.permutation

            if (!block.getComponent("mm:custom_leaves")) return;
            if (block.below().isAir) {
                const xOffset = Math.random() - 0.5
                const zOffset = Math.random() - 0.5
                const origin = block.bottomCenter()
                dim.spawnParticle(block.typeId + "_particle", { x: origin.x + xOffset, y: origin.y - 0.8, z: origin.z + zOffset })
            }
            const persistent = perm.getState("mm:persistent")
            if(!persistent && block.typeId == "mm:twisted_leaves") leavesTicked(block)
            if (Math.random() > 0.5 && persistent == false) {
                const corner1 = { x: block.x - radius, y: block.y - radius, z: block.z - radius }
                const corner2 = { x: block.x + radius, y: block.y + radius, z: block.z + radius }
                if (!dim.isChunkLoaded(corner1) || !dim.isChunkLoaded(corner2)) return;
                const blockVol = new BlockVolume(corner1, corner2)
                const filter = { includeTypes: logBlocks, includeTags: ["mm:custom_log"] }
                try {
                    if (dim.containsBlock(blockVol, filter, false)) {
                        tryOpaque(block, dim)
                        return;
                    };
                    dim.runCommand(`fill ${block.x} ${block.y} ${block.z} ${block.x} ${block.y} ${block.z} air destroy`)

                } catch {

                }
            } else {
                tryOpaque(block, dim)
            }
        },
        onPlayerBreak(e) {
            const block = e.block;
            const dim = e.dimension;
            const checks = [
                block.above(),
                block.below(),
                block.east(),
                block.south(),
                block.west(),
                block.north()
            ]
            for (const target of checks) {
                if (!dim.isChunkLoaded(target.location)) return
                if (target.getComponent("mm:custom_leaves")) tryOpaque(target, target.dimension)
            }
        },
        onPlace(e) {
            const block = e.block;
            const dim = e.dimension;
            const checks = [
                block.above(),
                block.below(),
                block.east(),
                block.south(),
                block.west(),
                block.north()
            ]
            for (const target of checks) {
                if (!target || !dim.isChunkLoaded(target.location)) return
                if (target.getComponent("mm:custom_leaves")) tryOpaque(target, target.dimension)
            }
        }
    })
})
