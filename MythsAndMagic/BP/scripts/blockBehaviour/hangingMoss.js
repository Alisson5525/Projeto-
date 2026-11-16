import {
    world,
    system
} from "@minecraft/server";

const componentId = "mm:hanging_moss"

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent(componentId, {
        onRandomTick(e) {
            const block = e.block;
            const dim = e.dimension
            const above = block.above()
            const below = block.below()
            const face = "down"
            if ((face == "down" && (above.isAir || above.isLiquid)) || (face == "up" && (below.isAir || below.isLiquid))) {
                dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
            }
        },
        onPlace(e) {
            const dim = e.dimension;
            const block = e.block
            //const face = block.permutation.getState("minecraft:block_face");
            for (let i = block.y + 1; i < dim.heightRange.max; i++) {
                const checkBlock = dim.getBlock({ x: block.x, y: i, z: block.z })
                if (!checkBlock.getComponent(componentId)) return;
                const checkBlockState = checkBlock.permutation.getState('mm:tip');
                if (checkBlockState) {
                    const below = checkBlock.above()
                    var newPerm = checkBlock.permutation.withState("mm:tip", false)
                    checkBlock.setPermutation(newPerm)
                    continue;

                }
            }


        },
        onBreak(e) {
            const originBlock = e.block
            const dim = originBlock.dimension
            const block = e.brokenBlockPermutation;
            //const face = block.getState("minecraft:block_face");

            //destroy blocks attached
            for (let i = originBlock.y - 1; i > dim.heightRange.min; i--) {
                const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                if (!checkBlock.getComponent(componentId)) break;
                dim.runCommand(`setblock ${checkBlock.x} ${i} ${checkBlock.z} air destroy`)
            }
            //shorten blocks it was attached to
            for (let i = originBlock.y + 1; i < dim.heightRange.max; i++) {
                const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                if (!checkBlock.getComponent(componentId)) break;
                const diff = i - originBlock.y
                if (diff == 1) {
                    checkBlock.setPermutation(checkBlock.permutation.withState("mm:tip", true))
                }
            }

        }
    })
})

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (item.typeId !== "minecraft:bone_meal") return;
    const block = e.block;
    if (!block) return;
    const dim = block.dimension
    if (block.getComponent(componentId)) {
        if (player.getDynamicProperty("mm:interact_cooldown") > 0) return
        player.setDynamicProperty("mm:interact_cooldown", 2)
        var endBlock = undefined
        for (let i = 0; i < 256 && endBlock == undefined; i++) {
            if (block.y - i < dim.heightRange.min) continue;
            const checkBlock = block.below(i)
            if (i >= 1 && !checkBlock.above().getComponent(componentId)) return;
            if (checkBlock.isAir && checkBlock.above().getComponent(componentId)) endBlock = checkBlock
        }
        system.run(() => {
            dim.playSound("item.bone_meal.use", player.location)
            dim.spawnParticle("minecraft:crop_growth_emitter", block.center())
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
            try {
                endBlock.setType(block.typeId)
            } catch (e) {

            }
        })
    }

})