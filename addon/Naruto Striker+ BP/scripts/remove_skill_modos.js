import { world } from "@minecraft/server";
import { cmd } from "./lib/cmd.js";
import { desativarTodos } from "./wg.js";

// Ao entrar/renascer: encerra os modos que ficaram salvos como "ativos" (antes, ao relogar
// durante um modo, a propriedade continuava ativa e o jogador nao conseguia ativar outro
// modo ate o tempo acabar, alem de manter o bonus de vida), e entao limpa o estado.
world.afterEvents.playerSpawn.subscribe((data) => {
  try {
    const player = data.player;
    desativarTodos(player);
    cmd(player, "hud @s hide health");
    cmd(player, "function remove_all");
  } catch {}
});
