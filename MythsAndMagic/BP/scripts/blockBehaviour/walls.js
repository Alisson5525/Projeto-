//base code is by nate036432 !!! ty!!

import { world } from "@minecraft/server";

const wallSuffix = "is_wall";

const isWall = (block) => {
    if (!block || !block.typeId) return false;
    if (block.typeId.startsWith("minecraft:"))
        return block.typeId.includes("wall");
    if (block.getTags()?.some((tag) => tag.endsWith(wallSuffix))) return true;
    return false;
};

const isConnectable = (block) => {
    if (!block || !block.typeId) return false;

    if (!isSolid(block) || nonConnectableBlocks.includes(block.typeId))
        return false;

    return true;
};

const isSlimBlock = (block) => {
    if (!block) return false;
    for (const entry of slimBlocks) {
        if (block.typeId !== entry.typeId) continue;
        if (entry.states) {
            const permutation = block.permutation;
            for (const [state, value] of Object.entries(entry.states)) {
                if (permutation.getState(state) !== value) return false;
            }
            return true;
        }
        return true;
    }
    return false;
};

const getNamespace = (block) => {
    if (!block || !block.typeId) return "";
    if (block.typeId.startsWith("minecraft:")) return "";
    return block.typeId.split(":")[0];
};

const getStateKey = (namespace, key) =>
    namespace ? `${namespace}:${key}` : key;

const getAdjacentBlocks = (centerBlock) => {
    const directions = [
        { name: "above", method: "above" },
        { name: "below", method: "below" },
        { name: "north", method: "north" },
        { name: "south", method: "south" },
        { name: "east", method: "east" },
        { name: "west", method: "west" },
    ];
    const adjacent = {};
    for (const { name, method } of directions) {
        try {
            adjacent[name] = centerBlock[method](1);
        } catch {
            adjacent[name] = undefined;
        }
    }
    return adjacent;
};

const updateWallStates = (wallBlock) => {
    if (
        wallBlock.typeId.startsWith("minecraft:") &&
        wallBlock.typeId.includes("wall")
    )
        return;

    const adjacent = getAdjacentBlocks(wallBlock);
    const stateChanges = {};
    const aboveBlock = adjacent.above;
    let forcePostBit = false;
    const namespace = getNamespace(wallBlock);

    for (const direction of ["north", "south", "east", "west"]) {
        const neighborBlock = adjacent[direction];
        if (!neighborBlock || !aboveBlock) return;
        if (!isConnectable(neighborBlock)) {
            stateChanges[
                getStateKey(namespace, `wall_connection_type_${direction}`)
            ] = "none";
        } else if (isConnectable(aboveBlock) && isConnectable(neighborBlock)) {
            if (isWall(aboveBlock)) {
                stateChanges[
                    getStateKey(namespace, `wall_connection_type_${direction}`)
                ] = "short";
                forcePostBit = true;
            } else {
                stateChanges[
                    getStateKey(namespace, `wall_connection_type_${direction}`)
                ] = "tall";
            }
        } else if (isConnectable(neighborBlock)) {
            stateChanges[
                getStateKey(namespace, `wall_connection_type_${direction}`)
            ] = "short";
        }
    }

    if (aboveBlock && isWall(aboveBlock)) {
        const abovePerm = aboveBlock.permutation;
        const aboveNamespace = getNamespace(aboveBlock);
        for (const direction of ["north", "south", "east", "west"]) {
            const stateKey = getStateKey(
                namespace,
                `wall_connection_type_${direction}`
            );
            const aboveStateKey = getStateKey(
                aboveNamespace,
                `wall_connection_type_${direction}`
            );
            if (
                stateChanges[stateKey] !== "none" &&
                abovePerm.getState(aboveStateKey) !== "none"
            ) {
                stateChanges[stateKey] = "tall";
            }
        }
    }

    let connectedCount = 0;
    for (const direction of ["north", "south", "east", "west"]) {
        if (
            stateChanges[
            getStateKey(namespace, `wall_connection_type_${direction}`)
            ] !== "none"
        ) {
            connectedCount++;
        }
    }

    if (forcePostBit || connectedCount >= 3) {
        stateChanges[getStateKey(namespace, "wall_post_bit")] = true;
    } else if (
        ((stateChanges[getStateKey(namespace, "wall_connection_type_north")] !==
            "none" &&
            stateChanges[getStateKey(namespace, "wall_connection_type_south")] !==
            "none") ||
            (stateChanges[getStateKey(namespace, "wall_connection_type_east")] !==
                "none" &&
                stateChanges[getStateKey(namespace, "wall_connection_type_west")] !==
                "none")) &&
        !isSlimBlock(aboveBlock)
    ) {
        stateChanges[getStateKey(namespace, "wall_post_bit")] = false;
    } else {
        stateChanges[getStateKey(namespace, "wall_post_bit")] = true;
    }

    if (aboveBlock && isWall(aboveBlock)) {
        const abovePerm = aboveBlock.permutation;
        const aboveNamespace = getNamespace(aboveBlock);
        const abovePostBit = abovePerm.getState(
            getStateKey(aboveNamespace, "wall_post_bit")
        );
        if (
            stateChanges[getStateKey(namespace, "wall_connection_type_north")] !==
            "none" &&
            stateChanges[getStateKey(namespace, "wall_connection_type_south")] !==
            "none" &&
            abovePerm.getState(
                getStateKey(aboveNamespace, "wall_connection_type_north")
            ) !== "none" &&
            abovePerm.getState(
                getStateKey(aboveNamespace, "wall_connection_type_south")
            ) !== "none" &&
            abovePostBit === false
        ) {
            stateChanges[getStateKey(namespace, "wall_post_bit")] = false;
        }
        if (
            stateChanges[getStateKey(namespace, "wall_connection_type_east")] !==
            "none" &&
            stateChanges[getStateKey(namespace, "wall_connection_type_west")] !==
            "none" &&
            abovePerm.getState(
                getStateKey(aboveNamespace, "wall_connection_type_east")
            ) !== "none" &&
            abovePerm.getState(
                getStateKey(aboveNamespace, "wall_connection_type_west")
            ) !== "none" &&
            abovePostBit === false
        ) {
            stateChanges[getStateKey(namespace, "wall_post_bit")] = false;
        }
    }

    let permutation = wallBlock.permutation;
    for (const [stateName, value] of Object.entries(stateChanges)) {
        permutation = permutation.withState(stateName, value);
    }
    wallBlock.setPermutation(permutation);
};

