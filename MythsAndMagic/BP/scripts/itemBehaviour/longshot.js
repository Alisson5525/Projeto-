import {
    world,
    system,
    DimensionTypes,
    ItemStack
} from "@minecraft/server";
import { makeVector, getDirection } from "magicSystem/main.js"

//mobs that cannot be pulled at all by the tether enchant
// any mob with the "longshot_unpullable" family will also be affected by this
// any mob with the "gravity_immune" family will also be affected by this
// any mob with the "boss" family will also be affected by this
const unpullables = [
    "minecraft:ravager",
    "minecraft:iron_golem",
    "minecraft:ender_dragon",
    "minecraft:wither",
    "minecraft:warden"
]
//mobs that cannot be pulled quickly by the tether enchant
// any mob with the "longshot_heavy" family will also be affected by this
const heavy = [
    "minecraft:creaking",
    "minecraft:panda",
    "minecraft:polar_bear",
    "minecraft:nautilus",
    "minecraft:zombie_nautilus",
    "minecraft:sniffer",
    "minecraft:copper_golem",
    "minecraft:camel",
    "minecraft:camel_husk",
    "minecraft:guardian",
    "minecraft:elder_guardian",
    "minecraft:ghast",
    "minecraft:happy_ghast",
    "minecraft:hoglin",
    "minecraft:zoglin"
]

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:longshot", {
        onUse(e) {
            const player = e.source;
            if (player.getGameMode() !== "Creative") {
                const inventory = player.getComponent("inventory")
                const container = inventory.container;
                var arrows = false
                for (let i = -1; i < container.size; i++) {
                    var checkitem = undefined
                    if (i == -1) checkitem = player.getComponent("equippable").getEquipment("Offhand")
                    if (i > -1) checkitem = container.getItem(i)
                    if (checkitem && checkitem.typeId == "minecraft:arrow") {
                        arrows = true;
                        break;
                    }
                }
                if (arrows == false) {
                    player.playSound("crossbow.loading.end", { volume: 1, pitch: 0.75 })
                    return;
                }
            }

            player.playSound("crossbow.loading.start", { volume: 2 })
        }
    })
})


world.afterEvents.itemCompleteUse.subscribe((e) => {
    const item = e.itemStack;
    const player = e.source;
    const dim = player.dimension
    if (!player.isValid) return;
    if (item.hasComponent("mm:longshot") == false || item.hasComponent("mm:longshot") == undefined) return;

    if (player.getGameMode() !== "Creative") {
        const inventory = player.getComponent("inventory")
        const container = inventory.container;
        var arrows = false
        for (let i = -1; i < container.size; i++) {
            var checkitem = undefined
            if (arrows == true) break;
            if (i == -1) checkitem = player.getComponent("equippable").getEquipment("Offhand")
            if (i > -1) checkitem = container.getItem(i)
            if (checkitem && checkitem.typeId == "minecraft:arrow") {
                arrows = true;
                if (checkitem.amount == 1) {
                    if (i == -1) player.getComponent("equippable").setEquipment("Offhand", undefined)
                    if (i > -1) container.setItem(i, undefined)
                } else {
                    checkitem.amount -= 1
                    if (i == -1) player.getComponent("equippable").setEquipment("Offhand", checkitem)
                    if (i > -1) container.setItem(i, checkitem)
                }
            }
        }
        if (arrows == false) return
    }


    const viewDir = player.getViewDirection()
    const head = player.getHeadLocation()
    const projectile = dim.spawnEntity("mm:longshot_projectile", head)

    const reelingLvl = item.getDynamicProperty("mm:ponder_enchant_reeling")
    const extensionLvl = item.getDynamicProperty("mm:ponder_enchant_extension")
    const tetherLvl = item.getDynamicProperty("mm:ponder_enchant_tether")

    dim.playSound("item.longshot.shoot", { x: viewDir.x + head.x, y: head.y, z: viewDir.z + head.z }, { volume: 0.66 })
    const comp = projectile.getComponent('projectile');
    if (comp) {
        comp.owner = player
        var power = 1.33
        if (extensionLvl) power += extensionLvl / 5
        comp.shoot(multiply(viewDir, { x: power, y: power, z: power }))
        if (reelingLvl) projectile.setDynamicProperty("mm:reeling_level", reelingLvl)
        if (tetherLvl) projectile.setDynamicProperty("mm:tether_level", tetherLvl)
        const leashable = projectile.getComponent('leashable');
        leashable.leashTo(player)
        var gravity = comp.gravity
        comp.gravity = 0
        system.runTimeout(() => {
            if (projectile.isValid) comp.gravity = gravity * 1.1
        }, 5)
    } else return;
    var durabilityTotal = 1
    if (extensionLvl) durabilityTotal += extensionLvl
    if (tetherLvl) durabilityTotal += 1
    for (let i = 0; i < durabilityTotal; i++) {
        if (player.getGameMode() !== "Creative") {
            const equipment = player.getComponent("equippable")
            const durability = item.getComponent("durability")
            const duraDamage = 1
            var chance = 1
            const unbreaking = item.getComponent("enchantable").getEnchantment("unbreaking")
            if (unbreaking) {
                chance = 1 / (unbreaking.level + 1)
            }
            if (Math.random() <= chance) {
                if (durability.damage + duraDamage < durability.maxDurability) {
                    durability.damage += duraDamage;
                    equipment.setEquipment("Mainhand", item)
                } else {
                    equipment.setEquipment("Mainhand", undefined)
                    dim.playSound("random.break", player.location, { volume: 1, pitch: 1 })

                }
            }
        }
    }
    player.startItemCooldown("longshot", 600)
})

