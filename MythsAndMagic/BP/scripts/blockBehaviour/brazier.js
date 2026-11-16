
import { world, system, EntityDamageCause } from '@minecraft/server';

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:brazier", {
        beforeOnPlayerPlace(e) {
            const block = e.block;
            const dim = e.dimension;
            const permutationtoPlace = e.permutationToPlace;
            if (block.typeId == "minecraft:water") {
                e.permutationToPlace = permutationtoPlace.withState("mm:lit", false)
                system.run(() => {

                    const pit = 1.8 + (Math.random() * 0.6)
                    dim.playSound("random.fizz", block.location, { volume: 0.5, pitch: pit })
                })
            }
        },
        onTick(e) {
            const { block } = e;
            const dim = e.dimension;
            const perm = block.permutation;
            if (perm.getState("mm:lit") == false) return;
            if (block.above().typeId == "minecraft:fire") block.above().setType("air")
            if (block.isWaterlogged || block.above().isWaterlogged || block.above().typeId == "minecraft:water" || block.above().typeId == "minecraft:flowing_water") {
                const newPerm = perm.withState("mm:lit", false);
                block.setPermutation(newPerm)
                dim.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z })
                dim.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z + 0.25 })
                dim.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z - 0.25 })
                dim.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x + 0.25, y: block.y + 0.77, z: block.center().z })
                dim.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x - 0.25, y: block.y + 0.77, z: block.center().z })
                const pit = 1.8 + (Math.random() * 0.6)
                dim.playSound("random.fizz", block.location, { volume: 0.5, pitch: pit })
            }
            const entitiesOnTop = dim.getEntitiesAtBlockLocation(block.above().location)
            for (const target of entitiesOnTop) {
                const feetPos = Math.floor((target.getAABB().center.y - target.getAABB().extent.y))
                if (dim.getBlock({ x: block.x, y: feetPos + 0.1, z: block.z }) !== block) continue;
                const dmg = target.applyDamage(1, { cause: EntityDamageCause.fire })
                if (dmg == true) {

                    const onfire = target.getComponent("minecraft:onfire")
                    if (!onfire) {
                        target.setOnFire(1, true)
                    } else {
                        if (onfire.onFireTicksRemaining < 160) target.setOnFire(onfire.onFireTicksRemaining / 20 + 1.1, true)
                    }
                }
            }

            const soundChance = Math.random()
            if (soundChance < 0.05) {
                const randVol = 1 + Math.random()
                const randPit = 0.3 + (Math.random() * 0.7)
                dim.playSound("fire.fire", block.location, { volume: randVol / 4, pitch: randPit })
            }
            const particleChance = Math.random()
            if ((particleChance < 0.0005 && !block.typeId.includes("meteor")) || (particleChance < 0.001 && block.typeId.includes("meteor"))) {
                var particleId
                if (block.typeId == "mm:brazier") particleId = "minecraft:lava_particle"
                if (block.typeId == "mm:soul_brazier") particleId = "mm:lava_particle_soul"
                if (block.typeId == "mm:copper_brazier") particleId = "mm:lava_particle_copper"
                if (block.typeId == "mm:sparkling_brazier") particleId = "mm:lava_particle_sparkling"
                if (block.typeId == "mm:unobtanium_brazier") particleId = "mm:lava_particle_unobtanium"
                if (block.typeId == "mm:meteor_brazier") particleId = "mm:lava_particle_meteor"
                dim.spawnParticle(particleId, { x: block.center().x, y: block.y + 0.75, z: block.center().z })
            }

        },
        onStepOn(e) {
            const block = e.block;
            const perm = block.permutation;
            if (perm.getState("mm:lit") == false) return;
            const entity = e.entity;
            const onfire = entity.getComponent("minecraft:onfire")
            if (onfire) return;
            entity.setOnFire(5, true)
        },
        onPlayerInteract(e) {
            const block = e.block;
            const player = e.player;
            const equipment = player.getComponent("minecraft:equippable")
            let playerHeld = equipment.getEquipment("Mainhand")
            if (!playerHeld) return;
            const perm = block.permutation;
            if (perm.getState("mm:lit") == false) {
                if (playerHeld.typeId == "minecraft:flint_and_steel") {
                    if (block.isWaterlogged || block.above().isWaterlogged || block.above().typeId == "minecraft:water" || block.above().typeId == "minecraft:flowing_water") return;

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
                    const newPerm = perm.withState("mm:lit", true);
                    const pit = 0.8 + (Math.random() * 0.4)
                    block.dimension.playSound("fire.ignite", block.location, { volume: 1, pitch: pit })
                    block.setPermutation(newPerm)
                } else if (playerHeld.typeId == "minecraft:fire_charge") {
                    if (block.isWaterlogged || block.above().isWaterlogged || block.above().typeId == "minecraft:water" || block.above().typeId == "minecraft:flowing_water") return;

                    if (player.getGameMode() !== "Creative") {
                        if (playerHeld.amount - 1 > 0) {
                            playerHeld.amount -= 1;
                            equipment.setEquipment("Mainhand", playerHeld)
                        } else {
                            equipment.setEquipment("Mainhand", undefined)

                        }
                    }
                    const newPerm = perm.withState("mm:lit", true);
                    block.setPermutation(newPerm)
                    block.dimension.playSound("mob.ghast.fireball", block.location, { volume: 1, pitch: 1 })
                }
            } else {
                if (playerHeld.hasTag("minecraft:is_shovel")) {

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
                    const newPerm = perm.withState("mm:lit", false);
                    const pit = 1.8 + (Math.random() * 0.6)
                    block.dimension.playSound("random.fizz", block.location, { volume: 0.5, pitch: pit })
                    block.setPermutation(newPerm)
                    block.dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z })
                    block.dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z + 0.25 })
                    block.dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x, y: block.y + 0.77, z: block.center().z - 0.25 })
                    block.dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x + 0.25, y: block.y + 0.77, z: block.center().z })
                    block.dimension.spawnParticle("minecraft:basic_smoke_particle", { x: block.center().x - 0.25, y: block.y + 0.77, z: block.center().z })
                }
            }
        }
    });
});

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (entity.typeId == "minecraft:small_fireball") {
        const block = e.getBlockHit().block;
        if (block.getComponent("mm:brazier") == undefined) return;
        const perm = block.permutation
        if (block.isWaterlogged || block.above().isWaterlogged || block.above().typeId == "minecraft:water" || block.above().typeId == "minecraft:flowing_water") return;

        const newPerm = perm.withState("mm:lit", true);
        block.setPermutation(newPerm)
        block.dimension.playSound("mob.ghast.fireball", block.location, { volume: 1, pitch: 1 })
    }
})