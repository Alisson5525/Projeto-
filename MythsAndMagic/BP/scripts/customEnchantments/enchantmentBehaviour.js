import { system, world } from "@minecraft/server";


//frozen_touch
world.beforeEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "minecraft:player") return;
    const cause = e.damageSource.cause
    if (cause !== "entityAttack") return;
    const held = attacker.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    const hurt = e.hurtEntity;
    if(!hurt || !hurt.isValid) return;
    const level = held.getDynamicProperty("mm:ponder_enchant_frozen_touch")
    if(!level) return;
    var damageBuff = 1
    if (level && hurt.typeId == "minecraft:blaze") damageBuff += level/6
    e.damage = e.damage * damageBuff
    system.run(() => {
        const slowness = hurt.getEffect("slowness")
        if(!slowness) {
            for(let i = 0; i < 15*level; i++) {
                system.runTimeout(() => {
                    if(!hurt || !hurt.isValid || !hurt.getEffect("slowness")) return;
                    
                    hurt.dimension.spawnParticle("mm:icicle_spear_chain", hurt.getHeadLocation())
                },i*4)
            }
        }
        hurt.addEffect("slowness", 60 * level, {amplifier:level-1})
    })
})


//ruthless
world.beforeEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "minecraft:player") return;
    const cause = e.damageSource.cause
    if (cause !== "entityAttack") return;
    const held = attacker.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    const hurt = e.hurtEntity;
    if(!hurt || !hurt.isValid) return;
    const level = held.getDynamicProperty("mm:ponder_enchant_ruthless")
    if(!level) return;
    const hp = hurt.getComponent("minecraft:health")
    var damageBuff = 1
    if (level && ((hp.currentValue + e.damage)/hp.defaultValue) <= 0.5) damageBuff += level*0.15
    e.damage = e.damage * damageBuff
})


//draining
world.afterEvents.entityHurt.subscribe((e) => {
    const attacker = e.damageSource.damagingEntity;
    if (!attacker) return;
    if (!attacker.isValid) return;
    if (attacker.typeId !== "minecraft:player") return;
    const cause = e.damageSource.cause
    if (cause !== "entityAttack") return;
    const held = attacker.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    const hurt = e.hurtEntity;
    if(!hurt || !hurt.isValid) return;
    const level = held.getDynamicProperty("mm:ponder_enchant_draining")
    if(!level) return;
    
    const hp = attacker.getComponent("minecraft:health")
    var setTo = hp.currentValue + e.damage * 0.04 * level

    console.warn( e.damage *0.04 * level)
    setTo = Math.min(hp.effectiveMax, setTo)
    hp.setCurrentValue(setTo)
})