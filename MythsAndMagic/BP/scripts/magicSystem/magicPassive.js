import {
    world,
    system,
    EntityDamageCause,
    DimensionTypes
} from "@minecraft/server";

import { applyElementDamage, getCurrentMana, getMaxMana, clampValue, getDirection, makeVector } from "./main.js"


function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}
world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    const id = event.eventId;
    if (id !== "mm:emit_freeze") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:icicles") return;
    const tame = entity.getComponent("minecraft:tameable")
    const owner = tame.tamedToPlayer
    if (!owner) return;

    const targets = entity.dimension.getEntities({ location: entity.location, maxDistance: 9 })
    for (const target of targets) {
        if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            let closeness = 1 + Math.floor(8 - getDistanceBetween(target, entity))
            target.addEffect("slowness", 30 + closeness * 3, { amplifier: Math.floor(closeness / 3.5) + (entity.getProperty("mm:level") - 1), showParticles: false })
            const rand = Math.random()
            if (rand < entity.getProperty("mm:level") / 5) {
                if (closeness > 1 && closeness < 5) {
                    applyElementDamage(1, target, owner, EntityDamageCause.freezing, "ice")
                } else if (closeness >= 6 && closeness < 8) {
                    applyElementDamage(2, target, owner, EntityDamageCause.freezing, "ice")
                } else if (closeness >= 8) {
                    applyElementDamage(3, target, owner, EntityDamageCause.freezing, "ice")
                }
            }
        }

    }
})

function randomSpawnLocation(base) {
    const x_offset = (Math.random() * 2.6) - 1.2
    const z_offset = (Math.random() * 2.6) - 1.2
    const y_offset = (Math.random() * 1) - 0.5
    return { x: x_offset + base.x, y: base.y - 2 + y_offset, z: z_offset + base.z }
}

function spawnDebris(spawnLoc, owner, dim, count) {
    if (count < 1) return;
    if (dim.isChunkLoaded(spawnLoc) == false) return;
    const debris = dim.spawnEntity("mm:debris", randomSpawnLocation(spawnLoc))
    const proj = debris.getComponent("minecraft:projectile")
    proj.owner = owner
    proj.shoot({ x: 0, y: -0.33, z: 0 })
    system.runTimeout(() => {
        spawnDebris(spawnLoc, owner, dim, count - 1)

    }, 2)

}

system.afterEvents.scriptEventReceive.subscribe((e) => {
    const id = e.id;
    if (id !== "mm:crumble_despawn") return;
    const entity = e.sourceEntity;
    const spawnLoc = entity.location
    const dim = entity.dimension
    if (entity.typeId !== "mm:stone_platform") return;
    const tame = entity.getComponent("minecraft:tameable")
    const owner = tame.tamedToPlayer
    if (owner) {
        system.runTimeout(() => {
            spawnDebris(spawnLoc, owner, dim, Math.ceil(Math.random() * 6))
        }, 1)
    }
    entity.remove()
})


world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (entity.typeId == "mm:debris") {
        dim.spawnParticle("mm:stone_platform_idle", loc)
        dim.playSound("land.pointed_dripstone", loc, { volume: 3, pitch: 0.5 })
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (entity.typeId == "mm:debris") {
        dim.spawnParticle("mm:stone_platform_idle", loc)
        dim.playSound("land.pointed_dripstone", loc, { volume: 3, pitch: 0.5 })
    }
})


system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:mana_siphon_duration', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:mana_siphon_duration")
        const level = world.scoreboard.getObjective("mm:mana_siphon_level")
        if (duration.getScore(player) > 0) {
            if (player.hasTag("mm:purify_effected")) {
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("mm:purify_clear", player.location)
                player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            }
            duration.addScore(player, -1)
            if (duration.getScore(player) % 2 == 0) {
                player.dimension.spawnParticle("mm:siphon_idle", player.location)
            }
        } else {
            duration.setScore(player, 0)
            level.setScore(player, 0)
            duration.removeParticipant(player)
            level.removeParticipant(player)
        }
    }
})

