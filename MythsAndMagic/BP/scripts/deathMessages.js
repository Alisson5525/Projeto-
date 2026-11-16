import { world, system } from "@minecraft/server";

const mmTames = [
    "mm:flickerwick",
    "mm:scrubel",
    "mm:blue_lantern_spirit"
]

world.beforeEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    const damage = e.damage;
    const attacker = e.damageSource.damagingEntity;
    const cause = e.damageSource.cause;
    if (!cause || cause == "override") return;
    var allowed = false
    var target = world.getPlayers()
    var message = ""
    var attackerName = ""
    if (attacker) {
        if (attacker.typeId == "minecraft:player") {
            attackerName = attacker.name
        } else if (attacker.nameTag) {
            attackerName = attacker.nameTag
        } else {
            attackerName = attacker.localizationKey
        }
    }
    var hurtName = ""
    if (hurt) {
        if (hurt.typeId == "minecraft:player") {
            hurtName = hurt.name
        } else if (hurt.nameTag) {
            hurtName = hurt.nameTag
        } else {
            hurtName = hurt.localizationKey
        }
    }
    const hp = hurt.getComponent("health")
    if (!hp) return;
    if (hp.currentValue > 0) return;
    if (hurt.typeId == "minecraft:player") {
        const equippable = hurt.getComponent("equippable")
        const off = equippable.getEquipment("Offhand")
        if (off && off.typeId == "minecraft:totem_of_undying") return;
        const main = equippable.getEquipment("Mainhand")
        if (main && main.typeId == "minecraft:totem_of_undying") return;
    }
    const deathMessages = world.gameRules.showDeathMessages
    if (deathMessages == false) return;

    if (!allowed && mmTames.includes(hurt.typeId)) {
        const tameable = hurt.getComponent("tameable")
        if (tameable && tameable.tamedToPlayer) {
            target = [tameable.tamedToPlayer]
            if (attacker) {
                message = { rawtext: [{ translate: hurtName }, { text: " " }, { translate: "death.mm.slain_by" }, { text: " " }, { translate: attackerName }] }
            } else {
                message = { rawtext: [{ translate: hurtName }, { text: " " }, { translate: "death.mm.died" }] }
            }
            allowed = true
        }
    }

    if (!allowed && hurt.typeId == "minecraft:player" && attacker) {
        if (attacker.typeId == "mm:sacred_statue") {
            message = { rawtext: [{ translate: hurtName }, { text: " " }, { translate: "death.mm.sacred_statue" }, { text: " " }, { translate: attackerName }] }

            allowed = true
        }
    }
    if (!allowed && hurt.typeId == "minecraft:player" && attacker) {
        if (attacker.typeId == "mm:revoid") {
            message = { rawtext: [{ translate: hurtName }, { text: " " }, { translate: "death.mm.revoid" }, { text: " " }, { translate: attackerName }] }

            allowed = true
        }
    }

    if (!allowed) return;
    e.cancel = true
    system.run(() => {
        world.gameRules.showDeathMessages = false
        if (attacker) {
            hurt.applyDamage(hp.currentValue, { cause: "override", damagingEntity: attacker })
        } else {
            hurt.applyDamage(hp.currentValue, { cause: "override" })
        }
        for (const player of target) {
            player.sendMessage(message)
        }
        world.gameRules.showDeathMessages = true
    })
});