import {
    world,
    system,
    EntityDamageCause
} from "@minecraft/server";

import { validTarget, getElement, applyElementDamage, clampValue, getCurrentMana, getDirection, protEnchantLvl, getMaxMana, makeVector } from "./main.js";
import { addCustomEffect } from "customEffects/main.js"
export function runSpell(source, spell, level, originLoc, staff) {
    const enflamedL = world.scoreboard.getObjective("mm:enflamed_lvl")
    if (enflamedL !== undefined && enflamedL.hasParticipant(source.scoreboardIdentity)) {
        if (getElement(spell) == "fire") {
            level = level + 1 + enflamedL.getScore(source)
        }
    }
    if (source.typeId == "minecraft:player") {
        var doResonance = false
        const equipment = source.getComponent("minecraft:equippable");
        const offHand = equipment.getEquipment("Offhand")
        if (source.hasTag("novelty:mm:resonance_amulet")) {
            doResonance = false
        } else if (offHand) {
            if (offHand.hasTag("mm:resonance_amulet")) doResonance = true
        }
        if (doResonance) {
            const tagId = spell + "_resonance"
            if (source.getDynamicProperty("mm:resonance") == undefined) source.setDynamicProperty("mm:resonance", 0)
            const resonanceLvl = source.getDynamicProperty("mm:resonance")
            if (source.hasTag(tagId) && resonanceLvl < 10) {
                source.setDynamicProperty("mm:resonance", resonanceLvl + 1)
            } else if (!source.hasTag(tagId)) {
                source.setDynamicProperty("mm:resonance", 0)
                for (const tag of source.getTags()) if (tag.includes("_resonance") && tag.includes("mm:")) source.removeTag(tag)
            }
            source.addTag(tagId)
        } else {
            source.setDynamicProperty("mm:resonance", 0)
            for (const tag of source.getTags()) if (tag.includes("_resonance") && tag.includes("mm:")) source.removeTag(tag)
        }
    }

    source.runCommand("scriptevent mm:spell_cast " + `${level}|${spell}`)
    if(!staff) source.runCommand("scriptevent mm:spell_cast_staffless " + `${level}|${spell}`)
    if (staff || originLoc) source.runCommand("scriptevent mm:spell_cast_staff " + `${level}|${spell}|${originLoc.x},${originLoc.y},${originLoc.z}|${staff}`)
    switch (spell) {
        case "mm:launch":
            return launch(source, level, originLoc, staff)
        case "mm:dash":
            return dash(source, level, originLoc, staff)
        case "mm:burst":
            return burst(source, level, originLoc, staff)
        case "mm:bolt":
            return bolt(source, level, originLoc, staff)
        case "mm:icicle":
            return icicle(source, level, originLoc, staff)
        case "mm:terraform":
            return terraform(source, level, originLoc, staff)
        case "mm:supersonic":
            return supersonic(source, level, originLoc, staff)
        case "mm:retrieval":
            return retrieval(source, level, originLoc, staff)
        case "mm:cauterise":
            return cauterise(source, level, originLoc, staff)
        case "mm:overclock":
            return overclock(source, level, originLoc, staff)
        case "mm:siphoning":
            return siphoning(source, level, originLoc, staff)
        case "mm:swap":
            return swap(source, level, originLoc, staff)
        case "mm:glaciate":
            return glaciate(source, level, originLoc, staff)
        case "mm:overheat":
            return overheat(source, level, originLoc, staff)
        case "mm:teleport":
            return teleport(source, level, originLoc, staff)
        case "mm:spark":
            return spark(source, level, originLoc, staff)
        case "mm:quake":
            return quake(source, level, originLoc, staff)
        case "mm:hellfire":
            return hellfire(source, level, originLoc, staff)
        case "mm:toxic":
            return toxic(source, level, originLoc, staff)
        case "mm:roots":
            return roots(source, level, originLoc, staff)
        case "mm:thunderbolt":
            return thunderbolt(source, level, originLoc, staff)
        case "mm:chilling":
            return chilling(source, level, originLoc, staff)
        case "mm:snowflake":
            return snowflake(source, level, originLoc, staff)
        case "mm:shadow":
            return shadow(source, level, originLoc, staff)
        case "mm:purify":
            return purify(source, level, originLoc, staff)
        case "mm:imprison":
            return imprison(source, level, originLoc, staff)
        case "mm:hurricane":
            return hurricane(source, level, originLoc, staff)
        case "mm:snowball":
            return snowball(source, level, originLoc, staff)
        case "mm:guardian":
            return guardian(source, level, originLoc, staff)
        case "mm:meteor":
            return meteor(source, level, originLoc, staff)
        case "mm:entangle":
            return entangle(source, level, originLoc, staff)
        case "mm:cloudsurf":
            return cloudsurf(source, level, originLoc, staff)
        case "mm:cluster":
            return cluster(source, level, originLoc, staff)
        default:
            return true;
    }
}

import "./spellcasting.js";

