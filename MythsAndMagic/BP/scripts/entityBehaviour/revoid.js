
import {
    world,
    system,
    DimensionTypes,
    EntityDamageCause
} from "@minecraft/server";

const passableBlocks = [
    "minecraft:air",
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:lava",
    "minecraft:snow_layer",
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
    "mm:revoid_light"
]

system.runInterval(() => {
    for (const dimId of DimensionTypes.getAll()) {
        const dimension = world.getDimension(dimId.typeId)
        for (const revoid of dimension.getEntities({ type: "mm:revoid" })) {

            revoid.runCommand("scriptevent mm:revoid_attempt_crouch")
            revoid.runCommand("scriptevent mm:revoid_attempt_stand")

        }
    }
}, 20)
system.runInterval(() => {
    for (const dimId of DimensionTypes.getAll()) {
        const dimension = world.getDimension(dimId.typeId)
        for (const revoid of dimension.getEntities({ type: "mm:revoid", scoreOptions: [{ objective: 'mm:revoid_scream', minScore: -10 }] })) {
            const duration = world.scoreboard.getObjective("mm:revoid_scream")
            if (duration.getScore(revoid) > 0) {
                duration.addScore(revoid, -1)
            }
            var players = dimension.getPlayers({ location: revoid.location, maxDistance: 16 })
            for (const player of players) {
                player.runCommand("camerashake add @s 0.02 2")
            }
            players = dimension.getPlayers({ location: revoid.location, maxDistance: 32 })
            for (const player of players) {
                player.runCommand("camerashake add @s 0.01 2")
            }
            if (duration.getScore(revoid) <= 0) {
                duration.setScore(revoid, 380)
                revoid.triggerEvent("mm:loud_scream")
            }
        }
    }
})
function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:loud_scream") return;
    const entity = e.entity;
    for (const player of entity.dimension.getPlayers({ location: entity.location, maxDistance: 96 })) {
        const dist = getDistanceBetween(player, entity)
        var vol = 1
        if (dist > 16) {
            vol = 0.8
        }
        if (dist > 32) {
            vol = 0.65
        }
        if (dist > 48) {
            vol = 0.5
        }
        if (dist > 64) {
            vol = 0.35
        }
        player.playSound("mob.revoid.chase", { volume: vol })
    }

})

world.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId == "mm:red_splinters") {
        attacker.remove()
    }
})

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:revoid_attempt_crouch") return;
    const { sourceEntity } = e;
    if (sourceEntity.typeId !== "mm:revoid") return;
    if (sourceEntity.getProperty("mm:crouched") == true) return;
    if (sourceEntity.hasTag("mm:state_cooldown")) return;
    const blockLoc = sourceEntity.dimension.getBlock(sourceEntity.location)
    if (blockLoc == undefined) return;
    var isSolidInWay = false;
    if (!passableBlocks.includes(blockLoc.east().above(2).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.east().above(3).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.north().above(2).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.north().above(3).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.west().above(2).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.west().above(3).typeId)) isSolidInWay = true


    if (!passableBlocks.includes(blockLoc.south().above(2).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.south().above(3).typeId)) isSolidInWay = true


    if (!passableBlocks.includes(blockLoc.above(2).typeId)) isSolidInWay = true
    if (!passableBlocks.includes(blockLoc.above(3).typeId)) isSolidInWay = true

    if (isSolidInWay == true) {
        sourceEntity.triggerEvent("mm:crouch")
    }
})
system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:revoid_attempt_stand") return;
    const { sourceEntity } = e;
    if (sourceEntity.typeId !== "mm:revoid") return;
    if (sourceEntity.getProperty("mm:crouched") == false) return;
    if (sourceEntity.hasTag("mm:state_cooldown")) return;
    const blockLoc = sourceEntity.dimension.getBlock(sourceEntity.location)
    if (blockLoc == undefined) return;
    var isSolidInWay = true;
    if (blockLoc.east() == undefined) return;
    if (!passableBlocks.includes(blockLoc.east().above(2).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.east().above(3).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.north().above(2).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.north().above(3).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.west().above(2).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.west().above(3).typeId)) isSolidInWay = false


    if (!passableBlocks.includes(blockLoc.south().above(2).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.south().above(3).typeId)) isSolidInWay = false


    if (!passableBlocks.includes(blockLoc.above(2).typeId)) isSolidInWay = false
    if (!passableBlocks.includes(blockLoc.above(3).typeId)) isSolidInWay = false

    if (isSolidInWay == true) {
        sourceEntity.triggerEvent("mm:stand")
    }
})

world.afterEvents.playerSpawn.subscribe((e) => {
    e.player.runCommand("execute as @s at @s unless entity @e[type=mm:revoid,r=64] run stopsound @s mob.revoid.chase")
})

world.afterEvents.entityDie.subscribe((e) => {
    const dead = e.deadEntity;
    if (!dead) return;
    if (!dead.isValid) return;
    if (dead.typeId == "mm:revoid") {
        const playerNear = dead.dimension.getPlayers(({ location: dead.location, maxDistance: 128 }))
        for (const player of playerNear) {
            player.runCommand("stopsound @s mob.revoid.chase")
        }
    }
})