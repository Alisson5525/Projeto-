import {
    world,
    system
} from "@minecraft/server";

import { addCustomEffect, effectIds } from "customEffects/main.js"

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:booze_potion", {
        onConsume({ itemStack, source }, p) {
            const effectArray = p.params.effects
            const amplifierArray = p.params.amplifiers
            const durationArray = p.params.durations

            for (let i = 0; i < effectArray.length; i++) {
                if (effectIds.includes(effectArray[i])) {
                    addCustomEffect(source, effectArray[i], durationArray[i] * 20, amplifierArray[i])
                } else {
                    source.addEffect(effectArray[i], durationArray[i] * 20, { amplifier: amplifierArray[i] })
                }
            }
        }
    })
})