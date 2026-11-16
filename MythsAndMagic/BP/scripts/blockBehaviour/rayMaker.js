import {
    world,
    system
} from "@minecraft/server";


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
    "minecraft:ice",
    "minecraft:slime",
    "minecraft:honey_block",
    "minecraft:monster_spawner",
    "minecraft:frosted_ice",
    "minecraft:beacon",

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

    "minecraft:glass",
    "minecraft:red_stained_glass",
    "minecraft:orange_stained_glass",
    "minecraft:yellow_stained_glass",
    "minecraft:lime_stained_glass",
    "minecraft:green_stained_glass",
    "minecraft:light_blue_stained_glass",
    "minecraft:cyan_stained_glass",
    "minecraft:blue_stained_glass",
    "minecraft:purple_stained_glass",
    "minecraft:magenta_stained_glass",
    "minecraft:pink_stained_glass",
    "minecraft:brown_stained_glass",
    "minecraft:white_stained_glass",
    "minecraft:light_gray_stained_glass",
    "minecraft:gray_stained_glass",
    "minecraft:black_stained_glass",

    "minecraft:glass_pane",
    "minecraft:red_stained_glass_pane",
    "minecraft:orange_stained_glass_pane",
    "minecraft:yellow_stained_glass_pane",
    "minecraft:lime_stained_glass_pane",
    "minecraft:green_stained_glass_pane",
    "minecraft:light_blue_stained_glass_pane",
    "minecraft:cyan_stained_glass_pane",
    "minecraft:blue_stained_glass_pane",
    "minecraft:purple_stained_glass_pane",
    "minecraft:magenta_stained_glass_pane",
    "minecraft:pink_stained_glass_pane",
    "minecraft:brown_stained_glass_pane",
    "minecraft:white_stained_glass_pane",
    "minecraft:light_gray_stained_glass_pane",
    "minecraft:gray_stained_glass_pane",
    "minecraft:black_stained_glass_pane",
    "minecraft:redstone_wire",
    "mm:light_switch",
    'mm:altermoss_growth',
    'mm:shockweed',
    'mm:occculeye',
    'mm:permafrost_icicle',
    "mm:flickerwick_light",
    "mm:soul_flickerwick_light",
    "mm:sparkling_flickerwick_light",
    "mm:copper_flickerwick_light",
    "mm:revoid_light"
]

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:raymaker", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;

            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == false && newPower > 0) {
                dim.playSound("block.raymaker.on", block.location)
                dim.playSound("block.raymaker.ambient", block.location, { volume: 0.2, pitch: 1 })
                //dim.playSound("mob.breeze.idle_air", block.location, { pitch: 0.8 })
                const newPerm = perm.withState("mm:powered", true).withState("mm:just_became_powered", true);
                block.setPermutation(newPerm)
            }
            if (powered == true && newPower == 0) {
                dim.playSound("block.raymaker.off", block.location)
                //dim.playSound("mob.breeze.idle_air", block.location, { pitch: 0.5 })
                const newPerm = perm.withState("mm:powered", false);
                block.setPermutation(newPerm)
            }
        },
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            if (dim.isChunkLoaded(block.location) == false) return;
            const perm = block.permutation
            const powered = perm.getState("mm:powered")
            if (powered == true) {
                if (Math.random() < 0.06) dim.playSound("block.raymaker.ambient", block.location, { volume: 0.2, pitch: 1 })

                const direction = perm.getState("minecraft:cardinal_direction")
                const justBecame = perm.getState("mm:just_became_powered")
                sendLightBeam(direction, block, "blue", 15, justBecame)
                if(justBecame) block.setPermutation(perm.withState("mm:just_became_powered",false))

            }
        }
    })
})

const blueLight = [
    "minecraft:blue_stained_glass",
    "minecraft:light_blue_stained_glass",
    "minecraft:cyan_stained_glass",
    "minecraft:blue_stained_glass_pane",
    "minecraft:light_blue_stained_glass_pane",
    "minecraft:cyan_stained_glass_pane"
]
const redLight = [
    "minecraft:red_stained_glass",
    "minecraft:pink_stained_glass",
    "minecraft:orange_stained_glass",
    "minecraft:red_stained_glass_pane",
    "minecraft:pink_stained_glass_pane",
    "minecraft:orange_stained_glass_pane"
]
const greenLight = [
    "minecraft:green_stained_glass",
    "minecraft:lime_stained_glass",
    "minecraft:green_stained_glass_pane",
    "minecraft:lime_stained_glass_pane"
]
const yellowLight = [
    "minecraft:yellow_stained_glass",
    "minecraft:yellow_stained_glass_pane"
]
const purpleLight = [
    "minecraft:purple_stained_glass",
    "minecraft:magenta_stained_glass",
    "minecraft:purple_stained_glass_pane",
    "minecraft:magenta_stained_glass_pane"
]
const whiteLight = [
    "minecraft:white_stained_glass",
    "minecraft:light_gray_stained_glass",
    "minecraft:gray_stained_glass",
    "minecraft:white_stained_glass_pane",
    "minecraft:light_gray_stained_glass_pane",
    "minecraft:gray_stained_glass_pane"
]


function decideColour(blockId, colour) {
    if (blueLight.includes(blockId)) return "blue";
    if (yellowLight.includes(blockId)) return "yellow";
    if (greenLight.includes(blockId)) return "green";
    if (redLight.includes(blockId)) return "red";
    if (purpleLight.includes(blockId)) return "purple";
    if (whiteLight.includes(blockId)) return "white";
    return colour
}