function launch(player, level) {
    var knockbackTarget = player
    const riding = player.getComponent("minecraft:riding")
    if (riding && riding.entityRidingOn.isValid && riding.entityRidingOn.matches({ families: ["mm_rideable_for_movement_spells"] })) knockbackTarget = riding.entityRidingOn

    const vd = player.getViewDirection()
    const force = 1.5 + (level / 4)
    knockbackTarget.applyKnockback({ x: vd.x * level + 1, z: vd.z * level + 1 }, force)
    knockbackTarget.addEffect("slow_falling", 100)
    player.dimension.playSound("spell.launch", player.location)
}
function dash(player, level) {
    var knockbackTarget = player
    const riding = player.getComponent("minecraft:riding")
    if (riding && riding.entityRidingOn.isValid && riding.entityRidingOn.matches({ families: ["mm_rideable_for_movement_spells"] })) knockbackTarget = riding.entityRidingOn
    const vd = player.getViewDirection()
    const force = 2 + (level / 1.33)
    knockbackTarget.applyKnockback({ x: vd.x * force, z: vd.z * force }, clampValue(vd.y, -5, 5) * (0.75 + (level / 4) * 1.3) + 0.2)
    knockbackTarget.addEffect("slow_falling", 10)
    if (vd.y >= 0) knockbackTarget.addEffect("levitation", 10)
    player.dimension.playSound("spell.dash", player.location)
}
function burst(player, level, loc, staff) {
    if (!loc) loc = player.location;
    var delay = 10
    if (staff) delay = 5
    var water = false
    const block = player.dimension.getBlock({ x: loc.x, y: loc.y + 0.1, z: loc.z })
    if (block.iswaterlogged || (block.isLiquid && block.typeId.includes("water"))) water = true
    if (block.above().iswaterlogged || (block.above().isLiquid && block.above().typeId.includes("water"))) water = true

    if (water == true) {
        player.dimension.playSound("random.fizz", loc)
        player.dimension.spawnParticle("minecraft:ice_evaporation_emitter", loc)
    } else {
        player.dimension.playSound("spell.burst.charge", loc, { pitch: 1.5, volume: 3 })
        player.dimension.spawnParticle("mm:burst_aura", loc)
        player.dimension.spawnParticle("mm:burst_black_smoke", loc)
        system.runTimeout(() => {
            player.dimension.playSound("spell.burst.explode", loc, { pitch: 0.3, volume: 3 })
            player.dimension.spawnParticle("mm:burst_explosion", loc)
            player.dimension.spawnParticle("mm:burst_flames", loc)
            const block = player.dimension.getBlock(loc)
            if (block.above().isAir) block.above().setType("mm:flickerwick_light")
            if (block.above().typeId == "minecraft:water") block.above().setType("mm:flickerwick_light")
            const targets = player.dimension.getEntities({ location: loc, maxDistance: 4.33 })
            for (const target of targets) {
                if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                    target.setOnFire(1 + level)
                    applyElementDamage(5 + level * 4, target, player, EntityDamageCause.fire, "fire")
                }
            }
        }, delay)
    }
}
function bolt(player, level) {
    var knockbackTarget = player
    const riding = player.getComponent("minecraft:riding")
    if (riding && riding.entityRidingOn.isValid && riding.entityRidingOn.matches({ families: ["mm_rideable_for_movement_spells"] })) knockbackTarget = riding.entityRidingOn
    const vd = player.getViewDirection()
    const force = 4
    knockbackTarget.applyKnockback({ x: vd.x * force, z: vd.z * force }, -3)
    knockbackTarget.addEffect("speed", 20 * level, { amplifier: 4 })
    knockbackTarget.addEffect("slow_falling", 2)
    player.dimension.spawnParticle("mm:bolt_spell", player.location)
    player.dimension.playSound("spell.bolt.dash", player.location, { pitch: 0.6 })
    player.dimension.playSound("spell.bolt.magic", player.location, { pitch: 3 })
}
function icicle(player, level, loc, staff) {
    if (!loc) loc = player.location
    var delay = 20
    if (staff) delay = 10
    const spawnLoc = player.dimension.getTopmostBlock({ x: loc.x, z: loc.z }, loc.y).above().location
    const dim = player.dimension;
    system.runTimeout(() => {
        dim.playSound("spell.terraform.platform_rise", spawnLoc, { pitch: 0.6 })
        const icicle = dim.spawnEntity("mm:icicles", spawnLoc)
        icicle.setProperty("mm:level", level)
        icicle.getComponent("minecraft:tameable").tame(player)
    }, delay)
}
function terraform(player, level, baseLoc, staff) {
    if (!baseLoc) baseLoc = player.location
    var loc = baseLoc
    if (!staff) loc = player.dimension.getTopmostBlock({ x: baseLoc.x, z: baseLoc.z }, baseLoc.y).above().location
    const dim = player.dimension;
    if (!staff) {
        var knockbackTarget = player
        const riding = player.getComponent("minecraft:riding")
        if (riding && riding.entityRidingOn.isValid && riding.entityRidingOn.matches({ families: ["mm_rideable_for_movement_spells"] })) knockbackTarget = riding.entityRidingOn

        var launchVar = true
        if (loc.y + 3 < baseLoc.y) launchVar = false
        if (knockbackTarget.isOnGround) launchVar = true
        player.dimension.playSound("spell.terraform.cast", baseLoc, { pitch: 0.4 })
        if (launchVar == false) {
            const velocity = knockbackTarget.getVelocity()
            knockbackTarget.applyKnockback({ x: 0, z: 0 }, 0.65 + level / 20)
            var toAdd = 0
            if (velocity.y < 0) toAdd = velocity.y * 1.6
            system.runTimeout(() => {
                dim.spawnParticle("mm:stone_platform_emerge", { x: player.location.x, y: loc.y, z: player.location.z })
                dim.playSound("spell.terraform.platform_rise", player.location, { pitch: 0.6 })
                if (velocity.y < 0) knockbackTarget.addEffect("slow_falling", 4, { showParticles: false })
                const stonePlatform = dim.spawnEntity("mm:stone_platform", { x: knockbackTarget.location.x, y: knockbackTarget.location.y - 1.2 + toAdd, z: knockbackTarget.location.z })
                stonePlatform.setProperty("mm:level", level)
                stonePlatform.getComponent("minecraft:tameable").tame(player)
                stonePlatform.triggerEvent("mm:scale_" + level)
            }, 2)
        } else {
            knockbackTarget.applyKnockback({ x: 0, z: 0 }, 1.175 + level / 20)
            dim.spawnParticle("mm:stone_platform_launch", loc)
            const spawnLoc = { x: knockbackTarget.location.x, y: knockbackTarget.location.y + 6, z: knockbackTarget.location.z }
            system.runTimeout(() => {
                dim.spawnParticle("mm:stone_platform_emerge", { x: spawnLoc.x, y: loc.y, z: spawnLoc.z })
                dim.playSound("spell.terraform.platform_rise", loc, { pitch: 0.6 })
                const stonePlatform = dim.spawnEntity("mm:stone_platform", spawnLoc)
                stonePlatform.setProperty("mm:level", level)
                stonePlatform.getComponent("minecraft:tameable").tame(player)
                stonePlatform.triggerEvent("mm:scale_" + level)
            }, 8)
        }
    } else {
        const targets = dim.getEntities({ maxDistance: 2.3, location: baseLoc })
        for (const target of targets) {
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {

                target.applyKnockback({ x: 0, z: 0 }, 1.175 + level / 20)
            }
        }
        dim.playSound("spell.terraform.cast", baseLoc, { pitch: 0.4 })
        dim.spawnParticle("mm:stone_platform_launch", loc)
        var spawnLoc = { x: loc.x, y: loc.y + 6, z: loc.z }
        const floorLoc = player.dimension.getTopmostBlock({ x: baseLoc.x, z: baseLoc.z }, baseLoc.y).above().location
        system.runTimeout(() => {
            dim.spawnParticle("mm:stone_platform_emerge", { x: loc.x, y: floorLoc.y, z: loc.z })
            dim.playSound("spell.terraform.platform_rise", loc, { pitch: 0.6 })
            const stonePlatform = dim.spawnEntity("mm:stone_platform", spawnLoc)
            stonePlatform.setProperty("mm:level", level)
            stonePlatform.getComponent("minecraft:tameable").tame(player)
            stonePlatform.triggerEvent("mm:scale_" + level)
        }, 8)
    }
}
function supersonic(player, level, loc, staff) {
    if (!loc) loc = player.location;
    var delay = 10
    if (staff) delay = 2


    player.dimension.playSound("spell.supersonic", loc, { pitch: 2.5, volume: 1.5 })
    player.dimension.spawnParticle("mm:super_sonic_outside", loc)
    system.runTimeout(() => {
        player.dimension.playSound("spell.supersonic.explode", loc, { pitch: 2.3, volume: 1.5 })
        player.dimension.playSound("spell.supersonic", loc, { pitch: 1, volume: 1.5 })
        player.dimension.spawnParticle("mm:super_sonic_inside", loc)
        const targets = player.dimension.getEntities({ location: loc, maxDistance: 5.5 })
        for (const target of targets) {
            if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.addEffect("slowness", 50 + (level * 10), { amplifier: 3 + level })
                target.addEffect("weakness", 50 + (level * 10), { amplifier: 0 + level })
                const direction = getDirection(loc, target.location);
                target.applyKnockback(makeVector(direction, 1.5 + level / 2), 0.45);
            }
            if (target.typeId == "mm:sanctuary_keeper") target.triggerEvent("mm:stun_no_target")
        }
    }, delay)

}

