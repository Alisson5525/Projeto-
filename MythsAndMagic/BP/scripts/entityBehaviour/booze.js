import {
    world,
    system,
    EntityDamageCause,
    ItemStack
} from "@minecraft/server";

import { getAllCustomEffects, addCustomEffect } from "customEffects/main.js"

function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

function getIngredients(entity) {
    let returnarray = []
    returnarray.push(entity.getDynamicProperty("mm:ingredient_0"))
    returnarray.push(entity.getDynamicProperty("mm:ingredient_1"))
    returnarray.push(entity.getDynamicProperty("mm:ingredient_2"))
    returnarray.push(entity.getDynamicProperty("mm:ingredient_3"))
    return returnarray
}

function getPotion(type) {

    switch (type) {
        case "water_breathing":
            return "mm:booze_potion_waterbreathing_long"
        case "fire_resistance":
            return "mm:booze_potion_fireresistance_long"
        case "invisibility":
            return "mm:booze_potion_invisibility_long"
        case "night_vision":
            return "mm:booze_potion_nightvision_long"
        case "slow_falling":
            return "mm:booze_potion_slowfalling_long"
        case "speed":
            return "mm:booze_potion_speed_strong"
        case "regeneration":
            return "mm:booze_potion_regeneration_strong"
        case "jump_boost":
            return "mm:booze_potion_jumpboost_strong"
        case "haste":
            return "mm:booze_potion_haste"
        case "metallurgy":
            return "mm:booze_potion_metallurgy"
        case "reduction":
            return "mm:booze_potion_reduction"
        case "blindness":
            return "mm:booze_potion_blindness"
        case "fragile":
            return "mm:booze_potion_fragile"
        default:
            return "mm:amethyst_bottle"
    }
}

const ingredients = [
    "minecraft:redstone",
    "minecraft:glowstone_dust",
    "minecraft:gunpowder",
    "minecraft:blaze_powder",
    "minecraft:nether_wart",
    "minecraft:magma_cream",
    "minecraft:sugar",
    "minecraft:rabbit_foot",
    "minecraft:ghast_tear",
    "minecraft:pufferfish",
    "minecraft:golden_carrot",
    "minecraft:phantom_membrane",
    "minecraft:gold_ingot",
    "mm:azsilva_carrot",
    "mm:alchatite_ingot",
    "minecraft:fermented_spider_eye",
    "minecraft:resin_clump",
    "mm:vampire_fang",
    "mm:glowstone_spike"
]

const recipes = [
    [["minecraft:glowstone_dust", "minecraft:nether_wart", "minecraft:sugar", "minecraft:sugar"], "speed"],
    [["minecraft:magma_cream", "minecraft:magma_cream", "minecraft:nether_wart", "minecraft:redstone"], "fire_resistance"],
    [["minecraft:pufferfish", "minecraft:pufferfish", "minecraft:nether_wart", "minecraft:redstone"], "water_breathing"],
    [["minecraft:ghast_tear", "minecraft:ghast_tear", "minecraft:nether_wart", "minecraft:glowstone_dust"], "regeneration"],
    [["minecraft:rabbit_foot", "minecraft:rabbit_foot", "minecraft:nether_wart", "minecraft:glowstone_dust"], "jump_boost"],
    [["minecraft:phantom_membrane", "minecraft:phantom_membrane", "minecraft:nether_wart", "minecraft:redstone"], "slow_falling"],
    [["minecraft:golden_carrot", "minecraft:golden_carrot", "minecraft:nether_wart", "minecraft:redstone"], "night_vision"],
    [["mm:azsilva_carrot", "mm:azsilva_carrot", "minecraft:nether_wart", "minecraft:redstone"], "invisibility"],
    [["minecraft:gold_ingot", "minecraft:gold_ingot", "minecraft:nether_wart", "minecraft:glowstone_dust"], "haste"],
    [["mm:alchatite_ingot", "mm:alchatite_ingot", "minecraft:nether_wart", "minecraft:gunpowder"], "metallurgy"],
    [["minecraft:resin_clump", "minecraft:resin_clump", "minecraft:nether_wart", "minecraft:fermented_spider_eye"], "reduction"],
    [["mm:vampire_fang", "minecraft:fermented_spider_eye", "minecraft:nether_wart", "minecraft:fermented_spider_eye"], "blindness"],
    [["mm:glowstone_spike", "mm:glowstone_spike", "minecraft:nether_wart", "minecraft:gunpowder"], "fragile"]
]

