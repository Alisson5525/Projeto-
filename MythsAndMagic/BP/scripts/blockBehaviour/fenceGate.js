import { system } from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:fence_gate", {
        onPlayerInteract(e, p) {
            const block = e.block;
            const perm = block.permutation;
            const closed = perm.getState("mm:closed");
            const params = p.params
            const openSound = params.open_sound
            const closeSound = params.close_sound
            const dim = block.dimension
            if (closed) {
                const dir = perm.getState("minecraft:cardinal_direction");
                const dx = e.player.location.x - (block.x + 0.5);
                const dz = e.player.location.z - (block.z + 0.5);

                const openAway = (dir === "east" || dir === "west")
                    ? dz < 0
                    : dx < 0;
                if (openSound) dim.playSound(openSound, block.center())
                block.setPermutation(
                    perm.withState("mm:closed", false)
                        .withState("mm:open_away", openAway)
                );
            } else {
                if (closeSound) dim.playSound(closeSound, block.center())
                block.setPermutation(perm.withState("mm:closed", true));
            }
        },
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
            const closed = perm.getState("mm:closed")

            if (closed == true && newPower > 0) {
                if (openSound) dim.playSound(openSound, block.location)
                const newPerm = perm.withState("mm:closed", false);
                block.setPermutation(newPerm)
            }
            if (closed == false && newPower == 0) {
                if (closeSound) dim.playSound(closeSound, block.location)
                const newPerm = perm.withState("mm:closed", true);
                block.setPermutation(newPerm)
            }
        }
    });
});