// Primeiro login: entrega o Códice do Zênite (uma vez por jogador) e dá as boas-vindas.
import { system, world } from '@minecraft/server';
import { CHAVES, ITENS } from '../core/config.js';
import { cfgMundo } from '../core/configuracoes.js';
import { tr } from '../core/texto.js';
import { darItem } from './entregas.js';

export function iniciarBoasVindas() {
  world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;
    const player = ev.player;
    system.runTimeout(() => {
      try {
        if (!player.isValid || !cfgMundo().boasVindas || player.getDynamicProperty(CHAVES.recebeuCodice)) return;
        player.setDynamicProperty(CHAVES.recebeuCodice, true);
        darItem(player, ITENS.codice, 1);
        system.runTimeout(() => {
          if (player.isValid) player.sendMessage(tr('zenite.msg.boas_vindas'));
        }, 60);
      } catch {
        /* ignora */
      }
    }, 1);
  });
}
