
import { system } from '@minecraft/server';

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:light_switch", {
        onTick(e) {
            const block = e.block;
            const perm = block.permutation
            const power = perm.getState("mm:powered_ticks")
            const active = perm.getState("mm:active")
            if (active == true) {
                if (power > 0) {
                    const newPerm = perm.withState("mm:powered_ticks", power - 1)
                    block.setPermutation(newPerm)
                } else {
                    const newPerm = perm.withState("mm:active", false)
                    block.setPermutation(newPerm)
                }
            }
        }
    });
});