const updateWallsAround = (centerBlock) => {
    const adjacent = getAdjacentBlocks(centerBlock);
    const blocksToCheck = [
        centerBlock,
        adjacent.above,
        adjacent.below,
        adjacent.north,
        adjacent.south,
        adjacent.east,
        adjacent.west,
    ];
    for (const block of blocksToCheck) {
        if (block && isWall(block)) {
            updateWallStates(block);
        }
    }
};

for (const eventName of [
    "playerBreakBlock",
    "playerPlaceBlock",
    "playerInteractWithBlock",
]) {
    world.afterEvents[eventName].subscribe(({ block }) => {
        updateWallsAround(block);
    });
}

const isSolid = (block) => {
    if (block.isAir) return false;
    if (block.isLiquid) return false;
    if (nonSolidBlocks.includes(block.typeId)) return false;
    return true;
};

//Variables

const slimBlocks = [
    { typeId: "minecraft:oak_fence" },
    { typeId: "minecraft:spruce_fence" },
    { typeId: "minecraft:birch_fence" },
    { typeId: "minecraft:jungle_fence" },
    { typeId: "minecraft:acacia_fence" },
    { typeId: "minecraft:dark_oak_fence" },
    { typeId: "minecraft:mangrove_fence" },
    { typeId: "minecraft:cherry_fence" },
    { typeId: "minecraft:bamboo_fence" },
    { typeId: "minecraft:crimson_fence" },
    { typeId: "minecraft:warped_fence" },
    { typeId: "minecraft:nether_brick_fence" },
    {
        typeId: "minecraft:lantern",
        states: { hanging: false },
    },
];

const nonConnectableBlocks = ["minecraft:lantern"];

