import {
    world,
    system
} from "@minecraft/server";


//vector bullshit pt1
export function getDirection(from, to) {
    const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
    if (distance == 0) return { x: 0, y: 0, z: 0 };

    return {
        x: (to.x - from.x) / distance,
        y: (to.y - from.y) / distance,
        z: (to.z - from.z) / distance
    };
}
//vector bullshit pt2
export function makeVector(vector, strength) {
    var vx = vector.x
    var vz = vector.z

    return { x: vx * strength, z: vz * strength }
}


//clamps value
export function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

const nonPassBlocks = [
    "minecraft:obsidian",
    "minecraft:barrier",
    "minecraft:bedrock",
    "minecraft:gold_block"
]

const replaceableBlocks = [
    "minecraft:water",
    "minecraft:lava",
    "minecraft:flowing_water",
    "minecraft:flowing_lava",
    "minecraft:air",
    'minecraft:light_block_0',
    'minecraft:light_block_1',
    'minecraft:light_block_2',
    'minecraft:light_block_3',
    'minecraft:light_block_4',
    'minecraft:light_block_5',
    'minecraft:light_block_6',
    'minecraft:light_block_7',
    'minecraft:light_block_8',
    'minecraft:light_block_9',
    'minecraft:light_block_10',
    'minecraft:light_block_11',
    'minecraft:light_block_12',
    'minecraft:light_block_13',
    'minecraft:light_block_14',
    'minecraft:light_block_15',
    "mm:revoid_light",
    "mm:flickerwick_light"
]

