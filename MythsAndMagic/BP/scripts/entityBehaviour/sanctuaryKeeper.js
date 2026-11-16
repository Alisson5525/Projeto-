import {
    world,
    system,
    ItemLockMode,
    EntityDamageCause,
    ItemStack,
    DimensionTypes
} from "@minecraft/server";

world.afterEvents.entityHurt.subscribe((event) => {
    const damager = event.damageSource.damagingEntity;
    if (!damager) return;
    if (damager.typeId !== "mm:sanctuary_keeper") return;
    damager.addEffect("weakness", 60, { amplifier: 255, showParticles: false })
})

system.runInterval(() => {
    const allPlayers = world.getPlayers({ excludeGameModes: ["Spectator"] })
    for (const player of allPlayers) {
        const hp = player.getComponent("health")
        if (hp.currentValue <= 0) continue;
        const equipment = player.getComponent("minecraft:equippable");
        if (!equipment) continue;
        const head = equipment.getEquipment("Head");
        if (!head) continue;
        if (head.typeId == "mm:cursed_mask") {
            if (head.lockMode !== ItemLockMode.slot) {
                head.lockMode = ItemLockMode.slot
            }
            if (head.keepOnDeath == false) {
                head.keepOnDeath = true
            }
            const durability = head.getComponent("minecraft:durability")
            if (!durability) continue;
            if (durability.damage < durability.maxDurability) {
                durability.damage += 1;
                equipment.setEquipment("Head", head)
                player.dimension.playSound("mob.sanctuary_keeper.attack", player.location, { volume: 1, pitch: 0.9 })
                player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 0.5 })
                player.dimension.spawnParticle("mm:sanctuary_keeper_aura", player.location)
                player.runCommand("camerashake add @s 0.1 1.5 rotational")
                player.runCommand("camera @s fade time 0 0 2 color 0 0 0 ")
                player.applyDamage(1, { cause: EntityDamageCause.magic })
            } else {
                const enchantable = head.getComponent("enchantable")
                var binding = false
                for (const enchant of enchantable.getEnchantments()) {
                    if (enchant.type.id == "binding") binding = true
                }
                equipment.setEquipment("Head", undefined)
                if (binding == true) {
                    head.lockMode = ItemLockMode.none
                    head.keepOnDeath = false
                    durability.damage -= Math.ceil(Math.random() * 9);
                    player.dimension.spawnItem(head, player.location)
                }
                player.dimension.playSound("mob.sanctuary_keeper.attack", player.location, { volume: 2, pitch: 0.7 })
                player.dimension.playSound("random.break", player.location, { volume: 2, pitch: 0.3 })
                player.runCommand("camerashake add @s 0.2 1.5")
                player.runCommand("camera @s fade time 0 0 1 color 0 0 0 ")
                player.applyDamage(3, { cause: EntityDamageCause.magic })
            }


        }
    }
}, 20)


system.afterEvents.scriptEventReceive.subscribe((event) => {
    const id = event.id;
    if (id !== "mm:damage_shield") return;
    const source = event.sourceEntity;
    const equipment = source.getComponent("minecraft:equippable");
    if (!equipment) return;
    const mainhand = equipment.getEquipment("Mainhand")
    if (mainhand) {
        if (mainhand.typeId == "minecraft:shield") {
            const durability = mainhand.getComponent("minecraft:durability")
            if (!durability) return;
            if (durability.damage + 99 < durability.maxDurability) {
                durability.damage += 99;
                equipment.setEquipment("Mainhand", mainhand)
                source.runCommand("camerashake add @s 0.4 0.5 rotational")
            } else {
                equipment.setEquipment("Mainhand", undefined)
                source.dimension.playSound("random.break", source.location, { volume: 1, pitch: 1 })
                source.runCommand("camerashake add @s 0.4 0.5 rotational")

            }
        }
    } else {
        const offhand = equipment.getEquipment("Offhand")
        if (offhand) {
            if (offhand.typeId == "minecraft:shield") {
                const durability = offhand.getComponent("minecraft:durability")
                if (!durability) return;
                if (durability.damage + 99 < durability.maxDurability) {
                    durability.damage += 99;
                    equipment.setEquipment("Offhand", offhand)
                    source.runCommand("camerashake add @s 0.4 0.5 rotational")
                } else {
                    equipment.setEquipment("Offhand", undefined)
                    source.dimension.playSound("random.break", source.location, { volume: 1, pitch: 1 })
                    source.runCommand("camerashake add @s 0.4 0.5 rotational")

                }
            }
        }
    }
})

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "mm:sanctuary_keeper_despawn") return;
    const entity = event.sourceEntity;
    if (entity.typeId !== "mm:sanctuary_keeper") return;
    entity.triggerEvent("mm:despawn")
})

