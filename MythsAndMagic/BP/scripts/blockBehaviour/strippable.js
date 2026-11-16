

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:strippable", {})
})

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const player = e.player;
    const item = e.itemStack;
    if (!item) return;
    if (!item.hasTag("minecraft:is_axe")) return;
    const block = e.block;
    if (!block) return;
    const dim = block.dimension
    if (block.getComponent("mm:strippable")) {
        if (block.typeId.includes("stripped")) return;
        if (player.getDynamicProperty("mm:interact_cooldown") > 0) return
        player.setDynamicProperty("mm:interact_cooldown", 2)
        system.run(() => {
            try {
                dim.playSound("use.wood", block.center(), { pitch: 0.8 })
                const oldPerm = block.permutation
                block.setType(block.typeId.replace("mm:", "mm:stripped_"))
                block.setPermutation(block.permutation.withState('minecraft:block_face', oldPerm.getState("minecraft:block_face")))
                //reduce dura
                if (player.getGameMode() !== "Creative") {
                    const equipment = player.getComponent("equippable")
                    const durability = item.getComponent("durability")
                    const duraDamage = 1
                    for (let i = 0; i < duraDamage; i++) {
                        var chance = 1
                        const unbreaking = item.getComponent("enchantable").getEnchantment("unbreaking")
                        if (unbreaking) {
                            chance = 1 / (unbreaking.level + 1)
                        }
                        if (Math.random() <= chance) {
                            if (durability.damage + 1 < durability.maxDurability) {
                                durability.damage += 1;
                                equipment.setEquipment("Mainhand", item)
                            } else {
                                equipment.setEquipment("Mainhand", undefined)
                                player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 1 })

                            }
                        }
                    }
                }
            } catch (e) {
            }
        })
    }

})