import {
    world,
    system
} from "@minecraft/server";


world.afterEvents.entityDie.subscribe((e) => {
    const { deadEntity, damageSource } = e;
    if (!deadEntity) return;
    if (!damageSource.damagingEntity) return;
    const damager = damageSource.damagingEntity;
    if (!deadEntity.isValid) return;
    if (deadEntity.matches({ families: ["alterrealm_mob"] })) {
        if (damager.typeId !== "minecraft:player") return;
        if (damager.getDynamicProperty("mm:altered") == false) return;
        const score = world.scoreboard.getObjective("mm:altered_time")
        if (score.getScore(damager) > 100) {
            for (let i = 0; i < 20; i++) {
                system.runTimeout(() => {
                    score.addScore(damager, 10)
                    damager.playSound("alterrealm.tick", { volume: 0.5, pitch: 1.3 + i / 10 })
                }, i)
            }
        }
    }
})