world.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    const hurt = e.hurtEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "minecraft:player") return;
    var siphonScore = world.scoreboard.getObjective("mm:mana_siphon_duration")
    if (!siphonScore) siphonScore = world.scoreboard.addObjective("mm:mana_siphon_duration", "Mana Siphon Duration")
    const id = attacker.scoreboardIdentity
    if (siphonScore.getParticipants().includes(id)) {
        if (!hurt) return;
        if (!hurt.isValid) return;
        if (attacker == hurt) return;
        const damage = e.damage;
        const level = world.scoreboard.getObjective("mm:mana_siphon_level").getScore(attacker)
        if (!level) return;
        const siphoned = clampValue(damage * (0.2 + (level / 12)), 0.1, 5)
        attacker.dimension.spawnParticle("mm:siphon_heal", attacker.location)
        attacker.setDynamicProperty("mm:mana", clampValue(getCurrentMana(attacker) + siphoned, getCurrentMana(attacker), getMaxMana(attacker)))
        //debugMessage(`§7${attacker.nameTag} siphoned ${siphoned}/${damage}`)

    }
})

system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:glaciate_duration', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:glaciate_duration")
        if (duration.getScore(player) > 0) {
            if (player.hasTag("mm:purify_effected")) {
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("mm:purify_clear", player.location)
                player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            }
            duration.addScore(player, -1)
            const dim = player.dimension;
            const loc = player.location
            if (duration.getScore(player) % 5 == 0) {
                dim.spawnParticle("mm:glaciate", loc)
            }
            if (duration.getScore(player) % 10 == 0) {
                dim.spawnParticle("mm:glaciate_smoke", loc)
            }
        } else {
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
})

const fireCauses = [
    EntityDamageCause.campfire,
    EntityDamageCause.fire,
    EntityDamageCause.fireTick,
    EntityDamageCause.lava,
    EntityDamageCause.magma
]

world.beforeEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const cause = e.damageSource.cause;

    if (!hurt) return
    if (!hurt.isValid) return
    var duration = world.scoreboard.getObjective("mm:glaciate_duration")
    if (!duration) duration = system.run(() => {
        world.scoreboard.addObjective("mm:glaciate_duration", "Glaciate Duration")
        return;
    })
    const id = hurt.scoreboardIdentity
    if (duration.getParticipants().includes(id)) {
        const fireRes = hurt.getEffect("fire_resistance")
        var damageMult = 0.5
        if (fireRes) damageMult = 0.9
        const dim = hurt.dimension;
        const loc = hurt.location
        if (fireCauses.includes(cause)) {
            e.damage = 2 + e.damage * 3
            system.run(() => {
                duration.setScore(hurt, 0)
                duration.removeParticipant(hurt)
                dim.playSound("random.glass", loc)
            })
        } else {
            e.damage = e.damage * damageMult
            system.run(() => {
                dim.playSound("mob.player.hurt_freeze", loc, { pitch: 0.85, volume: 1.5 })
                dim.spawnParticle("mm:glaciate_smoke", loc)
                dim.spawnParticle("mm:glaciate_smoke", loc)
                if (duration.getScore(hurt) > 10) duration.addScore(hurt, -5)
            })
        }
    }
})

