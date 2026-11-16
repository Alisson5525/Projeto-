import {
    world,
    system,
    ItemStack,
    ItemLockMode,
    EntityDamageCause
} from "@minecraft/server";

function hasFullDemonArmour(player) {
    const equippable = player.getComponent("minecraft:equippable")
    if (equippable !== undefined) {
        const head = equippable.getEquipment("Head")
        if (head == undefined) return false;
        if (!head.hasTag("mm:demon_armour")) return false;

        const chest = equippable.getEquipment("Chest")
        if (chest == undefined) return false;
        if (!chest.hasTag("mm:demon_armour")) return false;

        const legs = equippable.getEquipment("Legs")
        if (legs == undefined) return false;
        if (!legs.hasTag("mm:demon_armour")) return false;

        const feet = equippable.getEquipment("Feet")
        if (feet == undefined) return false;
        if (!feet.hasTag("mm:demon_armour")) return false;
    }
    return true
}

function lockBoundCopy(item) {
    const newId = item.typeId.replace("mm:", "mm:bound_")
    var newItem = new ItemStack(newId, 1)
    const fromProperties = item.getDynamicPropertyIds()
    for (const id of fromProperties) {
        newItem.setDynamicProperty(id, item.getDynamicProperty(id))
    }
    if (item.nameTag !== undefined) newItem.nameTag = "§v" + item.nameTag + "§r"
    newItem.lockMode = ItemLockMode.slot
    newItem.keepOnDeath = true
    const enchantable = item.getComponent("enchantable")
    const newEnchantable = newItem.getComponent("enchantable")
    newEnchantable.addEnchantments(enchantable.getEnchantments())
    return newItem;
}

function bindDemonArmour(player) {
    const equippable = player.getComponent("minecraft:equippable")
    if (equippable !== undefined) {
        const head = equippable.getEquipment("Head")
        const chest = equippable.getEquipment("Chest")
        const legs = equippable.getEquipment("Legs")
        const feet = equippable.getEquipment("Feet")
        player.addTag("mm:demon_armour")
        player.dimension.playSound("item.demon_armour.bind", player.location)
        equippable.setEquipment("Head", lockBoundCopy(head))
        equippable.setEquipment("Chest", lockBoundCopy(chest))
        equippable.setEquipment("Legs", lockBoundCopy(legs))
        equippable.setEquipment("Feet", lockBoundCopy(feet))
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player.hasTag("mm:demon_armour")) {
            if (hasFullDemonArmour(player)) {
                bindDemonArmour(player)
            }
        } else {
            if (hasFullDemonArmour(player) == false) {
                player.removeTag("mm:demon_armour")
                const equippable = player.getComponent("minecraft:equippable")
                if (equippable !== undefined) {

                    equippable.setEquipment("Head", undefined)
                    equippable.setEquipment("Chest", undefined)
                    equippable.setEquipment("Legs", undefined)
                    equippable.setEquipment("Feet", undefined)
                    player.dimension.playSound("item.demon_armour.break", player.location)
                }
            } else {
                const particle = Math.random()
                if (particle > 0.66) {
                    player.dimension.spawnParticle("mm:demon_armour_idle", player.location)
                }
            }
        }
    }
}, 5)

world.afterEvents.entityDie.subscribe((e) => {
    const dead = e.deadEntity
    if (dead.typeId == "minecraft:player") {
        if (world.gameRules.keepInventory == true) return;
        if (dead.hasTag("mm:demon_armour")) {
            dead.removeTag("mm:demon_armour")
            const equippable = dead.getComponent("minecraft:equippable")
            if (equippable !== undefined) {

                equippable.setEquipment("Head", undefined)
                equippable.setEquipment("Chest", undefined)
                equippable.setEquipment("Legs", undefined)
                equippable.setEquipment("Feet", undefined)
                dead.dimension.playSound("item.demon_armour.break", player.location)
            }

        }
    }
})

const triggers = [
    EntityDamageCause.blockExplosion,
    EntityDamageCause.contact,
    EntityDamageCause.entityAttack,
    EntityDamageCause.entityExplosion,
    EntityDamageCause.maceSmash,
    EntityDamageCause.magic,
    EntityDamageCause.projectile,
    EntityDamageCause.thorns
]

world.afterEvents.entityHurt.subscribe((e) => {
    const player = e.hurtEntity;
    if (!player) return;
    if (!player.isValid) return;
    const cause = e.damageSource.cause;
    const damageEntity = e.damageSource.damagingEntity;
    if (player.hasTag("mm:demon_armour")) {
        const chance = Math.random()
        if (chance > 0.1) return;
        if (triggers.includes(cause)) {
            player.runCommand("scriptevent mm:stun 2")
            player.dimension.playSound("item.demon_armour.bind", player.location, { pitch: 0.5 })
            player.dimension.spawnParticle("mm:demon_armour_stun_smoke", player.location)
            return;
        }
        if (!damageEntity) return;
        if (!damageEntity.isValid) return;
        if (damageEntity.typeId == "minecraft:player") {
            player.runCommand("scriptevent mm:stun 2")
            player.dimension.playSound("item.demon_armour.bind", player.location, { pitch: 0.5 })
            player.dimension.spawnParticle("mm:demon_armour_stun_smoke", player.location)
            return;

        }
    }
})