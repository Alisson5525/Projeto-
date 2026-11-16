
import { world, system, ItemStack } from '@minecraft/server';

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:ballista", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;

            const perm = block.permutation
            if (newPower > 0 && perm.getState("mm:loaded") == true) {
                const half = perm.getState("minecraft:multi_block_part")
                var baseBlock = undefined
                var bowBlock = undefined
                if (half == 0) bowBlock = block.above()
                if (half == 1) bowBlock = block
                if (half == 0) baseBlock = block
                if (half == 1) baseBlock = block.below()
                const bowPerm = bowBlock.permutation;
                const basePerm = baseBlock.permutation;
                const rot = bowPerm.getState("mm:rotation")
                var shootVector = undefined
                var spawnPos = undefined
                const bowCenter = bowBlock.center()
                if (rot == 0) shootVector = { x: 0, y: 0, z: 1 }
                if (rot == 1) shootVector = { x: -0.25, y: 0, z: 0.75 }
                if (rot == 2) shootVector = { x: -0.5, y: 0, z: 0.5 }
                if (rot == 3) shootVector = { x: -0.75, y: 0, z: 0.25 }
                if (rot == 4) shootVector = { x: -1, y: 0, z: 0 }
                if (rot == 5) shootVector = { x: -0.75, y: 0, z: -0.25 }
                if (rot == 6) shootVector = { x: -0.5, y: 0, z: -0.5 }
                if (rot == 7) shootVector = { x: -0.25, y: 0, z: -0.75 }
                if (rot == 8) shootVector = { x: 0, y: 0, z: -1 }
                if (rot == 9) shootVector = { x: 0.25, y: 0, z: -0.75 }
                if (rot == 10) shootVector = { x: 0.5, y: 0, z: -0.5 }
                if (rot == 11) shootVector = { x: 0.75, y: 0, z: -0.25 }
                if (rot == 12) shootVector = { x: 1, y: 0, z: 0 }
                if (rot == 13) shootVector = { x: 0.75, y: 0, z: 0.25 }
                if (rot == 14) shootVector = { x: 0.5, y: 0, z: 0.5 }
                if (rot == 15) shootVector = { x: 0.25, y: 0, z: 0.75 }

                spawnPos = { x: bowCenter.x + shootVector.x, y: bowCenter.y + 0.1, z: bowCenter.z + shootVector.z }
                const spawnBlock = dim.getBlock(spawnPos)
                if (spawnBlock.isAir == false && spawnBlock.isLiquid == false && !spawnBlock.typeId == "mm:ballista") return;
                const projectile = dim.spawnEntity("minecraft:arrow", spawnPos)
                const projComp = projectile.getComponent("projectile")
                projectile.addTag("mm:ballista_arrow")
                projComp.shoot({ x: shootVector.x * 3.5, y: 0, z: shootVector.z * 3.5 })
                projectile.nameTag = "Ballista"
                projComp.gravity = 0;
                projComp.airInertia = 1
                projComp.liquidInertia = 1
                system.runTimeout(() => {
                    if (projComp.isValid && projectile.isValid) {
                        projComp.gravity = 0.05;
                        projComp.airInertia = 0.99
                        projComp.liquidInertia = 0.6
                    }
                }, 120)
                bowBlock.setPermutation(bowPerm.withState("mm:loaded", false))
                baseBlock.setPermutation(basePerm.withState("mm:loaded", false))
                dim.playSound("block.ballista.fire", bowBlock.center())
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

            var newPerm = perm
            const dir = perm.getState("minecraft:cardinal_direction")
            const rot = perm.getState("mm:rotation")
            const half = perm.getState("minecraft:multi_block_part")
            var otherBlock = undefined
            if (half == 0) otherBlock = block.above()
            if (half == 1) otherBlock = block.below()
            const otherPerm = otherBlock.permutation;
            var otherBlockNewPerm = otherPerm;
            if (perm.getState("mm:loaded") == false) {
                if (playerHeld) {
                    if (playerHeld.typeId == "minecraft:arrow") {
                        if (player.getGameMode() !== "Creative") {
                            if (playerHeld.amount - 1 === 0) {
                                equipment.setEquipment('Mainhand', undefined);
                            } else {
                                playerHeld.amount -= 1;
                                equipment.setEquipment('Mainhand', playerHeld);
                            }
                        }
                        newPerm = perm.withState("mm:loaded", true)
                        otherBlockNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherBlockNewPerm)
                        dim.playSound("block.ballista.load", block.center())
                        return;
                    }
                } else {
                    let offHand = equipment.getEquipment("Offhand")
                    if (offHand && offHand.typeId == "minecraft:arrow") {
                        if (player.getGameMode() !== "Creative") {
                            if (offHand.amount - 1 === 0) {
                                equipment.setEquipment('Offhand', undefined);
                            } else {
                                offHand.amount -= 1;
                                equipment.setEquipment('Offhand', offHand);
                            }
                        }
                        newPerm = perm.withState("mm:loaded", true)
                        otherBlockNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherBlockNewPerm)
                        dim.playSound("block.ballista.load", block.center())
                        return;
                    }
                }
            }
            if (player.isSneaking == false) {
                if (rot < 15) {
                    newPerm = newPerm.withState("mm:rotation", rot + 1)
                    otherBlockNewPerm = otherBlockNewPerm.withState("mm:rotation", rot + 1)
                } else {
                    newPerm = newPerm.withState("mm:rotation", 0)
                    otherBlockNewPerm = otherBlockNewPerm.withState("mm:rotation", 0)
                }
                if (rot == 3 || rot == 7 || rot == 11 || rot == 15) {
                    if (dir == "south") newPerm = newPerm.withState("minecraft:cardinal_direction", "west")
                    if (dir == "west") newPerm = newPerm.withState("minecraft:cardinal_direction", "north")
                    if (dir == "north") newPerm = newPerm.withState("minecraft:cardinal_direction", "east")
                    if (dir == "east") newPerm = newPerm.withState("minecraft:cardinal_direction", "south")
                    if (dir == "south") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "west")
                    if (dir == "west") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "north")
                    if (dir == "north") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "east")
                    if (dir == "east") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "south")
                }
            } else {
                if (rot > 0) {
                    newPerm = newPerm.withState("mm:rotation", rot - 1)
                    otherBlockNewPerm = otherBlockNewPerm.withState("mm:rotation", rot - 1)
                } else {
                    newPerm = newPerm.withState("mm:rotation", 15)
                    otherBlockNewPerm = otherBlockNewPerm.withState("mm:rotation", 15)
                }
                if (rot == 0 || rot == 4 || rot == 8 || rot == 12) {
                    if (dir == "south") newPerm = newPerm.withState("minecraft:cardinal_direction", "east")
                    if (dir == "west") newPerm = newPerm.withState("minecraft:cardinal_direction", "south")
                    if (dir == "north") newPerm = newPerm.withState("minecraft:cardinal_direction", "west")
                    if (dir == "east") newPerm = newPerm.withState("minecraft:cardinal_direction", "north")
                    if (dir == "south") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "east")
                    if (dir == "west") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "south")
                    if (dir == "north") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "west")
                    if (dir == "east") otherBlockNewPerm = otherBlockNewPerm.withState("minecraft:cardinal_direction", "north")
                }
            }
            block.setPermutation(newPerm)
            otherBlock.setPermutation(otherBlockNewPerm)
            var pit = 0.9 + (Math.random() * 0.2)
            if (player.isSneaking) pit -= 0.2

            dim.playSound("block.ballista.rotate", block.center(), { volume: 0.5, pitch: pit })



        },
        onTick(e) {
            const block = e.block;
            const perm = block.permutation;
            var newPerm = perm
            const dim = block.dimension;
            const half = perm.getState("minecraft:multi_block_part")
            const loaded = perm.getState("mm:loaded")
            if (half == 1 || loaded == true) return;
            const otherBlock = block.above()
            const otherPerm = otherBlock.permutation;
            var otherNewPerm = otherPerm
            const east = block.east()
            const west = block.west()
            const north = block.north()
            const south = block.south()
            if (east && east.typeId == "minecraft:hopper" && east.permutation.getState("facing_direction") == 4 && east.permutation.getState("toggle_bit") == false) {
                const inventory = east.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (!item) continue;
                    if (item.typeId == "minecraft:arrow") {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:loaded", true)
                        otherNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherNewPerm)
                        dim.playSound("block.ballista.load", block.center())
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
                    if (item.typeId == "minecraft:arrow") {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:loaded", true)
                        otherNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherNewPerm)
                        dim.playSound("block.ballista.load", block.center())
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
                    if (item.typeId == "minecraft:arrow") {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:loaded", true)
                        otherNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherNewPerm)
                        dim.playSound("block.ballista.load", block.center())
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
                    if (item.typeId == "minecraft:arrow") {
                        if (item.amount > 1) {
                            item.amount -= 1
                        } else {
                            item = undefined
                        }
                        slot.setItem(item)
                        newPerm = perm.withState("mm:loaded", true)
                        otherNewPerm = otherPerm.withState("mm:loaded", true)
                        block.setPermutation(newPerm)
                        otherBlock.setPermutation(otherNewPerm)
                        dim.playSound("block.ballista.load", block.center())
                        return;
                    }
                }
            }
        },
        beforeOnPlayerPlace(e) {
            const player = e.player;
            const y = player.getRotation().y;
            let rot = y + 360 * (y != Math.abs(y));
            rot = Math.round(rot / 22.5)
            rot = rot != 16 ? rot : 0
            e.permutationToPlace = e.permutationToPlace.withState('mm:rotation', rot);
            if (rot == 4 || rot == 5 || rot == 6 || rot == 7) e.permutationToPlace = e.permutationToPlace.withState('minecraft:cardinal_direction', "west");
            if (rot == 8 || rot == 9 || rot == 10 || rot == 11) e.permutationToPlace = e.permutationToPlace.withState('minecraft:cardinal_direction', "north");
            if (rot == 12 || rot == 13 || rot == 14 || rot == 15) e.permutationToPlace = e.permutationToPlace.withState('minecraft:cardinal_direction', "east");
            if (rot == 0 || rot == 1 || rot == 2 || rot == 3) e.permutationToPlace = e.permutationToPlace.withState('minecraft:cardinal_direction', "south");
        }
    });
});



