import {
    world,
    system
} from "@minecraft/server";

const componentId = "mm:glowstone_spike"

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent(componentId, {
        beforeOnPlayerPlace(e) {
            const block = e.block;
            const above = block.above()
            const below = block.below()
            const face = e.permutationToPlace.getState('minecraft:block_face');
            if (face !== "up" && face !== "down") {
                e.cancel = true;
            }
            if ((face == "down" && (above.isAir || above.isLiquid)) || (face == "up" && (below.isAir || below.isLiquid))) {

                e.cancel = true;
            }
        },
        onRandomTick(e, {params}) {
            const block = e.block;
            const dim = e.dimension
            const above = block.above()
            const below = block.below()
            const face = block.permutation.getState('minecraft:block_face');
            if ((face == "down" && (above.isAir || above.isLiquid)) || (face == "up" && (below.isAir || below.isLiquid))) {

                dim.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`)
            } else if (face == "down" && block.permutation.getState('mm:type') == "tip") {
                var canGrow = false
                if (block.below().isAir) {
                    for (let i = block.y + 1; i < dim.heightRange.min || i < block.y + 16; i++) {
                        const checkBlock = dim.getBlock({ x: block.x, y: i, z: block.z })
                        if (checkBlock.typeId == params.grow_from) canGrow = true
                        if (!checkBlock.getComponent(componentId)) continue;
                        const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                        if (checkBlockFace !== face) continue;
                    }
                }
                if (Math.random() < 0.2 && canGrow) {
                    block.below().setType(block.typeId)
                } else {
                    dim.spawnParticle(block.typeId + "_particle", { x: block.center().x, y: block.y + 0.2, z: block.center().z })
                }

            }
        },
        onPlace(e) {
            const dim = e.dimension;
            const block = e.block
            const face = block.permutation.getState("minecraft:block_face");
            if (face == "up") {
                for (let i = block.y - 1; i > dim.heightRange.min; i--) {
                    const checkBlock = dim.getBlock({ x: block.x, y: i, z: block.z })
                    if (!checkBlock.getComponent(componentId)) return;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) return;
                    const checkBlockState = checkBlock.permutation.getState('mm:type');
                    if (checkBlockState !== "base") {
                        const below = checkBlock.below()
                        if (!below.getComponent(componentId) || below.permutation.getState('minecraft:block_face') !== checkBlockFace) {
                            var newPerm = checkBlock.permutation.withState("mm:type", "base")
                            checkBlock.setPermutation(newPerm)
                            continue;
                        }
                    }
                    if (checkBlockState !== "middle") {
                        const below = checkBlock.below()
                        if (below.getComponent(componentId) && below.permutation.getState('minecraft:block_face') == checkBlockFace) {
                            const above = checkBlock.above()
                            if (above.getComponent(componentId) && above.permutation.getState('minecraft:block_face') == checkBlockFace) {
                                var newPerm = checkBlock.permutation.withState("mm:type", "middle")
                                checkBlock.setPermutation(newPerm)
                                continue;
                            }
                        }
                    }
                }
            } else {
                for (let i = block.y + 1; i < dim.heightRange.max; i++) {
                    const checkBlock = dim.getBlock({ x: block.x, y: i, z: block.z })
                    if (!checkBlock.getComponent(componentId)) return;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) return;
                    const checkBlockState = checkBlock.permutation.getState('mm:type');
                    if (checkBlockState !== "base") {
                        const below = checkBlock.above()
                        if (!below.getComponent(componentId) || below.permutation.getState('minecraft:block_face') !== checkBlockFace) {
                            var newPerm = checkBlock.permutation.withState("mm:type", "base")
                            checkBlock.setPermutation(newPerm)
                            continue;
                        }
                    }
                    if (checkBlockState !== "middle") {
                        const below = checkBlock.above()
                        if (below.getComponent(componentId) && below.permutation.getState('minecraft:block_face') == checkBlockFace) {
                            const above = checkBlock.below()
                            if (above.getComponent(componentId) && above.permutation.getState('minecraft:block_face') == checkBlockFace) {
                                var newPerm = checkBlock.permutation.withState("mm:type", "middle")
                                checkBlock.setPermutation(newPerm)
                                continue;
                            }
                        }
                    }
                }
            }

        },
        onBreak(e) {
            const originBlock = e.block
            const dim = originBlock.dimension
            const block = e.brokenBlockPermutation;
            const face = block.getState("minecraft:block_face");
            if (face == "up") {
                //destroy blocks attached
                for (let i = originBlock.y + 1; i < dim.heightRange.max; i++) {
                    const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                    if (!checkBlock.getComponent(componentId)) break;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) break;
                    dim.runCommand(`setblock ${checkBlock.x} ${i} ${checkBlock.z} air destroy`)
                }
                //shorten blocks it was attached to
                for (let i = originBlock.y - 1; i > dim.heightRange.min; i--) {
                    const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                    if (!checkBlock.getComponent(componentId)) break;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) break;
                    const diff = originBlock.y - i
                    if (diff == 1) {
                        checkBlock.setPermutation(checkBlock.permutation.withState("mm:type", "tip"))
                    }
                }
            } else {
                //destroy blocks attached
                for (let i = originBlock.y - 1; i > dim.heightRange.min; i--) {
                    const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                    if (!checkBlock.getComponent(componentId)) break;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) break;
                    dim.runCommand(`setblock ${checkBlock.x} ${i} ${checkBlock.z} air destroy`)
                }
                //shorten blocks it was attached to
                for (let i = originBlock.y + 1; i < dim.heightRange.max; i++) {
                    const checkBlock = dim.getBlock({ x: originBlock.x, y: i, z: originBlock.z })
                    if (!checkBlock.getComponent(componentId)) break;
                    const checkBlockFace = checkBlock.permutation.getState('minecraft:block_face');
                    if (checkBlockFace !== face) break;
                    const diff = i - originBlock.y
                    if (diff == 1) {
                        checkBlock.setPermutation(checkBlock.permutation.withState("mm:type", "tip"))
                    }
                }
            }
        }
    })
})