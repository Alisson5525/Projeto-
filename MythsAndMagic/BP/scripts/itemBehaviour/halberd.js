import {
    world,
    system,
    EntityDamageCause,
    GameMode
} from "@minecraft/server";

function reduceHunger(entity, amount) {
    if (entity.typeId !== "player") return;
    if (entity.getGameMode() == GameMode.Creative) return;
    const saturation = entity.getComponent("minecraft:player.saturation");
    if (!saturation) return;
    const hunger = entity.getComponent("minecraft:player.hunger");
    if (!hunger) return;
    if (saturation.currentValue !== 0) {
        if (saturation.currentValue - amount * 0.75 < 0) {
            saturation.setCurrentValue(0)
        } else {
            saturation.setCurrentValue(saturation.currentValue - amount * 0.75)
        }
    } else {
        if (hunger.currentValue - amount < 0) {
            hunger.setCurrentValue(0)
        } else {
            hunger.setCurrentValue(hunger.currentValue - amount)
        }
    }
}

//vector bullshit pt1
export function getDirection(from, to) {
    const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
    if (distance == 0) return { x: 0, y: 0, z: 0 };

    return {
        x: (to.x - from.x) / distance,
        y: (to.y - from.y) / distance,
        z: (to.z - from.z) / distance
    };
}
//vector bullshit pt2
export function makeVector(vector, strength) {
    var vx = vector.x
    var vz = vector.z

    return { x: vx * strength, z: vz * strength }
}

function getPitch() {
    var pitch = Math.random() * 0.4
    return pitch + 0.4
}




function modifyDamage(attacker, hurt, damage, itemStack) {
    var newDamage = damage
    if (attacker.getEffect("weakness")) {
        const level = attacker.getEffect("weakness").amplifier + 1
        newDamage = newDamage * Math.pow(0.8, level) + (Math.pow(0.8, level) - 1) / 0.4
    }
    if (attacker.getEffect("strength")) {
        const level = attacker.getEffect("strength").amplifier + 1
        newDamage = newDamage * Math.pow(1.3, level) + (Math.pow(1.3, level) - 1) / 0.4
    }
    const enchantable = itemStack.getComponent('minecraft:enchantable');
    for (const enchantment of enchantable.getEnchantments()) {
        if (enchantment.type.id === 'sharpness') {
            newDamage = newDamage + Math.floor(enchantment.level * 1.25);
        }
        if (enchantment.type.id === 'smite') {
            if (hurt.matches({
                families: ['undead']
            })) {
                newDamage = newDamage + Math.floor(enchantment.level * 2.5);
            }
        }
        if (enchantment.type.id === 'bane_of_arthropods') {
            if (hurt.matches({
                families: ['arthropod']
            })) {
                newDamage = newDamage + Math.floor(enchantment.level * 2.5);
            }
        }
    }
    return newDamage
}

function disableShield(hit, seconds, type) {
    hit.startItemCooldown("minecraft:shield", seconds * 20)
    const dim = hit.dimension;
    const targetLoc = hit.location;
    dim.playSound("item." + type + "halberd.disarm", targetLoc)
    dim.spawnParticle("minecraft:critical_hit_emitter", { x: targetLoc.x, y: targetLoc.y + 0.4, z: targetLoc.z })
}


