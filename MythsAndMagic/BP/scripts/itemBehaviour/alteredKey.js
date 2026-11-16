import {
    world,
    system,
    BlockVolume
} from "@minecraft/server";

function getSizeRef(min, max) {
    return Math.hypot(min.x - max.x, min.y - max.y, min.z - max.z)
}

const spawnSpots = [
    "mm:alterstone",
    "mm:altermoss_block",
    "mm:cobbled_alterstone",
    "mm:unobtanium_ore",
    "mm:alterbrush",
    "mm:veiny_alterstone",
    "mm:mossy_alterstone"
]

function returnFromAlterrealm(player) {
    system.runTimeout(() => {
        if (player.getDynamicProperty("mm:altered") == true) {
            const score = world.scoreboard.getObjective("mm:altered_time")
            const dimToTp = player.getDynamicProperty("mm:alter_dim").toString().replace("minecraft:", "")
            const loc = player.getDynamicProperty("mm:alter_loc")
            player.runCommand("execute in " + dimToTp + " as @s run tp " + `${loc.x} ${loc.y} ${loc.z}`)

            score.setScore(player, -1)
            player.setDynamicProperty("mm:alter_loc", null)
            player.setDynamicProperty("mm:alter_dim", null)
            player.setDynamicProperty("mm:altered", false)
            system.runTimeout(() => {
                player.playSound("alterrealm.return")
                player.runCommand("stopsound @s mob.revoid.chase")
            }, 1)
            const altererPlayers = world.getDimension("mm:alterrealm").getPlayers()
            for (const test of altererPlayers) {
                if (test.getDynamicProperty("mm:altered") == true) return;
            }
        }
    }, 1)
}

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:altered_key", {
        onUse({ source }) {
            if (world.getDynamicProperty("mm:disablealterrealm") !== false) {
                return;
            }
            if (source.getDynamicProperty("mm:altered") == true) {
                return;
            }
            if (source.dimension.id == "mm:alterrealm") {
                return;
            }
            const maxRendDist = source.clientSystemInfo.maxRenderDistance;
            if (maxRendDist <= 12 && !source.hasTag("mm:altered_warn")) {
                source.sendMessage("§c§l[Warning] - §r§cOn low-end devices, entering the alterrealm alone may cause crashes or large lag spikes, proceed with caution!")
                source.addTag("mm:altered_warn")
            }
            source.dimension.playSound("item.altered_key.charge", source.location)
            source.dimension.spawnParticle("mm:altered_key_charge_0", source.location)
            source.dimension.spawnParticle("mm:altered_key_charge_1", source.location)
        },
        onCompleteUse({ source }) {
            if (world.getDynamicProperty("mm:disablealterrealm") !== false) {
                source.dimension.playSound("item.altered_key.fail", source.location)
                return;
            }
            if (source.getDynamicProperty("mm:altered") == true) {
                source.dimension.playSound("item.altered_key.fail", source.location)
                return;
            }
            if (source.dimension.id == "mm:alterrealm") {
                source.dimension.playSound("item.altered_key.fail", source.location)
                return;
            }
            const tickingareaDim = world.getDimension("mm:alterrealm")
            source.dimension.playSound("item.altered_key.use", source.location)
            source.playSound("item.altered_key.use")
            system.runTimeout(() => {
                source.playSound("item.altered_key.use")

            }, 40)
            if (source.getGameMode() !== "Creative") {
                const equippable = source.getComponent("equippable")
                equippable.setEquipment("Mainhand", undefined)
            }
            const alteredPlayers = world.getPlayers()
            var length = 0
            for (const player of alteredPlayers) {
                if (player.getDynamicProperty("mm:altered") == true) length += 1
            }
            source.dimension.spawnParticle("mm:altered_key_use_0", source.location)
            source.dimension.spawnParticle("mm:altered_key_use_1", source.location)
            source.addEffect("nausea", 140, { amplifier: 0, showParticles: false })
            source.runCommand("camera @s fade time 0 5 5 color 0 0 0")
            system.runTimeout(() => {
                source.addEffect("resistance", 66, { amplifier: 5, showParticles: false })
                source.addEffect("slow_falling", 66, { amplifier: 0, showParticles: false })
                source.addEffect("blindness", 86, { amplifier: 0, showParticles: false })
                source.addEffect("darkness", 86, { amplifier: 0, showParticles: false })
                if (world.gameRules.sendCommandFeedback == true) {
                    var rule = world.gameRules.sendCommandFeedback;
                    world.gameRules.sendCommandFeedback = false;
                    system.runTimeout(() => {

                        world.gameRules.sendCommandFeedback = rule
                    }, 100)
                }
                if (length == 0) {

                    tickingareaDim.runCommand("tickingarea remove mm:alterrealm_1")
                    tickingareaDim.runCommand("tickingarea remove mm:alterrealm_2")
                    tickingareaDim.runCommand("tickingarea remove mm:alterrealm_3")
                    tickingareaDim.runCommand("tickingarea remove mm:alterrealm_4")
                    tickingareaDim.runCommand("tickingarea remove mm:alterrealm_5")
                    const x = 155 + Math.round(Math.random() * 50) - 25
                    const y = 65
                    const z = 155 + Math.round(Math.random() * 50) - 25
                    world.setDynamicProperty("mm:alter_location", { x: x, y: y, z: z })
                    tickingareaDim.runCommand(`tickingarea add circle ${x} ${y} ${z} 4 mm:alterrealm_5 true`)
                }
                const worldloc = world.getDynamicProperty("mm:alter_location")
                const altWorldLoc = { x: worldloc.x, y: worldloc.y, z: worldloc.z }
                source.setDynamicProperty("mm:altered", true)
                source.setDynamicProperty("mm:alter_loc", source.location)
                source.setDynamicProperty("mm:alter_dim", source.dimension.id)
                //source.playMusic("music.game.alterrealm_bg", { loop: true, fade: 0.5 })

                system.runTimeout(() => {

                    source.runCommand("execute in mm:alterrealm as @s run tp " + `${worldloc.x} ${worldloc.y} ${worldloc.z}`)
                }, 5)

                system.runTimeout(() => {
                    if (length == 0) {
                        world.setDynamicProperty("mm:revoid_spawn_countdown", 2400)
                        system.runTimeout(() => {

                            var corner1 = { x: worldloc.x - 8, y: 30, z: worldloc.z - 8 }
                            var corner2 = { x: worldloc.x + 8, y: 80, z: worldloc.z + 8 }
                            const dim = source.dimension
                            var volume = source.dimension.getBlocks((new BlockVolume(corner1, corner2)), {})
                            for (const location of volume.getBlockLocationIterator()) {
                                const block = dim.getBlock(location)
                                /*if (block.typeId !== "minecraft:air") {
                                    block.setType("minecraft:air")
                                }*/
                                if (block.typeId !== "mm:alterbedrock") {
                                    block.setType("mm:alterbedrock")
                                }
                            }
                        }, 8)
                        system.runTimeout(() => {
                            var mobs = world.getDimension("mm:alterrealm").getEntities({ maxDistance: 200, families: ["alterrealm_mob"], location: worldloc })
                            for (const deletable of mobs) {
                                deletable.remove()
                            }
                            var items = world.getDimension("mm:alterrealm").getEntities({ maxDistance: 200, type: "item", location: worldloc })
                            for (const deletable of items) {
                                deletable.remove()
                            }

                            const loader = world.getDimension("mm:alterrealm").getEntities({ type: "mm:loader" })
                            if (loader.length == 0) world.getDimension("mm:alterrealm").spawnEntity("mm:loader", { x: 155, y: 128, z: 155 })
                            var corner1 = { x: worldloc.x - 16, y: 30, z: worldloc.z - 16 }
                            var corner2 = { x: worldloc.x + 16, y: 80, z: worldloc.z + 16 }
                            const dim = source.dimension
                            var volume = source.dimension.getBlocks((new BlockVolume(corner1, corner2)), {})
                            for (const location of volume.getBlockLocationIterator()) {
                                const block = dim.getBlock(location)
                                /*if (block.typeId !== "minecraft:air") {
                                    block.setType("minecraft:air")
                                }*/
                                if (block.typeId !== "mm:alterbedrock") {
                                    block.setType("mm:alterbedrock")
                                }
                            }
                        }, 9)
                        system.runTimeout(() => {

                            system.runTimeout(() => {

                                const structure = world.structureManager.placeJigsawStructure("mm:alterrealm", source.dimension, { x: altWorldLoc.x, y: altWorldLoc.y, z: altWorldLoc.z }, { ignoreStartHeight: true, includeEntities: true })
                                const sizeRef = getSizeRef(structure.min, structure.max)
                                world.setDynamicProperty("mm:alterrealm_size", sizeRef)
                            }, 3)
                            var solidGround
                            system.runTimeout(() => {
                                var corner1 = { x: worldloc.x - 12, y: worldloc.y - 12, z: worldloc.z - 12 }
                                var corner2 = { x: worldloc.x + 12, y: worldloc.y + 12, z: worldloc.z + 12 }

                                var dim = world.getDimension("mm:alterrealm")
                                var volume = source.dimension.getBlocks((new BlockVolume(corner1, corner2)), {})
                                for (const location of volume.getBlockLocationIterator()) {
                                    const block = dim.getBlock(location)
                                    if (block.typeId !== "minecraft:air" && spawnSpots.includes(block.typeId) && (block.above().typeId == "minecraft:air" || block.above().typeId == "mm:altermoss_growth") && block.above(2).typeId == "minecraft:air") {
                                        solidGround = block.above().location;
                                        break;
                                    }

                                }
                                if (solidGround !== undefined) {
                                    source.runCommand("execute in mm:alterrealm as @s run tp " + `${solidGround.x} ${solidGround.y} ${solidGround.z}`)
                                    world.setDynamicProperty("mm:alter_location", { x: solidGround.x, y: solidGround.y, z: solidGround.z })
                                } else {
                                    system.runTimeout(() => {
                                        var corner1 = { x: worldloc.x - 12, y: worldloc.y - 12, z: worldloc.z - 12 }
                                        var corner2 = { x: worldloc.x + 12, y: worldloc.y + 12, z: worldloc.z + 12 }

                                        var dim = world.getDimension("mm:alterrealm")
                                        var volume = source.dimension.getBlocks((new BlockVolume(corner1, corner2)), {})
                                        for (const location of volume.getBlockLocationIterator()) {
                                            const block = dim.getBlock(location)
                                            if (block.typeId !== "minecraft:air" && spawnSpots.includes(block.typeId) && (block.above().typeId == "minecraft:air" || block.above().typeId == "mm:altermoss_growth") && block.above(2).typeId == "minecraft:air") {
                                                solidGround = block.above().location;
                                                break;
                                            }

                                        }
                                        if (solidGround !== undefined) {
                                            source.runCommand("execute in mm:alterrealm as @s run tp " + `${solidGround.x} ${solidGround.y} ${solidGround.z}`)
                                            world.setDynamicProperty("mm:alter_location", { x: solidGround.x, y: solidGround.y, z: solidGround.z })
                                        } else {
                                            system.runTimeout(() => {
                                                var corner1 = { x: worldloc.x - 12, y: worldloc.y - 12, z: worldloc.z - 12 }
                                                var corner2 = { x: worldloc.x + 12, y: worldloc.y + 12, z: worldloc.z + 12 }

                                                var dim = world.getDimension("mm:alterrealm")
                                                var volume = source.dimension.getBlocks((new BlockVolume(corner1, corner2)), {})
                                                for (const location of volume.getBlockLocationIterator()) {
                                                    const block = dim.getBlock(location)
                                                    if (block.typeId !== "minecraft:air" && spawnSpots.includes(block.typeId) && (block.above().typeId == "minecraft:air" || block.above().typeId == "mm:altermoss_growth") && block.above(2).typeId == "minecraft:air") {
                                                        solidGround = block.above().location;
                                                        break;
                                                    }

                                                }
                                                if (solidGround !== undefined) {
                                                    source.runCommand("execute in mm:alterrealm as @s run tp " + `${solidGround.x} ${solidGround.y} ${solidGround.z}`)
                                                    world.setDynamicProperty("mm:alter_location", { x: solidGround.x, y: solidGround.y, z: solidGround.z })
                                                }
                                            }, 10)
                                        }
                                    }, 10)
                                }
                            }, 5)
                        }, 10)
                    }
                    if (world.getDynamicProperty("mm:alterrealm_size") == null || world.getDynamicProperty("mm:alterrealm_size") == undefined) world.setDynamicProperty("mm:alterrealm_size", 120)
                    world.scoreboard.getObjective("mm:altered_time").setScore(source, 2400 + Math.round(world.getDynamicProperty("mm:alterrealm_size") * 20))
                }, 25)

            }, 5)
        }
    })
})

