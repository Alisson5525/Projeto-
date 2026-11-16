import {
    system,
    world
} from "@minecraft/server";

function destroyiftag(block) {
    if (block.hasTag("mm:requires_block_below")) {
        system.run(() => {
            if (block.below().isAir == false) return;
            block.dimension.runCommand(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air destroy`)
            destroyiftag(block.above())
        })
    } else if (block.hasTag("mm:requires_block_above")) {
        system.run(() => {
            if (block.above().isAir == false) return;
            block.dimension.runCommand(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air destroy`)
            destroyiftag(block.below())
        })
    }
}

world.beforeEvents.playerBreakBlock.subscribe((e) => {
    const block = e.block;
    destroyiftag(block.above())
    destroyiftag(block.below())
})