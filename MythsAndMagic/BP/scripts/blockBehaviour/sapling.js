

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:sapling", {
        onRandomTick(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const feature = p.params.feature
            const bonus_feature = p.params.bonus_feature
            const perm = block.permutation
            const stage = perm.getState("mm:sapling_stage")
            if (stage < 1) {
                block.setPermutation(perm.withState("mm:sapling_stage", stage + 1))
            } else {
                try {
                    block.setType("air")
                    dim.placeFeature(feature, block.location, true)
                    if(bonus_feature) system.runTimeout(() => {
                        dim.placeFeature(bonus_feature, block.location, true)
                    })
                } catch (e) {
                    block.setPermutation(perm)
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
    if (block.above().isAir == false) {
        return;
    }
    const dim = block.dimension
    if (block.getComponent("mm:sapling")) {
        if (player.getDynamicProperty("mm:interact_cooldown") > 0) return
        player.setDynamicProperty("mm:interact_cooldown", 10)
        const perm = block.permutation
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
                const feature = block.getComponent("mm:sapling").customComponentParameters.params.feature
                const bonus_feature = block.getComponent("mm:sapling").customComponentParameters.params.bonus_feature
                block.setType("air")
                dim.placeFeature(feature, block.location, true)
                if(bonus_feature) system.runTimeout(() => {
                    dim.placeFeature(bonus_feature, block.location, true)
                })
            } catch (e) {
                block.setPermutation(perm)
            }
        })
    }

})