function retrieval(player, level, loc, staff) {
    const retrieval = player.getEntitiesFromViewDirection({
        maxDistance: 32,
        includePassableBlocks: false
    })
    if (retrieval.length == 0 || staff) {
        if (!loc) loc = player.location
        player.dimension.spawnParticle("minecraft:wind_explosion_emitter", loc)
        player.dimension.playSound("spell.retrieval", loc, { pitch: 0.5 })
        const targets = player.dimension.getEntities({ location: loc, maxDistance: 2 })
        for (const target of targets) {
            if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                applyElementDamage(level * 3, target, player, EntityDamageCause.entityAttack, "air")
            }
        }
        return;
    }
    for (const target of retrieval) {
        if (target !== player && (target.entity.matches({ families: ["monster"] }) || target.entity.matches({ families: ["mob"] }) || target.entity.matches({ families: ["animal"] }) || target.entity.matches({ families: ["player"] }))) {
            const entity = target.entity;
            const xDif = entity.location.x - player.location.x;
            const zDif = entity.location.z - player.location.z;
            const yDif = player.location.y - entity.location.y;
            if (entity.typeId === 'minecraft:player' && entity.isFlying) return;
            entity.dimension.spawnParticle("minecraft:wind_explosion_emitter", entity.location)
            entity.dimension.playSound("spell.retrieval", entity.location)
            applyElementDamage(level * 1, entity, player, EntityDamageCause.entityAttack, "air")
            entity.applyKnockback({ x: -xDif / (3 - (level * 1 / 2.2)), z: -zDif / (3 - (level * 1 / 2.2)) }, clampValue(0.05 + yDif * 0.25, -1, yDif / 10) + 0.1);
            return;
        }
    }

}

function cauterise(player, level) {
    var damage = 9 - level
    const damageDealt = clampValue(applyElementDamage(damage, player, player, EntityDamageCause.fire, "fire", true), 2, 10)
    const fireRes = player.getEffect("fire_resistance")
    if (fireRes) {
        player.addEffect("regeneration", 250 / 5, { amplifier: 1 })
    } else {
        player.applyDamage(1, { cause: EntityDamageCause.fire })
        player.addEffect("regeneration", 250, { amplifier: 1 })
        let hp = player.getComponent("health")
        if (player.getGameMode() !== "Creative") hp.setCurrentValue(clampValue(hp.currentValue - damageDealt, 0, hp.defaultValue))
    }
    player.dimension.spawnParticle("mm:burst_flames", player.location)
    player.dimension.playSound("spell.cauterise.fire", player.location)
    player.dimension.playSound("spell.cauterise.magic", player.location, { pitch: 4 })
}
function overclock(player, level) {
    const damageDealt = applyElementDamage(6, player, player, EntityDamageCause.lightning, "electric", true)
    player.applyDamage(1, { cause: EntityDamageCause.lightning })
    let hp = player.getComponent("health")
    if (player.getGameMode() !== "Creative") hp.setCurrentValue(clampValue(hp.currentValue - damageDealt, 0, hp.defaultValue))
    player.addEffect("speed", 100 + (level * 60), { amplifier: 1 })
    player.addEffect("strength", 100 + (level * 60), { amplifier: 0 })
    player.dimension.playSound("spell.overclock", player.location, { pitch: 2 })
    player.dimension.spawnParticle("mm:spark_hit_electricity", player.location)

}

function siphoning(player, level) {
    player.dimension.playSound("spell.siphoning", player.location, { pitch: 0.85, volume: 1.5 })
    player.dimension.playSound("spell.siphoning.magic", player.location, { pitch: 1.5, volume: 1.5 })
    var siphonScore = world.scoreboard.getObjective("mm:mana_siphon_duration")
    if (!siphonScore) siphonScore = world.scoreboard.addObjective("mm:mana_siphon_duration", "Mana Siphon Duration")
    siphonScore.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:mana_siphon_duration").getScore(player) > 0) {
        siphonScore.addScore(player, 25)
    } else {
        siphonScore.addScore(player, 100)
    }
    var siphonLevel = world.scoreboard.getObjective("mm:mana_siphon_level")
    if (!siphonLevel) siphonLevel = world.scoreboard.addObjective("mm:mana_siphon_level", "Mana Siphon Level")
    siphonLevel.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:mana_siphon_level").getScore(player) < level) siphonLevel.setScore(player, level)
}

function swapConnectionVisual(targetLoc, hitLoc, dim) {
    const xDif = targetLoc.x - hitLoc.x
    const yDif = targetLoc.y - hitLoc.y
    const zDif = targetLoc.z - hitLoc.z
    const distanceBetween = Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z)
    for (let i = 1; i < distanceBetween; i++) {
        system.runTimeout(() => {
            dim.spawnParticle("mm:siphon_idle", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: 1 + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
        }, i / 2)
    }
}