function sendLightBeam(direction, block, setColour, workingRange, firstInst) {
    var range = workingRange
    if (range < 2) range = 2
    if (range > 15) range = 15
    const dim = block.dimension;
    var colour = setColour
    if (dim.isChunkLoaded(block.location) == false) return;
    var xOffset = 0
    var zOffset = 0
    if (direction == "west") xOffset = 0.5
    if (direction == "east") xOffset = -0.5
    if (direction == "north") zOffset = 0.5
    if (direction == "south") zOffset = -0.5
    if (dim.isChunkLoaded({ x: block.center().x + xOffset * 1.5, y: block.center().y, z: block.center().z + zOffset * 1.5 }) == false) return;

    dim.spawnParticle("mm:light_ray_particle_" + colour, block.center())
    if (world.getDynamicProperty("mm:performancemode") !== true) {
        dim.spawnParticle("mm:light_ray_particle_" + colour, { x: block.center().x + xOffset, y: block.center().y, z: block.center().z + zOffset })
        dim.spawnParticle("mm:light_ray_particle_" + colour, { x: block.center().x + xOffset / 2, y: block.center().y, z: block.center().z + zOffset / 2 })
        dim.spawnParticle("mm:light_ray_particle_" + colour, { x: block.center().x + xOffset * 1.5, y: block.center().y, z: block.center().z + zOffset * 1.5 })
    }
    for (let i = 1; i < Math.ceil(range); i++) {
        var tempBlock
        if (direction == "west") tempBlock = block.east(i)
        if (direction == "east") tempBlock = block.west(i)
        if (direction == "south") tempBlock = block.north(i)
        if (direction == "north") tempBlock = block.south(i)
        if (dim.isChunkLoaded(tempBlock.location) == false) return;
        if (tempBlock.typeId.includes("glass")) {
            colour = decideColour(tempBlock.typeId, colour)
        }
        if (tempBlock.typeId == "mm:light_switch") {
            range = 15
            tempBlock.setPermutation(tempBlock.permutation.withState("mm:active", true).withState("mm:powered_ticks", 5))
            //return;
        }
        if (tempBlock.below().typeId == "mm:azsilva_mirror" && tempBlock.typeId !== "mm:raymaker") {
            var reflectDir
            reflectDir = tempBlock.below().permutation.getState("minecraft:cardinal_direction")

            //world.sendMessage(reflectDir)
            var bounced = false
            if (direction == "west" && reflectDir == "east") {
                sendLightBeam("south", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "west" && reflectDir == "north") {
                sendLightBeam("north", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "south" && reflectDir == "north") {
                sendLightBeam("east", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "south" && reflectDir == "west") {
                sendLightBeam("west", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "east" && reflectDir == "west") {
                sendLightBeam("north", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "east" && reflectDir == "south") {
                sendLightBeam("south", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "north" && reflectDir == "south") {
                sendLightBeam("west", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if (direction == "north" && reflectDir == "east") {
                sendLightBeam("east", tempBlock, colour, range - 0.5)
                bounced = true
            }
            if(firstInst && bounced) {
                const players = dim.getPlayers({maxDistance: 16, location: tempBlock.location, excludeGameModes:["Spectator"]})
                for(const player of players) player.runCommand("scriptevent mm:prismatic")
            }
            return;
        }
        if (!passableBlocks.includes(tempBlock.typeId) && !tempBlock.isAir && !tempBlock.isLiquid) return;
        if (tempBlock.typeId !== "mm:light_switch") {
            var xOffset = 0
            var zOffset = 0
            if (direction == "west") xOffset = 0.5
            if (direction == "east") xOffset = -0.5
            if (direction == "north") zOffset = 0.5
            if (direction == "south") zOffset = -0.5
            if (dim.isChunkLoaded({ x: tempBlock.center().x + xOffset * 1.5, y: tempBlock.center().y, z: tempBlock.center().z + zOffset * 1.5 }) == false) return;
            dim.spawnParticle("mm:light_ray_particle_" + colour, tempBlock.center())
            if (world.getDynamicProperty("mm:performancemode") !== true) {
                dim.spawnParticle("mm:light_ray_particle_" + colour, { x: tempBlock.center().x + xOffset, y: tempBlock.center().y, z: tempBlock.center().z + zOffset })
                dim.spawnParticle("mm:light_ray_particle_" + colour, { x: tempBlock.center().x + xOffset / 2, y: tempBlock.center().y, z: tempBlock.center().z + zOffset / 2 })
                dim.spawnParticle("mm:light_ray_particle_" + colour, { x: tempBlock.center().x + xOffset * 1.5, y: tempBlock.center().y, z: tempBlock.center().z + zOffset * 1.5 })
            }
            const entities = dim.getEntitiesAtBlockLocation(tempBlock.center())
            for (const target of entities) {
                const head = target.getHeadLocation()
                if (
                    (head.y >= tempBlock.center().y - 0.4 && head.y < tempBlock.center().y + 0.4) &&
                    (head.x >= tempBlock.center().x - 0.4 && head.x < tempBlock.center().x + 0.4) &&
                    (head.z >= tempBlock.center().z - 0.4 && head.z < tempBlock.center().z + 0.4)

                ) {
                    target.addEffect("blindness", 10, { showParticles: true })
                    if (target.typeId == "minecraft:player" && target.getGameMode() !== "Spectator" && !target.hasTag("mm:disableflashes")) target.runCommand("camera @s fade time 0 0.2 0.2 color 255 255 255")
                }
            }
        }
    }
}