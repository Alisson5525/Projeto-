import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import { clampValue, getCurrentMana, getMana, debugMessage, getCooldown, getDurability, updateLore, getCost, getElement, getElementColour, getLore, spellList } from "magicSystem/main.js";

import { refundMana } from "magicSystem/spellcasting.js"

import { runSpell } from "magicSystem/magicTriggered.js"

const usableSpells = [
    "mm:burst",
    "mm:icicle",
    "mm:thunderbolt",
    "mm:supersonic",
    "mm:retrieval",
    "mm:toxic",
    "mm:quake",
    "mm:purify",
    "mm:shadow",
    "mm:terraform",
    "mm:hurricane",
    "mm:guardian"
]
const projectileSpells = [
    "mm:hellfire",
    "mm:spark"
]
const disableBaseElementParticle = [
    "mm:thunderbolt",
    "mm:toxic",
    "mm:shadow",
    "mm:guardian"
]

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:staff", {
        onBeforeDurabilityDamage(e) {
            if (e.durabilityDamage > 0) e.durabilityDamage = 0
        }
    })
})

world.afterEvents.itemUse.subscribe((e) => {
    const item = e.itemStack;
    if (item.getComponent("mm:staff")) {
        const player = e.source;
        if (player.getItemCooldown("spell") > 0) return;
        player.startItemCooldown("spell", 20)
        player.playAnimation("animation.player.inspect_staff")
    }
    return;
})