function swap(player, level) {
    const swapTarget = player.getEntitiesFromViewDirection({
        maxDistance: level * 12,
        includePassableBlocks: false
    })
    if (swapTarget.length == 0) {
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        return false;
    }
    for (const target of swapTarget) {
        if (target !== player && (target.entity.matches({ families: ["monster"] }) || target.entity.matches({ families: ["mob"] }) || target.entity.matches({ families: ["animal"] }) || target.entity.matches({ families: ["player"] }))) {
            const targetLoc = target.entity.location;
            const playerLoc = player.location
            target.entity.tryTeleport(playerLoc)
            player.tryTeleport(targetLoc)
            const playerRot = player.getRotation()
            const targetRot = target.entity.getRotation()
            player.setRotation(targetRot)
            target.entity.setRotation(playerRot)
            player.dimension.spawnParticle("mm:swap", targetLoc)
            player.dimension.spawnParticle("mm:swap", playerLoc)
            player.dimension.playSound("spell.swap", targetLoc)
            player.dimension.playSound("spell.swap", playerLoc)
            swapConnectionVisual(targetLoc, playerLoc, player.dimension)
            swapConnectionVisual(playerLoc, targetLoc, player.dimension)
            return true;
        }
    }
    //return false
}

function glaciate(player, level) {
    player.dimension.playSound("spell.glaciate.1", player.location, { pitch: 0.85, volume: 1.5 })
    player.dimension.playSound("spell.glaciate.2", player.location, { pitch: 1.5, volume: 1.5 })
    var frigidScore = world.scoreboard.getObjective("mm:glaciate_duration")
    if (!frigidScore) frigidScore = world.scoreboard.addObjective("mm:glaciate_duration", "Glaciate Duration")
    frigidScore.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:glaciate_duration").getScore(player) > 0) {
        frigidScore.addScore(player, 25 + (level * 15))
    } else {
        frigidScore.addScore(player, 100 + (level * 40))
    }
}

function teleport(player, level) {
    const raycast = player.getBlockFromViewDirection(
        {
            maxDistance: 16 * level,
            includePassableBlocks: false,
            includeLiquidBlocks: true
        });
    if (!raycast) {
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        player.dimension.spawnParticle("mm:siphon_idle", player.location)
        return false
    } else {
        const playerLoc = player.location
        const block = raycast.block.location;
        const faceLocation = raycast.faceLocation;
        const face = raycast.face;
        player.dimension.spawnParticle("mm:swap", {
            x: block.x + faceLocation.x,
            y: block.y + faceLocation.y + 1,
            z: block.z + faceLocation.z
        })
        player.dimension.playSound("spell.teleport", block)
        player.dimension.spawnParticle("mm:swap", playerLoc)
        player.dimension.playSound("spell.teleport", playerLoc)
        if ((face === "Up" || face === "Down") || !raycast.block.above().isAir) {
            player.tryTeleport(
                {
                    x: block.x + faceLocation.x,
                    y: block.y + faceLocation.y + 1,
                    z: block.z + faceLocation.z
                },
                {
                    checkForBlocks: false
                });
        }
        else {
            player.tryTeleport(
                {
                    x: block.x + 0.5,
                    y: block.y + 1,
                    z: block.z + 0.5
                },
                {
                    checkForBlocks: false
                });
        }
    }
}

function spark(player, level, loc, staff) {
    var mult = 1;
    if (staff) mult = 2
    if (!loc) loc = player.getHeadLocation()
    const ammo = player.dimension.spawnEntity('mm:spark', loc);
    const proj = ammo.getComponent('projectile');
    proj.owner = player;
    ammo.setProperty("mm:level", level)
    const vd = player.getViewDirection()
    proj.shoot({ x: vd.x * mult, y: vd.y * mult, z: vd.z * mult })
    player.dimension.playSound("spell.spark.cast", loc, { pitch: 1.5 })
    player.dimension.playSound("spell.spark.magic", loc, { pitch: 3 })
}

function createEarthquake(player, level, loc, dim) {
    dim.playSound("spell.quake.charge", loc, { pitch: 1.5, volume: 1 })
    dim.playSound("spell.quake.creak", loc, { volume: 1, pitch: 0.3 })
    dim.spawnParticle("mm:earthquake_smoke", loc)
    const shakeTargets = dim.getPlayers({ location: loc, maxDistance: 7.5 })
    for (const target of shakeTargets) {
        target.runCommand("camerashake add @s 0.75 1.7 ")
    }
    const slowTargets = dim.getEntities({ location: loc, maxDistance: 6.5 })
    for (const target of slowTargets) {
        if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            if (target.isOnGround) {
                target.addEffect("slowness", 40, { amplifier: 2, showParticles: false })
            }
        }
    }
    system.runTimeout(() => {
        dim.spawnParticle("mm:earthquake_hit", loc)
        dim.spawnParticle("mm:earthquake_hit_smoke", loc)
        dim.playSound("spell.quake.explode", loc, { pitch: 1, volume: 4 })
        dim.playSound("spell.quake.smash", loc, { pitch: 0.5, volume: 3 })
        const quakeTargets = dim.getEntities({ location: loc, maxDistance: 6.5 })
        for (const target of quakeTargets) {
            if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                if (target.isOnGround) {
                    const damageDealt = applyElementDamage(8 + (level * 4), target, player, EntityDamageCause.fall, "earth")
                    system.runTimeout(() => {
                        if (damageDealt == true) target.applyKnockback({ x: 0, z: 0 }, 0.65)
                    }, 1)
                }
            }
        }
    }, 20)
}

function quake(player, level, loc) {
    if (!loc) loc = player.location
    const dim = player.dimension;
    const quakeLoc = player.dimension.getTopmostBlock({ x: loc.x, z: loc.z }, loc.y).above()
    if (quakeLoc.y + 8 < player.location.y) {
        return;
    } else {
        dim.spawnParticle("mm:earthquake_smoke", quakeLoc)
        dim.playSound("spell.quake.cast", quakeLoc, { volume: 1, pitch: 0.6 })
        const offset1 = Math.floor(Math.random() * 25) + 15
        const offset2 = Math.floor(Math.random() * 25) + offset1 + 25
        const offset3 = Math.floor(Math.random() * 25) + offset2 + 25

        system.runTimeout(() => {
            createEarthquake(player, level, quakeLoc, dim)
        }, offset1)
        system.runTimeout(() => {
            createEarthquake(player, level, quakeLoc, dim)
        }, offset2)
        system.runTimeout(() => {
            createEarthquake(player, level, quakeLoc, dim)
        }, offset3)
    }
}

function overheat(player, level) {
    player.dimension.playSound("spell.overheat", player.location, { pitch: 1, volume: 1 })
    var overheatScore = world.scoreboard.getObjective("mm:overheat_duration")
    if (!overheatScore) overheatScore = world.scoreboard.addObjective("mm:overheat_duration", "Overheat Duration")
    overheatScore.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:overheat_duration").getScore(player) > 0) {
        overheatScore.addScore(player, 50 + (level * 20))
    } else {
        overheatScore.addScore(player, 200 + (level * 30))
    }
}

