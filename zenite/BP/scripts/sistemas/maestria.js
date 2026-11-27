// Maestria: XP por abates e por técnicas, subida de nível com celebração.
import { system, world } from '@minecraft/server';
import { COR, ENTIDADE_ARCONTE, LIMIARES_XP, NIVEL_MAX, PARTICULAS, SONS, TECNICAS } from '../core/config.js';
import { obterEstado, salvarEstado } from '../core/estado.js';
import { anel, somJogador, titulo } from '../core/fx.js';
import { aoLancar } from '../core/lancar.js';
import { eterMax, nivelPorXp, xpPorAbate } from '../core/progression.js';
import { tr } from '../core/texto.js';

/** @param {import('@minecraft/server').Player} player @param {number} antes @param {number} depois */
function celebrar(player, antes, depois) {
  titulo(player, tr('zenite.titulo.nivel'), { rawtext: [{ text: '§f' }, tr('zenite.menu.nivel'), { text: ` ${depois}` }] }, 5, 50, 20);
  somJogador(player, SONS.nivel, 1);
  const l = player.location;
  for (let i = 0; i < 3; i++) anel(player.dimension, { x: l.x, y: l.y + 0.2 + i * 0.7, z: l.z }, 1.1, 14, PARTICULAS.estrela, i === 1 ? COR.ouro : COR.ciano, 0.35, i);
  try {
    player.sendMessage({ rawtext: [tr('zenite.msg.nivel_subiu'), { text: ` §f${depois}§b!` }] });
    for (const tec of TECNICAS) {
      if (!tec.requer && tec.nivel > antes && tec.nivel <= depois) {
        player.sendMessage({ rawtext: [tr('zenite.msg.nova_tecnica'), { text: ` ${tec.corTexto}` }, tr(`zenite.tec.${tec.id}.nome`)] });
      }
    }
  } catch {
    /* ignora */
  }
}

/** @param {import('@minecraft/server').Player} player @param {number} qtd */
export function ganharXp(player, qtd) {
  const e = obterEstado(player);
  const antes = e.nivel;
  e.xp = Math.max(0, Math.round(e.xp + qtd));
  e.nivel = nivelPorXp(e.xp);
  e.sujo = true;
  if (e.nivel > antes) {
    celebrar(player, antes, e.nivel);
    salvarEstado(player);
  }
}

/** @param {import('@minecraft/server').Player} player @param {number} n */
export function definirNivel(player, n) {
  const e = obterEstado(player);
  const alvo = Math.max(1, Math.min(NIVEL_MAX, Math.floor(n)));
  const antes = e.nivel;
  e.xp = LIMIARES_XP[alvo - 1];
  e.nivel = alvo;
  e.eter = Math.min(e.eter, eterMax(alvo));
  if (alvo > antes) celebrar(player, antes, alvo);
  salvarEstado(player);
}

export function iniciarMaestria() {
  world.afterEvents.entityDie.subscribe((ev) => {
    try {
      const matador = ev.damageSource?.damagingEntity;
      if (!matador || matador.typeId !== 'minecraft:player') return;
      const morto = ev.deadEntity;
      if (morto.typeId === ENTIDADE_ARCONTE || morto.typeId === 'minecraft:player') return;
      let vida = 20;
      try {
        vida = morto.getComponent('minecraft:health')?.effectiveMax ?? 20;
      } catch {
        vida = 20;
      }
      ganharXp(/** @type {import('@minecraft/server').Player} */ (matador), xpPorAbate(vida));
    } catch {
      /* ignora */
    }
  });
  aoLancar((player) => {
    const e = obterEstado(player);
    if (system.currentTick - e.ultimoXpLance >= 20) {
      e.ultimoXpLance = system.currentTick;
      ganharXp(player, 1);
    }
  });
}