system.afterEvents.scriptEventReceive.subscribe((e) => {
    const id = e.id
    const player = e.sourceEntity;
    if (id !== "mm:return_failsafe") return;
    returnFromAlterrealm(player)
})

world.afterEvents.playerDimensionChange.subscribe((e) => {
    const player = e.player
    const dim = e.fromDimension;
    if (e.toDimension == dim) return;
    if (dim == world.getDimension("mm:alterrealm")) {
        if (player.getDynamicProperty("mm:altered") == true) {


            returnFromAlterrealm(player)
        }
    }
})

system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: "mm:altered_time", minScore: 0 }] })) {
        const score = world.scoreboard.getObjective("mm:altered_time")
        player.startItemCooldown("power_item", score.getScore(player))
        player.startItemCooldown("adv:alterrealm_checker", score.getScore(player))
        if (score.getScore(player) <= 1800 && (score.getScore(player) - 39) % 40 == 0) {
            var vol = (900 - score.getScore(player)) / 1800
            if (vol < 0.01) vol = 0.01
            if (vol >= 0) player.playSound("alterrealm.tick", { volume: vol })
            const equippable = player.getComponent("minecraft:equippable")
            const main = equippable.getEquipment("Mainhand")
            const off = equippable.getEquipment("Offhand")
            if ((main && main.hasTag("mm:alterrealm_clock")) || (off && off.hasTag("mm:alterrealm_clock"))) {
                if (vol * 0.8 > 0) {
                    if (score.getScore(player) <= 200 && (score.getScore(player) - 39) % 20 == 0) {
                        player.playSound("alterrealm.tick_modified_final", { volume: vol * 1.4 })
                        if ((score.getScore(player) - 39) % 80 == 0) {
                            player.playSound("alterrealm.tick_modified", { volume: vol * 1 })
                        }

                    } else if ((score.getScore(player) - 39) % 80 == 0) {
                        player.playSound("alterrealm.tick_modified", { volume: vol * 1 })
                    }
                }
            }
        }
        if (score.getScore(player) < 120) {
            if (player.getEffect("nausea") == undefined) {
                player.addEffect("nausea", 180)
            }
            player.runCommand("camerashake add @s 0.01 5 positional")
        }
        if (player.location.y <= 10) {

            returnFromAlterrealm(player)
        }
        if (score.getScore(player) <= 0) {

            returnFromAlterrealm(player)
        } else {
            score.addScore(player, -1)
            player.spawnParticle("mm:alterrealm_ambient", player.location)
        }
    }
})

