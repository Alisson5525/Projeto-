import {
    EntityDamageCause,
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:shockweed", {
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            const rand = Math.random()
            if (dim.isChunkLoaded(block.location) == false) return;
            if (rand < 0.15) {
                dim.spawnParticle("mm:shockweed_glow", block.center())
            }
            let entities = dim.getEntitiesAtBlockLocation(block.location)
            for (const target of entities) {
                if (target.hasTag("mm:shockweed_cooldown")) continue;
                if (target.getVelocity().x == 0 && target.getVelocity().y == 0 && target.getVelocity().z == 0) {
                    continue;
                }
                if (target.isSneaking) {
                    continue;
                }
                if (target.matches({ families: ["alterrealm_mob"] })) continue;
                if (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] })) {
                    dim.playSound("mob.warden.sonic_boom", block.center(), { pitch: 4, volume: 0.13 })
                    dim.spawnParticle("mm:discharge_electricity", block.above().center())
                    target.addTag("mm:shockweed_cooldown")
                    target.applyDamage(1, { cause: EntityDamageCause.lightning })
                    target.addEffect("slowness", 20, { amplifier: 10 })
                    target.addEffect("mining_fatigue", 20, { amplifier: 2 })
                    target.addEffect("weakness", 20, { amplifier: 10 })
                    if (target.typeId == "minecraft:player") {
                        target.runCommand("camerashake add @s 0.125 0.8")
                        target.runCommand("camerashake add @s 0.125 0.7")
                        target.runCommand("camerashake add @s 0.125 0.6")
                        target.runCommand("camerashake add @s 0.125 0.5")
                        target.runCommand("camerashake add @s 0.125 0.4")
                        target.runCommand("camerashake add @s 0.125 0.3")
                        target.runCommand("camerashake add @s 0.125 0.2")
                        target.runCommand("camerashake add @s 0.125 0.1")
                    }
                    system.runTimeout(() => {
                        target.removeTag("mm:shockweed_cooldown")
                    }, 60)
                }
            }
        }
    })
})