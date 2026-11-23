import {
    world,
    system
} from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}


const STRUCTURE_NAME = "konoha";
const PROPERTY_NAME = "estrutura_spawnada";
// evita carregar a vila duas vezes quando varios jogadores entram juntos
let carregando = false;

// blocos que nao contam como "chao" (copas de arvore, plantas, agua)
function ehChaoValido(typeId) {
    return !/(air|leaves|log|wood|tallgrass|tall_grass|short_grass|fern|flower|snow_layer|vine|mushroom|bush)/.test(typeId);
}

world.afterEvents.playerSpawn.subscribe((ev) => {

    if (!ev.initialSpawn) return;

    if (world.getDynamicProperty(PROPERTY_NAME)) return;
    if (carregando) return;
    carregando = true;

    const player = ev.player;

    runTimeoutSeguro(async () => {

        try {

            if (!player.isValid()) { carregando = false; return; }
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

                if (block && ehChaoValido(block.typeId)) {
                    y = i + 1;
                    break;
                }
            }

            /*
            =======================================================
            FORCE LOAD CHUNKS
            =======================================================
            */

            // se falhar (ex.: limite de areas de ticking), segue para carregar a estrutura mesmo assim
            await player.runCommandAsync(
                `tickingarea add circle ${x} ${y} ${z} 4 estrutura_spawn`
            ).catch(() => {});

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
            // ponto de chegada da vila (usado pela Viagem Rapida do Pergaminho Ninja)
            try { world.setDynamicProperty("ns:konoha_pos", JSON.stringify({ x: x + 6.5, y: y + 2, z: z + 31.5 })); } catch (e) {}

            // libera a area de carregamento forcado (antes ficava ativa para sempre)
            runTimeoutSeguro(() => {
                try { player.dimension.runCommandAsync("tickingarea remove estrutura_spawn")?.catch?.(() => {}); } catch (e) {}
            }, 100);

            player.sendMessage("§aEstrutura carregada!");

        } catch (e) {
            console.warn(e);
        }
        carregando = false;

    }, 80);
});