const alterblocks = [
    "mm:alterstone",
    "mm:mossy_alterstone",
    "mm:alterbedrock",
    "mm:altermoss_block",
    "mm:veiny_alterstone",
    "mm:unobtanium_ore"
]

function checkBelow(block) {
    const dim = block.dimension
    for (let i = 0; i < block.y; i++) {
        let blockLoc = { x: block.x, y: i, z: block.z }
        if (alterblocks.includes(dim.getBlock(blockLoc).typeId)) {
            return false
        } else {
            continue;
        }
    }
    return true;
}

function checkAbove(block) {
    const dim = block.dimension
    for (let i = 256; i > block.y; i--) {
        let blockLoc = { x: block.x, y: i, z: block.z }
        if (alterblocks.includes(dim.getBlock(blockLoc).typeId)) {
            return false
        } else {
            continue;
        }
    }
    return true;
}


world.beforeEvents.playerBreakBlock.subscribe((e) => {
    const block = e.block;
    const player = e.player;
    if (player.getDynamicProperty("mm:altered") == true) {
        var changeBlock = false

        if (changeBlock == false && checkBelow(block) == true) {
            changeBlock = true
        }

        if (changeBlock == false && checkAbove(block) == true) {
            changeBlock = true
        }
        if (changeBlock == false && (checkAbove(block.west()) == true || checkBelow(block.west()) == true)) {
            changeBlock = true
        }
        if (changeBlock == false && (checkAbove(block.east()) == true || checkBelow(block.east()) == true)) {
            changeBlock = true
        }
        if (changeBlock == false && (checkAbove(block.north()) == true || checkBelow(block.north()) == true)) {
            changeBlock = true
        }
        if (changeBlock == false && (checkAbove(block.south()) == true || checkBelow(block.south()) == true)) {
            changeBlock = true
        }

        if (changeBlock == true) {
            if (block.typeId == "mm:alterbedrock") e.cancel = true;
            system.run(() => {
                block.dimension.spawnParticle("mm:alterbedrock_shift", block.bottomCenter())
                block.dimension.playSound("block.alterbedrock.shift", block.center())
                block.setType("mm:alterbedrock")
            })
        }
    }
})

