import { world , system} from '@minecraft/server';

world.beforeEvents.worldInitialize.subscribe((data) => {
    data.blockComponentRegistry.registerCustomComponent('sunrise:put_support_coffin_collision_up', {
        onPlace: ((onPlace) => {
            const { block } = onPlace;
            block.above(1).setType("sunrise:caixao_up_collision");
        })
    });
    data.blockComponentRegistry.registerCustomComponent('sunrise:break_support_coffin_collision_up', {
        onPlayerDestroy: ((onPlayerDestroy) => {
            const { block } = onPlayerDestroy;
            block.above(1).setType("minecraft:air");
        })
    });
    data.blockComponentRegistry.registerCustomComponent('sunrise:sleep_coffin', {
        onPlayerInteract: ((onPlayerInteract) => {
            const { player  } = onPlayerInteract;
            if (player.hasTag("vampiro") && world.getTimeOfDay() <= 12000 || player.hasTag("vampiro") && world.getTimeOfDay() >= 23500 || player.hasTag("lobisomem") && world.getTimeOfDay() <= 12000 || player.hasTag("lobisomem") && world.getTimeOfDay() >= 23500) {
                player.runCommand("spawnpoint @s[r=4] ~~1~");
                player.runCommand("camera @s[r=8] fade time 0.4 1.8 0.75 color 0 0 0");
                player.runCommand("time set night");
        }
        })
    });
    data.blockComponentRegistry.registerCustomComponent('sunrise:support_coffin_collision_up', {
        onPlayerDestroy: ((onPlayerDestroy) => {
            const { player , block } = onPlayerDestroy;
            if (block.below(1).typeId.includes("caixao")){
                block.below(1).dimension.spawnItem(block.below(1).getItemStack(1),block.below(1).location)
                block.below(1).setType("minecraft:air")
            }
        })
    });
});