const passThrough = [
    "minecraft:air",
    "minecraft:snow_layer",
    "minecraft:copper_grate",
    "minecraft:exposed_copper_grate",
    "minecraft:weathered_copper_grate",
    "minecraft:oxidized_copper_grate",
    "minecraft:waxed_copper_grate",
    "minecraft:waxed_weathered_copper_grate",
    "minecraft:waxed_exposed_copper_grate",
    "minecraft:waxed_oxidized_copper_grate",
    "minecraft:iron_bars",
    "minecraft:copper_bars",
    "minecraft:exposed_copper_bars",
    "minecraft:weathered_copper_bars",
    "minecraft:oxidized_copper_bars",
    "minecraft:waxed_copper_bars",
    "minecraft:waxed_exposed_copper_bars",
    "minecraft:waxed_weathered_copper_bars",
    "minecraft:waxed_oxidized_copper_bars",

    //no collision blocks
    "minecraft:activator_rail",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:bamboo",
    "minecraft:banner",
    "minecraft:beetroot_seeds",
    "minecraft:blue_orchid",
    "minecraft:brown_mushroom",
    "minecraft:bubble_collumn",
    "minecraft:bush",
    "minecraft:cactus_flower",
    "minecraft:carrot",
    "minecraft:web",
    "minecraft:cornflower",
    "minecraft:crimson_fungus",
    "minecraft:crimson_roots",
    "minecraft:dandelion",
    "minecraft:dead_bush",
    "minecraft:detector_rail",
    "minecraft:open_eyeblossom",
    "minecraft:closed_eyeblossom",
    "minecraft:fern",
    "minecraft:firefly_bush",
    "minecraft:red_flower",
    "minecraft:yellow_flower",
    "minecraft:flower",
    "minecraft:frogspawn",
    "minecraft:glow_berries",
    "minecraft:cave_vines",
    "minecraft:glow_lichen",
    "minecraft:hanging_roots",
    "minecraft:kelp",
    "minecraft:leaf_litter",
    "minecraft:lilac",
    "minecraft:lily_of_the_valley",
    "minecraft:mangrove_propagule",
    "minecraft:melon_seeds",
    "minecraft:mushroom",
    "minecraft:warped_fungus",
    "minecraft:portal",
    "minecraft:nether_sprouts",
    "minecraft:nether_wart",
    "minecraft:oxeye_daisy",
    "minecraft:paeonia",
    "minecraft:pale_hanging_moss",
    "minecraft:peony",
    "minecraft:pink_petals",
    "minecraft:pitcher_plant",
    "minecraft:poppy",
    "minecraft:potato",
    "minecraft:powder_snow",
    "minecraft:powered_rail",
    "minecraft:pumpkin_seeds",
    "minecraft:rail",
    "minecraft:red_mushroom",
    "minecraft:redstone_dust",
    "minecraft:redstone_torch",
    "minecraft:redstone_repeater",
    "minecraft:redstone_comparator",
    "minecraft:rose_bush",
    "minecraft:sapling",
    "minecraft:sculk_vein",
    "minecraft:seagrass",
    "minecraft:short_dry_grass",
    "minecraft:short_grass",
    "minecraft:shrub",
    "minecraft:sign",
    "minecraft:small_dripleaf",
    "minecraft:soul_torch",
    "minecraft:spore_blossom",
    "minecraft:trip_wire",
    "minecraft:sugar_cane",
    "minecraft:reeds",
    "minecraft:sunflower",
    "minecraft:sweet_berry_bush",
    "minecraft:sweet_berries",
    "minecraft:tall_grass",
    "minecraft:tall_dry_grass",
    "minecraft:torch",
    "minecraft:torchflower",
    "minecraft:torchflower_seeds",
    "minecraft:tripwire_hook",
    "minecraft:tulip",
    "minecraft:twisting_vines",
    "minecraft:vine",
    "minecraft:warped_fungus",
    "minecraft:warped_roots",
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:weeping_vines",
    "minecraft:wheat_seeds",
    "minecraft:seeds",
    "minecraft:wildflowers",
    "minecraft:wither_rose",
    "minecraft:frame",
    "minecraft:glow_item_frame",
    'minecraft:cave_vines',
    'minecraft:cave_vines_body_with_berries',
    'minecraft:cave_vines_head_with_berries',
    'minecraft:tube_coral',
    'minecraft:tube_coral_fan',
    'minecraft:brain_coral',
    'minecraft:brain_coral_fan',
    'minecraft:bubble_coral',
    'minecraft:bubble_coral_fan',
    'minecraft:fire_coral',
    'minecraft:fire_coral_fan',
    'minecraft:horn_coral',
    'minecraft:horn_coral_fan',
    'minecraft:dead_tube_coral',
    'minecraft:dead_tube_coral_fan',
    'minecraft:dead_brain_coral',
    'minecraft:dead_brain_coral_fan',
    'minecraft:dead_bubble_coral',
    'minecraft:dead_bubble_coral_fan',
    'minecraft:dead_fire_coral',
    'minecraft:dead_fire_coral_fan',
    'minecraft:dead_horn_coral',
    'minecraft:dead_horn_coral_fan',
    'minecraft:wheat',
    'minecraft:carrots',
    'minecraft:potatoes',
    'minecraft:melon_stem',
    'minecraft:pumpkin_stem',
    'minecraft:torchflower_crop',
    'minecraft:pitcher_crop',
    'minecraft:bamboo',
    'minecraft:bamboo_sapling',
    'minecraft:cocoa',
    'minecraft:reeds',
    'minecraft:sweet_berry_bush',
    'minecraft:kelp',
    'minecraft:nether_wart',
    'minecraft:light_block_0',
    'minecraft:light_block_1',
    'minecraft:light_block_2',
    'minecraft:light_block_3',
    'minecraft:light_block_4',
    'minecraft:light_block_5',
    'minecraft:light_block_6',
    'minecraft:light_block_7',
    'minecraft:light_block_8',
    'minecraft:light_block_9',
    'minecraft:light_block_10',
    'minecraft:light_block_11',
    'minecraft:light_block_12',
    'minecraft:light_block_13',
    'minecraft:light_block_14',
    'minecraft:light_block_15',
    'minecraft:pink_petals',
    'minecraft:pitcher_plant',
    'minecraft:torchflower',
    'minecraft:powder_snow',
    'minecraft:redstone_torch',
    'minecraft:torch',
    'minecraft:soul_torch',
    'minecraft:snow_layer',
    'minecraft:vines',
    'minecraft:twisting_vines',
    'minecraft:creeping_vines',
    'minecraft:short_grass',
    'minecraft:tall_grass',
    'minecraft:red_flower',
    'minecraft:yellow_flower',
    'minecraft:open_eyeblossom',
    'minecraft:closed_eyeblossom',
    'minecraft:fern',
    'minecraft:double_plant',

    'mm:altermoss_growth',
    'mm:shockweed',
    'mm:occculeye',
    'mm:permafrost_icicle',
    'mm:flickerwick_light',
    'mm:revoid_light',
    "mm:soul_flickerwick_light",
    "mm:sparkling_flickerwick_light",
    "mm:copper_flickerwick_light",
]