world.afterEvents.playerSwingStart.subscribe((e) => {
    if (e.swingSource == "DropItem") return;
    if (e.swingSource == "Interact") return;
    const player = e.player;
    const item = e.heldItemStack
    const dim = player.dimension
    var loc = player.getHeadLocation()
    const vd = player.getViewDirection()
    if (!item) return;
    if (!item.getComponent("mm:staff") || !item.hasTag("mm:spell_caster")) return;
    var cooldownTime = 30


    if (player.getDynamicProperty("mm:altered") == true) {
        player.runCommand("camerashake add @s 0.25 0.25")
        player.playSound("item.spellbook.disabled")
        return
    }

    const spell = item.getDynamicProperty("mm:spell")
    if (spell == undefined) {
        player.sendMessage("§7§oIt is empty...")
        dim.playSound("item.spellstaff.fail", loc)
        return;
    }
    var manaCost = getMana(spell)
    const equipment = player.getComponent("minecraft:equippable")
    const offHand = equipment.getEquipment("Offhand")
    if (player.hasTag("novelty:mm:shivering_amulet")) {
        manaCost = manaCost * 2 / 3
    } else if (offHand) {
        if (offHand.hasTag("mm:shivering_amulet")) manaCost = manaCost * 2 / 3
    }
    if (getCurrentMana(player) < manaCost) {
        player.sendMessage("§7§oNot enough mana")
        dim.playSound("item.spellstaff.fail", loc)
        if (projectileSpells.includes(spell) || usableSpells.includes(spell)) dim.spawnParticle("minecraft:ice_evaporation_emitter", { x: loc.x + vd.x * (2.5), y: loc.y + vd.y * (2.5), z: loc.z + vd.z * (2.5) })
        return;
    } else {
        player.setDynamicProperty("mm:mana", getCurrentMana(player) - manaCost)
        debugMessage(`§7${player.nameTag} used §d${manaCost} Mana§7.`)
    }
    player.runCommand("scriptevent mm:spellcast_staff")
    if (offHand) {
        if (offHand.hasTag("mm:amulet")) {
            if (player.getGameMode() !== "Creative") {
                const am_durability = offHand.getComponent("minecraft:durability")

                if (am_durability.damage + 1 < am_durability.maxDurability) {
                    am_durability.damage += 1;
                    equipment.setEquipment("Offhand", offHand)
                } else {
                    let core = new ItemStack("mm:amulet_core", 1)
                    equipment.setEquipment("Offhand", core)

                    player.dimension.playSound(offHand.typeId.replace("mm:", "item.break."), player.location, { volume: 1, pitch: 0.5 })

                }
            }
        }
    }


    if (player.getGameMode() !== "Creative") {
        const equipment = player.getComponent("equippable");
        const durability = item.getComponent("durability");
        const unbreaking = item.getComponent("enchantable")?.getEnchantment("unbreaking");
        const chance = unbreaking ? 1 / (unbreaking.level + 1) : 1;

        let damage = 0;
        const duraDamage = Math.ceil(getCost(spell) * 0.5);
        for (let i = 0; i < duraDamage; i++) {
            if (Math.random() <= chance) damage++;
        }

        if (damage > 0) {
            if (durability.damage + damage < durability.maxDurability) {
                durability.damage += damage;
                equipment.setEquipment("Mainhand", item);
            } else {
                equipment.setEquipment("Mainhand", undefined);
                player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 1 });
            }
        }
    }

    const cooldownAdd = getCooldown(spell)
    cooldownTime += cooldownAdd
    if (player.hasTag("novelty:mm:blazing_amulet")) {
        cooldownTime = cooldownTime * 2 / 3
    } else if (offHand) {
        if (offHand.hasTag("mm:blazing_amulet")) cooldownTime = cooldownTime * 2 / 3
    } else {
    }
    if (player.hasTag("novelty:mm:shivering_amulet")) {
        cooldownTime = cooldownTime * 4 / 3
    } else if (offHand) {
        if (offHand.hasTag("mm:shivering_amulet")) cooldownTime = cooldownTime * 4 / 3
    }
    if (player.hasTag("novelty:mm:altered_amulet")) {
        let hp = player.getComponent("health")
        if (hp.currentValue - 2 > 0) {
            hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
        }
    } else if (offHand) {
        if (offHand.hasTag("mm:altered_amulet")) {
            let hp = player.getComponent("health")
            if (hp.currentValue - 2 > 0) {
                hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
            }
        }
    }
    var hit = false
    var triggered = false
    var hitLoc = undefined
    player.dimension.playSound("item.spellstaff.success", loc)
    if (!usableSpells.includes(spell)) {
        const spawnLoc = { x: loc.x + vd.x * (2.5), y: loc.y + vd.y * (2.5), z: loc.z + vd.z * (2.5) }
        const spellWorked = runSpell(player, spell, 3, spawnLoc, true)
        if (spellWorked == false) {
            refundMana(player, manaCost, 1)
            cooldownTime -= getCooldown(spell) * 0.7
        }
        triggered = true

    } else {
        for (let i = 0; i < 80; i++) {
            system.runTimeout(() => {
                if (triggered) return;
                const particleLoc = { x: loc.x + vd.x * (i * 1.2 + 2.5), y: loc.y + vd.y * (i * 1.2 + 2.5), z: loc.z + vd.z * (i * 1.2 + 2.5) }
                if (dim.isChunkLoaded(particleLoc)) {
                    if (hit) {
                        if (!hitLoc) hitLoc = particleLoc
                        if (dim.isChunkLoaded(hitLoc) == false) return;
                        const spellWorked = runSpell(player, spell, 3, hitLoc, true)
                        if (spellWorked == false) {
                            refundMana(player, manaCost, 1)
                            dim.spawnParticle("minecraft:ice_evaporation_emitter", hitLoc)
                        }
                        triggered = true
                        return;
                    } else {
                        const element = getElement(spell)
                        if (!disableBaseElementParticle.includes(spell)) {
                            const blockloc = dim.getBlock(particleLoc)
                            if (blockloc && element == "fire") {
                                if (blockloc.isLiquid) dim.spawnParticle("minecraft:ice_evaporation_emitter", particleLoc)
                                if (!blockloc.isLiquid) dim.spawnParticle("mm:staff_" + element, particleLoc)
                            } else {
                                dim.spawnParticle("mm:staff_" + element, particleLoc)
                            }
                        }
                        dim.spawnParticle(spell.replace("mm:", "mm:staff_trail_") + "_1", particleLoc)
                        dim.spawnParticle(spell.replace("mm:", "mm:staff_trail_") + "_2", particleLoc)
                        if (dim.isChunkLoaded(particleLoc) && !dim.isChunkLoaded({ x: loc.x + vd.x * ((3 + i) * 1.2 + 2.5), y: loc.y + vd.y * ((3 + i) * 1.2 + 2.5), z: loc.z + vd.z * ((3 + i) * 1.2 + 2.5) })) hit = true
                        if (i == 78) hit = true
                        if (!hit) {
                            const blockHit = dim.getBlock(particleLoc)
                            if (blockHit.isAir == false && blockHit.isLiquid == false && !passableBlocks.includes(blockHit.typeId)) {
                                hit = true
                                hitLoc = { x: loc.x + vd.x * ((i - 1.5) * 1.2 + 2.5), y: loc.y + vd.y * ((i - 1.5) * 1.2 + 2.5), z: loc.z + vd.z * ((i - 1.5) * 1.2 + 2.5) }
                                /*const topLoc = dim.getTopmostBlock({ x: blockHit.x, z: blockHit.z }, blockHit.y + 3).location;
                                if (topLoc.y < blockHit.y + 3) {
                                    hitLoc = { x: blockHit.x, y: topLoc.y + 1, z: blockHit.z }
                                } else {
                                    hitLoc = { x: blockHit.x, y: blockHit.y + 1, z: blockHit.z }
                                }*/

                            }
                            if (!hit) {
                                var radius = 2.5
                                if (i < 5) radius = 1
                                const entities = dim.getEntities({ maxDistance: radius, location: particleLoc })
                                for (const target of entities) {
                                    if (target == player) continue;
                                    if (target.matches({ families: ["ignore"] })) continue;
                                    if (target.matches({ families: ["debug"] })) continue;
                                    if (
                                        !target.matches({ families: ["monster"] }) &&
                                        !target.matches({ families: ["mob"] }) &&
                                        !target.matches({ families: ["animal"] }) &&
                                        !(target.matches({ families: ["player"] }) && world.gameRules.pvp == true)
                                    ) continue;
                                    hit = true
                                    hitLoc = target.location;
                                    return;
                                }
                            }
                        }
                    }
                } else {
                    i -= 1
                }
            }, i)
        }
    }
    const cd = item.getComponent("minecraft:cooldown")
    player.startItemCooldown(cd.cooldownCategory, cooldownTime);
    return;
})


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
    "mm:revoid_light"
]
