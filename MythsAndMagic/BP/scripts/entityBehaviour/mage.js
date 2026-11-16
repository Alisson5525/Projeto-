import {
    world,
    system,
    BlockVolume
} from "@minecraft/server";

function getSpellCrafters(dim, loc) {
    const spellCraftersFound = []
    var corner1 = { x: loc.x - 16, y: loc.y + 8, z: loc.z - 16 }
    var corner2 = { x: loc.x + 16, y: loc.y - 8, z: loc.z + 16 }
    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:spellcrafter") {
            const perm = block.permutation
            const power = perm.getState("mm:power")
            if (power == 0) {
                spellCraftersFound.push(block)
            }
        }
    }
    if (spellCraftersFound.length > 0) return spellCraftersFound;
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:spellcrafter") {
            const perm = block.permutation
            const power = perm.getState("mm:power")
            if (power == 1) {
                spellCraftersFound.push(block)
            }
        }
    }
    if (spellCraftersFound.length > 0) return spellCraftersFound;
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:spellcrafter") {
            const perm = block.permutation
            const power = perm.getState("mm:power")
            if (power == 2) {
                spellCraftersFound.push(block)
            }
        }
    }
    if (spellCraftersFound.length > 0) return spellCraftersFound;
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "mm:spellcrafter") {
            const perm = block.permutation
            const power = perm.getState("mm:power")
            if (power == 3) {
                spellCraftersFound.push(block)
            }
        }
    }
    return spellCraftersFound;
}

function findNearest(list, loc) {
    var closestBlock = undefined
    var closestDist = 26
    for (const block of list) {
        const dist = Math.hypot(loc.x - block.x, loc.y - block.y, loc.z - block.z)
        if (dist < closestDist) {
            closestDist = dist
            closestBlock = block
        }
    }
    return closestBlock
}

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:use_crystal") return;
    const entity = e.entity;
    if (entity.typeId !== "mm:mage") return;
    const dim = entity.dimension;
    entity.playAnimation("animation.mage.use_crystal")
    const loc = entity.location;
    system.runTimeout(() => {
        dim.spawnParticle("mm:mage_crystal_small", loc)
    }, 15)
    system.runTimeout(() => {
        dim.spawnParticle("mm:mage_crystal_big", loc)
    }, 30)
    system.runTimeout(() => {
        const spellCrafters = getSpellCrafters(dim, loc)
        if (spellCrafters.length == 0) {
            system.runTimeout(() => {
                entity.triggerEvent("mm:refuse_item")
            }, 27)
        } else {
            const nearestSpellCrafter = findNearest(spellCrafters, loc)
            if (nearestSpellCrafter == undefined) {
                system.runTimeout(() => {
                    entity.triggerEvent("mm:refuse_item")
                }, 27)
            } else {
                if (nearestSpellCrafter.typeId == "mm:spellcrafter") {
                    dim.spawnParticle("mm:mage_spellcrafter_fuel", nearestSpellCrafter.center())
                    dim.playSound("block.spellcrafter.fail", nearestSpellCrafter.location, { volume: 1, pitch: 2 })
                    const perm = nearestSpellCrafter.permutation
                    const newPerm = perm.withState("mm:power", 4);
                    nearestSpellCrafter.setPermutation(newPerm)
                }
            }
        }
    }, 60)
})


world.afterEvents.playerBreakBlock.subscribe((event) => {
    const block = event.brokenBlockPermutation;
    if (block.type.id === "mm:spellcrafter") {

        if (world.getDifficulty() === "Peaceful") return;
        event.player.runCommand("damage @e[type=mm:mage,r=24] 0 none entity @s")
        event.player.runCommand("/event entity @e[r=24,type=mm:mage] mm:spellcrafter_broken")
    }
});

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:mage_release_the_gang") return;
    const entity = e.entity
    if (entity.typeId !== "mm:mage") return;
    const dim = entity.dimension;
    const bookshelves = []
    const loc = entity.location;
    const booksAlready = dim.getEntities({ location: loc, maxDistance: 32, type: "mm:spell_book" })
    if (booksAlready.length > 4) return;
    var corner1 = { x: loc.x - 16, y: loc.y + 8, z: loc.z - 16 }
    var corner2 = { x: loc.x + 16, y: loc.y - 8, z: loc.z + 16 }
    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
    for (const blockLoc of volume.getBlockLocationIterator()) {
        let block = dim.getBlock(blockLoc)
        if (block.typeId === "minecraft:bookshelf" || block.typeId == "minecraft:chiseled_bookshelf") {
            bookshelves.push(block)
        }
    }
    if (bookshelves.length == 0) {
        const rand = Math.random()
        if (rand < 0.6) return;
        const book = dim.spawnEntity("mm:spell_book", { x: loc.x, y: loc.y + 2, z: loc.z })
    } else {
        var spawnCount = 3
        if (bookshelves.length < spawnCount) spawnCount == bookshelves.length
        for (let i = 0; i < spawnCount; i++) {
            const rand = Math.floor(Math.random() * bookshelves.length)
            const bookshelf = bookshelves[rand]
            bookshelf.setType("minecraft:chiseled_bookshelf")
            dim.runCommand(`fill ${bookshelf.x} ${bookshelf.y} ${bookshelf.z} ${bookshelf.x} ${bookshelf.y} ${bookshelf.z} air destroy`)
            const book = dim.spawnEntity("mm:spell_book", { x: bookshelf.x, y: bookshelf.y + 2, z: bookshelf.z })
        }
    }
});