function sparkConnectionVisual(targetLoc, hitLoc, dim) {
    const xDif = targetLoc.x - hitLoc.x
    const yDif = targetLoc.y - hitLoc.y
    const zDif = targetLoc.z - hitLoc.z
    const distanceBetween = Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z)
    for (let i = 1; i < distanceBetween; i++) {
        system.runTimeout(() => {
            dim.spawnParticle("mm:spark_electricity", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: 1 + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
        }, i / 2)
    }
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:spark") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        dim.spawnParticle("mm:spark_hit", loc)
        dim.spawnParticle("mm:spark_hit_electricity", loc)
        dim.playSound("spell.spark.hit", loc, { pitch: 2.8, volume: 0.5 })
        const damage = 4 + (level * 4)

        const bonusTargets = dim.getEntities({ location: loc, maxDistance: 3 + level * 1.5 })
        if (!bonusTargets) {
            entity.remove()
            return;
        }
        for (const target of bonusTargets) {
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {

                applyElementDamage(damage / 4, target, owner, EntityDamageCause.lightning, "electric")
                sparkConnectionVisual(target.location, loc, dim)
            }
        }
        entity.remove()
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:spark") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        if (owner == hit) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        dim.spawnParticle("mm:spark_hit", loc)
        dim.spawnParticle("mm:spark_hit_electricity", loc)
        dim.playSound("spell.spark.hit", loc, { pitch: 3, volume: 0.5 })
        dim.playSound("spell.spark.flash", loc, { pitch: 2, volume: 2 })
        const damage = 4 + (level * 4)
        applyElementDamage(damage, hit, owner, EntityDamageCause.lightning, "electric")

        const bonusTargets = dim.getEntities({ location: loc, maxDistance: 3 + level * 2 })
        if (!bonusTargets) {
            entity.remove()
            return;
        }
        for (const target of bonusTargets) {
            if (target !== owner && target !== hit && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {

                applyElementDamage(damage / 2, target, owner, EntityDamageCause.lightning, "electric")
                sparkConnectionVisual(target.location, loc, dim)
            }
        }
        entity.remove()
    }
})

// used if spark hits water or despawns, decreased damage plus able to target owner, owner takes increased damage
system.afterEvents.scriptEventReceive.subscribe((e) => {
    const id = e.id;
    if (id !== "mm:spark_expire") return;
    const entity = e.sourceEntity;
    const dim = entity.dimension;
    const loc = entity.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:spark") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        dim.spawnParticle("mm:spark_hit", loc)
        dim.spawnParticle("mm:spark_hit_electricity", loc)
        dim.playSound("spell.spark.hit", loc, { pitch: 3, volume: 0.5 })
        const damage = 4 + (level * 4)

        const bonusTargets = dim.getEntities({ location: loc, maxDistance: 3 + level * 1.5 })
        if (!bonusTargets) {
            entity.remove()
            return;
        }
        for (const target of bonusTargets) {
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                if (target == owner) {
                    applyElementDamage((damage / 1) - 1, target, owner, EntityDamageCause.lightning, "electric")

                } else {
                    applyElementDamage((damage / 5), target, owner, EntityDamageCause.lightning, "electric")

                }
                sparkConnectionVisual(target.location, loc, dim)
            }
        }
    }
})

system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:overheat_duration', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:overheat_duration")
        if (duration.getScore(player) > 0) {
            if (player.hasTag("mm:purify_effected")) {
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("mm:purify_clear", player.location)
                player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            }
            duration.addScore(player, -1)

            player.addEffect("fire_resistance", duration.getScore(player) + 20, { amplifier: 0, showParticles: false })

            if (duration.getScore(player) % 5 == 0) {
                player.dimension.spawnParticle("mm:overheat_aura", player.location)
            }

            if (player.isInWater) {
                if (player.getEffect("fire_resistance")) player.removeEffect("fire_resistance")
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("minecraft:ice_evaporation_emitter", player.location)
                player.dimension.playSound("random.fizz", player.location, { pitch: 1, volume: 0.85 })
            }
        } else {
            if (player.getEffect("fire_resistance")) player.removeEffect("fire_resistance")
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
})

world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const attacker = e.damageSource.damagingEntity;
    const cause = e.damageSource.cause;
    const damage = e.damage

    if (!hurt) return
    if (!hurt.isValid) return
    if (!attacker) return
    if (!attacker.isValid) return
    if (hurt == attacker) return;
    var duration = world.scoreboard.getObjective("mm:overheat_duration")
    if (!duration) duration = world.scoreboard.addObjective("mm:overheat_duration", "Overheat Duration")
    const id = hurt.scoreboardIdentity
    if (duration.getParticipants().includes(id)) {
        if (duration.getScore(hurt) > 31) {
            duration.addScore(hurt, -30)
        }
        if (duration.getScore(hurt) <= 31) {
            duration.setScore(hurt, 1)
        }
        const fireRes = attacker.getEffect("minecraft:fire_resistance")
        if (!fireRes) {
            applyElementDamage(clampValue(damage - 1, 1, 8), attacker, hurt, EntityDamageCause.fire, "fire")
        } else {
            if (fireRes.duration !== -1) {
                const newDuration = Math.ceil(fireRes.duration * 2 / 3)
                const newAmp = fireRes.amplifier;
                attacker.removeEffect("minecraft:fire_resistance")
                attacker.addEffect("minecraft:fire_resistance", newDuration, { amplifier: newAmp })
            }
        }
        hurt.dimension.spawnParticle("mm:overheat_activate", hurt.location)
    }
})

