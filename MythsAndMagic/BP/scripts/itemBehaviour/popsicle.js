import {
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:popsicle", {
        onConsume({ source }) {
            source.addEffect("regeneration", 60, { amplifier: 0, showParticles: true })
            source.addEffect("slowness", 60, { amplifier: 1, showParticles: false })
            source.addEffect("fire_resistance", 60, { amplifier: 1, showParticles: false })
            source.playSound("mob.player.hurt_freeze", source.location)
        }
    })
})