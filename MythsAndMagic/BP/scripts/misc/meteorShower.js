import {
    world,
    system
} from "@minecraft/server";

const baseChance = 1
const maxIntervalSeconds = 3
const maxDropOffSeconds = 1
const minPlayerDist = 1
const maxPlayerDist = 60
const offsetY = 90

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

function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}
function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}

world.afterEvents.worldLoad.subscribe((e) => {
    const chance = world.getDynamicProperty("mm:meteor_chance")
    if (chance == undefined) world.setDynamicProperty("mm:meteor_chance", baseChance)
    const active = world.getDynamicProperty("mm:meteor_active")
    if (active == undefined) world.setDynamicProperty("mm:meteor_active", false)
    const isNight = world.getDynamicProperty("mm:is_night")
    if (isNight == undefined) world.setDynamicProperty("mm:is_night", false)
})

system.runInterval(() => {
    const isNight = world.getDynamicProperty("mm:is_night")
    const time = world.getTimeOfDay()
    if (isNight == false) {
        if (time >= 12523 && time <= 22677) becomeNight()
    }
    if (isNight == true) {
        if (time < 12523 || time > 22677) becomeDay()
    }
})

function playMeteorSound(sound) {
    for (const player of world.getDimension("minecraft:overworld").getPlayers()) {
        if (player.location.y > 40) player.playSound(sound, { volume: 0.66 })
    }
}

function becomeNight() {
    world.setDynamicProperty("mm:is_night", true)
    if (world.gameRules.doWeatherCycle == true) {
        const chance = world.getDynamicProperty("mm:meteor_chance")
        const rand = Math.random() * 100
        if (rand < chance) {
            playMeteorSound("weather.meteor.ambience_alternate")
            var alt = false
            system.runInterval(() => {
                if (world.getDynamicProperty("mm:meteor_active") == false) return;
                if (alt) {
                    playMeteorSound("weather.meteor.ambience_alternate")
                    alt = false
                } else {
                    playMeteorSound("weather.meteor.ambience")
                    alt = true
                }
            }, 1900)
            world.setDynamicProperty("mm:meteor_active", true)
            world.setDynamicProperty("mm:meteor_chance", -2)
        } else {
            if (chance < -5) {
                world.setDynamicProperty("mm:meteor_chance", -5)
            } else if (chance < 1) {
                world.setDynamicProperty("mm:meteor_chance", chance + 1)
            } else {
                world.setDynamicProperty("mm:meteor_chance", Math.round((chance + (Math.round(Math.random() * 2))) * 1.1))
            }
            if (world.getDynamicProperty("mm:meteor_chance") > 33) world.setDynamicProperty("mm:meteor_chance", 33)
        }
    }
}

function becomeDay() {
    if (world.getDynamicProperty("mm:meteor_active") && world.gameRules.doWeatherCycle == true) {
        world.setDynamicProperty("mm:meteor_active", false)

    }
    world.setDynamicProperty("mm:is_night", false)
}


//detect overworld players in meteorshowwer
system.runInterval(() => {
    if (!world.getDynamicProperty("mm:meteor_active")) return;
    const dim = world.getDimension("minecraft:overworld")
    for (const player of dim.getPlayers()) {
        var meteorTimer = player.getDynamicProperty("mm:meteor_timer")
        if (!meteorTimer || meteorTimer < 1) {
            meteorTimer = Math.round((maxIntervalSeconds * 20) - Math.random() * (maxDropOffSeconds * 20))
            player.setDynamicProperty("mm:meteor_timer", meteorTimer)
        }
        if (meteorTimer == 1) {
            var spawnMeteor = true
            for (const otherPlayer of player.dimension.getPlayers({ location: player.location, maxDistance: 64 })) {
                if (otherPlayer.id > player.id) spawnMeteor = false
            }
            const y = player.location.y
            var randomOffsetX = Math.random() * maxPlayerDist - maxPlayerDist / 2
            if (randomOffsetX > 0) randomOffsetX += minPlayerDist
            if (randomOffsetX <= 0) randomOffsetX -= minPlayerDist
            var randomOffsetZ = Math.random() * maxPlayerDist - maxPlayerDist / 2
            if (randomOffsetZ > 0) randomOffsetZ += minPlayerDist
            if (randomOffsetZ <= 0) randomOffsetZ -= minPlayerDist
            randomOffsetX -= 10
            randomOffsetX -= Math.random() * 30
            var newOffsetY = offsetY
            if (y + newOffsetY > 319) newOffsetY -= (y + newOffsetY - 320)
            var finalyY = player.location.y + newOffsetY
            var topMost = dim.getTopmostBlock({ x: player.location.x + randomOffsetX, z: player.location.z + randomOffsetZ })
            if (topMost) topMost = topMost.y
            if (!topMost) topMost = finalyY
            if (topMost > finalyY) finalyY = clampValue(topMost + 64, topMost, 320)
            finalyY = clampValue(finalyY, 120, 320)
            const spawnLoc = {
                x: player.location.x + randomOffsetX,
                y: finalyY,
                z: player.location.z + randomOffsetZ
            }
            const blockAtLoc = dim.getBlock(spawnLoc)
            if (!blockAtLoc || blockAtLoc.isAir == false) spawnMeteor = false
            if (spawnMeteor) {
                const tickingAreaManager = world.tickingAreaManager;
                const tickId = `mm:anchor_${player.id}`
                tickingAreaManager.createTickingArea(tickId, {
                    dimension: dim,
                    from: spawnLoc,
                    to: spawnLoc
                })
                system.runTimeout(() => {
                    const meteor = dim.spawnEntity("mm:meteorite", spawnLoc, { spawnEvent: "mm:world_meteor" })
                    for (let player of dim.getPlayers({ location: spawnLoc, maxDistance: 128 })) {
                        var distance = 1 - getDistanceBetween(player, meteor) / 128
                        if (distance > 1) distance = 1
                        player.playSound("weather.meteor.woosh", { volume: distance })
                    }
                    meteor.getComponent("projectile").shoot({
                        x: 0.3 + (Math.random() * 0.1), y: -0.4 - (Math.random() * 0.1), z: Math.random() * 0.1 - 0.05
                    })
                    system.runTimeout(() => {
                        //dim.getBlock(spawnLoc).setType("mm:sparkling_crystal_block")
                        tickingAreaManager.removeTickingArea(tickId)
                    }, 1)
                }, 1)
            }
        } else {
            if (player.location.y > 50) {
                if (meteorTimer % 3 == 0) {
                    player.spawnParticle("mm:meteor_shower_ambient", player.location)
                }
                if (meteorTimer % 66 == 6) {
                    if (Math.random() > 0.5) {
                        player.spawnParticle("mm:meteor_shower_ambient_stars", player.location)
                        dim.playSound("weather.meteor.woosh_far", player.location, { volume: 0.44 })
                    } else {
                        player.spawnParticle("mm:meteor_shower_ambient_stars_farther", player.location)
                        dim.playSound("weather.meteor.woosh_far", player.location, { volume: 0.25 })

                    }
                }
            }
        }
        player.setDynamicProperty("mm:meteor_timer", meteorTimer - 1)
    }
})




