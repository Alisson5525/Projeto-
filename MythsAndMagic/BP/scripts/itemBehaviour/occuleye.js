import {
    world,
    system
} from "@minecraft/server";

world.afterEvents.itemCompleteUse.subscribe((e) => {
    const item = e.itemStack;
    const player = e.source;
    if (item.typeId == "mm:occuleye") {
        player.addEffect("nausea", 100)
        player.addEffect("night_vision", 400)
    }
})