

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

const canReplace = [
    "minecraft:stone",
    "minecraft:andesite",
    "minecraft:granite",
    "minecraft:deepslate",
    "minecraft:diorite",
    "minecraft:dirt",
    "minecraft:grass_block",
    "minecraft:mycelium",
    "minecraft:podzol",
    "minecraft:dirt_with_roots",
    "minecraft:tuff",
    "minecraft:moss_block",
    "minecraft:pale_moss_block",
    "mm:alterstone"
]

const vegetationBlocks = [
    "mm:twisted_moss_carpet",
    "mm:twisted_moss_carpet",
    "mm:twisted_moss_carpet",
    "mm:twisted_moss_carpet",
    "mm:twisted_moss_carpet",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_stalks",
    "mm:twisted_shrub",
    "mm:twisted_shrub",
    "mm:ilymia",
    "mm:ilymia",
    "minecraft:air",
    "minecraft:air",
    "minecraft:air",
    "minecraft:air",
    "minecraft:air",
    "minecraft:air"
]

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:twisted_moss", {})
})

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (item.typeId !== "minecraft:bone_meal") return;
    const block = e.block;
    if (!block) return;
    if (block.above().isAir == false) {
        return;
    }
    const dim = block.dimension
    if (block.getComponent("mm:twisted_moss")) {
        if (player.getDynamicProperty("mm:interact_cooldown") > 0) return
        player.setDynamicProperty("mm:interact_cooldown", 2)
        system.run(() => {
            var blocksPlaced = 0
            const maxX = 2 + Math.round(Math.random())
            const maxZ = 3 + Math.round(Math.random())
            for (let i = 0 - maxX; i <= maxX; i++) {
                for (let j = 0 - maxZ; j <= maxZ; j++) {
                    var chance = 1
                    var edgeX = false
                    var edgeZ = false
                    if (i == maxX || i == 0 - maxX) edgeX = true
                    if (j == maxZ || j == 0 - maxZ) edgeZ = true
                    if ((edgeX && !edgeZ) || (!edgeX && edgeZ)) chance = 0.75
                    if (edgeX && edgeZ) chance = 0

                    if (Math.random() < chance) {
                        const setLoc = {
                            x: block.x + i,
                            y: block.y + 1,
                            z: block.z + j
                        }
                        var countDown = 4
                        var foundBlock = undefined
                        var vegetationBlock = undefined
                        if (dim.getBlock(setLoc).isAir) countDown = 6
                        for (let k = 0; k < countDown && foundBlock == undefined; k++) {
                            const testblock = dim.getBlock({
                                x: setLoc.x,
                                y: setLoc.y - k,
                                z: setLoc.z
                            })
                            if (testblock.above().isAir && canReplace.includes(testblock.typeId)) {
                                foundBlock = testblock
                            }
                        }
                        if (foundBlock) {
                            blocksPlaced += 1
                            foundBlock.setType("mm:twisted_moss_block")
                        }
                        for (let k = 0; k < countDown && vegetationBlock == undefined; k++) {
                            const testblock = dim.getBlock({
                                x: setLoc.x,
                                y: setLoc.y - k,
                                z: setLoc.z
                            })
                            if (testblock.above().isAir && testblock.typeId == "mm:twisted_moss_block") {
                                vegetationBlock = testblock.above()
                            }
                        }
                        if (vegetationBlock && Math.random() > 0.6) {
                            blocksPlaced += 1
                            const type = vegetationBlocks[Math.floor(Math.random() * vegetationBlocks.length)]
                            vegetationBlock.setType(type)
                        }
                    }
                }
            }
            if (blocksPlaced > 0) {
                dim.playSound("item.bone_meal.use", player.location)
                dim.spawnParticle("minecraft:crop_growth_area_emitter", block.above().center())
                //reduce bonemeal
                if (player.getGameMode() !== "Creative") {
                    const equipment = player.getComponent("minecraft:equippable")
                    if (item.amount - 1 > 0) {
                        item.amount -= 1;
                        equipment.setEquipment("Mainhand", item)
                    } else {
                        equipment.setEquipment("Mainhand", undefined)
                    }
                }
            }
        })
    }

})