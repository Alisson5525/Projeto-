import {
    world,
    system,
    ItemStack,
    EntityDamageCause
} from "@minecraft/server";

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

function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}
function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}

function hasFullMeteorArmour(player) {
    const equippable = player.getComponent("minecraft:equippable")
    if (equippable !== undefined) {
        const head = equippable.getEquipment("Head")
        if (head == undefined) return false;
        if (head.typeId !== "mm:meteor_helmet") return false;

        const chest = equippable.getEquipment("Chest")
        if (chest == undefined) return false;
        if (chest.typeId !== "mm:meteor_chestplate") return false;

        const legs = equippable.getEquipment("Legs")
        if (legs == undefined) return false;
        if (legs.typeId !== "mm:meteor_leggings") return false;

        const feet = equippable.getEquipment("Feet")
        if (feet == undefined) return false;
        if (feet.typeId !== "mm:meteor_boots") return false;
    }
    return true
}

function damageItem(slot, player, damage) {
    const equipment = player.getComponent("equippable")
    const item = equipment.getEquipment(slot)
    if (!item) return;
    if (!damage) return;
    const durability = item.getComponent("durability")
    var chance = 1
    const unbreaking = item.getComponent("enchantable").getEnchantment("unbreaking")
    if (unbreaking) {
        chance = 1 / (unbreaking.level + 1)
    }
    for (let i = 0; i < damage; i++) {
        if (Math.random() <= chance) {
            const duraDamage = 1
            if (durability.damage + duraDamage < durability.maxDurability) {
                durability.damage += duraDamage;
                equipment.setEquipment(slot, item)
            } else {
                equipment.setEquipment(slot, undefined)
                player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 1 })

            }
        }
    }
}

system.runInterval((e) => {
    for (const player of world.getPlayers({ excludeGameModes: ["Spectator"], tags: ["mm:been_loaded"] })) {
        if (!player.isValid) continue;
        const airTimer = player.getDynamicProperty("mm:airtime")
        if (player.isOnGround || player.isFlying || player.isInWater) {
            if (airTimer !== 0) player.setDynamicProperty("mm:airtime", 0)
        } else {
            player.setDynamicProperty("mm:airtime", airTimer + 1)
        }
        player.setDynamicProperty("mm:airtime_o", airTimer)
    }
})

system.runInterval((e) => {
    for (const player of world.getPlayers({ excludeGameModes: ["Spectator"] })) {
        if (player.isFlying || !hasFullMeteorArmour(player) || !player.isFalling || player.getDynamicProperty("mm:airtime") <= 13) continue;
        const dim = player.dimension
        const loc = player.location
        if (player.getComponent("minecraft:player.hunger").currentValue > 6) {
            var topmostBlock = dim.getTopmostBlock({ x: loc.x, z: loc.z }, loc.y)
            if(!topmostBlock) topmostBlock = dim.getBlock({x:loc.x, y:dim.heightRange.min, z:loc.z})
            if (topmostBlock.y <= loc.y - 2.5 || player.hasTag("mm:meteor_armour_drop_active")) {
                if (!player.hasTag("mm:meteor_armour_drop_active")) {

                    dim.playSound("item.meteor_armour.fall", loc, { pitch: 1.5, volume: 1 })
                }
                player.applyImpulse({ x: 0, y: -0.2, z: 0 })
                player.runCommand("camerashake add @s 0.06 0.3")
                player.addTag("mm:meteor_armour_drop_active")
                try {
                    dim.spawnParticle("mm:meteor_armour_trail", loc)
                } catch { }
            }
        } else {
            player.removeTag("mm:meteor_armour_drop_active")

        }
    }
    for (const player of world.getPlayers({ tags: ["mm:meteor_armour_drop_active"] })) {
        if (!player.isOnGround && (player.isFlying || !hasFullMeteorArmour(player) || !player.isFalling || player.getDynamicProperty("mm:airtime") <= 13)) {
            player.removeTag("mm:meteor_armour_drop_active")
            continue;
        }
        if (player.isOnGround) {
            player.removeTag("mm:meteor_armour_drop_active")
            const airTime = player.getDynamicProperty("mm:airtime_o")
            if (airTime <= 13) return;
            const dim = player.dimension
            const loc = player.location
            dim.playSound("item.meteor_armour.explode", loc, { pitch: 1.5, volume: 1 })
            dim.spawnParticle("mm:meteor_groundhit", loc)
            dim.spawnParticle("mm:meteor_explosion", loc)
            dim.spawnParticle("mm:meteor_explosion", loc)
            dim.spawnParticle("mm:meteor_explosion", loc)
            dim.spawnParticle("mm:meteor_hit_0", loc)
            var headDmg = 1
            var chestDmg = 1
            var legsDmg = 1
            var bootsDmg = 2
            var wasAnyDamageDone = false
            var damage = 20
            if (airTime <= 16) damage = 16
            if (airTime <= 12) damage = 12
            if (airTime >= 20) {
                for (let i = 0; i < airTime - 18; i++) {
                    damage += 1
                }
            }
            const bonusTargets = dim.getEntities({ location: loc, maxDistance: 4 })
            for (const target of bonusTargets) {
                if (target !== player && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                    var effDamage = damage * clampValue(((6 - getDistanceBetween(target, player)) / 6), 0.1, 0.66)
                    effDamage = Math.round(effDamage * 10) / 10
                    var dmgDone = target.applyDamage(effDamage, { cause: "entityExplosion", damagingEntity: player })
                    if (dmgDone) {
                        if(target.typeId == "minecraft:sniffer") player.runCommand("scriptevent mm:repeated_history")
                        wasAnyDamageDone = true
                        const slots = [
                            "head",
                            "chestplate",
                            "legs",
                            "feet"
                        ]
                        const damageTo = slots[Math.floor(Math.random() * slots.length)]
                        if (damageTo == "head") headDmg += 1
                        if (damageTo == "chestplate") chestDmg += 1
                        if (damageTo == "legs") legsDmg += 1
                        if (damageTo == "feet") bootsDmg += 1
                        target.setOnFire(1)
                        const direction = getDirection(loc, target.location);
                        target.applyKnockback(makeVector(direction, 1), 0.45);
                    }
                }
            }
            if (wasAnyDamageDone) {
                damageItem("Head", player, headDmg)
                damageItem("Chest", player, chestDmg)
                damageItem("Legs", player, legsDmg)
                damageItem("Feet", player, bootsDmg)
            }
        }
    }
})

world.beforeEvents.entityHurt.subscribe((e) => {
    const player = e.hurtEntity;
    if (!player) return;
    if (player.hasTag("mm:meteor_armour_drop_active") == false) return;
    const cause = e.damageSource.cause;
    if (cause !== "fall") return;
    if (player.hasTag("mm:meteor_armour_temp")) {
        system.run(() => {
            player.removeTag("mm:meteor_armour_temp")
        })
        return;
    }
    var damage = e.damage
    if (damage <= 8) damage = 0
    if (damage > 8) damage -= 8
    damage = damage * 0.33
    e.cancel = true;
    system.run(() => {
        if (damage > 0) {
            player.addTag("mm:meteor_armour_temp")
            player.applyDamage(damage, { cause: "fall" })
        }
    })
})