function hellfire(player, level, loc, staff) {
    var mult = 1;
    if (staff) mult = 2
    if (!loc) loc = player.getHeadLocation()
    const hp = player.getComponent("minecraft:health")
    const pct = hp.currentValue / hp.defaultValue
    const power = (Math.ceil(pct * 4) / 4)
    const ammo = player.dimension.spawnEntity('mm:hellfire', loc);
    const proj = ammo.getComponent('projectile');
    proj.owner = player;
    ammo.setProperty("mm:level", level)
    var heat = 0
    if (power == 1) heat = 0
    if (power == 0.75) heat = 1
    if (power == 0.5) heat = 2
    if (power == 0.25) heat = 3
    ammo.setProperty("mm:heat", heat)
    proj.shoot({ x: player.getViewDirection().x * mult, y: player.getViewDirection().y * 1.2 * mult, z: player.getViewDirection().z * mult })
    player.dimension.playSound("spell.hellfire.shoot", loc, { pitch: 0.5 + (heat / 4) })
    player.dimension.playSound("spell.hellfire.cast", loc, { pitch: 1.15 - (heat / 8), volume: 1.5 })
    player.dimension.spawnParticle(`mm:hellfire_sonicboom_${heat}`, player.location)
}

function toxicParticle(loc, dim, count) {
    if (count < 1) return;
    dim.spawnParticle("mm:toxic_spore", loc)
    system.runTimeout(() => {
        toxicParticle(loc, dim, count - 1)
    }, 1)
}

function spawnToxic(loc, dim, owner, level, power) {
    if (power > level * 4 + 3) {
        return;
    }
    for (let i = 0; i < 30; i++) {
        system.runTimeout(() => {
            if (dim.isChunkLoaded(loc)) {
                const block = dim.getBlock(loc)
                if (block !== undefined && block.above().isAir || block.above().typeId == "mm:sparkling_flickerwick_light" || block.above().typeId == "minecraft:water") block.above().setType("mm:sparkling_flickerwick_light")
            }
        }, i)
    }
    dim.spawnParticle("mm:toxic_loop", loc)
    const numSpawn = Math.ceil(power / 2) - 2
    if (numSpawn >= 1) {
        toxicParticle(loc, dim, numSpawn)
    }
    dim.playSound("spell.toxic.pulse", loc, { pitch: (Math.random() * 0.4 + 0.2) })
    system.runTimeout(() => {
        dim.playSound("spell.toxic.bubble", loc, { pitch: (Math.random() * 0.4 + 0.2) })
        const targets = dim.getEntities({ location: loc, maxDistance: 3.5 + level / 3 })
        for (const target of targets) {
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                var mult = 1
                if (target.matches({ families: ["undead"] })) mult = 0.33
                var damageAmt = (power * mult)
                if (target.typeId == "minecraft:player") {
                    const protection = target.getComponent("minecraft:equippable").totalArmor
                    damageAmt = clampValue(damageAmt - protection / 5, power / 3 + 1, damageAmt)
                }
                const damageDealt = applyElementDamage(damageAmt, target, owner, EntityDamageCause.wither, "earth")
                system.runTimeout(() => {

                    if (damageDealt == true) {
                        target.applyKnockback({ x: 0, z: 0 }, 0.05)
                        target.addEffect("poison", 10)
                    }
                }, 1)


            }
        }

        system.runTimeout(() => {
            spawnToxic(loc, dim, owner, level, power + 1)
        }, 10)
    }, 10)
}

function toxic(player, level, loc) {
    if (!loc) loc = player.location
    const dim = player.dimension;
    dim.playSound("spell.toxic.cast", loc, { pitch: (Math.random() * 0.4 + 0.8) })
    dim.spawnParticle("mm:toxic_start", loc)
    spawnToxic(loc, dim, player, level, 1)
}

function roots(player, level) {
    if (player.hasTag("mm:roots_active")) return;
    const health = player.getComponent("minecraft:health")
    if (health.currentValue < health.defaultValue) {
        player.addTag("mm:roots_active")
        player.addTag("mm:roots_active_" + level)
        player.dimension.playSound("spell.roots", player.location, { pitch: 0.2, volume: 1.5 })
    }
}

function thunderboltChain(damager, origin, target, prevTargets, damage, range, pitch, overrideOriginLoc) {
    if (damage < 1) return;
    const dim = origin.dimension;
    const targetLoc = target.location
    var hitLoc = origin.location;
    if (overrideOriginLoc) hitLoc = overrideOriginLoc
    const xDif = targetLoc.x - hitLoc.x
    const yDif = targetLoc.y - hitLoc.y
    const zDif = targetLoc.z - hitLoc.z
    const distanceBetween = Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z)
    for (let i = 1; i < distanceBetween; i++) {
        system.runTimeout(() => {
            dim.spawnParticle("mm:discharge_hit", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: 1 + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
            dim.spawnParticle("mm:discharge_electricity", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: 1 + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
        }, i / 2)
    }
    system.runTimeout(() => {
        const damageDealt = applyElementDamage(damage, target, damager, EntityDamageCause.lightning, "electric")
        if (!damageDealt) return;
        target.dimension.playSound("spell.thunderbolt.resonate", target.location, { pitch: pitch * 5, volume: 1 })
        target.dimension.spawnParticle("mm:discharge_big_electricity", target.location)
        const newTargets = prevTargets
        newTargets.push(target)
        const newchaintargets = dim.getEntities({ location: targetLoc, maxDistance: range })
        for (const newchaintarget of newchaintargets) {
            if (!prevTargets.includes(newchaintarget)) {
                if ((newchaintarget.matches({ families: ["monster"] }) || newchaintarget.matches({ families: ["mob"] }) || newchaintarget.matches({ families: ["animal"] }) || newchaintarget.matches({ families: ["player"] }))) {
                    thunderboltChain(damager, target, newchaintarget, newTargets, damage * 0.9, clampValue(range * 1.2, range, 16), pitch * 0.9)
                    return;
                }
            }
        }
    }, 1 + distanceBetween / 2)
}

function thunderbolt(player, level, loc, staff) {
    const dim = player.dimension;
    if (!loc) loc = player.location
    const targets = dim.getEntities({ location: loc, maxDistance: 6 })
    dim.playSound("spell.thunderbolt", loc)
    dim.spawnParticle("mm:discharge_big_electricity", loc)
    const damage = level * 3 + 3
    for (const target of targets) {
        if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            if (staff) thunderboltChain(player, player, target, [player], damage, 7, 1, loc)
            if (!staff) thunderboltChain(player, player, target, [player], damage, 7, 1, undefined)
            return;
        }
    }
}

