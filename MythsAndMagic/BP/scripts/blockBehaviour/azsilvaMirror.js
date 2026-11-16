
import { world, system, ItemStack } from '@minecraft/server';

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:azsilva_mirror", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const loc = block.location;
            const dim = e.dimension;
            const newPower = e.powerLevel;

            const perm = block.permutation
            if (newPower > 0) {
                if (perm.getState("mm:prevent_player_interaction")) {
                    const pit = 0.9 + (Math.random() * 0.2)
                    dim.playSound("block.azsilva_mirror.locked", loc, { volume: 1, pitch: pit })
                    return;
                }
                var newPerm = perm
                const dir = perm.getState("minecraft:cardinal_direction")
                if (dir == "south") newPerm = perm.withState("minecraft:cardinal_direction", "west")
                if (dir == "west") newPerm = perm.withState("minecraft:cardinal_direction", "north")
                if (dir == "north") newPerm = perm.withState("minecraft:cardinal_direction", "east")
                if (dir == "east") newPerm = perm.withState("minecraft:cardinal_direction", "south")
                block.setPermutation(newPerm)
                const pit = 0.9 + (Math.random() * 0.2)
                dim.playSound("block.azsilva_mirror.rotate_redstone", loc, { volume: 0.5, pitch: pit })

            }
        },
        onPlayerInteract(e) {
            const block = e.block;
            const player = e.player;
            const equipment = player.getComponent("minecraft:equippable")
            let playerHeld = equipment.getEquipment("Mainhand")
            const perm = block.permutation;
            const dim = block.dimension;
            const loc = block.location;

            if (perm.getState("mm:prevent_player_interaction") == true && player.getGameMode() !== "Creative") {
                const pit = 0.8 + (Math.random() * 0.4)
                dim.playSound("vault.close_shutter", loc, { volume: 1, pitch: pit })
                return;
            }
            if (perm.getState("mm:locked") == true) {
                if (playerHeld && playerHeld.typeId == "minecraft:shears") {
                    if (player.getGameMode() !== "Creative") {
                        const durability = playerHeld.getComponent("minecraft:durability")
                        if (!durability) return;
                        if (durability.damage + 1 < durability.maxDurability) {
                            durability.damage += 1;
                            equipment.setEquipment("Mainhand", playerHeld)
                        } else {
                            equipment.setEquipment("Mainhand", undefined)
                            player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 1 })

                        }
                    }
                    const newPerm = perm.withState("mm:locked", false);
                    const chain = new ItemStack("minecraft:iron_chain", 1)
                    dim.spawnItem(chain, block.center())
                    const pit = 0.9 + (Math.random() * 0.2)
                    dim.playSound("block.azsilva_mirror.unlock", loc, { volume: 1, pitch: pit })
                    block.setPermutation(newPerm)
                } else {
                    const pit = 0.9 + (Math.random() * 0.2)
                    dim.playSound("block.azsilva_mirror.locked", loc, { volume: 1, pitch: pit })
                    return;
                }
            }
            if (perm.getState("mm:locked") == false) {
                if (playerHeld && playerHeld.typeId == "minecraft:iron_chain") {
                    if (player.getGameMode() !== "Creative") {
                        if (playerHeld.amount - 1 === 0) {
                            equipment.setEquipment('Mainhand', undefined);
                        } else {
                            playerHeld.amount -= 1;
                            equipment.setEquipment('Mainhand', playerHeld);
                        }
                    }
                    const newPerm = perm.withState("mm:locked", true);
                    const pit = 0.9 + (Math.random() * 0.2)
                    dim.playSound("block.azsilva_mirror.lock", loc, { volume: 1, pitch: pit })
                    block.setPermutation(newPerm)
                    return;
                } else {
                    var newPerm = perm
                    const dir = perm.getState("minecraft:cardinal_direction")
                    if (!player.isSneaking) {
                        if (dir == "south") newPerm = perm.withState("minecraft:cardinal_direction", "west")
                        if (dir == "west") newPerm = perm.withState("minecraft:cardinal_direction", "north")
                        if (dir == "north") newPerm = perm.withState("minecraft:cardinal_direction", "east")
                        if (dir == "east") newPerm = perm.withState("minecraft:cardinal_direction", "south")
                    } else {
                        if (dir == "south") newPerm = perm.withState("minecraft:cardinal_direction", "east")
                        if (dir == "west") newPerm = perm.withState("minecraft:cardinal_direction", "south")
                        if (dir == "north") newPerm = perm.withState("minecraft:cardinal_direction", "west")
                        if (dir == "east") newPerm = perm.withState("minecraft:cardinal_direction", "north")

                    }
                    block.setPermutation(newPerm)
                    var pit = 0.9 + (Math.random() * 0.2)
                    if (player.isSneaking) pit -= 0.4
                    dim.playSound("block.azsilva_mirror.rotate", loc, { volume: 1, pitch: pit })

                }
            }
        }
    });
});