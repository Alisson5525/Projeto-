

import {
    world,
    system,
    ItemStack
} from "@minecraft/server";


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:pressure_plate", {})
    event.blockComponentRegistry.registerCustomComponent("mm:pressure_plate_pressed", {
        onTick(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const params = p.params
            const offSound = params.off_sound

            const perm = block.permutation
            const open = perm.getState("mm:pressed")
            if (open == true) {
                const getEntities = dim.getEntitiesAtBlockLocation(block.location)
                var valid = false
                for (const target of getEntities) if (target.isOnGround) valid = true
                if (valid) return;
                if (offSound) dim.playSound(offSound, block.location)
                const newPerm = perm.withState("mm:pressed", false);
                block.setPermutation(newPerm)
            }
        }
    })
    event.blockComponentRegistry.registerCustomComponent("mm:pressure_plate_unpressed", {
        onTick(e, p) {
            const block = e.block;
            const dim = e.dimension;
            const params = p.params
            const onSound = params.on_sound

            const perm = block.permutation
            const open = perm.getState("mm:pressed")
            if (open == false) {
                const getEntities = dim.getEntitiesAtBlockLocation(block.location)
                var valid = false
                for (const target of getEntities) if (target.isOnGround) valid = true
                if (!valid) return;
                if (onSound) dim.playSound(onSound, block.location)
                const newPerm = perm.withState("mm:pressed", true);
                block.setPermutation(newPerm)
            }
        }
    })
})