function hellfireBurst(dim, loc, heat, level, entity, owner) {
    dim.spawnParticle(`mm:hellfire_explosion_${heat}`, loc)
    dim.spawnParticle(`mm:hellfire_sonicboom_${heat}`, loc)
    dim.spawnParticle(`mm:hellfire_${heat}`, { x: loc.x + 2, y: loc.y, z: loc.z })
    dim.spawnParticle(`mm:hellfire_${heat}`, { x: loc.x - 2, y: loc.y, z: loc.z })
    dim.spawnParticle(`mm:hellfire_${heat}`, { x: loc.x, y: loc.y, z: loc.z + 2 })
    dim.spawnParticle(`mm:hellfire_${heat}`, { x: loc.x, y: loc.y, z: loc.z - 2 })
    dim.playSound("spell.hellfire.hit", loc, { pitch: 1 - (heat / 8), volume: 0.2 + (heat / 10) })
    const damage = 2 + (heat * 4) + (level * 2)
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 1 + (heat * 2) })
    if (!bonusTargets) {
        entity.remove()
        return;
    }
    for (const target of bonusTargets) {
        if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {

            applyElementDamage(clampValue(damage - getDistanceBetween(target, entity) / 4 - heat, damage - 6, damage + 1), target, owner, EntityDamageCause.lava, "fire")
            target.setOnFire(heat * 2 + 1)
        }
    }
    entity.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:hellfire") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        var heat = entity.getProperty("mm:heat")
        if (!heat) heat = 0
        hellfireBurst(dim, loc, heat, level, entity, owner)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:hellfire") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        var heat = entity.getProperty("mm:heat")
        if (!heat) heat = 0
        hellfireBurst(dim, loc, heat, level, entity, owner)
    }
})


system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:chilling_duration', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:chilling_duration")
        if (duration.getScore(player) > 0) {
            if (player.hasTag("mm:purify_effected")) {
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("mm:purify_clear", player.location)
                player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            }
            duration.addScore(player, -1)

            if (duration.getScore(player) % 3 == 0) {
                player.dimension.spawnParticle("mm:chilling_swirls", player.location)
            }
            if (duration.getScore(player) % 7 == 0) {
                player.dimension.spawnParticle("mm:glaciate_smoke", player.location)
            }
        } else {
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
})


world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const attacker = e.damageSource.damagingEntity;
    const cause = e.damageSource.cause;
    const damage = e.damage

    if (!hurt) return
    if (!hurt.isValid) return
    if (!attacker) return
    if (!attacker.isValid) return
    if (hurt == attacker) return;
    var duration = world.scoreboard.getObjective("mm:chilling_duration")
    if (!duration) duration = world.scoreboard.addObjective("mm:chilling_duration", "Chilling Duration")
    const id = attacker.scoreboardIdentity
    if (duration.getParticipants().includes(id)) {
        if (duration.getScore(attacker) > 16) {
            duration.addScore(attacker, -15)
        }
        if (duration.getScore(attacker) <= 16) {
            duration.setScore(attacker, 1)
        }
        hurt.dimension.spawnParticle("mm:chilling_swirls", hurt.location)
        hurt.dimension.playSound("spell.chilling.2", hurt.location)
        hurt.addEffect("slowness", 20 + Math.floor(clampValue(damage * 10, 0, 200)), { amplifier: 4 })
        hurt.applyKnockback({ x: 0, z: 0 }, -0.5)
    }
})


function hasSnowflake(item) {
    if (item.getDynamicProperty("mm:spell_1") == "mm:snowflake") return true;
    if (item.getDynamicProperty("mm:spell_2") == "mm:snowflake") return true;
    if (item.getDynamicProperty("mm:spell_3") == "mm:snowflake") return true;
    if (item.getDynamicProperty("mm:spell") == "mm:snowflake") return true;
    return false;
}

