import {
    world,
    system,
    EntityDamageCause
} from "@minecraft/server";

import { clampValue } from "magicSystem/main.js"
function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}
function hellfireBurst(dim, loc, heat, level, entity, owner) {
    heat = 2
    level = 2
    dim.spawnParticle(`mm:guardian_hellfire_explosion`, loc)
    dim.spawnParticle(`mm:guardian_hellfire_sonicboom`, loc)
    dim.spawnParticle(`mm:guardian_hellfire`, { x: loc.x + 2, y: loc.y, z: loc.z })
    dim.spawnParticle(`mm:guardian_hellfire`, { x: loc.x - 2, y: loc.y, z: loc.z })
    dim.spawnParticle(`mm:guardian_hellfire`, { x: loc.x, y: loc.y, z: loc.z + 2 })
    dim.spawnParticle(`mm:guardian_hellfire`, { x: loc.x, y: loc.y, z: loc.z - 2 })
    dim.playSound("spell.hellfire.hit", loc, { pitch: 1 - (heat / 8), volume: 0.2 + (heat / 10) })
    const damage = 2 + (heat * 4) + (level * 2)
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 1 + (heat * 2) })
    if (owner) {
        for (const target of bonusTargets) {
            if (target.typeId == "mm:guardian_myth") continue;
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {

                target.applyDamage(clampValue(damage - getDistanceBetween(target, entity) / 4 - heat, damage - 6, damage + 1), { cause: EntityDamageCause.lava, damagingEntity: owner })
                target.setOnFire(heat * 2 + 1)
            }
        }
    } else {
        for (const target of bonusTargets) {
            if (target.typeId == "mm:guardian_myth") continue;
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.applyDamage(clampValue(damage - getDistanceBetween(target, entity) / 4 - heat, damage - 6, damage + 1), { cause: EntityDamageCause.lava })
                target.setOnFire(heat * 2 + 1)
            }
        }
    }
    entity.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:guardian_hellfire") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        var level = 2
        var heat = 2
        hellfireBurst(dim, loc, heat, level, entity, owner)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:guardian_hellfire") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        var level = 2
        var heat = 2
        hellfireBurst(dim, loc, heat, level, entity, owner)
    }
})


//melee knockback

function getDirection(from, to) {
    const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
    if (distance == 0) return { x: 0, y: 0, z: 0 };

    return {
        x: (to.x - from.x) / distance,
        y: (to.y - from.y) / distance,
        z: (to.z - from.z) / distance
    };
}

function makeVector(vector, strength) {
    var vx = vector.x
    var vz = vector.z

    return { x: vx * strength, z: vz * strength }
}

world.afterEvents.entityHurt.subscribe((event) => {
    const damager = event.damageSource.damagingEntity;
    const cause = event.damageSource.cause;
    if (cause !== EntityDamageCause.entityAttack) return;
    if (!damager) return;
    if (damager.typeId !== "mm:guardian_myth") return;
    const hurt = event.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    const direction = getDirection(damager.location, hurt.location);
    hurt.applyKnockback(makeVector(direction, 2.3), 0.5);

})

world.beforeEvents.entityHurt.subscribe((e) => {
    const cause = e.damageSource.cause;
    if (cause !== EntityDamageCause.entityAttack) return;
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "mm:guardian_myth") return;
    const hands = attacker.getProperty("mm:hands_active")
    const hurt = e.hurtEntity
    system.run(() => {
        if(hands > 2) {

            attacker.dimension.playSound("mob.guardian_myth.hit_strong", hurt.location)
        } else {
            attacker.dimension.playSound("mob.guardian_myth.hit_weak", hurt.location)

        }
    })
    if (hands == 3) e.damage = e.damage * 0.76
    if (hands == 2) e.damage = e.damage * 0.66
    if (hands == 1) e.damage = e.damage * 0.33
    if (hands == 0) e.cancel = true
})


//anchor points

world.afterEvents.entitySpawn.subscribe((e) => {
    const entity = e.entity;
    if (!entity || !entity.isValid) return;
    if (entity.typeId !== "mm:guardian_myth") return;
    if (!entity.getProperty("mm:respawn_after_killed")) return;
    const dim = entity.dimension
    entity.setDynamicProperty("mm:origin_loc", entity.location)
    entity.setDynamicProperty("mm:origin_dim", dim.id)
})

