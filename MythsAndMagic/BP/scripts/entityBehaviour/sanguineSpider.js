import {
    world,
    system
} from "@minecraft/server";
export function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:cloak_sanguine_spider") return;
    const entity = e.sourceEntity;
    entity.dimension.playSound("mob.sanguine_spider.cloak", entity.location, { volume: 0.5 })
    system.runTimeout(() => {
        if (entity.isValid) {
            entity.addEffect("invisibility", 3600, { showParticles: false })
        }
    }, 30)
})

world.afterEvents.entityHurt.subscribe((e) => {
    const damager = e.damageSource.damagingEntity;
    if (!damager) return;
    if (!damager.isValid) return;
    if (damager.typeId !== "mm:sanguine_spider") return;
    let hp = damager.getComponent("health")
    const healAmount = Math.floor(e.damage + 2)
    var maxHp = hp.defaultValue;
    var currentHP = hp.currentValue;
    hp.setCurrentValue(clampValue(currentHP + healAmount, currentHP, maxHp))
})