system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:snowflake_active"] })) {
        var levelTag = ""
        for (const tag of player.getTags()) {
            if (tag.includes("mm:snowflake_active_")) {
                levelTag = tag
                break
            }
        }
        const level = parseInt(levelTag.charAt(levelTag.length - 1))
        const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
        if (player.hasTag("mm:purify_effected")) {
            player.removeEffect("levitation")
            player.removeTag(levelTag)
            player.removeTag("mm:snowflake_active")
            player.dimension.spawnParticle("mm:purify_clear", player.location)
            player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            return;
        }
        if (getCurrentMana(player) <= 0) {

            player.removeEffect("levitation")
            player.removeTag(levelTag)
            player.removeTag("mm:snowflake_active")
            return;
        }
        if (!held) {
            player.removeEffect("levitation")
            player.removeTag(levelTag)
            player.removeTag("mm:snowflake_active")
        } else if (!held.hasTag("mm:spell_caster")) {
            player.removeEffect("levitation")
            player.removeTag(levelTag)
            player.removeTag("mm:snowflake_active")
        } else if (!hasSnowflake(held)) {
            player.removeEffect("levitation")
            player.removeTag(levelTag)
            player.removeTag("mm:snowflake_active")

        } else {
            player.addEffect("levitation", clampValue(getCurrentMana(player) * 10, 10, 999999), { amplifier: level })
            player.dimension.spawnParticle("mm:glaciate", player.location)
            const currentMana = getCurrentMana(player)
            const removeAmount = 0.6 / level
            const afterMana = currentMana - removeAmount
            if (afterMana < 0) player.setDynamicProperty("mm:mana", 0)
            if (afterMana >= 0) player.setDynamicProperty("mm:mana", afterMana)
            const cd = held.getComponent("minecraft:cooldown")
            player.startItemCooldown(cd.cooldownCategory, 50);
        }
    }
}, 5)



function hasRoots(item) {
    if (item.getDynamicProperty("mm:spell_1") == "mm:roots") return true;
    if (item.getDynamicProperty("mm:spell_2") == "mm:roots") return true;
    if (item.getDynamicProperty("mm:spell_3") == "mm:roots") return true;
    if (item.getDynamicProperty("mm:spell") == "mm:roots") return true;
    return false;
}


function healPlayer(player, amount) {
    const hp = player.getComponent("health");
    if (!hp) return;
    if (hp.currentValue + amount > hp.defaultValue) {
        hp.setCurrentValue(hp.defaultValue)
    } else {
        hp.setCurrentValue(hp.currentValue + amount)
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:roots_active"] })) {
        var levelTag = ""
        for (const tag of player.getTags()) {
            if (tag.includes("mm:roots_active_")) {
                levelTag = tag
                break
            }
        }
        const level = parseInt(levelTag.charAt(levelTag.length - 1))
        const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
        const health = player.getComponent("minecraft:health")
        if (health.currentValue >= health.defaultValue) {
            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")
            return;
        }
        if (player.hasTag("mm:purify_effected")) {
            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")
            player.dimension.spawnParticle("mm:purify_clear", player.location)
            player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            return;
        }
        if (getCurrentMana(player) <= 0) {

            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")
            return;
        }
        if (!held) {
            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")
        } else if (!held.hasTag("mm:spell_caster")) {
            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")
        } else if (!hasRoots(held)) {
            player.removeEffect("slowness")
            player.removeTag(levelTag)
            player.removeTag("mm:roots_active")

        } else {
            healPlayer(player, level * 1 / 7.5)
            player.addEffect("slowness", 1 + (getCurrentMana(player) * 10), { amplifier: 5 })
            player.dimension.spawnParticle("mm:roots", player.location)
            const currentMana = getCurrentMana(player)
            const removeAmount = 0.4
            const afterMana = currentMana - removeAmount
            if (afterMana < 0) player.setDynamicProperty("mm:mana", 0)
            if (afterMana >= 0) player.setDynamicProperty("mm:mana", afterMana)
            const cd = held.getComponent("minecraft:cooldown")
            player.startItemCooldown(cd.cooldownCategory, 50);
        }
    }
}, 5)

