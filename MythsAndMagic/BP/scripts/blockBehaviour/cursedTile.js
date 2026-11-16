import {
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:cursed_tile", {
        onTick(e) {
            const block = e.block;
            const dim = e.dimension;
            let entities = dim.getEntities({ location: block.location, maxDistance: 32, tags: ["mm:sanctuary_keeper_target"] });
            if (entities.length > 0) return;
            block.setType("mm:chiseled_arid_sandstone_tile")
        }
    })
})