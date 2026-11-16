
import { world, system, EntityDamageCause } from '@minecraft/server';

const blockId = "mm:fallen_meteor"

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent(blockId, {
        beforeOnPlayerPlace(e) {
            const permutationtoPlace = e.permutationToPlace;
            e.permutationToPlace = permutationtoPlace.withState("mm:player_placed", true)

        },
        onTick(e) {
            const { block } = e;
            if (block.typeId !== blockId) return;
            const dim = e.dimension;
            const perm = block.permutation;
            if (perm.getState("mm:player_placed")) return;
            const state = perm.getState("mm:destruction_state")
            if (state < 3) {
                block.setPermutation(perm.withState("mm:destruction_state", state + 1))
            } else {
                dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
            }
        },
        onPlayerBreak(e) {
            const player = e.player;
            const blockLoc = e.block.location;
            const broken = e.brokenBlockPermutation.type.id
            const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
            if (!held) return;
            var level = 0
            const enchant = held.getComponent("minecraft:enchantable")
            if (enchant) {
                if (enchant.getEnchantment("silk_touch")) return;
                const fortune = enchant.getEnchantment("fortune")
                if (fortune) level = fortune.level
            }
            if (!held.typeId.includes("pickaxe")) return;

            if (player.getGameMode() == "Creative") return;
            var lootId = "fallen_meteor"
            player.runCommand(`loot spawn ${blockLoc.x} ${blockLoc.y} ${blockLoc.z} loot "blocks/fallen_meteor"`)
            for (let i = 0; i < level; i++) {
                let rand = Math.random()
                if (rand < 0.5 || i == 0) {
                    player.runCommand(`loot spawn ${blockLoc.x} ${blockLoc.y} ${blockLoc.z} loot "blocks/${lootId}_fortune"`)
                }
            }
        }
    });
});