//snowball

function snowballExplosion(dim, loc, level, snowballProjectile, owner) {
    dim.playSound("spell.snowball.land", loc, { pitch: 0.6, volume: 2 })
    dim.playSound("spell.chilling.2", loc, { pitch: 1.2, volume: 1.5 })
    dim.spawnParticle("mm:snowball_hit_0", loc)
    dim.spawnParticle("mm:snowball_hit_1", loc)
    dim.spawnParticle("mm:snowball_hit_2", loc)
    const damage = 7 + level * 2
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 4 })
    const corner1 = {
        x: loc.x - 2,
        y: loc.y - 2,
        z: loc.z - 2
    }
    const corner2 = {
        x: loc.x + 2,
        y: loc.y + 2,
        z: loc.z + 2
    }
    dim.runCommand(`fill ${corner1.x} ${corner1.y} ${corner1.z} ${corner2.x} ${corner2.y} ${corner2.z} air replace fire`)
    if (!bonusTargets) {
        snowballProjectile.remove()
        return;
    }
    for (const target of bonusTargets) {
        if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            var mult = 1
            if (target.matches({ families: ["blaze"] })) mult = 2
            const dmgDone = applyElementDamage(mult * clampValue(damage - Math.round(getDistanceBetween(target, snowballProjectile) * 10) / 10, damage - 6, damage + 1), target, owner, EntityDamageCause.entityExplosion, "ice")
            if (dmgDone) target.addEffect("slowness", 70, { amplifier: 2 })
        }
        if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            const onfire = target.getComponent("onfire")
            if (onfire) target.extinguishFire()
        }
    }
    snowballProjectile.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:giant_snowball") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        snowballExplosion(dim, loc, level, entity, owner)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:giant_snowball") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        snowballExplosion(dim, loc, level, entity, owner)
    }
})





//meteor

function meteorExplosion(dim, loc, level, meteorProjectile, owner) {
    dim.playSound("spell.meteor.explode", loc, { pitch: 1, volume: 3 })
    dim.spawnParticle("mm:meteor_groundhit", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_explosion", loc)
    dim.spawnParticle("mm:meteor_hit_0", loc)
    const damage = 7 + level * 4
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 6 })
    if (!bonusTargets) {
        meteorProjectile.remove()
        return;
    }
    for (const target of bonusTargets) {
        if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            var effDamage = damage * clampValue(((6 - getDistanceBetween(target, meteorProjectile)) / 6), 0.66, 1)
            effDamage = 1.1*(Math.round(effDamage * 10) / 10)
            const dmgDone = applyElementDamage(effDamage, target, owner, EntityDamageCause.fire, "earth")
            if (dmgDone) {
                if(target.typeId == "minecraft:sniffer") owner.runCommand("scriptevent mm:repeated_history")
                target.setOnFire(1)
                const direction = getDirection(loc, target.location);
                target.applyKnockback(makeVector(direction, 1), 0.45);
            }
        }
    }
    meteorProjectile.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:meteorite") {
        const world = entity.getProperty("mm:world_meteor")
        if (world) return;
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        meteorExplosion(dim, loc, level, entity, owner)
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
        if (world) return;
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        var level = entity.getProperty("mm:level")
        if (!level) level = 1
        meteorExplosion(dim, loc, level, entity, owner)
    }
})


system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:entanglement_duration', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:entanglement_duration")
        if (duration.getScore(player) > 0) {
            if (player.hasTag("mm:purify_effected")) {
                duration.setScore(player, 0)
                duration.removeParticipant(player)
                player.dimension.spawnParticle("mm:purify_clear", player.location)
                player.dimension.playSound("spell.purify.clear", player.location, { pitch: 2 })
            }
            duration.addScore(player, -1)
            const onfire = player.getComponent("minecraft:onfire")
            if (onfire && duration.getScore(player) > 0) duration.addScore(player, -1)
            if (duration.getScore(player) % 5 == 0) {
                player.dimension.spawnParticle("mm:entanglement_particle", player.location)
            }
        } else {
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
})

