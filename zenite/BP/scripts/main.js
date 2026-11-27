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
import { iniciarLoopEfeitos } from './core/efeitos.js';
import { iniciarVeu } from './tecnicas/veu.js';
import './tecnicas/poco.js';
import './tecnicas/nova.js';
import './tecnicas/passo.js';
import './tecnicas/reversao.js';
import './tecnicas/horizonte.js';
import { limparAbobadasPendentes } from './tecnicas/abobada.js';
import { iniciarArconte } from './chefe/arconte.js';
import './chefe/ritual.js';

system.beforeEvents.startup.subscribe((ev) => {
  registrarComandos(ev.customCommandRegistry);
});

iniciarItens();
iniciarMaestria();
iniciarBoasVindas();
ganchos.limparAbobadas = () => limparAbobadasPendentes();

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
  iniciarLoopEfeitos();
  iniciarCiclo();
  iniciarArmadura();
  iniciarVeu();
  iniciarArconte();
  // Cúpulas que ficaram no mundo (queda ou recarga) somem assim que o chunk carregar.
  system.runTimeout(() => limparAbobadasPendentes(), 40);
  system.runInterval(() => limparAbobadasPendentes(), 600);
  for (const f of ganchos.aoCarregar) {
    try {
      f();
    } catch (err) {
      console.warn(`[Zênite] ao carregar: ${err}`);
    }
  }
});
