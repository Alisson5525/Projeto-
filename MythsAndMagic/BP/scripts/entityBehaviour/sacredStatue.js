import {
    world,
    system,
    EntityDamageCause
} from "@minecraft/server";

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
    if (damager.typeId !== "mm:sacred_statue") return;
    const targets = damager.dimension.getEntities({ location: damager.location, maxDistance: 5.5 })
    for (const target of targets) {
        if (target.typeId !== damager.typeId && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
            target.addEffect("slowness", 60, { amplifier: 0, showParticles: false })
            const direction = getDirection(damager.location, target.location);
            target.applyDamage(5, { cause: EntityDamageCause.entityExplosion, damagingEntity: damager })
            target.applyKnockback(makeVector(direction, 1.5), 0.45);
            if (target.typeId == "minecraft:player") target.runCommand("camerashake add @s 1 1")
        }
    }
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((event) => {
    const id = event.eventId;
    if (id !== "mm:statue_slam_attack") return;
    const entity = event.entity;
    if (entity.typeId !== "mm:sacred_statue") return;
    system.runTimeout(() => {
        const targets = entity.dimension.getEntities({ location: entity.location, maxDistance: 5.5 })
        for (const target of targets) {
            if (target.typeId !== entity.typeId && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.addEffect("slowness", 60, { amplifier: 0, showParticles: false })
                const direction = getDirection(entity.location, target.location);
                target.applyDamage(25, { cause: EntityDamageCause.entityExplosion, damagingEntity: entity })
                target.applyKnockback(makeVector(direction, 1), 1);
                if (target.typeId == "minecraft:player") target.runCommand("camerashake add @s 2 2")
            }
        }
        const partLoc = entity.location;
        entity.dimension.spawnParticle("mm:statue_slam_attack", partLoc)
        entity.dimension.spawnParticle("mm:statue_attack", { x: partLoc.x + 1.5, y: partLoc.y, z: partLoc.z })
        entity.dimension.spawnParticle("mm:statue_attack", { x: partLoc.x - 1.5, y: partLoc.y, z: partLoc.z })
        entity.dimension.spawnParticle("mm:statue_attack", { x: partLoc.x, y: partLoc.y, z: partLoc.z + 1.5 })
        entity.dimension.spawnParticle("mm:statue_attack", { x: partLoc.x, y: partLoc.y, z: partLoc.z - 1.5 })

    }, 16)
})