import {
    world,
    system
} from "@minecraft/server";

const STRUCTURE_NAME = "konoha";
const PROPERTY_NAME = "estrutura_spawnada";

world.afterEvents.playerSpawn.subscribe((ev) => {

    if (!ev.initialSpawn) return;

    if (world.getDynamicProperty(PROPERTY_NAME)) return;

    const player = ev.player;

    system.runTimeout(async () => {

        try {

            const loc = player.location;

            const x = Math.floor(loc.x);
            const z = Math.floor(loc.z);

            // Procura chão
            let y = 150;

            for (let i = 150; i > -64; i--) {

                const block = player.dimension.getBlock({
                    x,
                    y: i,
                    z
                });

                if (block && block.typeId !== "minecraft:air") {
                    y = i + 1;
                    break;
                }
            }

            /*
            =======================================================
            FORCE LOAD CHUNKS
            =======================================================
            */

            await player.runCommandAsync(
                `tickingarea add circle ${x} ${y} ${z} 4 estrutura_spawn`
            );

            /*
            =======================================================
            LOAD STRUCTURE
            =======================================================
            */

            await player.runCommandAsync(
                `structure load ${STRUCTURE_NAME} ${x} ${y} ${z}`
            );

            /*
            =======================================================
            TELEPORT
            =======================================================
            */

            player.teleport({
                x: x + 6,
                y: y + 2,
                z: z + 31
            });

            /*
            =======================================================
            SAVE
            =======================================================
            */

            world.setDynamicProperty(PROPERTY_NAME, true);

            player.sendMessage("§aEstrutura carregada!");

        } catch (e) {
            console.warn(e);
        }

    }, 80);
});