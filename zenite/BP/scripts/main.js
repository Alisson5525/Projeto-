// Zênite — Feitiçaria do Firmamento. Ponto de entrada dos scripts.
import { system, world } from '@minecraft/server';
import { esquecerJogador } from './core/configuracoes.js';
import { descartarEstado, salvarEstado } from './core/estado.js';
import { ganchos } from './core/ganchos.js';
import { iniciarArmadura } from './sistemas/armadura.js';
import { iniciarBoasVindas } from './sistemas/boas_vindas.js';
import { registrarComandos } from './sistemas/comandos.js';
import { iniciarCiclo } from './sistemas/hud_loop.js';
import { iniciarItens } from './sistemas/itens.js';
import { iniciarMaestria } from './sistemas/maestria.js';

system.beforeEvents.startup.subscribe((ev) => {
  registrarComandos(ev.customCommandRegistry);
});

iniciarItens();
iniciarMaestria();
iniciarBoasVindas();

world.beforeEvents.playerLeave.subscribe((ev) => {
  const player = ev.player;
  const id = player.id;
  try {
    salvarEstado(player);
  } catch {
    /* contexto restrito: o salvamento periódico já cobriu */
  }
  system.run(() => {
    descartarEstado(id);
    esquecerJogador(id);
  });
});

world.afterEvents.worldLoad.subscribe(() => {
  iniciarCiclo();
  iniciarArmadura();
  for (const f of ganchos.aoCarregar) {
    try {
      f();
    } catch (err) {
      console.warn(`[Zênite] ao carregar: ${err}`);
    }
  }
});