function chilling(player, level) {
    player.dimension.playSound("spell.chilling.1", player.location, { pitch: 0.95, volume: 1.5 })
    player.dimension.playSound("spell.chilling.2", player.location, { pitch: 1.6, volume: 1.5 })
    const onfire = player.getComponent("onfire")
    if (onfire) player.extinguishFire()
    var chillingScore = world.scoreboard.getObjective("mm:chilling_duration")
    if (!chillingScore) chillingScore = world.scoreboard.addObjective("mm:chilling_duration", "Chilling Duration")
    chillingScore.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:chilling_duration").getScore(player) > 0) {
        chillingScore.addScore(player, 50 + (level * 25))
    } else {
        chillingScore.addScore(player, 200 + (level * 100))
    }
}

function snowflake(player, level) {
    if (player.hasTag("mm:snowflake_active")) return;
    player.addTag("mm:snowflake_active")
    player.addTag("mm:snowflake_active_" + level)
    player.dimension.playSound("spell.snowflake", player.location, { pitch: 2, volume: 1.5 })
}

function healPlayer(player, amount) {
    const hp = player.getComponent("minecraft:health");
    if (!hp) return;
    if (hp.currentValue + amount > hp.defaultValue) {
        hp.setCurrentValue(hp.defaultValue)
    } else {
        hp.setCurrentValue(hp.currentValue + amount)
    }
}

function shadow(player, level, loc, staff) {
    const dim = player.dimension;
    if (!loc) loc = player.location;
    var delay = 8
    if (staff) delay = 4
    const damage = 4 + level * 4
    if (!staff) {
        dim.spawnParticle("mm:shadow", loc)
    } else {
        dim.spawnParticle("mm:shadow_ranged", loc)

    }
    dim.playSound("spell.shadow.charge", loc, { pitch: 0.66, volume: 2 })
    system.runTimeout(() => {
        dim.spawnParticle("mm:shadow_smoke", loc)
        dim.playSound("spell.shadow.slash", loc, { pitch: 0.5, volume: 8 })
        dim.playSound("spell.shadow.aura", loc, { pitch: 0.5 })
        const targets = player.dimension.getEntities({ location: loc, maxDistance: 4.5 })
        for (const target of targets) {
            if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                const damageDealt = applyElementDamage(damage, target, player, EntityDamageCause.entityAttack, "mana")
                if (damageDealt) {
                    target.addEffect("blindness", 10 + level * 10)
                    healPlayer(player, damage * 0.05)
                }
            }
        }
    }, delay)
}

function purifyEffect(loc, dim, owner, level) {
    const targets = dim.getEntities({ location: loc, maxDistance: 2.25 })
    for (const target of targets) {
        if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            var manaRestore = 0.01
            target.addTag("mm:purify_effected")
            system.runTimeout(() => {
                if (target.isValid && target.hasTag("mm:purify_effected")) target.removeTag("mm:purify_effected")
            }, 1)
            if (target == owner) manaRestore += 0.01
            if (target.typeId == "minecraft:player") {
                target.runCommand("scriptevent mm:remove_custom_effects")
                target.setDynamicProperty("mm:mana", clampValue(getCurrentMana(target) + manaRestore, 0, getMaxMana(target)))
            }
            const targetEffects = target.getEffects()
            for (const effect of targetEffects) {
                if (effect.duration !== -1) {
                    target.removeEffect(effect.typeId)
                    target.dimension.spawnParticle("mm:purify_clear", target.location)
                    target.dimension.playSound("spell.purify.clear", target.location, { pitch: 2 })
                }
            }
        }
    }
}

function purifyPulse(loc, dim, owner, level, countdown) {
    if (countdown - 1 < 0) return;
    dim.spawnParticle("mm:purify_ring", loc)
    dim.spawnParticle("mm:purify_sparkles", loc)
    dim.spawnParticle("mm:purify_sparkles", loc)
    purifyEffect(loc, dim, owner, level)
    system.runTimeout(() => {
        purifyEffect(loc, dim, owner, level)
    }, 2)
    system.runTimeout(() => {
        purifyEffect(loc, dim, owner, level)
    }, 4)
    system.runTimeout(() => {
        purifyEffect(loc, dim, owner, level)
    }, 6)
    system.runTimeout(() => {
        purifyEffect(loc, dim, owner, level)
    }, 8)
    system.runTimeout(() => {
        purifyPulse(loc, dim, owner, level, countdown - 1)
    }, 10)
}

function purify(player, level, loc) {
    if (!loc) loc = player.location
    const spawnLoc = { x: loc.x, y: loc.y + 0.5, z: loc.z }
    const dim = player.dimension;
    purifyPulse(spawnLoc, dim, player, level, level * 4 + 5)
    dim.playSound("spell.purify", spawnLoc, { pitch: 0.9 })
}

function imprison(player, level) {
    const dim = player.dimension
    const hd = player.getHeadLocation()
    const vd = player.getViewDirection()
    dim.playSound("spell.imprison", hd, { pitch: 1.4 })
    for (let i = 0; i < 5 + level * 5; i++) {
        system.runTimeout(() => {
            const spawnLoc = {
                x: hd.x + (vd.x * 2 * i),
                y: hd.y + (vd.y * 2 * i),
                z: hd.z + (vd.z * 2 * i)
            }
            if (dim.getBlock(spawnLoc).typeId == "minecraft:water" || dim.getBlock(spawnLoc).typeId == "mm:revoid_light" || dim.getBlock(spawnLoc).isAir) dim.getBlock(spawnLoc).setType("mm:revoid_light")
            dim.spawnParticle("mm:imprison_spell_0", spawnLoc)
            dim.spawnParticle("mm:imprison_spell_1", spawnLoc)
            const players = dim.getPlayers({
                maxDistance: 3,
                location: spawnLoc
            })
            for (const target of players) {
                if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                    var worked = addCustomEffect(target, "reduction", (50 + level * 10) - i * 2, 2)
                    if (worked) {
                        target.runCommand("camerashake add @s 0.25 0.25")
                        target.playSound("item.spellbook.disabled")
                    }
                }
            }
            const entities = dim.getEntities({
                maxDistance: 3,
                location: spawnLoc
            })
            for (const target of entities) {
                if(target.typeId == "mm:spell_book") {
                    target.remove()
                } else if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                    var worked = target.addEffect("slowness", (50 + level * 10) - i * 2, { amplifier: 0, showParticles: false })
                    if (worked) {
                        target.applyDamage(0.1, { cause: "magic" })
                        const manaCurrent = target.getProperty("mm:mana")
                        if (manaCurrent) {
                            player.runCommand("scriptevent mm:magic_reversion")
                            if (manaCurrent - 7 < 0) {
                                target.setProperty("mm:mana", 0)
                            } else {
                                target.setProperty("mm:mana", manaCurrent - 7)

                            }
                        }
                    }
                }
            }
        }, i * 2)
    }
}