world.beforeEvents.itemUse.subscribe((e) => {
    const item = e.itemStack;
    const player = e.source;
    if (player.getDynamicProperty("mm:altered") == true) {
        if (item.typeId == "minecraft:chorus_fruit" || item.typeId == "minecraft:ender_pearl") {
            e.cancel = true;
        }
    }
})

system.runInterval(() => {
    const alteredPlayers = world.getPlayers()
    var length = 0
    for (const player of alteredPlayers) {
        if (player.getDynamicProperty("mm:altered") == true) length += 1
    }
    if (length == 0) {
        if (world.getDynamicProperty("mm:revoid_spawn_countdown") !== -1) {
            world.setDynamicProperty("mm:revoid_spawn_countdown", -1)
        }
    } else {
        if (world.getDynamicProperty("mm:revoid_spawn_countdown") !== undefined) {
            if (world.getDynamicProperty("mm:revoid_spawn_countdown") > -1) {
                world.setDynamicProperty("mm:revoid_spawn_countdown", world.getDynamicProperty("mm:revoid_spawn_countdown") - 1)
                for (const player of world.getPlayers({ tags: ["mm:debug"] })) {
                    if (player.getDynamicProperty("mm:altered") == true) {
                        player.onScreenDisplay.setActionBar(`§c§lRevoid : ${world.getDynamicProperty("mm:revoid_spawn_countdown")}`)
                    }
                }
            }
            if (world.getDynamicProperty("mm:revoid_spawn_countdown") == 0) {

                var dim = world.getDimension("mm:alterrealm")
                dim.runCommand("tickingarea remove mm:alterrealm_5")
                system.runTimeout(() => {

                    const worldloc = world.getDynamicProperty("mm:alter_location")
                    const altWorldLoc = { x: worldloc.x, y: worldloc.y, z: worldloc.z }
                    dim.runCommand(`tickingarea add circle ${altWorldLoc.x} ${altWorldLoc.y} ${altWorldLoc.z} 4 mm:alterrealm_5 true`)
                }, 1)
                system.runTimeout(() => {
                    if (world.getDifficulty() == "Peaceful") return;
                    const worldloc = world.getDynamicProperty("mm:alter_location")
                    const altWorldLoc = { x: worldloc.x, y: worldloc.y, z: worldloc.z }
                    var solidGround
                    for (const player of dim.getPlayers({ location: altWorldLoc, maxDistance: 256 })) {
                        player.playSound("mob.revoid.warn", { volume: 0.5 })
                    }
                    var corner1 = { x: worldloc.x - 3, y: worldloc.y - 3, z: worldloc.z - 3 }
                    var corner2 = { x: worldloc.x + 3, y: worldloc.y + 3, z: worldloc.z + 3 }
                    var volume = dim.getBlocks((new BlockVolume(corner1, corner2)), {})
                    for (const location of volume.getBlockLocationIterator()) {
                        const block = dim.getBlock(location)
                        if (block.typeId !== "minecraft:air" && spawnSpots.includes(block.typeId) && (block.above().typeId == "minecraft:air" || block.above().typeId == "mm:altermoss_growth") && (block.above(2).typeId == "minecraft:air" || block.above(2).typeId == "mm:altermoss_growth") && (block.above(3).typeId == "minecraft:air" || block.above(3).typeId == "mm:altermoss_growth")) {
                            solidGround = block.above().location;
                            break;
                        }

                    }
                    if (solidGround !== undefined) {
                        dim.spawnEntity("mm:revoid", solidGround, { spawnEvent: "mm:spawn_alterrealm_revoid" })
                    } else {
                        dim.spawnEntity("mm:revoid", altWorldLoc, { spawnEvent: "mm:spawn_alterrealm_revoid_crouched" })

                    }
                }, 2)

            }
        }
    }
})