world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const attacker = e.damageSource.damagingEntity;
    const cause = e.damageSource.cause;
    const damage = e.damage

    if (!hurt) return
    if (!hurt.isValid) return
    if (!attacker) return
    if (!attacker.isValid) return
    if (hurt == attacker) return;
    var duration = world.scoreboard.getObjective("mm:entanglement_duration")
    if (!duration) duration = world.scoreboard.addObjective("mm:entanglement_duration", "Entanglement Duration")
    const id = hurt.scoreboardIdentity
    if (duration.getParticipants().includes(id)) {
        if (duration.getScore(hurt) > 11) {
            duration.addScore(hurt, -10)
        }
        if (duration.getScore(hurt) <= 11) {
            duration.setScore(hurt, 1)
        }
        const v = hurt.getVelocity()
        hurt.clearVelocity()
        hurt.applyImpulse(v)
        hurt.dimension.spawnParticle("mm:entanglement_hit_particle", hurt.location)
    }
})

//airsurf
system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:riding_airsurfer"] })) {
        const riding = player.getComponent("minecraft:riding")
        if (riding && riding.entityRidingOn !== undefined) {
            if (riding.entityRidingOn.typeId == "mm:air_surfer") {
                const v = player.getVelocity()
                var x = v.x
                var z = v.z
                if (riding.entityRidingOn.isOnGround && (x > 0.5 || x < -0.5 || z > 0.5 || z < -0.5)) {
                    player.runCommand("camerashake add @s 0.01 1")
                }
                player.playAnimation("animation.player.air_surfer_riding", { blendOutTime: 0.0, stopExpression: "!q.is_riding" })
            } else {
                player.removeTag("mm:riding_airsurfer")

            }
        } else {
            player.removeTag("mm:riding_airsurfer")

        }
    }
})

world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if (hurt.isValid == false) return
    if (!hurt.hasTag("mm:riding_airsurfer")) return
    if (e.damage < 2) return;
    const riding = hurt.getComponent("minecraft:riding")
    if (riding && riding.entityRidingOn !== undefined) {
        if (riding.entityRidingOn.typeId == "mm:air_surfer") {
            hurt.removeTag("mm:riding_airsurfer")
            riding.entityRidingOn.triggerEvent("mm:despawn")

        }
    }

})

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    const id = event.eventId;
    if (id !== "mm:wake") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:air_surfer") return;
    if (!entity || !entity.isValid) return;
    const tame = entity.getComponent("minecraft:tameable")
    const owner = tame.tamedToPlayer
    if (!owner) return;
    const loc = entity.location
    const dim = entity.dimension
    const block = entity.dimension.getBlock({ x: loc.x, y: loc.y - 0.2, z: loc.z })
    if (block && block.typeId == "minecraft:water" && block.above().isAir) {
        system.runTimeout(() => {
            dim.spawnParticle("mm:cloudsurf_water_1", loc)
            dim.spawnParticle("mm:cloudsurf_water_2", loc)
        }, 2)
        system.runTimeout(() => {
            dim.spawnParticle("mm:cloudsurf_water_1", loc)
            dim.spawnParticle("mm:cloudsurf_water_2", loc)
        }, 6)
    }
})

system.runInterval(() => {
    for(const type of DimensionTypes.getAll()) {
        const dim = world.getDimension(type.typeId)
        const clusters = dim.getEntities({type:"mm:cluster_projectile"})
        for(const entity of clusters) {
            const v = entity.getVelocity()
            if(v.x == 0 && v.y == 0 && v.z == 0) {
                entity.triggerEvent("mm:final_explosion")
            } else {
                if(entity.isOnGround) {
                    entity.triggerEvent("mm:mini_explosion")
                }
                if(!entity || !entity.isValid) continue;
                if(!dim.getBlock(entity.location)) continue;
                const blockSpace = dim.getBlock(entity.location).above()
                if (blockSpace.isAir || blockSpace.getComponent("mm:flickerwick_light")) {
                    blockSpace.setType("mm:flickerwick_light")
                }
            }
        }
    }
})