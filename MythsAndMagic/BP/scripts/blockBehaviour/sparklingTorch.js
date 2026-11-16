
import { system, world, MolangVariableMap } from '@minecraft/server';

export const unplaceables = [
    "minecraft:air",
    "minecraft:lava",
    "minecraft:flowing_lava",
    "minecraft:snow_layer",
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
    'minecraft:weeping_vines',
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
    "mm:flickerwick_light",
    "mm:revoid_light",
    'mm:unobtanium_torch',
    'mm:sparkling_torch',
    "mm:meteor_torch"
]

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:sparkling_torch", {
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
            if (block.typeId === 'mm:sparkling_torch' || block.typeId == "mm:unobtanium_torch" || block.typeId == "mm:meteor_torch") {
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
                if (block.typeId.includes("meteor") && rand > 0.025) return;
                if (!block.typeId.includes("meteor") && rand > 0.01) return;
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
                    block.dimension.spawnParticle(block.typeId.replace("torch", "flame_particle"), { x: particleX, y: particleY, z: particleZ }, molangVariables);
                    if (block.typeId.includes("meteor")) {
                        block.dimension.spawnParticle('mm:meteor_smoke_particle', { x: particleX, y: particleY, z: particleZ }, molangVariables);
                    } else {
                        block.dimension.spawnParticle('minecraft:basic_smoke_particle', { x: particleX, y: particleY, z: particleZ }, molangVariables);
                    }
                }
            }
        }
    });
});