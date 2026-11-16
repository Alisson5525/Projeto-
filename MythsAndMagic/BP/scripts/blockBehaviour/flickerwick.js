import {
    world,
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:flickerwick_light", {
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            let entities = dim.getEntities({ location: block.location, maxDistance: 2 });
            for (const entity of entities) {
                if (entity.typeId == "mm:flickerwick") {
                    return
                }
            }
            if (dim.isChunkLoaded(block.location) == false) return;
            const perm = block.permutation;
            const light = perm.getState("mm:light")
            if (light > 1) {
                const newPerm = perm.withState("mm:light", light - 1);
                block.setPermutation(newPerm)
            } else {
                if (block.isWaterlogged) {
                    block.setType("minecraft:water")
                } else {
                    block.setType("minecraft:air")
                }
            }
        }
    });

    event.blockComponentRegistry.registerCustomComponent("mm:flickerwick_statue", {
        onPlayerInteract(e, p) {
            const block = e.block;
            const player = e.player;
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
                block.dimension.playSound("mob.ghast.fireball", block.location, { volume: 1, pitch: 1 })
            }

            if (pass == false) return;
            block.dimension.playSound("fire.ignite", block.location, { volume: 1, pitch: 1 })
            const mob = p.params.type
            const tall = p.params.tall
            const perm = block.permutation
            const facing = perm.getState("minecraft:cardinal_direction");
            var spawnEvent = ""
            if (tall == false) {
                if (mob == "normal") spawnEvent = "mm:spawn_as_standard_flickerwick"
                if (mob == "soul") spawnEvent = "mm:spawn_as_soul_flickerwick"
                if (mob == "copper") spawnEvent = "mm:spawn_as_copper_flickerwick"
                if (mob == "sparkling") spawnEvent = "mm:spawn_as_sparkling_flickerwick"
            } else {
                if (mob == "normal") spawnEvent = "mm:spawn_as_tall_standard_flickerwick"
                if (mob == "soul") spawnEvent = "mm:spawn_as_tall_soul_flickerwick"
                if (mob == "copper") spawnEvent = "mm:spawn_as_tall_copper_flickerwick"
                if (mob == "sparkling") spawnEvent = "mm:spawn_as_tall_sparkling_flickerwick"
            }
            const spawnLoc = { x: block.center().x, y: block.y, z: block.center().z }
            block.setType("minecraft:air")
            var rotX = 0
            if (facing == "east") rotX = 90
            if (facing == "west") rotX = 270
            if (facing == "south") rotX = 180
            const flickerwick = block.dimension.spawnEntity("mm:flickerwick", spawnLoc, { initialRotation: rotX })
            flickerwick.triggerEvent(spawnEvent)
            const tameable = flickerwick.getComponent("tameable")
            tameable.tame(player)
            flickerwick.addEffect("slowness", 25, { amplifier: 99, showParticles: false })
        }
    })
})