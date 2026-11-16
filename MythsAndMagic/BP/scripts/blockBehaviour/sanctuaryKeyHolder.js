import {
    world,
    system,
    ItemStack,
    BlockVolume
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:sanctuary_key_holder", {
        onTick(e) {
            const block = e.block;
            const cent = block.center()
            const loc = { x: cent.x, y: block.y, z: cent.z }
            e.dimension.spawnParticle("mm:sanctuary_vault_passive", loc)
        },
        onPlayerInteract(e) {
            const { block, player, dimension } = e;

            const perm = block.permutation;
            const interactions = perm.getState("mm:interactions");
            var locked = perm.getState("mm:locked");
            if (interactions == 0 && locked == true) {
                const statues = dimension.getEntities({ type: "mm:sacred_statue", closest: 2, maxDistance: 64, location: block.location })
                if (statues.length > 0) {
                    block.setPermutation(block.permutation.withState('mm:interactions', 1));
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.playSound("block.key_holder.attempt_grab", block.location)
                    //player.sendMessage({ translate: "sanctuary_key.awaken_statues" })
                    for (const statue of statues) {
                        statue.triggerEvent("mm:wake_up")
                    }
                } else {
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                    dimension.playSound("block.key_holder.grab", block.location)
                    const key = new ItemStack("mm:sanctuary_key", 1)
                    player.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                    dimension.spawnItem(key, block.center())
                    //player.sendMessage({ translate: "sanctuary_key.claimed_key" })
                    const location = block.location;
                    const dim = dimension;
                    var corner1 = { x: location.x - 8, y: location.y, z: location.z - 8 }
                    var corner2 = { x: location.x + 8, y: location.y + 8, z: location.z + 8 }
                    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
                    for (const blockLoc of volume.getBlockLocationIterator()) {
                        let nblock = dim.getBlock(blockLoc)
                        if (nblock.typeId === "mm:dormant_sanctuary_keeper") {
                            system.runTimeout(() => {
                                foundMask(nblock.location, dimension)
                            }, 20)
                        }
                    }
                }
            }
            if (interactions == 1 && locked == true) {
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.playSound("block.key_holder.fail_grab", block.location)
                //player.sendMessage({ translate: "sanctuary_key.kill_statues" })
                const statues = dimension.getEntities({ maxDistance: 64, location: block.location, type: "mm:sacred_statue" })
                if (statues.length == 0) {
                    block.setPermutation(block.permutation.withState('mm:locked', false));
                    locked = false
                }

            }
            if (locked == false) {
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
                dimension.playSound("block.key_holder.grab", block.location)
                const key = new ItemStack("mm:sanctuary_key", 1)
                player.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                dimension.spawnItem(key, block.center())
                //player.sendMessage({ translate: "sanctuary_key.claimed_key" })
                const location = block.location;
                const dim = dimension;
                var corner1 = { x: location.x - 8, y: location.y, z: location.z - 8 }
                var corner2 = { x: location.x + 8, y: location.y + 8, z: location.z + 8 }
                var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
                for (const blockLoc of volume.getBlockLocationIterator()) {
                    let nblock = dim.getBlock(blockLoc)
                    if (nblock.typeId === "mm:dormant_sanctuary_keeper") {
                        system.runTimeout(() => {
                            foundMask(nblock.location, dimension)
                        }, 20)
                    }
                }
            }
        }
    });
})

world.afterEvents.entityDie.subscribe((e) => {
    const { deadEntity } = e;
    if (!deadEntity) return;
    if (!deadEntity.isValid) return;
    if (deadEntity.typeId == "mm:sacred_statue") {
        const dimension = deadEntity.dimension
        const statues = dimension.getEntities({ type: "mm:sacred_statue", maxDistance: 64, location: deadEntity.location })
        for (const statue of statues) {
            if (statue !== deadEntity) statue.addTag("mm:second_statue")
        }
        system.runTimeout(() => {
            if (deadEntity.hasTag("mm:second_statue")) {
                updateKeys(deadEntity.location, deadEntity.dimension)
            }
        }, 9)
    }
})

function foundMask(block, dimension) {
    dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
    dimension.runCommand(`summon mm:sanctuary_keeper ${block.x} ${block.y} ${block.z} facing @p`)
    dimension.playSound("mob.sanctuary_keeper.spawn", block)
}

function foundKey(block, dimension) {
    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
    dimension.spawnParticle("mm:sanctuary_vault_passive", block.center())
    block.setPermutation(block.permutation.withState('mm:locked', false));
    dimension.playSound("block.key_holder.grab", block.location, { pitch: 2 })
}

function updateKeys(location, dim) {
    var corner1 = { x: location.x - 32, y: location.y - 8, z: location.z - 32 }
    var corner2 = { x: location.x + 32, y: location.y + 8, z: location.z + 32 }
    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:sanctuary_key_holder") {
            foundKey(block, dim)
            return;
        }
    }
    corner1 = { x: location.x - 65, y: location.y - 8, z: location.z - 65 }
    corner2 = { x: location.x + 65, y: location.y + 8, z: location.z + 65 }
    volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:sanctuary_key_holder") {
            foundKey(block, dim)
            return;
        }
    }

}