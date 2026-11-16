import {
    world,
    system,
    BlockVolume
} from "@minecraft/server";

const snowCanReplace = [
    "minecraft:grass_block",
    "minecraft:dirt",
    "minecraft:gravel",
    "minecraft:sand",
    "minecraft:red_sand",
    "minecraft:crimson_nylium",
    "minecraft:warped_nylium",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:coarse_dirt",
    "minecraft:rooted_dirt", // i forget the id lol
    "minecraft:dirt_with_roots" // i know its one of these two, though..
]

const snowLayersCanReplace = [
    "minecraft:air"
]

function spreadSnow(dim, originLoc, chance, range, blockArray) {
    if (range < 1 || range > 6) return;
    var newArray = blockArray
    var corner1 = { x: originLoc.x - range, y: originLoc.y + 2, z: originLoc.z - range }
    var corner2 = { x: originLoc.x + range, y: originLoc.y - 3, z: originLoc.z + range }
    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
    for (const location of volume.getBlockLocationIterator()) {

        const block = dim.getBlock(location)
        if (block.typeId == "minecraft:water" && block.above().isAir) {
            block.setType("minecraft:frosted_ice")
            dim.spawnParticle("mm:spread_snow", block.center())
            newArray.push(block)
        }
        const rand = Math.random()

        if (rand > chance) continue;
        if (block.above().typeId == "minecraft:snow" || block.above().typeId == "minecraft:snow_layer") continue;
        if (rand < 0.03) {
            if (block.typeId == "minecraft:snow_layer") {
                if (snowCanReplace.includes(block.below().typeId) || block.below().typeId == "minecraft:snow") {
                    block.setType("mm:permafrost_icicle")
                    const perm = block.permutation;
                    const newPermutation = perm.withState("minecraft:block_face", "up").withState("mm:from_slushbuckler", true)
                    block.setPermutation(newPermutation)
                    newArray.push(block)
                }
            }
        } else if (blockArray.includes(block)) {
            continue;
        } else {
            if (block.above().isLiquid || block.above().typeId == "minecraft:frosted_ice") continue;
            if (block.typeId == "minecraft:stone_bricks") {
                block.setType("mm:snowy_stone_bricks")
                dim.spawnParticle("mm:spread_snow", block.center())
                newArray.push(block)
            }
            if (snowCanReplace.includes(block.typeId)) {
                block.setType("minecraft:snow")
                dim.spawnParticle("mm:spread_snow", block.center())
                newArray.push(block)
            } else if (snowLayersCanReplace.includes(block.typeId)) {
                if (snowCanReplace.includes(block.below().typeId) || block.below().typeId == "minecraft:snow") {
                    block.setType("minecraft:snow_layer")
                    dim.spawnParticle("mm:spread_snow", block.center())
                    newArray.push(block)
                }
            }
        }
    }
    spreadSnow(dim, originLoc, chance - 0.2, range + 1, newArray)
}

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id == "mm:slushbuckler_snow") {
        const source = e.sourceEntity
        const dim = source.dimension;
        const loc = source.location
        source.setProperty("mm:snowstorm", true)
        source.addEffect("slowness", 50, { amplifier: 99, showParticles: false })
        system.runTimeout(() => {
            if (!source.isValid) return;
            const vd = source.getViewDirection()
            const tloc = source.location
            dim.spawnParticle("mm:snow_breath", { x: tloc.x + vd.x * 4, y: tloc.y, z: tloc.z + vd.z * 4 })
            dim.spawnParticle("mm:snow_breath", { x: tloc.x + vd.x * 2, y: tloc.y, z: tloc.z + vd.z * 2 })
            dim.spawnParticle("mm:snow_breath", tloc)
        }, 30);
        system.runTimeout(() => {
            const originBlock = dim.getBlock(loc).below()
            spreadSnow(dim, originBlock.location, 1.1, 1, [])
            source.setProperty("mm:snowstorm", false)

        }, 50)

    }
})