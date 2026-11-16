import {
    world,
    system,
    MolangVariableMap
} from "@minecraft/server";

export const effectIds = [
    "metallurgy",
    "reduction",
    "enflamed",
    "fragile",
    "electrified"
]

export const effectColours = [
    ["fire_resistance", [255, 153, 0]],
    ["haste", [217, 192, 67]],
    ["invisibility", [246, 246, 246]],
    ["jump_boost", [253, 255, 132]],
    ["night_vision", [194, 255, 102]],
    ["regeneration", [205, 92, 171]],
    ["slow_falling", [243, 207, 185]],
    ["speed", [51, 235, 255]],
    ["water_breathing", [152, 218, 192]],
    ["metallurgy", [170, 163, 178]],
    ["reduction", [210, 108, 83]],
    ["blindness", [31, 31, 35]],
    ["enflamed", [210, 20, 20]],
    ["fragile", [255, 217, 0]],
    ["electrified", [0, 89, 249]]
]

function addCustomEffect(player, effectId, ticks, amplifier) {
    const durationScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_time")
    const levelScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_lvl")
    if (durationScoreboard == undefined || levelScoreboard == undefined) return;
    if (durationScoreboard.hasParticipant(player.scoreboardIdentity)) {
        if (levelScoreboard.getScore(player) > amplifier) {
            return false;
        }
        if (levelScoreboard.getScore(player) <= amplifier && durationScoreboard.getScore(player) >= ticks) {
            return false;
        }
    }
    durationScoreboard.setScore(player, ticks)
    levelScoreboard.setScore(player, amplifier)
    player.onScreenDisplay.setTitle(`§mm:${effectId}: `)
    return true
}
function removeCustomEffect(player, effectId) {
    const durationScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_time")
    const levelScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_lvl")
    if (durationScoreboard == undefined || levelScoreboard == undefined) return;
    if (durationScoreboard.hasParticipant(player.scoreboardIdentity)) {
        durationScoreboard.removeParticipant(player)
        levelScoreboard.removeParticipant(player)
        player.onScreenDisplay.setTitle(`§mm:${effectId}:`)
    }
}

function getAllCustomEffects(player) {
    const returnArray = []
    for (const effectId of effectIds) {
        const durationScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_time")
        const levelScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_lvl")
        if (durationScoreboard == undefined || levelScoreboard == undefined) continue;
        for (const test of player.dimension.getPlayers({ scoreOptions: [{ objective: "mm:" + effectId + "_time", minScore: 0 }] })) {
            if (player == test) {
                let element = [effectId, durationScoreboard.getScore(player), levelScoreboard.getScore(player)]
                returnArray.push(element)
            }
        }
    }
    return returnArray;
}

export { addCustomEffect, removeCustomEffect, getAllCustomEffects }



world.afterEvents.worldLoad.subscribe((e) => {
    for (const effectId of effectIds) {
        if (!world.scoreboard.getObjective("mm:" + effectId + "_time")) {
            world.scoreboard.addObjective("mm:" + effectId + "_time")
        }

        if (!world.scoreboard.getObjective("mm:" + effectId + "_lvl")) {
            world.scoreboard.addObjective("mm:" + effectId + "_lvl")
        }
    }
})

system.runInterval(() => {
    for (const effectId of effectIds) {
        const durationScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_time")
        const levelScoreboard = world.scoreboard.getObjective("mm:" + effectId + "_lvl")
        if (durationScoreboard == undefined || levelScoreboard == undefined) continue;
        for (const player of world.getPlayers({ scoreOptions: [{ objective: "mm:" + effectId + "_time", minScore: 0 }] })) {
            triggerEffect(player, effectId, levelScoreboard.getScore(player) + 1)
            durationScoreboard.addScore(player, -1)
            if (durationScoreboard.getScore(player) == 0) {
                removeCustomEffect(player, effectId)
            }
        }
    }
})



function triggerEffect(player, effectId, level) {
    if (player.getGameMode() !== "Spectator") {
        const particleChance = Math.random()
        if (particleChance > 0.82) {
            var rgbMap = new MolangVariableMap()
            for (const colours of effectColours) {
                if (colours[0] == effectId) {

                    rgbMap.setColorRGB("variable.color", { red: colours[1][0] / 255, green: colours[1][1] / 255, blue: colours[1][2] / 255 })
                }
            }
            player.dimension.spawnParticle("mm:potion_ambient", player.location, rgbMap)
        }
    }
    player.onScreenDisplay.setTitle(`§mm:${effectId}: `)
    if (effectId == "metallurgy") {
        if (player.isInWater && !player.isOnGround && !player.isFlying) {
            player.applyImpulse({ x: 0, y: -0.025 * level, z: 0 })
        }
    }
    if (effectId == "enflamed") {
    }
}

world.beforeEvents.entityHurt.subscribe((e) => {
    const cause = e.damageSource.cause;
    if (cause == "selfDestruct" || cause == "override") return;
    const hurt = e.hurtEntity
    if (!hurt || !hurt.isValid || hurt.typeId !== "minecraft:player") return;
    const durationScoreboard = world.scoreboard.getObjective("mm:fragile_time")
    const levelScoreboard = world.scoreboard.getObjective("mm:fragile_lvl")
    if (durationScoreboard == undefined || levelScoreboard == undefined) return;
    const lvl = levelScoreboard.getScore(hurt)
    if (lvl == undefined) return;
    const multiplier = 1 + (lvl + 1 * 0.15)
    e.damage = e.damage * multiplier
})


world.afterEvents.itemCompleteUse.subscribe((e) => {
    const { itemStack, source } = e;
    if (itemStack.typeId == "minecraft:milk_bucket") {
        for (const effectId of effectIds) {
            removeCustomEffect(source, effectId)
        }
    }
})
world.afterEvents.entityDie.subscribe((e) => {
    const dead = e.deadEntity;
    if (!dead.isValid) return;
    if (dead.typeId == "minecraft:player") {
        for (const effectId of effectIds) {
            removeCustomEffect(dead, effectId)
        }
    }
})
system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:remove_custom_effects") return;
    const source = e.sourceEntity;
    for (const effectId of effectIds) {
        removeCustomEffect(source, effectId)
    }

})


import "./effectcustom.js"
import "./splashPotions.js"
import "./stun.js"