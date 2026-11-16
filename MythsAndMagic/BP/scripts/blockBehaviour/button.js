

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:button", {
        beforeOnPlayerPlace(e) {
            const permToPlace = e.permutationToPlace
            if (permToPlace.getState("minecraft:block_face") !== "up" && permToPlace.getState("minecraft:block_face") !== "down") e.permutationToPlace = permToPlace.withState("mm:wall", true)
        }
    })
    event.blockComponentRegistry.registerCustomComponent("mm:button_pressed", {
        onTick(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const params = p.params
            const offSound = params.off_sound

            const perm = block.permutation
            const open = perm.getState("mm:pressed")
            if (open == true) {
                if (offSound) dim.playSound(offSound, block.location)
                const newPerm = perm.withState("mm:pressed", false);
                block.setPermutation(newPerm)
            }
        }
    })
})

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const player = e.player;
    const block = e.block;
    if (!block) return;
    const dim = block.dimension
    if (block.getComponent("mm:button")) {
        const perm = block.permutation
        const pressed = perm.getState("mm:pressed")
        if (pressed) return;
        if (player.isSneaking) {
            const equippable = player.getComponent("equippable")
            if (equippable.getEquipment("Mainhand")) return;
        }
        if (player.getDynamicProperty("mm:interact_cooldown") > 0) return
        player.setDynamicProperty("mm:interact_cooldown", 2)
        e.cancel = true;
        system.run(() => {
            const comp = block.getComponent("mm:button")
            const params = comp.customComponentParameters.params
            const onSound = params.on_sound

            if (pressed == false) {
                if (onSound) dim.playSound(onSound, block.location)
                const newPerm = perm.withState("mm:pressed", true);
                block.setPermutation(newPerm)
            }
        })
    }
})