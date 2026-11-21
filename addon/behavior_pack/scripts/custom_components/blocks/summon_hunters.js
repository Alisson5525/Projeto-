import { world , system} from '@minecraft/server';

world.beforeEvents.worldInitialize.subscribe((data) => {
    data.blockComponentRegistry.registerCustomComponent('sunrise:summon_hunters_component', {
        onRandomTick: ((onRandomTick) => {
            const { block } = onRandomTick;
            const { x, y, z } = block.location;
            const random = Math.floor(Math.random() * 100) < 60;
            if (random){
                block.dimension.runCommand(`summon sunrise:hunter ${x} ${y} ${z}`)
            }
        })
    });
});