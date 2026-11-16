import {
    world,
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:permafrost_icicle", {
        beforeOnPlayerPlace(e) {
            const block = e.block;
            const above = block.above()
            const below = block.below()
            const face = e.permutationToPlace.getState('minecraft:block_face');
            if (face !== "up" && face !== "down") {
                e.cancel = true;
            }
            if ((face == "down" && (above.isAir || above.isLiquid)) || (face == "up" && (below.isAir || below.isLiquid))) {

                e.cancel = true;
            }
        },
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            if (dim.isChunkLoaded(block.location) == false) return;
            const perm = block.permutation;
            const above = block.above()
            const below = block.below()
            if (perm.getState("mm:tip") == undefined) return;
            if (perm.getState("minecraft:block_face") == undefined) return;
            const tip = perm.getState("mm:tip");
            const face = perm.getState("minecraft:block_face")
            if (face !== "up" && face !== "down") {
                const newPermutation = perm.withState("minecraft:block_face", "up");
                block.setPermutation(newPermutation)
            }
            if ((face == "down" && (above.isAir || above.isLiquid)) || (face == "up" && (below.isAir || below.isLiquid))) {
                dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                return;
            }
            if (tip == true && face == "up") {
                if ((above.typeId == block.typeId && above.permutation.getState("minecraft:block_face") == face)) {
                    const newPermutation = perm.withState("mm:tip", false);
                    block.setPermutation(newPermutation)
                    return;
                }
            }
            if (tip == true && face == "down") {
                if ((below.typeId == block.typeId && below.permutation.getState("minecraft:block_face") == face)) {
                    const newPermutation = perm.withState("mm:tip", false);
                    block.setPermutation(newPermutation)
                    return;
                }
            }
            if (tip == false && face == "up") {
                if ((above.typeId !== block.typeId || above.permutation.getState("minecraft:block_face") !== face)) {
                    const newPermutation = perm.withState("mm:tip", true);
                    block.setPermutation(newPermutation)
                    return;
                }
            }
            if (tip == false && face == "down") {
                if ((below.typeId !== block.typeId || below.permutation.getState("minecraft:block_face") !== face)) {
                    const newPermutation = perm.withState("mm:tip", true);
                    block.setPermutation(newPermutation)
                    return;
                }
            }
        }
    })
})