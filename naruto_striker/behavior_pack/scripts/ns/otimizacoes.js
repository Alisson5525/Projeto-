// Otimizacoes de desempenho que substituem linhas executadas a cada tick por jogador.
import { world, system } from "@minecraft/server";

/* Dano base do jogador (placar "dano_stats" -> grupo "tnt:dano.N" com minecraft:attack).
   Antes: 100 linhas de comando por tick por jogador (2000 avaliacoes/s), re-adicionando o
   grupo a cada tick. Agora: dispara o evento quando o valor muda e reaplica 1x por segundo
   (mantem o comportamento de "restaurar" o dano se outro grupo o sobrescrever). */
const ultimoDano = new Map();

world.afterEvents.playerLeave.subscribe((ev) => ultimoDano.delete(ev.playerId));

system.runInterval(() => {
  const obj = world.scoreboard.getObjective("dano_stats");
  if (!obj) return;
  const refresh = system.currentTick % 20 === 0;
  for (const player of world.getPlayers()) {
    try {
      if (!player.scoreboardIdentity) continue;
      const n = obj.getScore(player.scoreboardIdentity);
      if (typeof n !== "number" || n < 1 || n > 100) continue; // fora de 1..100 o original nao fazia nada
      if (!refresh && ultimoDano.get(player.id) === n) continue;
      ultimoDano.set(player.id, n);
      player.triggerEvent(`tnt:dano.${n}`);
    } catch {}
  }
}, 1);

/* execute_jutsus.mcfunction usa seletores globais (@e[tag=amaterasu], @e[tag=genjutsu]...).
   Antes era chamado por CADA jogador a cada tick: com N jogadores, particulas e efeitos
   eram aplicados N vezes por tick. Agora roda uma vez por tick em cada dimensao com jogadores. */
system.runInterval(() => {
  const dims = new Set();
  for (const p of world.getPlayers()) {
    try { dims.add(p.dimension.id); } catch {}
  }
  for (const id of dims) {
    const dim = world.getDimension(id);
    try { dim.runCommand("function execute_jutsus"); } catch {
      try { dim.runCommandAsync("function execute_jutsus"); } catch {}
    }
  }
}, 1);