const metalBlocks = [
    "minecraft:iron_block",
    "minecraft:raw_iron_block",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:iron_chain",
    "minecraft:iron_bars"
]

function checkConflict(direction, checkBlock) {
    if (checkBlock == undefined) return true;
    if (checkBlock.typeId == "mm:magnetic_piston") {
        const perm = checkBlock.permutation;
        const powered = perm.getState("mm:powered")
        if (powered == true) {
            const checkDirection = perm.getState("minecraft:block_face")
            if (direction == "up" && checkDirection == "down") return true;
            if (direction == "down" && checkDirection == "up") return true;
            if (direction == "east" && checkDirection == "west") return true;
            if (direction == "west" && checkDirection == "east") return true;
            if (direction == "north" && checkDirection == "south") return true;
            if (direction == "south" && checkDirection == "north") return true;
        }
    }
    return false;
}
function magnetise(block, dim, direction, type) {
    if (type == "pull") {
        var conflict = false
        for (let i = 1; i < 13; i++) {
            if (direction == "up") {
                if (checkConflict(direction, block.above(i)) == true) conflict = true
            } else if (direction == "down") {
                if (checkConflict(direction, block.below(i)) == true) conflict = true
            } else if (direction == "east") {
                if (checkConflict(direction, block.east(i)) == true) conflict = true
            } else if (direction == "west") {
                if (checkConflict(direction, block.west(i)) == true) conflict = true
            } else if (direction == "north") {
                if (checkConflict(direction, block.north(i)) == true) conflict = true
            } else if (direction == "south") {
                if (checkConflict(direction, block.south(i)) == true) conflict = true
            }
        }
        if (conflict == true) {
            //dim.spawnParticle("minecraft:ice_evaporation_emitter", block.location)
            return;
        }
        for (let i = 1; i < 13; i++) {
            var tempBlock

            if (direction == "up") {
                tempBlock = block.above(i)
            } else if (direction == "down") {
                tempBlock = block.below(i)
            } else if (direction == "east") {
                tempBlock = block.east(i)
            } else if (direction == "west") {
                tempBlock = block.west(i)
            } else if (direction == "north") {
                tempBlock = block.north(i)
            } else if (direction == "south") {
                tempBlock = block.south(i)
            }
            if (tempBlock == undefined) return;
            if (nonPassBlocks.includes(tempBlock.typeId) || tempBlock.hasTag("mm:magnet_blocker")) return;
            const entities = dim.getEntitiesAtBlockLocation(tempBlock.location)
            for (const pullable of entities) {
                if (pullable.typeId !== "minecraft:player" && pullable.typeId !== "minecraft:iron_golem") continue;
                if (pullable.typeId == "minecraft:player" && pullable.isFlying) continue;
                if (pullable.typeId == "minecraft:player") {
                    const metallurgyD = world.scoreboard.getObjective("mm:metallurgy_time")
                    if (metallurgyD == undefined) continue;
                    if (!metallurgyD.hasParticipant(pullable.scoreboardIdentity)) continue;
                }
                const xDif = pullable.location.x - block.center().x;
                const zDif = pullable.location.z - block.center().z;
                if (pullable.typeId == "minecraft:player") {
                    if (direction == "up") {
                        if (pullable.typeId !== "minecraft:player") {
                            pullable.applyImpulse({ x: 0, y: -0.5, z: 0 });
                        } else {
                            pullable.applyKnockback({ x: 0, z: 0 }, -0.5);
                        }

                    } else if (direction !== "down") {
                        if (pullable.isOnGround) {
                            if (pullable.typeId !== "minecraft:player") {
                                pullable.applyImpulse({ x: -xDif / 2, y: 0, z: -zDif / 2 });
                            } else {
                                pullable.applyKnockback({ x: -xDif / 1, z: -zDif / 1 }, 0);
                            }
                        } else {
                            if (pullable.typeId !== "minecraft:player") {
                                pullable.applyImpulse({ x: -xDif / 2, y: -0.1, z: -zDif / 2 });
                            } else {
                                pullable.applyKnockback({ x: -xDif / 1, z: -zDif / 1 }, -0.1);
                            }

                        }
                    } else {
                        if (pullable.typeId == "minecraft:player") {
                            pullable.applyKnockback({ x: -xDif / 2, z: -zDif / 2 }, 0.5);
                        } else {
                            pullable.clearVelocity()
                            pullable.applyImpulse({ x: -xDif / 2, y: 0.1, z: -zDif / 2 });
                        }
                    }
                }
            }
            if (!metalBlocks.includes(tempBlock.typeId) && !tempBlock.hasTag("mm:magnet_pullable")) continue;

            var blockPullThrough = null

            if (direction == "up") {
                blockPullThrough = block.above(i - 1)
            } else if (direction == "down") {
                blockPullThrough = block.below(i - 1)
            } else if (direction == "east") {
                blockPullThrough = block.east(i - 1)
            } else if (direction == "west") {
                blockPullThrough = block.west(i - 1)
            } else if (direction == "north") {
                blockPullThrough = block.north(i - 1)
            } else if (direction == "south") {
                blockPullThrough = block.south(i - 1)
            }

            if (blockPullThrough !== null) {
                if (replaceableBlocks.includes(blockPullThrough.typeId)) {
                    for (const entity of dim.getEntitiesAtBlockLocation(tempBlock.above().location)) {
                        if ((passThrough.includes(blockPullThrough.above().typeId) || direction == "up") && !entity.isSneaking && !entity.isFlying) {
                            entity.tryTeleport(blockPullThrough.above().bottomCenter())
                                playerMoved(entity)
                        }
                    }
                    for (const entity of dim.getEntitiesAtBlockLocation(blockPullThrough.location)) {

                        if (passThrough.includes(blockPullThrough.above().typeId) && !entity.isSneaking && !entity.isFlying) {

                            var tpLoc = null
                            if (direction == "east") {
                                tpLoc = block.east(i - 2)
                            } else if (direction == "west") {
                                tpLoc = block.west(i - 2)
                            } else if (direction == "north") {
                                tpLoc = block.north(i - 2)
                            } else if (direction == "south") {
                                tpLoc = block.south(i - 2)
                            }
                            if (tpLoc !== null && passThrough.includes(tpLoc.typeId)) {
                                playerMoved(entity)
                                entity.tryTeleport(tpLoc.bottomCenter())
                            }

                        }
                    }

                    const setPerm = tempBlock.permutation
                    blockPullThrough.setType(tempBlock.typeId)
                    blockPullThrough.setPermutation(setPerm)
                    tempBlock.setType("minecraft:air")
                    dim.spawnParticle("mm:pulled_from", tempBlock.center())
                }
            }
        }
    } else {
        var conflict = false
        for (let i = 13; i > 0; i--) {
            if (direction == "up") {
                if (checkConflict(direction, block.above(i)) == true) conflict = true
            } else if (direction == "down") {
                if (checkConflict(direction, block.below(i)) == true) conflict = true
            } else if (direction == "east") {
                if (checkConflict(direction, block.east(i)) == true) conflict = true
            } else if (direction == "west") {
                if (checkConflict(direction, block.west(i)) == true) conflict = true
            } else if (direction == "north") {
                if (checkConflict(direction, block.north(i)) == true) conflict = true
            } else if (direction == "south") {
                if (checkConflict(direction, block.south(i)) == true) conflict = true
            }
        }
        if (conflict == true) return;
        var amagneticAt = 110
        for (let i = 11; i > 0; i--) {
            var tempBlock

            if (direction == "up") {
                tempBlock = block.above(i)
            } else if (direction == "down") {
                tempBlock = block.below(i)
            } else if (direction == "east") {
                tempBlock = block.east(i)
            } else if (direction == "west") {
                tempBlock = block.west(i)
            } else if (direction == "north") {
                tempBlock = block.north(i)
            } else if (direction == "south") {
                tempBlock = block.south(i)
            }
            if (tempBlock == undefined) return;
            if (nonPassBlocks.includes(tempBlock.typeId) || tempBlock.hasTag("mm:magnet_blocker")) {
                amagneticAt = i;
                break;
            }
        }
        for (let i = 11; i > 0; i--) {

            var tempBlock
            if (direction == "up") {
                tempBlock = block.above(i)
            } else if (direction == "down") {
                tempBlock = block.below(i)
            } else if (direction == "east") {
                tempBlock = block.east(i)
            } else if (direction == "west") {
                tempBlock = block.west(i)
            } else if (direction == "north") {
                tempBlock = block.north(i)
            } else if (direction == "south") {
                tempBlock = block.south(i)
            }
            if (tempBlock == undefined) return;
            if (i > amagneticAt) continue;
            const entities = dim.getEntitiesAtBlockLocation(tempBlock.location)
            for (const pullable of entities) {
                if (pullable.typeId !== "minecraft:player" && pullable.typeId !== "minecraft:iron_golem") continue;
                if (pullable.typeId == "minecraft:player" && pullable.isFlying) continue;
                if (pullable.typeId == "minecraft:player") {
                    const metallurgyD = world.scoreboard.getObjective("mm:metallurgy_time")
                    if (metallurgyD == undefined) continue;
                    if (!metallurgyD.hasParticipant(pullable.scoreboardIdentity)) continue;
                }
                const xDif = pullable.location.x - block.center().x;
                const zDif = pullable.location.z - block.center().z;
                if (pullable.typeId == "minecraft:player") {
                    if (direction == "up") {
                        if (pullable.typeId !== "minecraft:player") {
                            pullable.applyImpulse({ x: 0, y: 0.5, z: 0 });
                        } else {
                            pullable.applyKnockback({ x: 0, z: 0 }, 0.5);
                        }

                    } else if (direction !== "down") {
                        if (pullable.isOnGround) {
                            if (pullable.typeId !== "minecraft:player") {
                                pullable.applyImpulse({ x: xDif / 15, y: 0, z: zDif / 15 });
                            } else {
                                pullable.applyKnockback({ x: xDif / 7, z: zDif / 7 }, 0);
                            }
                        } else {
                            if (pullable.typeId !== "minecraft:player") {
                                pullable.applyImpulse({ x: xDif / 15, y: 0, z: zDif / 15 });
                            } else {
                                pullable.applyKnockback({ x: xDif / 7, z: zDif / 7 }, 0);
                            }

                        }
                    } else {
                        if (pullable.typeId == "minecraft:player") {
                            pullable.applyKnockback({ x: xDif / 15, z: zDif / 15 }, -0.5);
                        } else {
                            pullable.clearVelocity()
                            pullable.applyImpulse({ x: xDif / 15, y: -0.1, z: zDif / 15 });
                        }
                    }
                }
            }
            if (!metalBlocks.includes(tempBlock.typeId) && !tempBlock.hasTag("mm:magnet_pullable")) continue;

            var blockPullThrough = null

            if (direction == "up") {
                blockPullThrough = block.above(i + 1)
            } else if (direction == "down") {
                blockPullThrough = block.below(i + 1)
            } else if (direction == "east") {
                blockPullThrough = block.east(i + 1)
            } else if (direction == "west") {
                blockPullThrough = block.west(i + 1)
            } else if (direction == "north") {
                blockPullThrough = block.north(i + 1)
            } else if (direction == "south") {
                blockPullThrough = block.south(i + 1)
            }

            if (blockPullThrough !== null) {
                if (replaceableBlocks.includes(blockPullThrough.typeId)) {
                    for (const entity of dim.getEntitiesAtBlockLocation(tempBlock.above().location)) {
                        if (passThrough.includes(blockPullThrough.above().typeId) && !entity.isSneaking && !entity.isFlying) {
                                playerMoved(entity)
                            entity.tryTeleport(blockPullThrough.above().bottomCenter())
                        }
                    }
                    for (const entity of dim.getEntitiesAtBlockLocation(blockPullThrough.location)) {
                        if (passThrough.includes(blockPullThrough.above().typeId) && !entity.isSneaking && !entity.isFlying) {

                            var tpLoc = null
                            if (direction == "east") {
                                tpLoc = block.east(i + 2)
                            } else if (direction == "west") {
                                tpLoc = block.west(i + 2)
                            } else if (direction == "north") {
                                tpLoc = block.north(i + 2)
                            } else if (direction == "south") {
                                tpLoc = block.south(i + 2)
                            }
                            if (tpLoc !== null && passThrough.includes(tpLoc.typeId)) {
                                playerMoved(entity)
                                entity.tryTeleport(tpLoc.bottomCenter())
                            }

                        }
                    }
                    const setPerm = tempBlock.permutation
                    blockPullThrough.setType(tempBlock.typeId)
                    blockPullThrough.setPermutation(setPerm)
                    tempBlock.setType("minecraft:air")
                    dim.spawnParticle("mm:pushed_from", tempBlock.center())
                }
            }
        }
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:magnetic_piston", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;

            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == false && newPower > 0) {
                dim.playSound("block.magnetic_piston.turn_on", block.location)
                const newPerm = perm.withState("mm:powered", true);
                block.setPermutation(newPerm)
            }
            if (powered == true && newPower == 0) {
                dim.playSound("block.magnetic_piston.turn_off", block.location)
                const newPerm = perm.withState("mm:powered", false);
                block.setPermutation(newPerm)
            }
        },
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == true) {
                if (Math.random() < 0.01) dim.playSound("block.magnetic_piston.ambient", block.location, { volume: 0.2, pitch: 1.1 })

                const direction = perm.getState("minecraft:block_face")
                const state = perm.getState("mm:state")
                if (state == "orange") {
                    magnetise(block, dim, direction, "pull")
                } else {
                    magnetise(block, dim, direction, "push")
                }


            }
        }
    })
})

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const face = e.blockFace;
    const block = e.block;
    const dim = e.block.dimension
    if (e.isFirstEvent == false) return;
    if (block.typeId !== "mm:magnetic_piston") return;
    const held = e.player.getComponent("equippable").getEquipment("Mainhand")
    if (held) return;
    const perm = block.permutation
    const direction = perm.getState("minecraft:block_face")
    var backFace = false
    if (face == "West" && direction == "east") backFace = true
    if (face == "East" && direction == "west") backFace = true
    if (face == "North" && direction == "south") backFace = true
    if (face == "South" && direction == "north") backFace = true
    if (face == "Up" && direction == "down") backFace = true
    if (face == "Down" && direction == "up") backFace = true
    if (backFace == true) {
        system.run(() => {
            const state = perm.getState("mm:state")
            if (state == "orange") {
                dim.playSound("block.magnetic_piston.blue", block.location)
                var newPerm = perm.withState("mm:state", "blue");
                block.setPermutation(newPerm)
            } else {
                dim.playSound("block.magnetic_piston.orange", block.location)
                var newPerm = perm.withState("mm:state", "orange");
                block.setPermutation(newPerm)

            }
        })
    }
})

function playerMoved(player) {
    if(player.typeId !== "minecraft:player") return;
    if(!player.getDynamicProperty("mm:magnetic_start")) {
        player.setDynamicProperty("mm:magnetic_start", player.location)
    }
    player.setDynamicProperty("mm:magnetic_travel_t", 5)
    const loc = player.getDynamicProperty("mm:magnetic_start")
    if(!loc) return;
    const dist = Math.hypot(loc.x - player.location.x, loc.y - player.location.y, loc.z - player.location.z);
    if(dist >= 50) {
        player.runCommand("scriptevent mm:magnetic_rail")
    }
}

system.runInterval(() => {
    for(const player of world.getPlayers()) {
    if(!player.getDynamicProperty("mm:magnetic_travel_t"))  return;
        player.setDynamicProperty("mm:magnetic_travel_t", player.getDynamicProperty("mm:magnetic_travel_t") - 1)
        if(player.getDynamicProperty("mm:magnetic_travel_t") <= 0) {
            player.setDynamicProperty("mm:magnetic_travel_t", null)
            player.setDynamicProperty("mm:magnetic_start", null)

        }
    }
})