function pullInMob(originLoc, pulled, owner) {
    const yDif = pulled.location.y - originLoc.y;
    var mult = 4;
    var mult2 = 0.52;

    if (pulled.typeId === 'minecraft:player' && pulled.isFlying) return;
    if (pulled.isSprinting) {
        mult = mult * 0.5;
    }
    if (!pulled.isOnGround) {
        mult2 = mult + 0.3;
        mult = mult * 0.44;
    }
    if (pulled.isOnGround && pulled.isSneaking) {
        mult = mult * 0.4
    }
    if (pulled == owner) {
        mult = mult / 2
        mult2 = mult2 / 2
    }
    if (!pulled.matches({ families: ["player"] })) mult = mult * 0.67
    const dir = getDirection(pulled.location, originLoc)
    //pulled.applyKnockback(makeVector(dir, 0.17 * mult), 0.02 * mult2);
    if (mult2 > 3 || yDif >= 8 || (yDif <= -8 && yDif >= -24)) mult2 += -0.33 * yDif
    pulled.applyImpulse({ x: makeVector(dir, 0.04 * mult).x, y: 0.01 * mult2, z: makeVector(dir, 0.04 * mult).z })
}

function hurricane(player, level, loc) {
    if (!loc) loc = player.location
    const dim = player.dimension
    dim.playSound("spell.hurricane", loc)
    dim.spawnParticle("minecraft:wind_explosion_emitter", loc)
    system.runTimeout(() => {
        dim.playSound("spell.hurricane", loc, { pitch: 0.2 })
        dim.spawnParticle("minecraft:wind_explosion_emitter", loc)
        dim.playSound("spell.hurricane.burst", loc)
        system.runTimeout(() => {
            dim.spawnParticle("mm:hurricane_wind_anticlockwise", { x: loc.x, y: loc.y + 4, z: loc.z })
            dim.spawnParticle("mm:hurricane_wind_clockwise", { x: loc.x, y: loc.y + 6, z: loc.z })
            dim.spawnParticle("mm:hurricane_wind_clockwise", { x: loc.x, y: loc.y + 2, z: loc.z })
        }, 10)
        for (let i = 0; i < 100; i++) {
            system.runTimeout(() => {
                if (i % 20 == 0) {
                    dim.playSound("spell.hurricane.burst", loc, { pitch: 0.1 })
                }
                if (i % 17 == 0) {
                    const entities = dim.getEntities({
                        maxDistance: 3,
                        location: loc
                    })
                    for (const target of entities) {
                        if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                            const damageDealt = applyElementDamage(3 + level * 1.5, target, player, EntityDamageCause.entityExplosion, "air")
                            if (damageDealt) {
                                target.applyImpulse({ x: 0, y: 0.01, z: 0 })
                                target.runCommand("ride @s stop_riding")
                            }
                        }
                        if (target.typeId == "minecraft:player") {
                            target.runCommand("camerashake add @s 0.04 1")

                        }
                    }
                }
                dim.spawnParticle("mm:hurricane_spell_main", loc)
                dim.spawnParticle("mm:hurricane_spell_pull", loc)

                const pullingTargets = dim.getEntities({
                    maxDistance: 11,
                    location: loc,
                    excludeFamilies: ["boss", "gravity_immune", "ignore", "warden", "irongolem"]
                })
                for (const target of pullingTargets) {
                    if (target.typeId == "minecraft:item" || (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] })) || (target.isValid && target.getComponent("minecraft:projectile")))) {
                        pullInMob(loc, target, player)
                    }
                }
            }, i)
        }
    }, 10)
}

function snowball(player, level, loc, staff) {
    var mult = 1;
    if (staff) mult = 2
    if (!loc) loc = player.getHeadLocation()
    const ammo = player.dimension.spawnEntity('mm:giant_snowball', loc);
    const proj = ammo.getComponent('projectile');
    proj.owner = player;
    ammo.setProperty("mm:level", level)
    const vd = player.getViewDirection()
    proj.shoot({ x: vd.x * mult, y: vd.y * mult, z: vd.z * mult })
    player.dimension.playSound("spell.snowball", loc, { pitch: 0.4 })
}


function guardian(player, level, loc, staff) {
    var duration = 200 + (level * 100)
    if (duration < 1) duration = 1
    if (!loc) loc = player.location;
    const dim = player.dimension
    const playerTag = "mm:guardian_" + `${player.id}`
    const activeGuardians = dim.getEntities({ tags: [playerTag], type: "mm:blue_lantern_spirit" })
    if (activeGuardians.length > 2) {
        return false
    } else {
        const newSpirit = dim.spawnEntity("mm:blue_lantern_spirit", loc)
        newSpirit.addTag(playerTag)
        const tameable = newSpirit.getComponent("tameable")
        tameable.tame(player)
        system.runTimeout(() => {
            if (newSpirit.isValid) newSpirit.remove()
        }, duration)
    }
}


function meteor(player, level, loc, staff) {
    var mult = 0.8;
    if (staff) mult = 1.2
    loc = player.getHeadLocation()
    const vd = player.getViewDirection()
    const ammo = player.dimension.spawnEntity('mm:meteorite', {
        x: loc.x,
        y: loc.y,
        z: loc.z
    });
    var fail = ammo.tryTeleport({
        x: loc.x,
        y: loc.y + 4,
        z: loc.z
    }, {
        checkForBlocks: true
    })
    if (fail == false) {
        ammo.remove()
        return false
    }
    const proj = ammo.getComponent('projectile');
    proj.owner = player;
    ammo.setProperty("mm:level", level)
    proj.shoot({
        x: vd.x * mult, y: (vd.y * mult), z: vd.z * mult
    })
    proj.liquidInertia = 0.8
    proj.gravity = 0.015
    if (staff) proj.gravity = 0.04
    for (let i = 0; i < 20; i++) {
        system.runTimeout(() => {
            if (ammo.isValid) {
                proj.gravity += (0.05 / 40)
            }
        }, 10 + i)
    }
    player.dimension.playSound("spell.meteor.cast", loc, { pitch: 1.2 })
}

//entanglement
function entangle(player, level) {
    player.dimension.playSound("spell.entangle", player.location, { pitch: 1.6, volume: 1 })
    var entanglementScore = world.scoreboard.getObjective("mm:entanglement_duration")
    if (!entanglementScore) entanglementScore = world.scoreboard.addObjective("mm:entanglement_duration", "Entanglement Duration")
    entanglementScore.addScore(player, 0)
    if (world.scoreboard.getObjective("mm:entanglement_duration").getScore(player) > 0) {
        entanglementScore.addScore(player, 50 + (level * 33))
    } else {
        entanglementScore.addScore(player, 150 + (level * 100))
    }
}