//meteor behaviour

const passables = [
    "mm:flickerwick_light",
    "mm:soul_flickerwick_light",
    "mm:sparkling_flickerwick_light",
    "mm:copper_flickerwick_light",
    "mm:revoid_light",
    "minecraft:air",
    "minecraft:snow_layer",
    "minecraft:water"
]

function meteorExplosion(dim, loc, meteorProjectile) {
    dim.playSound("weather.meteor.explode", loc, { pitch: 1, volume: 1 })
    dim.playSound("spell.terraform.platform_rise", loc, { pitch: 1 })
    dim.spawnParticle("mm:meteor_groundhit", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_hit_0", loc)
    const damage = 45
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 8 })
    for (const target of bonusTargets) {
        if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            var effDamage = damage * clampValue(((6 - getDistanceBetween(target, meteorProjectile)) / 6), 0.1, 1)
            effDamage = Math.round(effDamage * 10) / 10
            var dmgDone = false
            const difficulty = world.getDifficulty()
            if (difficulty !== "Peaceful") dmgDone = target.applyDamage(effDamage, { cause: "entityExplosion", damagingEntity: meteorProjectile })
            if (difficulty == "Peaceful") dmgDone = target.applyDamage(effDamage, { cause: "entityExplosion" })
            if (dmgDone) {
                target.setOnFire(1)
                const direction = getDirection(loc, target.location);
                target.applyKnockback(makeVector(direction, 1), 0.45);
            }
        }
    }
    if (Math.random() > 0.75) {
        var placeSpot = dim.getTopmostBlock({ x: loc.x, z: loc.z }, loc.y + 2)
        if (placeSpot) {
            placeSpot = placeSpot.below()
            if (!passables.includes(placeSpot.typeId)) placeSpot = placeSpot.above()
            if (passables.includes(placeSpot.below().typeId)) placeSpot = placeSpot.below()
            if (passables.includes(placeSpot.typeId) && !passables.includes(placeSpot.below().typeId)) {
                if (!cannotPlaceOn.includes(placeSpot.below().typeId)) {
                    placeSpot.setType("mm:fallen_meteor")
                    dim.spawnParticle("mm:meteor_distance_beam", {
                        x: loc.x,
                        y: placeSpot.y + 2,
                        z: loc.z
                    })
                }
            }
        }
    }
    const tickingAreaManager = world.tickingAreaManager;
    const tickId = `mm:anchor_${meteorProjectile.id}`
    tickingAreaManager.createTickingArea(tickId, {
        dimension: dim,
        from: loc,
        to: loc
    })
    system.runTimeout(() => {

        tickingAreaManager.removeTickingArea(tickId)
    }, 20)
    meteorProjectile.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:meteorite") {
        const world = entity.getProperty("mm:world_meteor")
        if (!world) return;
        meteorExplosion(dim, loc, entity)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:meteorite") {
        const world = entity.getProperty("mm:world_meteor")
        if (!world) return;
        meteorExplosion(dim, loc, entity)
    }
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    if (event.eventId !== "mm:create_light") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:meteorite") return;
    const dim = entity.dimension;
    const blockSpace = dim.getBlock(entity.location).above()
    if (!blockSpace) return;
    if (blockSpace.isAir || blockSpace.getComponent("mm:flickerwick_light")) {
        blockSpace.setType("mm:soul_flickerwick_light")
    }
    entity.runCommand("fill ~1 ~ ~0 ~-1 ~-3 ~0 air replace snow_layer")
    entity.runCommand("fill ~0 ~ ~1 ~ ~-3 ~-1 air replace snow_layer")
})



const cannotPlaceOn = [
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
    "minecraft:frosted_ice",

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
    "mm:revoid_light"
]
