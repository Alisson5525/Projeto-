import {
    EntityDamageCause,
    system,
    world
} from "@minecraft/server";

system.runInterval(() => {
    for(const player of world.getPlayers()) {
        if(player.getDynamicProperty("mm:guardian_wand_cooldown")) {
            const amt = player.getDynamicProperty("mm:guardian_wand_cooldown")
            if(amt == 0) {
                player.setDynamicProperty("mm:guardian_wand_cooldown", null)
            } else {
                player.setDynamicProperty("mm:guardian_wand_cooldown", amt - 1)
            }
        }
    }
})

world.afterEvents.entityHitEntity.subscribe((e) => {
    system.runTimeout(() => {
        const player = e.damagingEntity;
        if(!player || !player.isValid || player.typeId !== "minecraft:player") return;
        if(player.getDynamicProperty("mm:guardian_wand_cooldown")) return;
        player.setDynamicProperty("mm:guardian_wand_cooldown", 30)
        const target = e.hitEntity;
        if(!target || !target.isValid) return;
        const hp = target.getComponent("health")
        if(hp && hp.currentValue <= 0) return;
        var hasWand = false
        const equippable = player.getComponent("equippable")
        if(!hasWand && equippable.getEquipment("Mainhand") && equippable.getEquipment("Mainhand").typeId == "mm:guardian_wand") hasWand = true
        if(!hasWand && equippable.getEquipment("Offhand") && equippable.getEquipment("Offhand").typeId == "mm:guardian_wand") hasWand = true
        if(hasWand) {
            const dim = target.dimension;
            const hurtLoc = target.getHeadLocation()
            dim.playSound("mob.guardian_myth.punch", hurtLoc)
            const hand = dim.spawnEntity("mm:guardian_wand_hand", {x:hurtLoc.x,y:0.2 + Math.max(target.location.y, hurtLoc.y-1.3),z:hurtLoc.z})
            const runInt = system.runInterval(() => {
                if(!player || !player.isValid || !hand || !hand.isValid || !target || !target.isValid) {
                    if(hand.isValid) hand.remove()
                    system.clearRun(runInt)
                    return;
                }
                hand.teleport({x:target.location.x,y:0.2 + Math.max(target.location.y, target.getHeadLocation().y-1.3),z:target.location.z}, {rotation: player.getRotation(), dimension:target.dimension})
            })
            system.runTimeout(() => {
                if(!player || !player.isValid || !target || !target.isValid) {
                    return;
                } else {
                    const hurtLoc = target.getHeadLocation()
                    const dim = target.dimension

                    dim.spawnParticle("mm:guardian_wand_punch", hurtLoc)
                    dim.spawnParticle("mm:guardian_hellfire", hurtLoc)
                    dim.playSound("mob.guardian_myth.hit_strong", hurtLoc)
                    target.applyDamage(8, {cause: EntityDamageCause.entityAttack, damagingEntity: player})
                }
            }, 4)
        } 
    }, 6)
})