//cloudsurf
function cloudsurf(player, level) {
    const riding = player.getComponent("minecraft:riding")
    if (riding) return false;
    const loc = player.location
    const dim = player.dimension
    const playerRot = player.getRotation()
    const playerV = player.getVelocity()
    dim.playSound("spell.cloudsurf.cast", loc, { pitch: 0.9, volume: 1 })
    if (level < 1) level = 1
    if (level > 3) level = 3
    player.runCommand(`ride @s summon_ride mm:air_surfer reassign_rides mm:level_${level}`)
    const getAirSurfer = dim.getEntities({ location: loc, maxDistance: 4, type: "mm:air_surfer", closest: 1, excludeTags: ["mm:air_surfer_marked"] })
    if (getAirSurfer.length > 0) {
        const surfer = getAirSurfer[0]

        const tameable = surfer.getComponent("tameable")
        tameable.tame(player)
        surfer.addTag("mm:air_surfer_marked")
        surfer.setRotation(playerRot)
        surfer.applyImpulse(playerV)
        if (playerV.y < 0) {
            for (let i = 0; i < 20; i++) {
                system.runTimeout(() => {
                    if (surfer.isValid && !surfer.isOnGround) surfer.applyImpulse({ x: 0, y: playerV.y * -0.05, z: 0 })
                }, i + 1)
            }
        }
    }
    system.runTimeout(() => {
        const riding = player.getComponent("minecraft:riding")
        if (!riding) return;
        player.addTag("mm:riding_airsurfer")
        player.playAnimation("animation.player.air_surfer_riding", { blendOutTime: 0.0, stopExpression: "!q.is_riding" })
    })
}

function cluster(player, level, loc, staff) {
    var mult = 1;
    if (staff) mult = 2
    if (!loc) loc = player.getHeadLocation()
    const ammo = player.dimension.spawnEntity('mm:cluster_projectile', loc);
    const tameable = ammo.getComponent('tameable');
    tameable.tame(player)
    ammo.setProperty("mm:level", level)
    const vd = player.getViewDirection()
    ammo.applyImpulse({ x: vd.x * mult, y: vd.y * mult, z: vd.z * mult })
        player.dimension.playSound("spell.cluster", loc, { pitch: 1, volume: 3 })
        player.dimension.playSound("spell.cluster.shoot", loc, { pitch: 0.5, volume: 3 })
}

world.afterEvents.entityHurt.subscribe((e) => {
    const entity = e.damageSource.damagingEntity;
    if(!entity || !entity.isValid || entity.typeId !== "mm:cluster_projectile") return;
    entity.triggerEvent("mm:final_explosion")
    
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    const id = e.eventId;
    const entity = e.entity;
    if(!entity || !entity.isValid || entity.typeId !== "mm:cluster_projectile") return;
    const owner = entity.getComponent("tameable").tamedToPlayer
    if(!owner) return;
    const dim = entity.dimension
    const loc = entity.location
    const level = entity.getProperty("mm:level")
    if(id == "mm:final_explosion") {
        if(entity.isInWater) {
            dim.playSound("random.fizz", loc)
            dim.spawnParticle("minecraft:ice_evaporation_emitter", loc)
        }
        if(dim.isChunkLoaded(loc)) {
            dim.playSound("spell.burst.explode", loc, {pitch: 1.5, volume: 0.5})
            dim.playSound("spell.cluster.twinkle", loc, { pitch: 0.88 + Math.random()*0.3, volume: 3 })
            dim.spawnParticle("mm:burst_explosion", loc)
            dim.spawnParticle("mm:burst_flames", loc)
            dim.spawnParticle("mm:cluster_hit_particle", loc)
            const block = dim.getBlock(loc)
            if (block.above().isAir) block.above().setType("mm:flickerwick_light")
            if (block.above().typeId == "minecraft:water") block.above().setType("mm:flickerwick_light")
        }
        const targets = dim.getEntities({ location: loc, maxDistance: 4.33 })
        for (const target of targets) {
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.setOnFire(3 + level)
                applyElementDamage(3 + level * 4, target, owner, EntityDamageCause.fire, "fire")
            }
        }
        const value = entity.getDynamicProperty("mm:booms")
        if(!value) {
            entity.setDynamicProperty("mm:booms", 2)
        } else if(value >= 2 + (level * 2)) {
            entity.remove()
            return;
        } else  {
            entity.setDynamicProperty("mm:booms", value + 2)
        }
    } else if (id == "mm:mini_explosion" && !entity.hasTag("mm:mini_explosion_cooldown")) {
        entity.addTag("mm:mini_explosion_cooldown")
        system.runTimeout(() => {
            if(!entity || !entity.isValid || entity.typeId !== "mm:cluster_projectile") return;
            entity.removeTag("mm:mini_explosion_cooldown")
        }, 3)
        if(dim.isChunkLoaded(loc)) {
            dim.playSound("spell.burst.explode", loc, {pitch: 1.5, volume: 0.5})
            dim.playSound("spell.cluster.twinkle", loc, { pitch: 0.88 + Math.random()*0.3, volume: 3 })
            dim.spawnParticle("mm:burst_explosion", loc)
            dim.spawnParticle("mm:burst_flames", loc)
            dim.spawnParticle("mm:cluster_hit_particle", loc)
            const block = dim.getBlock(loc)
            if (block.above().isAir) block.above().setType("mm:flickerwick_light")
            if (block.above().typeId == "minecraft:water") block.above().setType("mm:flickerwick_light")
        }
        const targets = dim.getEntities({ location: loc, maxDistance: 2.33 })
        for (const target of targets) {
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.setOnFire(1 + level)
                applyElementDamage(level * 3, target, owner, EntityDamageCause.fire, "fire")
            }
        }
        const randX = Math.floor(Math.random()*3)-1
        const randZ = Math.floor(Math.random()*3)-1
        const value = entity.getDynamicProperty("mm:booms")
        if(!value) {
            entity.setDynamicProperty("mm:booms", 1)
        } else if(value >= 2 + (level * 2)) {
            entity.remove()
            return;
        } else  {
            entity.setDynamicProperty("mm:booms", value + 1)
        }
        const v = entity.getVelocity()
        entity.clearVelocity()
        entity.applyImpulse({
            x:randX/2 + v.x,
            y:0.33 + -0.5*v.y,
            z:randZ/2 + v.z
        })
    }
})