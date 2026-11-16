
import {
    world,
    system,
    MolangVariableMap
} from "@minecraft/server";

import { effectColours, effectIds, addCustomEffect } from "./main.js"

const splashRange = 4.5

const effectData = [
    ["fire_resistance", 720, 0],
    ["invisibility", 720, 0],
    ["jump_boost", 90, 2],
    ["night_vision", 720, 0],
    ["regeneration", 90, 2],
    ["slow_falling", 480, 0],
    ["speed", 90, 2],
    ["water_breathing", 720, 0],
    ["haste", 90, 1],
    ["metallurgy", 300, 0],
    ["reduction", 30, 0],
    ["blindness", 20, 0],
    ["fragile", 60, 0]
]

function validTarget(target) {
    return target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] })
}

function getDuration(effectId) {
    for (const duration of effectData) {
        if (duration[0] == effectId) return duration[1]
    }
}

function getLevel(effectId) {
    for (const duration of effectData) {
        if (duration[0] == effectId) return duration[2]
    }
}


function setEffectId(potion) {
    const variant = potion.getComponent("minecraft:variant")
    if (!variant) return "fire_resistance"
    for (let i = 0; i < effectData.length; i++) {
        if (variant.value == i) return effectData[i][0]
    }
}
function getDistanceBetween(target, eloc) {
    const tloc = target.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}
function splashCustom(effectId, target, loc, dim) {
    var duration = getDuration(effectId)
    const amp = getLevel(effectId)
    var pct = 1 - (getDistanceBetween(target, loc) / splashRange)
    duration = duration * pct
    addCustomEffect(target, effectId, Math.ceil(duration) * 20, amp)
}
function splashDefault(effectId, target, loc, dim) {
    var duration = getDuration(effectId)
    const amp = getLevel(effectId)
    var pct = 1 - (getDistanceBetween(target, loc) / splashRange)
    duration = duration * pct
    target.addEffect(effectId, Math.ceil(duration) * 20, { amplifier: amp })
}

function potionHit(dim, loc, potion, owner, hitEntity) {
    const effectId = setEffectId(potion)
    var rgbMap = new MolangVariableMap()
    for (const colours of effectColours) {
        if (colours[0] == effectId) {

            rgbMap.setColorRGB("variable.color", { red: colours[1][0] / 255, green: colours[1][1] / 255, blue: colours[1][2] / 255 })
        }
    }
    dim.spawnParticle("mm:splash_potion", loc, rgbMap)
    dim.spawnParticle("mm:splash_potion_2", loc, rgbMap)
    dim.playSound("amethyst_bottle.shatter", loc, { volume: 3, pitch: Math.random() * 0.2 + 0.9 })
    if (effectIds.includes(effectId)) {
        const targets = dim.getPlayers({ location: loc, maxDistance: splashRange })
        for (const target of targets) {
            if (validTarget(target) && target !== hitEntity) {
                splashCustom(effectId, target, loc, dim)
            }
            if (validTarget(target) && target == hitEntity) {
                addCustomEffect(target, effectId, getDuration(effectId) * 20, getLevel(effectId))
            }
        }
    } else {
        const targets = dim.getEntities({ location: loc, maxDistance: splashRange })
        for (const target of targets) {
            if (validTarget(target) && target !== hitEntity) splashDefault(effectId, target, loc, dim)
            if (validTarget(target) && target == hitEntity) target.addEffect(effectId, getDuration(effectId) * 20, { amplifier: getLevel(effectId) })
        }

    }
    potion.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (entity.typeId == "mm:amethyst_splash_potion") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        potionHit(dim, loc, entity, owner, null)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (entity.typeId == "mm:amethyst_splash_potion") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        potionHit(dim, loc, entity, owner, hit)
    }
})