const nonSolidBlocks = [
    "minecraft:activator_rail",
    "minecraft:air",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:bamboo",
    "minecraft:bamboo_button",
    "minecraft:bamboo_pressure_plate",
    "minecraft:bamboo_sapling",
    "minecraft:bamboo_trapdoor",
    "minecraft:banner",
    "minecraft:beetroot",
    "minecraft:beetroot_seeds",
    "minecraft:blue_orchid",
    "minecraft:bubble_column",
    "minecraft:brown_mushroom",
    "minecraft:carrots",
    "minecraft:carrot",
    "minecraft:cherry_button",
    "minecraft:cherry_pressure_plate",
    "minecraft:cherry_sapling",
    "minecraft:cherry_sign",
    "minecraft:cherry_trapdoor",
    "minecraft:cherry_wall_sign",
    "minecraft:closed_eyeblossom",
    "minecraft:cornflower",
    "minecraft:crimson_button",
    "minecraft:crimson_fungus",
    "minecraft:crimson_pressure_plate",
    "minecraft:crimson_roots",
    "minecraft:crimson_sign",
    "minecraft:crimson_trapdoor",
    "minecraft:crimson_wall_sign",
    "minecraft:dandelion",
    "minecraft:dark_oak_button",
    "minecraft:dark_oak_pressure_plate",
    "minecraft:dark_oak_sapling",
    "minecraft:dark_oak_sign",
    "minecraft:dark_oak_trapdoor",
    "minecraft:dark_oak_wall_sign",
    "minecraft:dead_bush",
    "minecraft:detector_rail",
    "minecraft:end_gateway",
    "minecraft:end_portal",
    "minecraft:end_portal_frame",
    "minecraft:fern",
    "minecraft:fire",
    "minecraft:flower_pot",
    "minecraft:frogspawn",
    "minecraft:glow_berries",
    "minecraft:glow_lichen",
    "minecraft:golden_rail",
    "minecraft:heavy_weighted_pressure_plate",
    "minecraft:hanging_roots",
    "minecraft:hanging_sign",
    "minecraft:kelp",
    "minecraft:large_fern",
    "minecraft:lava",
    "minecraft:lilac",
    "minecraft:lily_of_the_valley",
    "minecraft:lily_pad",
    "minecraft:light_block_0",
    "minecraft:light_block_1",
    "minecraft:light_block_2",
    "minecraft:light_block_3",
    "minecraft:light_block_4",
    "minecraft:light_block_5",
    "minecraft:light_block_6",
    "minecraft:light_block_7",
    "minecraft:light_block_8",
    "minecraft:light_block_9",
    "minecraft:light_block_10",
    "minecraft:light_block_11",
    "minecraft:light_block_12",
    "minecraft:light_block_13",
    "minecraft:light_block_14",
    "minecraft:light_block_15",
    "minecraft:light_weighted_pressure_plate",
    "minecraft:mangrove_button",
    "minecraft:mangrove_leaves",
    "minecraft:mangrove_pressure_plate",
    "minecraft:mangrove_propagule",
    "minecraft:mangrove_roots",
    "minecraft:mangrove_sign",
    "minecraft:mangrove_trapdoor",
    "minecraft:mangrove_wall_sign",
    "minecraft:melon_stem",
    "minecraft:oak_button",
    "minecraft:oak_pressure_plate",
    "minecraft:oak_sapling",
    "minecraft:oak_sign",
    "minecraft:oak_trapdoor",
    "minecraft:oak_wall_sign",
    "minecraft:orange_tulip",
    "minecraft:oxeye_daisy",
    "minecraft:peony",
    "minecraft:pink_petals",
    "minecraft:pink_tulip",
    "minecraft:pitcher_plant",
    "minecraft:polished_blackstone_button",
    "minecraft:polished_blackstone_pressure_plate",
    "minecraft:poppy",
    "minecraft:potatoes",
    "minecraft:potato",
    "minecraft:powder_snow",
    "minecraft:pumpkin_stem",
    "minecraft:rail",
    "minecraft:red_mushroom",
    "minecraft:red_tulip",
    "minecraft:redstone",
    "minecraft:redstone_torch",
    "minecraft:rose_bush",
    "minecraft:sculk_vein",
    "minecraft:seagrass",
    "minecraft:sea_pickle",
    "minecraft:small_amethyst_bud",
    "minecraft:small_dripleaf",
    "minecraft:snow",
    "minecraft:soul_fire",
    "minecraft:soul_torch",
    "minecraft:spruce_button",
    "minecraft:spruce_pressure_plate",
    "minecraft:spruce_sapling",
    "minecraft:spruce_sign",
    "minecraft:spruce_trapdoor",
    "minecraft:spruce_wall_sign",
    "minecraft:spore_blossom",
    "minecraft:stone_button",
    "minecraft:stone_pressure_plate",
    "minecraft:structure_void",
    "minecraft:sugar_cane",
    "minecraft:sunflower",
    "minecraft:sweet_berry_bush",
    "minecraft:tall_grass",
    "minecraft:torch",
    "minecraft:torchflower",
    "minecraft:torchflower_crop",
    "minecraft:tripwire",
    "minecraft:tripwire_hook",
    "minecraft:twisting_vines",
    "minecraft:vine",
    "minecraft:warped_button",
    "minecraft:warped_fungus",
    "minecraft:warped_pressure_plate",
    "minecraft:warped_roots",
    "minecraft:warped_sign",
    "minecraft:warped_trapdoor",
    "minecraft:warped_wall_sign",
    "minecraft:water",
    "minecraft:weeping_vines",
    "minecraft:wheat",
    "minecraft:white_tulip",
    "minecraft:wither_rose",
    "minecraft:bush",
    "minecraft:cactus_flower",
    "minecraft:closed_eyeblossom",
    "minecraft:flower",
    "minecraft:fungus",
    "minecraft:leaf_litter",
    "minecraft:leaves",
    "minecraft:mushroom",
    "minecraft:open_eyeblossom",
    "minecraft:pale_hanging_moss",
    "minecraft:portal",
    "minecraft:pressure_plate",
    "minecraft:reeds",
    "minecraft:short_dry_grass",
    "minecraft:short_grass",
    "minecraft:sign",
    "minecraft:tall_dry_grass",
    "minecraft:tulip",
    "minecraft:wildflowers",
    "minecraft:wooden_button",
    "minecraft:wooden_pressure_plate",
    "minecraft:web",
];