world.afterEvents.entityDie.subscribe((e) => {
    const entity = e.deadEntity;
    if (!entity || !entity.isValid) return;
    if (entity.typeId !== "mm:guardian_myth") return;
    if (!entity.getProperty("mm:respawn_after_killed")) return;
    const dim = entity.getDynamicProperty("mm:origin_dim")
    const loc = entity.getDynamicProperty("mm:origin_loc")
    if (!dim || !loc) return;
    const getDim = world.getDimension(dim)
    const worldBottom = getDim.heightRange.min
    const tickingAreaManager = world.tickingAreaManager;
    const tickId = `mm:anchor_${entity.id}`
    tickingAreaManager.createTickingArea(tickId, {
        dimension: getDim,
        from: loc,
        to: loc
    })
    system.runTimeout(() => {
        if (getDim.isChunkLoaded(loc)) {
            const newgen = getDim.spawnEntity("mm:guardian_myth_respawn_anchor", {
                x: loc.x,
                y: worldBottom + 1,
                z: loc.z
            })
            newgen.setDynamicProperty("mm:origin_loc", loc)
            newgen.setDynamicProperty("mm:origin_dim", dim)
        }
        tickingAreaManager.removeTickingArea(tickId)
    }, 1)
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:respawn_guardian_myth") return;
    const entity = e.entity;
    const dim = entity.dimension
    const loc = entity.getDynamicProperty("mm:origin_loc")
    const myth = dim.spawnEntity("mm:guardian_myth", {
        x: loc.x,
        y: loc.y - 0.5,
        z: loc.z
    }, {
        spawnEvent: "mm:spawn_for_structure"
    })
    const obstructed = myth.tryTeleport(loc, { checkForBlocks: true })
    if (obstructed == false) return myth.remove()

    myth.dimension.spawnParticle("mm:guardian_hellfire_sonicboom", myth.location)

    myth.dimension.spawnParticle("mm:guardian_hellfire_explosion", myth.location)
    dim.playSound("mob.guardian_myth.spawn", myth.location)
    entity.remove()
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if (e.eventId !== "mm:spawn_guardian_myth") return;
    const entity = e.entity;
    const dim = entity.dimension
    const loc = entity.location
    const myth = dim.spawnEntity("mm:guardian_myth", {
        x: loc.x,
        y: loc.y - 0.5,
        z: loc.z
    }, {
        spawnEvent: "mm:spawn_for_structure"
    })
    const obstructed = myth.tryTeleport(loc, { checkForBlocks: true })
    if (obstructed == false) return myth.remove()

    entity.remove()
    myth.dimension.spawnParticle("mm:guardian_hellfire_sonicboom", myth.location)

    myth.dimension.spawnParticle("mm:guardian_hellfire_explosion", myth.location)
    dim.playSound("mob.guardian_myth.spawn", myth.location)
})

//key drops

world.afterEvents.entityHurt.subscribe((e) => {
    const damager = e.damageSource.damagingEntity;
    if (!damager) return;
    if (damager.typeId !== "minecraft:player") return;
    const hurt = e.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    if (hurt.typeId !== "mm:guardian_myth") return;
    if (!hurt.getProperty("mm:respawn_after_killed")) return;
    hurt.addTag("mm:remembered_hurt_by_" + damager.id)
})

world.afterEvents.entityDie.subscribe((e) => {
    const entity = e.deadEntity;
    if (!entity || !entity.isValid) return;
    if (entity.typeId !== "mm:guardian_myth") return;
    if (!entity.getProperty("mm:respawn_after_killed")) return;
    var keyCount = 0
    var idChecks = []
    for (const tag of entity.getTags()) {
        if (!tag.includes("mm:remembered_hurt_by")) continue;
        const id = tag.replace("mm:remembered_hurt_by_", "")
        idChecks.push(id)
    }
    for (const player of entity.dimension.getPlayers({
        maxDistance: 32,
        location: entity.location,
        excludeGameModes: [
            "Spectator"
        ]
    })) {
        if (idChecks.includes(`${player.id}`)) keyCount += 1
    }
    if (keyCount < 1 && e.damageSource.damagingEntity) keyCount = 1
    if (keyCount > 6) keyCount = 6
    for (let i = 0; i < keyCount; i++) {
        const LootTableManager = world.getLootTableManager()
        const loot = LootTableManager.getLootTable("entities/guardian_myth")
        const lootDrop = LootTableManager.generateLootFromTable(loot)
        for (const itemDrop of lootDrop) {
            entity.dimension.spawnItem(itemDrop, entity.location).clearVelocity()
        }
    }
})

//particle

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if(e.eventId !== "mm:remove_hand") return;
    const entity = e.entity;
    if(!entity || !entity.isValid || entity.typeId !== "mm:guardian_myth") return;
    const hands = entity.getProperty("mm:hands_active")
    entity.dimension.playSound("mob.guardian_myth.break_hand", entity.location, {volume: 0.33, pitch: Math.random()/2.5 + 0.8})
    if(hands == 3) {
        entity.runCommand("particle mm:guardian_myth_hand_breaks ^-1^1^1")
    } else if(hands == 2) {
        entity.runCommand("particle mm:guardian_myth_hand_breaks ^1^1^1")
    } if(hands == 1) {
        entity.runCommand("particle mm:guardian_myth_hand_breaks ^-1^2^1")
    } else if(hands == 0) {
        entity.runCommand("particle mm:guardian_myth_hand_breaks ^1^2^1")
    }
})