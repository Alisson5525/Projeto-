

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

const vanillaDoors = [
    "minecraft:door",
    "minecraft:oak_door",
    "minecraft:birch_door",
    "minecraft:spruce_door",
    "minecraft:jungle_door",
    "minecraft:acacia_door",
    "minecraft:dark_oak_door",
    "minecraft:bamboo_door",
    "minecraft:mangrove_door",
    "minecraft:warped_door",
    "minecraft:crimson_door",
    "minecraft:cherry_door",
    "minecraft:poplar_door",
    "minecraft:pale_oak_door"
]

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:door", {
        beforeOnPlayerPlace(e) {
            const block = e.block;
            const dim = e.dimension;
            const perm = e.permutationToPlace
            const dir = perm.getState("minecraft:cardinal_direction")
            var checkBlock = undefined
            if (dir == "east") checkBlock = block.south()
            if (dir == "west") checkBlock = block.north()
            if (dir == "south") checkBlock = block.west()
            if (dir == "north") checkBlock = block.east()
            if (checkBlock) {
                if (checkBlock.getComponent("mm:door") || vanillaDoors.includes(checkBlock.typeId)) {
                    e.permutationToPlace = perm.withState("mm:mirror", true)
                }
            }

        },
        onRedstoneUpdate(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;
            const oldPower = e.previousPowerLevel;
            if (oldPower == newPower) return;
            const params = p.params
            const openSound = params.open_sound
            const closeSound = params.close_sound
            const perm = block.permutation
            const open = perm.getState("mm:open")
            const half = perm.getState("minecraft:multi_block_part")
            var otherBlock = undefined
            if (half == 0) otherBlock = block.above()
            if (half == 1) otherBlock = block.below()
            const otherPerm = otherBlock.permutation;

            if (open == false && newPower > 0) {
                if (openSound) dim.playSound(openSound, block.location)
                const newPerm = perm.withState("mm:open", true);
                block.setPermutation(newPerm)
                otherBlock.setPermutation(otherPerm.withState("mm:open", true))
            }
            if (open == true && newPower == 0) {
                if (closeSound) dim.playSound(closeSound, block.location)
                const newPerm = perm.withState("mm:open", false);
                block.setPermutation(newPerm)
                otherBlock.setPermutation(otherPerm.withState("mm:open", false))
            }
        },
        onPlayerInteract(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const params = p.params
            const openSound = params.open_sound
            const closeSound = params.close_sound
            const perm = block.permutation
            const open = perm.getState("mm:open")

            const half = perm.getState("minecraft:multi_block_part")
            var otherBlock = undefined
            if (half == 0) otherBlock = block.above()
            if (half == 1) otherBlock = block.below()
            const otherPerm = otherBlock.permutation;
            if (open == false) {
                if (openSound) dim.playSound(openSound, block.location)
                const newPerm = perm.withState("mm:open", true);
                block.setPermutation(newPerm)
                otherBlock.setPermutation(otherPerm.withState("mm:open", true))
            }
            if (open == true) {
                if (closeSound) dim.playSound(closeSound, block.location)
                const newPerm = perm.withState("mm:open", false);
                block.setPermutation(newPerm)
                otherBlock.setPermutation(otherPerm.withState("mm:open", false))
            }
        }
    })
})