//music

system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:bg_music_alterrealm"] })) {
        const dim = player.dimension
        if(dim.id == "mm:alterrealm") {
            if(world.getDynamicProperty("mm:revoid_spawn_countdown") <= -1) {
                player.removeTag("mm:bg_music_alterrealm")
                player.addTag("mm:bg_music_revoid")
                player.playMusic("music.game.revoid", {loop: true, fade:1})
            }
        } else {
            player.removeTag("mm:bg_music_playing")
            player.removeTag("mm:bg_music_alterrealm")
            player.stopMusic()
        }
    }
    for (const player of world.getPlayers({ tags: ["mm:bg_music_revoid"] })) {
        const dim = player.dimension
        if(dim.id == "mm:alterrealm") {
                        if(world.getDynamicProperty("mm:revoid_spawn_countdown") > -1) {
                player.removeTag("mm:bg_music_revoid")
                player.addTag("mm:bg_music_alterrealm")
                player.playMusic("music.game.alterrealm_bg", {loop: true, fade:1})
            }
        } else {
            player.removeTag("mm:bg_music_playing")
            player.removeTag("mm:bg_music_revoid")
            player.stopMusic()
        }
    }
    for(const player of world.getPlayers({excludeTags:["mm:bg_music_playing"]})) {
        if(player.dimension.id == "mm:alterrealm") {
            player.addTag("mm:bg_music_playing")
            player.addTag("mm:bg_music_alterrealm")
            player.playMusic("music.game.alterrealm_bg", {loop: true, fade:1})
        }
    }
    for (const player of world.getPlayers({ tags: ["alylica:music_playing"] })) {
        for (const tag of player.getTags()) if (tag.includes("mm:") && tag.includes("bg_music")) player.removeTag(tag)
        //player.stopMusic()
    }
}, 5)

world.afterEvents.playerJoin.subscribe((e) => {
    system.runTimeout(() => {
        const player = world.getEntity(e.playerId)
        for (const tag of player.getTags()) if (tag.includes("mm:") && tag.includes("bg_music")) player.removeTag(tag)
    }, 200)
})