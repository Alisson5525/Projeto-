import {
    world,
    system,
    EntityDamageCause
} from "@minecraft/server";

const cooldowns = [
    "mm:icicle_spear_hit_cooldown",
    "mm:icicle_spear_kill_cooldown"
]

system.runInterval(() => {
    for(const entry of cooldowns) {
        for(const player of world.getPlayers()) {
            if(player.getDynamicProperty(entry)) {
                const amt = player.getDynamicProperty(entry)
                if(amt == 0) {
                    player.setDynamicProperty(entry, null)
                } else {
                    player.setDynamicProperty(entry, amt - 1)
                }
            }
        }
    }
})

world.afterEvents.playerSwingStart.subscribe((e) => {
    const player = e.player;
    const item = e.heldItemStack;
    if(!item || !item.getComponent("mm:icicle_spear")) return;
    if(e.swingSource == "Attack") player.dimension.playSound("item.icicle_spear.swing", player.location)
})

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:icicle_spear", {
        onUse(e) {
            const source = e.source
            source.dimension.playSound("item.icicle_spear.use", source.location)
            
        },
        onHitEntity(e) {
            const attacker = e.attackingEntity;
            if(!attacker || !attacker.isValid) return;
            const hurt = e.hitEntity;
            if(!hurt || !hurt.isValid) return;
            hurt.dimension.playSound("item.icicle_spear.hit", hurt.location)
            const hurtLoc = hurt.getHeadLocation()
            const dim = hurt.dimension
            const targets = dim.getEntities({maxDistance: 8, location: hurtLoc})
            if(attacker.getDynamicProperty("mm:icicle_spear_hit_cooldown")) return;
            attacker.setDynamicProperty("mm:icicle_spear_hit_cooldown", 60)
            for(const target of targets) {
                if (target !== attacker && target !== hurt && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || (target.matches({ families: ["player"] }) && world.gameRules.pvp))) {
                    if(target.getEffect("slowness")) continue;
                    const time = connectLine(target.getHeadLocation(), hurtLoc, dim)
                    system.runTimeout(() => {
                        if(!target.isValid) return
                        target.addEffect("slowness", 70, {amplifier: 3})
                        target.clearVelocity()
                    },time)
                }
            }
        }
    })
})


function connectLine(targetLoc, hitLoc, dim) {
    const xDif = targetLoc.x - hitLoc.x
    const yDif = targetLoc.y - hitLoc.y
    const zDif = targetLoc.z - hitLoc.z
    const distanceBetween = Math.ceil(Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z))
    for (let i = 1; i < distanceBetween; i++) {
        system.runTimeout(() => {
            dim.spawnParticle("mm:icicle_spear_chain", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: (Math.random()/2 - 0.25) + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
            system.runTimeout(() => {
                if(Math.random() > 0.7) dim.spawnParticle("minecraft:ice_evaporation_emitter", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: -0.5 + (Math.random()/2 - 0.25) + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })
            },2)
        }, i)
    }
    return distanceBetween
}

function getDistanceBetween(target, loc) {
    const hitLoc = loc
    const targetLoc = target.location
    return Math.ceil(Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z))
}

import {  applyElementDamage, clampValue } from "magicSystem/main.js"
world.afterEvents.entityDie.subscribe((e) => {
    const dead = e.deadEntity;
    if(!dead || !dead.isValid) return;
    const attacker = e.damageSource.damagingEntity;
    if(!attacker || !attacker.isValid || attacker.typeId !== "minecraft:player") return;
    const held = attacker.getComponent("equippable").getEquipment("Mainhand")
    if(!held || !held.getComponent("mm:icicle_spear")) return;
    if(attacker.getDynamicProperty("mm:icicle_spear_kill_cooldown")) return;
    system.runTimeout(() => {
        const dim = dead.dimension
        const loc = dead.location

        dim.playSound("item.icicle_spear.kill", loc, { pitch: 1, volume: 2 })
        dim.playSound("spell.chilling.2", loc, { pitch: 1.2, volume: 1.5 })
        dim.spawnParticle("mm:snowball_hit_0", loc)
        dim.spawnParticle("mm:snowball_hit_1", loc)
        dim.spawnParticle("mm:snowball_hit_2", loc)
        const damage = 13
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
            if (target !== attacker && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || (target.matches({ families: ["player"] }) && world.gameRules.pvp))) {
                var mult = 1
                if (target.matches({ families: ["blaze"] })) mult = 2
                const dmgDone = applyElementDamage(mult * clampValue(damage - Math.round(getDistanceBetween(target, loc) * 10) / 10, damage - 6, damage + 1), target, attacker, EntityDamageCause.entityExplosion, "ice")
                if (dmgDone) target.addEffect("slowness", 20, { amplifier: 20 })
            }
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                const onfire = target.getComponent("onfire")
                if (onfire) target.extinguishFire()
            }
        }

    }, 19)

    attacker.setDynamicProperty("mm:icicle_spear_kill_cooldown", 59)
})