function multiply(a, b) {
    return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}








system.runInterval(() => {
    for (const dimId of DimensionTypes.getAll()) {
        const dim = world.getDimension(dimId.typeId)
        for (const entity of dim.getEntities({ type: "mm:longshot_projectile" })) {
            const proj = entity.getComponent("projectile")
            if (!proj) {
                entity.remove()
                continue;
            };
            const owner = proj.owner
            if (!owner) {
                entity.remove()
                continue;
            };

            if (dim !== owner.dimension) {
                owner.startItemCooldown("longshot", 1)
                owner.removeTag("mm:pulled_by_longshot")

                entity.remove()
                continue;

            }
            if (owner) {
                let equippable = owner.getComponent("equippable")
                var item = equippable.getEquipment("Mainhand")
                if (!item) {
                    entity.remove()
                    owner.startItemCooldown("longshot", 1)
                    owner.removeTag("mm:pulled_by_longshot")
                    continue;
                }
                if (item.typeId !== "mm:longshot") {
                    entity.remove()
                    owner.startItemCooldown("longshot", 1)
                    owner.removeTag("mm:pulled_by_longshot")
                    continue;

                }
                const slot = owner.selectedSlotIndex
                system.runTimeout(() => {
                    if (entity.isValid && owner.selectedSlotIndex !== slot) {
                        entity.remove()
                        owner.startItemCooldown("longshot", 0)
                        owner.removeTag("mm:pulled_by_longshot")

                    }
                }, 1)
            }
            const leashable = entity.getComponent('leashable');
            if (leashable.isLeashed == false || leashable.leashHolder !== owner) {
                entity.remove()
                owner.startItemCooldown("longshot", 1)
                owner.removeTag("mm:pulled_by_longshot")
                continue;
            }
            system.runTimeout(() => {
                if (entity.isValid == false && owner.isValid) {
                    owner.dimension.playSound("item.longshot.retract", owner.location, { volume: 0.35 })

                    owner.startItemCooldown("longshot", 5)
                    owner.removeTag("mm:pulled_by_longshot")
                    return;
                }
            }, 1)
            if (entity.hasTag("mm:locked_to_entity")) {
                var idTag = ""
                for (const tag of entity.getTags()) if (tag.includes("mm:locked_to_entity_")) idTag = tag
                const id = idTag.replace("mm:locked_to_entity_", "")
                const hookedTo = world.getEntity(id)
                if (!hookedTo || !hookedTo.isValid || hookedTo.dimension !== entity.dimension) {
                    entity.removeTag(idTag)
                    entity.removeTag("mm:locked_to_entity")
                } else {
                    entity.tryTeleport(hookedTo.getHeadLocation())
                }
            }
            if (entity.hasTag("mm:hit_ground")) {
                var cont = false
                for (const player of dim.getPlayers({ location: entity.location, maxDistance: 5 })) {
                    if (player == owner) cont = true;
                }
                if (!cont) {
                    var xzmult = 1.1
                    var ymult = 1
                    var pulledEntity;
                    var targetEntity;
                    if (entity.getDynamicProperty("mm:tether_level") >= 1 && entity.hasTag("mm:locked_to_entity")) {
                        targetEntity = owner;
                        var idTag = ""
                        for (const tag of entity.getTags()) if (tag.includes("mm:locked_to_entity_")) idTag = tag
                        const id = idTag.replace("mm:locked_to_entity_", "")
                        const hookedTo = world.getEntity(id)
                        pulledEntity = hookedTo
                        if (unpullables.includes(hookedTo.typeId) || hookedTo.matches({ families: ["gravity_immune"] }) || hookedTo.matches({ families: ["boss"] }) || hookedTo.matches({ families: ["longshot_unpullable"] })) {
                            xzmult = 0;
                            ymult = 0;
                        } else if (heavy.includes(hookedTo.typeId) || hookedTo.matches({ families: ["longshot_heavy"] })) {
                            xzmult = 0.55;
                            ymult = 0.7
                        }
                    } else {
                        targetEntity = entity;
                        pulledEntity = owner
                    }
                    const riding = pulledEntity.getComponent("riding")
                    if (riding) {
                        pulledEntity = riding.entityRidingOn
                    }
                    const dir = getDirection(pulledEntity.location, targetEntity.location)
                    var xz = 0.25
                    var y = 0
                    if (y == 0 && targetEntity.location.y < pulledEntity.location.y - 3) y = -0.05
                    if (y == 0 && targetEntity.location.y > pulledEntity.location.y + 3) y = 0.125
                    if (y == 0 && targetEntity.location.y > pulledEntity.location.y + 0.15) y = 0.1
                    if (pulledEntity.isSneaking) {
                        y = 0
                        if (!owner.isOnGround) xz = 0.1
                        if (owner.isOnGround) xz = 0
                    }
                    if (pulledEntity.isInWater) {
                        xz = xz * 0.6
                        y = y * 0.9
                    }
                    if (y < 0 && pulledEntity.getEffect("slow_falling")) y = y / 4
                    if (pulledEntity.isFlying) {
                        xz = xz * 0.2
                        y = y * 0.2
                    }
                    const reelingLvl = entity.getDynamicProperty("mm:reeling_level")
                    if (reelingLvl && !pulledEntity.isFlying) {
                        xzmult += reelingLvl * 0.15
                        ymult += reelingLvl * 0.1
                    }
                    xz = xz * xzmult
                    y = y * ymult
                    var vec = makeVector(dir, xz)
                    if (pulledEntity.typeId == "minecraft:player") {
                        var v = pulledEntity.getVelocity()
                        if (v.x < (xzmult * -0.1) || v.x > (xzmult * 0.1) || v.z < (xzmult * -0.1) || v.z > (xzmult * 0.1) || v.y < (xzmult * -0.1) || v.y > (xzmult * 0.1)) pulledEntity.runCommand("camerashake add @s 0.05 0.5")
                    }
                    pulledEntity.applyImpulse({ x: vec.x, y: y, z: vec.z })
                }
            }
            owner.playAnimation("animation.player.holding_longshot", { blendOutTime: 0.0 })
            owner.startItemCooldown("longshot", 800)
            owner.addTag("mm:pulled_by_longshot")
        }
    }
})

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    const id = e.eventId;
    if (id !== "mm:hit_ground") return;
    const entity = e.entity
    if (!entity.isValid) return;
    if (entity.typeId !== "mm:longshot_projectile") return;
    if (!entity.hasTag("mm:hit_ground")) {
        entity.dimension.playSound("item.longshot.land", entity.location)
        entity.addTag("mm:hit_ground")
    }
})

