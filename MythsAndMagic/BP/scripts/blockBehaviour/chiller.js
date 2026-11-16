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

const passableBlocks = [
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
    "minecraft:redstone_wire",

    'mm:altermoss_growth',
    'mm:shockweed',
    'mm:occculeye',
    'mm:permafrost_icicle',
    "mm:flickerwick_light",
    "mm:soul_flickerwick_light",
    "mm:sparkling_flickerwick_light",
    "mm:copper_flickerwick_light",
    "mm:revoid_light",
    "mm:spirit_lantern"
]

function blowColdAir(block, dim, direction, limit) {
    for (let i = 1; i < limit; i++) {
        var particleChance = Math.random()
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
        if (tempBlock.isAir == false && passableBlocks.includes(tempBlock.typeId) == false) return;
        if (particleChance > clampValue(i / 10, 0.1, 0.7)) tempBlock.dimension.spawnParticle("mm:chiller_" + direction, tempBlock.center())

        const entities = dim.getEntitiesAtBlockLocation(tempBlock.location)
        for (const entity of entities) {
            if (entity.typeId !== "minecraft:item") {
                entity.addEffect("slowness", 8, { amplifier: 5, showParticles: false })
                entity.addEffect("mining_fatigue", 8, { amplifier: 1, showParticles: false })
            }
            if (entity.typeId == "minecraft:player" && entity.isFlying) continue;
            const xDif = entity.location.x - block.center().x;
            const zDif = entity.location.z - block.center().z;
            const yDif = block.center().y - entity.location.y;
            if (direction == "up") {
                if (yDif < 1 && yDif > -1) {
                    entity.applyImpulse({ x: 0, y: -0.5, z: 0 });
                }
            } else if (direction !== "down") {
                if (entity.isOnGround) {
                    entity.applyImpulse({ x: -xDif / 200, y: 0, z: -zDif / 200 });
                } else {
                    entity.applyImpulse({ x: -xDif / 100, y: -0.1, z: -zDif / 100 });

                }
            } else {
                if (entity.typeId == "minecraft:item") {
                    entity.clearVelocity()
                    entity.applyImpulse({ x: -xDif / 200, y: 0.1, z: -zDif / 200 });
                }
            }
        }
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:chiller", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;

            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == false && newPower > 0) {
                dim.playSound("block.copper_bulb.turn_on", block.location)
                dim.playSound("mob.breeze.idle_air", block.location, { pitch: 0.8 })
                const newPerm = perm.withState("mm:powered", true);
                block.setPermutation(newPerm)
            }
            if (powered == true && newPower == 0) {
                dim.playSound("block.copper_bulb.turn_off", block.location)
                dim.playSound("mob.breeze.idle_air", block.location, { pitch: 0.5 })
                const newPerm = perm.withState("mm:powered", false);
                block.setPermutation(newPerm)
            }
        },
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            if (dim.isChunkLoaded(block.location) == false) return;
            const power = block.getRedstonePower()
            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == true) {
                if (Math.random() < 0.01) dim.playSound("block.chiller.ambient", block.location, { volume: 0.2, pitch: 1 })
                const direction = perm.getState("minecraft:block_face")
                blowColdAir(block, dim, direction, Math.round(clampValue(power + 1, 1, 15)))

            }
        }
    })
})