world.afterEvents.playerInteractWithEntity.subscribe((e) => {
    const { beforeItemStack, player, target } = e;

    if (target.typeId == "mm:booze") {
        if (!beforeItemStack) return;
        if (beforeItemStack.typeId == "minecraft:glass_bottle") {
            target.dimension.playSound("mob.booze.reject", target.location)
        }
        if (beforeItemStack.typeId == "mm:amethyst_bottle") {

            const moodLvl = target.getProperty("mm:mood")
            const currentType = target.getProperty("mm:potion")
            if (moodLvl == 4) {
                const newPotion = new ItemStack(getPotion(currentType), 1)
                if (beforeItemStack.amount == 1) {
                    player.getComponent("equippable").setEquipment("Mainhand", newPotion)
                } else {
                    beforeItemStack.amount -= 1
                    player.getComponent("equippable").setEquipment("Mainhand", beforeItemStack)
                    system.runTimeout(() => {

                        player.dimension.spawnItem(newPotion, player.location)
                    }, 1)
                }

                target.setDynamicProperty(`mm:ingredient_0`, undefined)
                target.setDynamicProperty(`mm:ingredient_1`, undefined)
                target.setDynamicProperty(`mm:ingredient_2`, undefined)
                target.setDynamicProperty(`mm:ingredient_3`, undefined)
                target.setProperty("mm:mood", 0)
                target.setProperty("mm:potion", "none")
                target.dimension.playSound("mob.booze.bottled", target.location)

                target.triggerEvent("mm:become_tired")


            } else {
                target.dimension.playSound("mob.booze.reject", target.location)

            }
            return;
        }
        if (!ingredients.includes(beforeItemStack.typeId)) return;
        const moodLvl = target.getProperty("mm:mood")
        if (moodLvl < 4) {
            target.setDynamicProperty(`mm:ingredient_${moodLvl}`, beforeItemStack.typeId)
            target.setProperty("mm:mood", moodLvl + 1)
            if (moodLvl < 3) {
                target.dimension.playSound("mob.booze.consume" + (moodLvl + 1), target.location)
            }
            if (moodLvl == 3) {
                var swalloedIngredients = getIngredients(target)
                swalloedIngredients = swalloedIngredients.sort()
                for (const recipe of recipes) {
                    let recipeSorted = recipe[0].sort()
                    if (recipeSorted[0] == swalloedIngredients[0] && recipeSorted[1] == swalloedIngredients[1] && recipeSorted[2] == swalloedIngredients[2] && recipeSorted[3] == swalloedIngredients[3]) {
                        target.dimension.playSound("mob.booze.transform", target.location)
                        target.setProperty("mm:potion", recipe[1])
                    }

                }
                system.runTimeout(() => {
                    if (target.getProperty("mm:potion") == "none") {

                        target.setDynamicProperty(`mm:ingredient_0`, undefined)
                        target.setDynamicProperty(`mm:ingredient_1`, undefined)
                        target.setDynamicProperty(`mm:ingredient_2`, undefined)
                        target.setDynamicProperty(`mm:ingredient_3`, undefined)
                        target.setProperty("mm:mood", 0)
                        target.setProperty("mm:potion", "none")
                        target.applyDamage(1)
                        target.dimension.playSound("mob.booze.vomit", target.location)
                        const spellCharges = new ItemStack("mm:spell_charge", Math.round(Math.random() * 2) + 1)
                        target.dimension.spawnItem(spellCharges, target.location)
                        target.triggerEvent("mm:become_tired_short")
                        target.playAnimation("animation.booze.spoil")
                    }
                }, 1)
            }
        } else {

            target.dimension.playSound("mob.booze.reject", target.location)
        }
    }
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:stop_being_tired") return;
    if (e.entity.typeId == "mm:booze") {
        e.entity.dimension.playSound("mob.booze.regenerate", e.entity.location)
    }
})













// projectile

function spellChargeBurst(dim, loc, entity, owner) {
    dim.spawnParticle("mm:spell_charge_smoke", loc)
    dim.spawnParticle("mm:spell_charge_eruption", loc)
    dim.spawnParticle("mm:spell_charge_burst", loc)
    dim.playSound("mob.slime.big", loc, { volume: 3, pitch: 1.5 })
    dim.playSound("bottle.empty", loc, { volume: 3, pitch: 1 })
    const targets = dim.getEntities({ location: loc, maxDistance: 2.5 })
    for (const target of targets) {

        if (owner) {
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                const potions = owner.getEffects()
                target.applyDamage(1, { cause: EntityDamageCause.magic, damagingEntity: owner })
                for (const potion of potions) {
                    const amp = potion.amplifier
                    const id = potion.typeId
                    var duration = potion.duration
                    if (duration == -1) {
                        duration = 9999
                    }
                    duration = clampValue(duration, 20, 1200)
                    target.addEffect(id, duration, { amplifier: amp })
                }
                if (target.typeId == "minecraft:player") {
                    const customPotions = getAllCustomEffects(owner)
                    for (const customPotion of customPotions) {
                        const amp = customPotion[2]
                        const id = customPotion[0]
                        var duration = customPotion[1]
                        if (duration == -1) {
                            duration = 9999
                        }
                        duration = clampValue(duration, 20, 1200)
                        addCustomEffect(target, id, duration, amp)

                    }
                }
            }
        } else {
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.applyDamage(1, { cause: EntityDamageCause.magic })
            }
        }
    }

    entity.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (entity.typeId == "mm:spell_charge") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        spellChargeBurst(dim, loc, entity, owner)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (entity.typeId == "mm:spell_charge") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        spellChargeBurst(dim, loc, entity, owner)
    }
})

world.afterEvents.entitySpawn.subscribe((e) => {
    const entity = e.entity;
    if (entity.typeId == "mm:spell_charge") {
        const loc = entity.location;
        const dim = entity.dimension;
        dim.playSound("mob.slime.attack", loc, { volume: 3, pitch: 1 })
    }
})