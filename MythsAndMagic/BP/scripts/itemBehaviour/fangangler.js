import {
    world,
    system,
    EntityDamageCause
} from "@minecraft/server";

function getMaxMana(player) {
    return player.getDynamicProperty("mm:max_mana")
}
function getCurrentMana(player) {
    return player.getDynamicProperty("mm:mana")
}
function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:fangangler", {
        onUse(e) {
            const player = e.source;
            const item = e.itemStack;

            const cd = item.getComponent("cooldown")
            player.startItemCooldown(cd.cooldownCategory, 5)
            player.playSound("item.fangangler.charge", { volume: 2 })
            //player.dimension.spawnParticle("mm:fangangler_charge", player.location)
        },
        onHitEntity(e) {
            if (e.hadEffect == true) {
                e.attackingEntity.dimension.playSound("item.fangangler.attack", e.attackingEntity.location, { volume: 1.5, pitch: 1 + (Math.random() * 0.4) - 0.2 })
                e.hitEntity.dimension.spawnParticle("mm:fangangler_slash", e.hitEntity.location)
            }
        }
    })
})


world.afterEvents.itemReleaseUse.subscribe((e) => {
    const item = e.itemStack;
    const player = e.source;
    const time = e.useDuration;
    if (item.hasComponent("mm:fangangler") == false || item.hasComponent("mm:fangangler") == undefined) return;
    const usedTime = 19999980 - time
    const projectileCount = Math.round(clampValue(usedTime / 6, 0, 16))
    if (projectileCount == 0) return;
    player.dimension.playSound("item.fangangler.shoot", player.location)
    const viewDir = player.getViewDirection()
    let amount = projectileCount
    const level = item.getDynamicProperty("mm:ponder_enchant_toxicity")
    for (let i = 0; i < amount; i++) {
        if (player.getComponent("equippable").getEquipment("Mainhand") == undefined) return;
        if (player.getComponent("equippable").getEquipment("Mainhand").typeId !== "mm:fangangler") return;
        system.runTimeout(() => {
            player.runCommand("particle mm:fangangler_slash ^^1.1^1.5")
            player.dimension.playSound("item.fangangler.attack", player.location, { volume: 0.75, pitch: 1 + (Math.random() * 0.4) - 0.2 })
        }, i * 2)
        const projectile = player.dimension.spawnEntity("mm:fangangler_projectile", player.getHeadLocation())
        if(level) projectile.addTag("mm:toxicity_enchanted")
        const comp = projectile.getComponent('projectile');
        const angle = (-(((amount - 1) / 2) * 5) + (4 * i))
        const radians = angle * (Math.PI / 180)
        let cosTheta = Math.cos(radians);
        let sinTheta = Math.sin(radians);
        const direction = {
            x: viewDir.x * cosTheta + viewDir.z * sinTheta,
            y: viewDir.y,
            z: -viewDir.x * sinTheta + viewDir.z * cosTheta
        }
        if (comp) {
            comp.owner = player
            comp.shoot(multiply(direction, { x: 1, y: 1, z: 1 }))
        } else projectile.applyImpulse(multiply(direction, { x: 1, y: 1, z: 1 }))


    }


    if (player.getGameMode() !== "Creative") {
        const equipment = player.getComponent("equippable");
        const durability = item.getComponent("durability");
        const unbreaking = item.getComponent("enchantable")?.getEnchantment("unbreaking");
        const chance = unbreaking ? 1 / (unbreaking.level + 1) : 1;

        let damage = 0;
        const duraDamage = Math.round(projectileCount * 1.5)
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
    const cd = item.getComponent("cooldown")
    player.startItemCooldown(cd.cooldownCategory, clampValue(usedTime, 20, 80))
})


world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (entity.isValid == false) return;
    if (entity.typeId == "mm:fangangler_projectile") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        dim.playSound("item.fangangler_projectile.hit", loc, { pitch: 1, volume: 1 })

        if (entity.isValid) entity.remove()
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (entity.isValid == false) return;
    if (entity.typeId == "mm:fangangler_projectile") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        if (!owner) return;
        if (owner == hit) return;
        dim.playSound("item.fangangler_projectile.hit", loc, { pitch: 1, volume: 1 })
        const apply = hit.applyDamage(8, { damagingProjectile: entity, damagingEntity: owner, cause: EntityDamageCause.entityAttack })
        if (apply) {
            if (owner !== hit && hit.typeId == "minecraft:player") owner.playSound("item.spellbook.hit", { volume: 0.2, pitch: 0.9 })
        }
        system.runTimeout(() => {
            if (entity.isValid) entity.remove()
        }, 1)
    }
})

function healPlayer(player, amount) {
    const hp = player.getComponent("minecraft:health");
    if (!hp) return;
    if (hp.currentValue + amount > hp.defaultValue) {
        hp.setCurrentValue(hp.defaultValue)
    } else {
        hp.setCurrentValue(hp.currentValue + amount)
    }
}

world.afterEvents.entityHurt.subscribe((e) => {
    const proj = e.damageSource.damagingProjectile;
    if (!proj) return;
    if (!proj.isValid) return;
    const project = proj.getComponent("minecraft:projectile")
    const owner = project.owner;
    const damage = e.damage;
    if (proj.typeId == "mm:fangangler_projectile") {
        healPlayer(owner, damage)
        if(proj.hasTag("mm:toxicity_enchanted")) {
            const hurt = e.hurtEntity;
            if(!hurt || !hurt.isValid) return;
            if(hurt.matches({families:["skeleton"]})) return;
            var duration = hurt.matches({families:["spider"]}) ? 5 : 8 + Math.floor(Math.random()*3)
            for(let i = 0; i < duration; i++) {
                system.runTimeout(() => {
                    if(!hurt || !hurt.isValid) return;
                    const dmgDone = hurt.applyDamage(1, {cause: EntityDamageCause.wither})
                    if(dmgDone && hurt.dimension.isChunkLoaded(hurt.location)) {
                        hurt.dimension.spawnParticle("mm:fangangler_projectile", hurt.location)
                        hurt.dimension.spawnParticle("mm:fangangler_projectile_2", hurt.location)
                        hurt.dimension.spawnParticle("mm:fangangler_projectile", hurt.getHeadLocation())
                        hurt.dimension.spawnParticle("mm:fangangler_projectile_2", hurt.getHeadLocation())
                        hurt.dimension.playSound("spell.toxic.pulse", hurt.location, {pitch: 0.6 + Math.random()*0.8})
                    }
                }, 5 + i*5)
            }
        }
    }
})

function multiply(a, b) {
    return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}