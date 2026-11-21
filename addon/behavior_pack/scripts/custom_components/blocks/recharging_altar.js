import { world , system} from '@minecraft/server';

world.beforeEvents.worldInitialize.subscribe((data) => {
    data.blockComponentRegistry.registerCustomComponent('sunrise:item_usable_component', {
        onPlayerInteract: ((onPlayerInteract) => {
            return
        }),
    });
});