world.beforeEvents.entityHurt.subscribe((e) => {
    const player = e.hurtEntity;
    if (!player) return;
    if (player.hasTag("mm:pulled_by_longshot") == false) return;
    const cause = e.damageSource.cause;
    if (cause !== "fall") return;
    if (player.hasTag("mm:longshot_temp")) {
        system.run(() => {
            player.removeTag("mm:longshot_temp")
        })
        return;
    }
    var damage = e.damage
    if (damage <= 4) damage = 0
    if (damage > 4) damage -= 4
    damage = damage * 0.5
    e.cancel = true;
    system.run(() => {
        if (damage > 0) {
            player.addTag("mm:longshot_temp")
            player.applyDamage(damage, { cause: "fall" })
        }
    })
})

world.beforeEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    const damagingEntity = e.damageSource.damagingEntity;
    if (!damagingEntity) return;
    if (!damagingEntity.isValid) return;
    const damagingProjectile = e.damageSource.damagingProjectile;
    if (!damagingProjectile) return;
    if (!damagingProjectile.isValid) return;
    if (damagingProjectile.typeId !== "mm:longshot_projectile") return;
    const cause = e.damageSource.cause;
    if (cause !== "projectile") return;
    if (damagingProjectile.hasTag("mm:hit_ground")) e.cancel = true;
})

