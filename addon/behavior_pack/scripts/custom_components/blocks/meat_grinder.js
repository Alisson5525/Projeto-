import { world , system} from '@minecraft/server';

world.beforeEvents.worldInitialize.subscribe((data) => {
    data.blockComponentRegistry.registerCustomComponent('sunrise:meat_grinder',{
        onPlayerInteract: ((onPlayerInteract) => {
            const { block, player } = onPlayerInteract;
            const meatTypes = [
                { type: "minecraft:beef", quantity: 4 },
                { type: "minecraft:porkchop", quantity: 4 },
                { type: "minecraft:mutton", quantity: 4 }
            ];
                for (const meatType of meatTypes) {
                    if (player.runCommand(`testfor @s[hasitem=[{item=minecraft:glass_bottle,quantity=1..},{item=${meatType.type},quantity=${meatType.quantity}..}]]`).successCount == 1) {
                        player.runCommand("gamerule sendCommandFeedback false");
                        player.runCommand("give @s sunrise:blood_bottle_4 1 0");
                        player.runCommand(`clear @s ${meatType.type} 0 ${meatType.quantity}`);
                        player.runCommand("clear @s minecraft:glass_bottle 0 1");
                        player.runCommand("gamerule sendCommandFeedback true");
                        let loc = block.location
                        player.runCommand(`clear @s ${meatType.type} 0 ${meatType.quantity}`);
                        player.runCommand(`particle sunrise:bite_blood_particle ${loc.x} ${loc.y} ${loc.z}`);
                        player.runCommand(`playsound mob.vampire.bite @a ${loc.x} ${loc.y} ${loc.z} 0.8 0.35`)
                        break; // Para sair do loop após encontrar uma correspondência
                    }
                }
        })
    })
});