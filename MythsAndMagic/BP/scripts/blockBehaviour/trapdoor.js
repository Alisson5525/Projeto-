

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:trapdoor", {
        onRedstoneUpdate(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const newPower = e.powerLevel;
            const oldPower = e.previousPowerLevel;
            if (oldPower == newPower) return;
            const params = p.params
            const openSound = params.open_sound
            const closeSound = params.close_sound

            const perm = block.permutation
            const open = perm.getState("mm:open")
            if (open == false && newPower > 0) {
                if (openSound) dim.playSound(openSound, block.location)
                const newPerm = perm.withState("mm:open", true);
                block.setPermutation(newPerm)
            }
            if (open == true && newPower == 0) {
                if (closeSound) dim.playSound(closeSound, block.location)
                const newPerm = perm.withState("mm:open", false);
                block.setPermutation(newPerm)
            }
        },
        onPlayerInteract(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const params = p.params
            const openSound = params.open_sound
            const closeSound = params.close_sound

            const perm = block.permutation
            const open = perm.getState("mm:open")
            if (open == false) {
                if (openSound) dim.playSound(openSound, block.location)
                const newPerm = perm.withState("mm:open", true);
                block.setPermutation(newPerm)
            }
            if (open == true) {
                if (closeSound) dim.playSound(closeSound, block.location)
                const newPerm = perm.withState("mm:open", false);
                block.setPermutation(newPerm)
            }
        }
    })

})