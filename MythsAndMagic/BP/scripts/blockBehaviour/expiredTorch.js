
import { system, world, MolangVariableMap } from '@minecraft/server';

import { unplaceables } from "./sparklingTorch.js";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:expired_torch", {
        onPlayerInteract(e) {
            const block = e.block
            const dim = e.dimension
            const perm = block.permutation
            const player = e.player
            const equipment = player.getComponent("minecraft:equippable")

            let playerHeld = equipment.getEquipment("Mainhand")
            if (!playerHeld) return;
            var pass = false
            if (playerHeld.typeId == "minecraft:flint_and_steel") {
                pass = true
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
            } else if (playerHeld.typeId == "minecraft:fire_charge") {
                pass = true
                if (player.getGameMode() !== "Creative") {
                    if (playerHeld.amount - 1 > 0) {
                        playerHeld.amount -= 1;
                        equipment.setEquipment("Mainhand", playerHeld)
                    } else {
                        equipment.setEquipment("Mainhand", undefined)

                    }
                }
                dim.playSound("mob.ghast.fireball", block.location, { volume: 1, pitch: 1 })
            }

            if (pass == false) return;
            dim.playSound("fire.ignite", block.location, { volume: 1, pitch: 1 })
            const face = perm.getState("minecraft:block_face")
            const setType = perm.getState("mm:former_id")
            if (setType.includes("mm:")) {
                block.setType(setType)
                block.setPermutation(block.permutation.withState("minecraft:block_face", face))
            } else {
                block.setType(setType)
                var setId = ""
                if (face == "up") setId = "top"
                if (face == "north") setId = "south"
                if (face == "east") setId = "west"
                if (face == "south") setId = "north"
                if (face == "west") setId = "east"
                block.setPermutation(block.permutation.withState("torch_facing_direction", setId))

            }

        },
        beforeOnPlayerPlace(e) {
            const block = e.block;
            const blockFace = e.permutationToPlace.getState('minecraft:block_face');
            if (blockFace == "up" && unplaceables.includes(block.below().typeId)) {
                e.cancel = true;
            }
            if (blockFace == "north" && unplaceables.includes(block.south().typeId)) {
                e.cancel = true;
            }
            if (blockFace == "east" && unplaceables.includes(block.west().typeId)) {
                e.cancel = true;
            }
            if (blockFace == "south" && unplaceables.includes(block.north().typeId)) {
                e.cancel = true;
            }
            if (blockFace == "west" && unplaceables.includes(block.east().typeId)) {
                e.cancel = true;
            }
        },
        onTick(e) {
            const { block } = e;
            const dim = e.dimension;
            if (!block) return;
            if (!dim.isChunkLoaded(block.location)) return;
            if (block.typeId === "mm:expired_torch") {
                const blockFace = block.permutation.getState('minecraft:block_face');
                if (block.below() && blockFace == "up" && unplaceables.includes(block.below().typeId)) {
                    dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                }
                if (block.south() && blockFace == "north" && unplaceables.includes(block.south().typeId)) {
                    dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                }
                if (block.west() && blockFace == "east" && unplaceables.includes(block.west().typeId)) {
                    dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                }
                if (block.north() && blockFace == "south" && unplaceables.includes(block.north().typeId)) {
                    dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                }
                if (block.east() && blockFace == "west" && unplaceables.includes(block.east().typeId)) {
                    dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
                }
                const rand = Math.random()
                if (rand > 0.2) return;
                const particlePositions = {
                    north: [0.5, 0.9, 0.75],
                    south: [0.5, 0.9, 0.25],
                    east: [0.25, 0.9, 0.5],
                    west: [0.75, 0.9, 0.5],
                    up: [0.5, 0.7, 0.5]
                };
                const position = particlePositions[blockFace];
                if (position) {
                    const [offsetX, offsetY, offsetZ] = position;
                    const { x, y, z } = block;
                    const particleX = x + offsetX;
                    const particleY = y + offsetY;
                    const particleZ = z + offsetZ;
                    const molangVariables = new MolangVariableMap();

                    block.dimension.spawnParticle('minecraft:basic_smoke_particle', { x: particleX, y: particleY, z: particleZ }, molangVariables);

                }
            }
        }
    });
});