//add wire hook to entity
world.beforeEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    const damagingEntity = e.damageSource.damagingEntity;
    if (!damagingEntity) return;
    if (!damagingEntity.isValid) return;
    const damagingProjectile = e.damageSource.damagingProjectile;
    if (!damagingProjectile) return;
    if (!damagingProjectile.isValid) return;
    if (damagingProjectile.typeId !== "mm:longshot_projectile") return;
    const cause = e.damageSource.cause;
    if (cause !== "projectile") return;
    if (damagingProjectile.hasTag("mm:locked_to_entity")) return;
    e.cancel = true;
    system.run(() => {
        damagingProjectile.dimension.playSound("item.longshot.attaches_to_mob", damagingProjectile.location)
        damagingProjectile.addTag("mm:hit_ground")
        damagingProjectile.addTag("mm:locked_to_entity")
        damagingProjectile.addTag("mm:locked_to_entity_" + `${hurt.id}`)
    })
})


//cut wire when the hooked entity is damaged
world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    const damagingProjectile = e.damageSource.damagingProjectile;
    if (damagingProjectile && damagingProjectile.isValid && damagingProjectile.typeId !== "mm:longshot_projectile") return;
    for (const hook of hurt.dimension.getEntities({ type: "mm:longshot_projectile", tags: [`mm:locked_to_entity_${hurt.id}`] })) {

        hook.dimension.playSound("item.longshot.retract", hook.location, { volume: 0.35 })
        hook.remove()
    }
})

//remove wire when the hooked entity hurts the attacker
world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if (!hurt) return;
    if (!hurt.isValid) return;
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    for (const hook of hurt.dimension.getEntities({ type: "mm:longshot_projectile", tags: [`mm:locked_to_entity_${attacker.id}`] })) {
        if (hook.getComponent("projectile").owner == hurt) {
            hook.dimension.playSound("item.longshot.retract", hook.location, { volume: 0.35 })
            hook.remove()
        }
    }
})


//cut wire from swing
world.afterEvents.playerSwingStart.subscribe((e) => {
    if (e.swingSource !== "Mine" && e.swingSource !== "Attack") return;
    const player = e.player;
    const item = e.heldItemStack;
    if (!item) return;
    if (item.typeId == "mm:longshot") {
        for (const hook of player.dimension.getEntities({ type: "mm:longshot_projectile" })) {
            if (hook.getComponent("projectile").owner == player) {
                player.dimension.playSound("item.longshot.retract", player.location, { volume: 0.35 })
                hook.remove()
                if (player.getGameMode() == "Creative") return;
                const inventory = player.getComponent("inventory")
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (item == undefined) continue;
                    if (item.typeId == "minecraft:arrow" && slot.amount < 64) {
                        slot.amount += 1
                        return;
                    }
                }
                const arrow = new ItemStack("minecraft:arrow", 1)
                for (let i = 0; i < container.size; i++) {
                    let slot = container.getSlot(i)
                    let item = container.getItem(i)
                    if (item == undefined) {
                        slot.setItem(arrow)
                        return;
                    }
                }
                player.dimension.spawnItem(arrow, player.location)
            }
        }
    }
})