system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:halberd_critical_hit", {
        onHitEntity({ hitEntity, attackingEntity, itemStack, hadEffect }, p) {
            if (!hitEntity) return;
            if (!attackingEntity) return;
            if (!itemStack) return;
            if (attackingEntity.typeId == "minecraft:player") {
                if (attackingEntity.isSprinting == false || hitEntity.isValid == false) {
                    if (itemStack.typeId == "mm:wooden_halberd") attackingEntity.dimension.playSound("item.wooden_halberd.hit", hitEntity.location)
                    if (itemStack.typeId !== "mm:wooden_halberd") attackingEntity.dimension.playSound("item.halberd.hit", hitEntity.location)
                    return;
                }
            } else {
                const v = attackingEntity.getVelocity()
                if ((v.x > 0.2 || v.x < -0.2) || (v.y > 0.2 || v.y < -0.2) || (v.z > 0.2 || v.z < -0.2)) {
                    if (hitEntity.isValid == false) {
                        if (itemStack.typeId == "mm:wooden_halberd") attackingEntity.dimension.playSound("item.wooden_halberd.hit", hitEntity.location)
                        if (itemStack.typeId !== "mm:wooden_halberd") attackingEntity.dimension.playSound("item.halberd.hit", hitEntity.location)
                        return;
                    }
                } else {
                    return;
                }
            }
            if (attackingEntity.getEffect("slowness")) {
                if (itemStack.typeId == "mm:wooden_halberd") attackingEntity.dimension.playSound("item.wooden_halberd.hit", hitEntity.location)
                if (itemStack.typeId !== "mm:wooden_halberd") attackingEntity.dimension.playSound("item.halberd.hit", hitEntity.location)
                return;
            }
            const mult = p.params.knockback_strength;
            const slownessDuration = p.params.slowness_duration;
            var damage = p.params.critical_damage;
            const hitLoc = hitEntity.location
            const attackLoc = attackingEntity.location
            //damage calc for mobs (less accurate)
            const clashingLvl = itemStack.getDynamicProperty("mm:ponder_enchant_clashing")
            if (attackingEntity.typeId !== "minecraft:player") {
                var damageBuff = 0
                if (clashingLvl) damageBuff = Math.floor(clashingLvl * 1.5)
                damage = modifyDamage(attackingEntity, hitEntity, damage, itemStack)
                damage += damageBuff
                hitEntity.applyDamage(damage, { damagingEntity: attackingEntity, cause: EntityDamageCause.entityAttack })
            }
            reduceHunger(attackingEntity, 0.1)
            attackingEntity.dimension.spawnParticle("minecraft:critical_hit_emitter", hitEntity.getHeadLocation())
            const direction = getDirection(attackLoc, hitLoc);
            hitEntity.applyKnockback(makeVector(direction, mult * 1.3), 0.35 * mult * 0.9);
            if (itemStack.typeId == "mm:wooden_halberd") attackingEntity.dimension.playSound("item.wooden_halberd.hit_critical", hitEntity.location, { volume: 0.6, pitch: getPitch() })
            if (itemStack.typeId !== "mm:wooden_halberd") attackingEntity.dimension.playSound("item.halberd.hit_critical", hitEntity.location, { volume: 0.6, pitch: getPitch() })

            attackingEntity.addEffect("slowness", slownessDuration * 1.1 + damage / 3, { amplifier: 0, showParticles: false })


            if (clashingLvl && hitEntity.typeId == "minecraft:player") {
                if (hadEffect == false) {
                    const isShieldReady = hitEntity.getItemCooldown("minecraft:shield")
                    if (isShieldReady <= 0) {
                        if (hitEntity.isSneaking) {
                            const hitequippable = hitEntity.getComponent("equippable")
                            if (hitequippable) {
                                const mainHand = hitequippable.getEquipment("Mainhand")
                                if (mainHand !== undefined) {
                                    if (mainHand.typeId == "minecraft:shield") {
                                        if (itemStack.typeId == "mm:wooden_halberd") disableShield(hitEntity, Math.ceil(1 + clashingLvl), "wooden_")
                                        if (itemStack.typeId !== "mm:wooden_halberd") disableShield(hitEntity, Math.ceil(1 + clashingLvl), "")
                                        return;
                                    }
                                }
                                const offhand = hitequippable.getEquipment("Offhand")
                                if (offhand !== undefined) {
                                    if (offhand.typeId == "minecraft:shield") {
                                        if (itemStack.typeId == "mm:wooden_halberd") disableShield(hitEntity, Math.ceil(1 + clashingLvl), "wooden_")
                                        if (itemStack.typeId !== "mm:wooden_halberd") disableShield(hitEntity, Math.ceil(1 + clashingLvl), "")
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (itemStack == undefined) return;
            if (attackingEntity.typeId !== "minecraft:player") return;
            const cooldown = itemStack.getComponent("cooldown")
            const ticks = cooldown.cooldownTicks
            const cat = cooldown.cooldownCategory
            attackingEntity.startItemCooldown(cat, Math.ceil(ticks * 1.4))
        }
    })
})

//damage calc for players (more accurate)
world.beforeEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "minecraft:player") return;
    if (!attacker.isSprinting) return;
    const cause = e.damageSource.cause
    if (cause !== "entityAttack") return;
    const held = attacker.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    const halberdComp = held.getComponent("mm:halberd_critical_hit")
    if (!halberdComp) return;
    const params = halberdComp.customComponentParameters.params
    const clashingLvl = held.getDynamicProperty("mm:ponder_enchant_clashing")
    var damageBuff = 0
    if (clashingLvl) damageBuff = Math.floor(clashingLvl * 1.5)
    var critDmg = params.critical_damage;
    var baseDmg = params.base_damage;
    e.damage = e.damage * ((critDmg + damageBuff) / (baseDmg + 1))
})