system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:sanctuary_keeper_target"], excludeGameModes: ["Creative"] })) {
        if (player.dimension.id !== "minecraft:overworld") {
            if (!player.hasTag("mm:warned_key_moody")) {
                player.addTag("mm:warned_key_moody")
                player.sendMessage("§c§oSeems that one of your inventory items really doesnt like this dimension...")
            }
            player.addEffect("slowness", 40, { amplifier: 3, showParticles: false })
            const rand = Math.random()
            if (rand < 0.2) {
                player.dimension.playSound("mob.sanctuary_keeper.attack", player.location, { volume: 1, pitch: 0.9 })
                player.dimension.playSound("random.break", player.location, { volume: 1, pitch: 0.5 })
                player.dimension.spawnParticle("mm:sanctuary_keeper_aura", player.location)
                player.runCommand("camerashake add @s 0.1 1.5 rotational")
                player.addTag("mm:sanctuary_key_moody_damage")
                player.applyDamage(1, { cause: EntityDamageCause.magic })
                player.removeTag("mm:sanctuary_key_moody_damage")
                player.addEffect("weakness", 40, { amplifier: 3 })
            }
        }
    }
}, 20)

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    var container = block.getComponent("minecraft:inventory")
    if (!container) return;

    var checkChest = true
    system.runInterval(() => {
        if (checkChest == true) {
            var newblock = e.block;
            if (!newblock) return;
            if (!newblock.dimension.isChunkLoaded(newblock.location)) return;
            const new_container = newblock.getComponent("minecraft:inventory")
            if (!new_container) return;
            const key = new ItemStack("mm:sanctuary_key", 1)
            if (newblock.dimension.getPlayers({ maxDistance: 8, location: newblock.location }).length > 0) {
                checkChest = true
            } else {
                checkChest = false
            }
            if (new_container.container.contains(key)) {
                for (let i = 0; i < container.container.size; i++) {
                    var slot = container.container.getSlot(i)
                    if (slot.getItem() !== undefined) {
                        if (slot.getItem().typeId == "mm:sanctuary_key") {
                            newblock.dimension.spawnItem(slot.getItem(), block.above().center())
                            container.container.setItem(i, undefined)
                        }
                    }
                }
                newblock.dimension.playSound("mob.sanctuary_keeper.attack", newblock.location, { volume: 1, pitch: 0.8 })
                newblock.dimension.playSound("random.break", newblock.location, { volume: 1, pitch: 0.5 })
                newblock.dimension.spawnParticle("mm:sanctuary_keeper_aura", newblock.center())
                newblock.dimension.runCommand(`setblock ${newblock.x} ${newblock.y} ${newblock.z} air destroy`)
                return;
            }
        } else {
            return;
        }
    }, 2)

})

system.runInterval(() => {
    for (const player of world.getPlayers({ tags: ["mm:sanctuary_keeper_target"] })) {
        player.runCommand("fill ~-15 ~-15 ~-15 ~15 ~15 ~15 mm:cursed_arid_sandstone_tile replace mm:chiseled_arid_sandstone_tile")
    }
}, 40)

world.afterEvents.entityDie.subscribe((e) => {
    const deadEntity = e.deadEntity;
    if (deadEntity.typeId !== "minecraft:player") return;
    if (deadEntity.hasTag("mm:sanctuary_keeper_target")) {
        const key = new ItemStack("mm:sanctuary_key", 1)
        const inventory = deadEntity.getComponent("minecraft:inventory")
        if (inventory.container.contains(key)) {
            for (let i = 0; i < inventory.container.size; i++) {
                var slot = inventory.container.getSlot(i)
                if (slot.getItem() !== undefined) {
                    if (slot.getItem().typeId == "mm:sanctuary_key") {
                        const item = slot.getItem()
                        inventory.container.setItem(i, undefined)
                        deadEntity.dimension.spawnItem(item, deadEntity.location)
                    }
                }
            }
            deadEntity.dimension.playSound("mob.sanctuary_keeper.attack", deadEntity.location, { volume: 1, pitch: 0.8 })
            deadEntity.dimension.playSound("random.break", deadEntity.location, { volume: 1, pitch: 0.5 })
            return;
        }
    }
})

function getDistanceBetween(target, entity) {
    const tloc = target.location
    const eloc = entity.location
    return Math.hypot(eloc.x - tloc.x, eloc.z - tloc.z)
}

system.runInterval(() => {
    for (const dimId of DimensionTypes.getAll()) {
        const dim = world.getDimension(dimId.typeId)
        const sanctuaryKeys = dim.getEntities({ type: "minecraft:item" })
        for (const key of sanctuaryKeys) {
            const itemComp = key.getComponent("item")
            if (itemComp.itemStack.typeId !== "mm:sanctuary_key") continue;
            const closePlayer = dim.getEntities({ excludeGameModes: ["Creative", "Spectator"], maxDistance: 24, type: "minecraft:player", closest: 1, location: key.location })
            if (closePlayer.length == 0) continue;
            const rand = Math.random()
            if (rand > 0.4) continue;
            const player = closePlayer[0]

            const xDif = key.location.x - player.location.x;
            const zDif = key.location.z - player.location.z;
            const yDif = player.location.y - key.location.y;
            var xPush = 0
            var yPush = 0.0
            var zPush = 0

            const dist = getDistanceBetween(player, key)

            if (xDif > 0.5) xPush = -0.1
            if (xDif < -0.5) xPush = 0.1
            if (zDif > 0.5) zPush = -0.1
            if (zDif < -0.5) zPush = 0.1
            if ((yDif > 0.99 && yDif < 6 && key.isOnGround && (player.isOnGround || player.isFlying) && dist < 12)) {
                yPush = 0.2
                if (rand < 0.1) yPush = 0.4
                zPush = zPush / 4
                xPush = xPush / 4
            }

            key.applyImpulse({ x: xPush, y: yPush, z: zPush })
            if (rand > 0.04) continue;
            player.spawnParticle("mm:sanctuary_keeper_aura", key.location)
        }
    }
}, 6)