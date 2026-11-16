import {
    system
} from "@minecraft/server";

import { addCustomEffect } from "customEffects/main.js"

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:lava_cookie", {
        onConsume({ source }) {
            source.setOnFire(1, true)
            addCustomEffect(source, "enflamed", 900, 0)
        }
    })
})