//projectile
world.beforeEvents.entityHurt.subscribe((e) => {
    const hit = e.hurtEntity;
    if (!hit) return;
    if (!hit.isValid) return;
    const cause = e.damageSource.cause
    if (cause !== "projectile") return;
    const projectile = e.damageSource.damagingProjectile
    if (projectile.typeId == "minecraft:arrow" && projectile.hasTag("mm:ballista_arrow")) {
        const arrowsHitting = projectile.dimension.getEntities({ location: hit.location, maxDistance: 2.5, type: projectile.typeId, tags: ["mm:ballista_arrow"] })
        e.damage = Math.ceil(e.damage * 80) / 10
        if (arrowsHitting.length > 1) e.damage = e.damage * arrowsHitting.length
        const v = projectile.getVelocity()
        system.run(() => {
            hit.runCommand("scriptevent mm:hit_by_ballista " + `${Math.ceil(e.damage)}`)
            hit.applyKnockback({ x: v.x, z: v.z }, v.y + 0.23)
        })
    }
})

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    if (!entity.isValid) return;
    if (entity.typeId == "minecraft:arrow" && entity.hasTag("mm:ballista_arrow")) {
        entity.removeTag("mm:ballista_arrow")
        const projectileComp = entity.getComponent("projectile")
        projectileComp.gravity = 0.05;
        projectileComp.airInertia = 0.99
        projectileComp.liquidInertia = 0.6
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    if (!entity.isValid) return;
    if (entity.typeId == "minecraft:arrow" && entity.hasTag("mm:ballista_arrow")) {
        entity.removeTag("mm:ballista_arrow")
        const projectileComp = entity.getComponent("projectile")
        projectileComp.gravity = 0.05;
        projectileComp.airInertia = 0.99
        projectileComp.liquidInertia = 0.6
    }
})