
import { world, system } from '@minecraft/server';


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:scrubel_treasure_pile", {
        beforeOnPlayerPlace(e) {
            const permtoplace = e.permutationToPlace
            e.permutationToPlace = permtoplace.withState("mm:player_placed", true)
        },
        onPlayerBreak(e) {
            const { block } = e;
            const dim = e.dimension;
            const perm = e.brokenBlockPermutation;
            if (perm.getState("mm:player_placed") == false) {
                const player = e.player
                if (player.getGameMode() !== "Survival") return;
                dim.spawnEntity("xp_orb", block.center())
                dim.spawnEntity("xp_orb", block.center())
                const rand = Math.random()
                const LootTableManager = world.getLootTableManager()
                if (rand > 0.9) {
                    const loot = LootTableManager.getLootTable("blocks/scrubel_treasure")
                    const lootDrop = LootTableManager.generateLootFromTable(loot)
                    for (const itemDrop of lootDrop) {
                        dim.spawnItem(itemDrop, block.center())
                    }
                } else {
                    const loot = LootTableManager.getLootTable("blocks/scrubel_generic")
                    const lootDrop = LootTableManager.generateLootFromTable(loot)
                    for (const itemDrop of lootDrop) {
                        dim.spawnItem(itemDrop, block.center())
                    }
                }

            }
        },
        onTick(e) {
            const { block } = e;
            const dim = e.dimension;
            const entityCheck = dim.getEntitiesAtBlockLocation(block.location)
            for (const entity of entityCheck) {
                if (entity.typeId == "mm:scrubel_treasure_pile") return;
            }
            block.dimension.spawnEntity("mm:scrubel_treasure_pile", block.bottomCenter())
        }
    });
});

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:kill") return;
    const entity = e.entity;
    if (entity.typeId !== "mm:scrubel_treasure_pile") return;
    if (!entity.isValid) return;
    entity.kill()
    system.runTimeout(() => {
        entity.remove()
    }, 1)
})