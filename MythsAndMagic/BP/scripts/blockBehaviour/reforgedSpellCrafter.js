import { world, system, ItemStack } from '@minecraft/server';

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:reforged_spellcrafter", {
        onTick(e) {
            const block = e.block;
            const perm = block.permutation;
            var newPerm = perm
            const dim = block.dimension;
            const inUse = perm.getState("mm:in_use")
            const power = perm.getState("mm:power")
            if (power == 1 || inUse == true) return;
            const above = block.above()
            const east = block.east()
            const west = block.west()
            const north = block.north()
            const south = block.south()
            if (above && above.typeId == "minecraft:hopper" && above.permutation.getState("facing_direction") == 0 && above.permutation.getState("toggle_bit") == false) {
                const inventory = above.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:power", 1)
                        block.setPermutation(newPerm)
                        dim.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        dim.playSound("block.spellcrafter.fail", block.center(), { volume: 1, pitch: 2 })
                        return;
                    }
                }
            } else if (east && east.typeId == "minecraft:hopper" && east.permutation.getState("facing_direction") == 4 && east.permutation.getState("toggle_bit") == false) {
                const inventory = east.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:power", 1)
                        block.setPermutation(newPerm)
                        dim.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        dim.playSound("block.spellcrafter.fail", block.center(), { volume: 1, pitch: 2 })
                        return;
                    }
                }
            } else if (west && west.typeId == "minecraft:hopper" && west.permutation.getState("facing_direction") == 5 && west.permutation.getState("toggle_bit") == false) {
                const inventory = west.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:power", 1)
                        block.setPermutation(newPerm)
                        dim.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        dim.playSound("block.spellcrafter.fail", block.center(), { volume: 1, pitch: 2 })
                        return;
                    }
                }
            } else if (south && south.typeId == "minecraft:hopper" && south.permutation.getState("facing_direction") == 2 && south.permutation.getState("toggle_bit") == false) {
                const inventory = south.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:power", 1)
                        block.setPermutation(newPerm)
                        dim.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        dim.playSound("block.spellcrafter.fail", block.center(), { volume: 1, pitch: 2 })
                        return;
                    }
                }
            } else if (north && north.typeId == "minecraft:hopper" && north.permutation.getState("facing_direction") == 3 && north.permutation.getState("toggle_bit") == false) {
                const inventory = north.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:power", 1)
                        block.setPermutation(newPerm)
                        dim.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        dim.playSound("block.spellcrafter.fail", block.center(), { volume: 1, pitch: 2 })
                        return;
                    }
                }
            }
        }
    });
});