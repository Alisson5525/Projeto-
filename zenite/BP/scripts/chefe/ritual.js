// Ritual do Selo do Eclipse: 5 segundos de presságios e o Arconte desperta.
import { COR, ENTIDADE_ARCONTE, ITENS, PARTICULAS, SONS } from '../core/config.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { esfera, flash, particula, som, titulo } from '../core/fx.js';
import { ganchos } from '../core/ganchos.js';
import { avisar } from '../core/lancar.js';
import { tr } from '../core/texto.js';
import * as V from '../core/vec.js';
import { consumirNaMao, registrarUso } from '../sistemas/itens.js';
import { blocoEm, obstaculo } from '../tecnicas/comum.js';

const DURACAO = 100;
let ritualAtivo = false;

/** Chão 6 blocos à frente do jogador. */
function pontoDoRitual(player) {
  const d = player.getViewDirection();
  const h = V.norm({ x: d.x, y: 0, z: d.z });
  const base = V.add(player.location, V.scale(h.x === 0 && h.z === 0 ? { x: 0, y: 0, z: 1 } : h, 6));
  const x = Math.floor(base.x);
  const z = Math.floor(base.z);
  for (let y = Math.floor(base.y) + 4; y >= Math.floor(base.y) - 8; y--) {
    if (obstaculo(blocoEm(player.dimension, { x, y, z })) && !obstaculo(blocoEm(player.dimension, { x, y: y + 1, z }))) return { x: x + 0.5, y: y + 1, z: z + 0.5 };
  }
  return { x: x + 0.5, y: Math.floor(base.y), z: z + 0.5 };
}

/** @param {import('@minecraft/server').Player} player @returns {boolean} se o ritual começou */
export function iniciarRitual(player) {
  const dim = player.dimension;
  if (ritualAtivo) {
    avisar(player, [tr('zenite.msg.ritual_ocupado')]);
    return false;
  }
  try {
    if (dim.getEntities({ type: ENTIDADE_ARCONTE }).length > 0) {
      avisar(player, [tr('zenite.msg.arconte_existe')]);
      return false;
    }
  } catch {
    return false;
  }
  const local = pontoDoRitual(player);
  ritualAtivo = true;
  som(dim, SONS.arconteRitual, local, 1.5, 1);
  iniciarEfeito({
    passo(i) {
      const t = i / DURACAO;
      if (i % 20 === 0) particula(dim, PARTICULAS.runa, { x: local.x, y: local.y + 0.05, z: local.z }, COR.violeta, 3 + 4 * t);
      if (i % 2 === 0) {
        for (let k = 0; k < 3; k++) {
          const a = i * 0.3 + (k * Math.PI * 2) / 3;
          const r = 2.6 * (1 - t) + 0.4;
          particula(dim, PARTICULAS.estrela, { x: local.x + Math.cos(a) * r, y: local.y + 0.2 + t * 3, z: local.z + Math.sin(a) * r }, k === 0 ? COR.carmesim : COR.violeta, 0.4);
        }
        particula(dim, PARTICULAS.sugar, V.add(local, { x: 0, y: 1.5, z: 0 }), COR.roxo, 3 - 2 * t);
      }
      if (i > 0 && i % 20 === 0) som(dim, SONS.trovao, local, 0.8, 0.8 + t * 0.4);
      if (i < DURACAO) return true;
      try {
        dim.spawnEntity(ENTIDADE_ARCONTE, local);
      } catch {
        return false;
      }
      som(dim, SONS.arconteRugido, local, 1.5, 1);
      particula(dim, PARTICULAS.explosao, V.add(local, { x: 0, y: 1.5, z: 0 }), COR.violeta, 2);
      particula(dim, PARTICULAS.onda, local, COR.roxo, 14);
      esfera(dim, V.add(local, { x: 0, y: 1.5, z: 0 }), 2.5, 40, PARTICULAS.estrela, COR.carmesim, 0.4);
      try {
        for (const p of dim.getPlayers({ location: local, maxDistance: 64 })) {
          titulo(p, tr('zenite.titulo.arconte'), tr('zenite.titulo.arconte_sub'), 10, 60, 20);
          flash(p, { red: 0.2, green: 0.02, blue: 0.3 }, 0.1, 0.3, 1.2);
          p.sendMessage(tr('zenite.arconte.inicio'));
        }
      } catch {
        /* ignora */
      }
      return false;
    },
    fim() {
      ritualAtivo = false;
    },
  });
  return true;
}

registrarUso(ITENS.selo, (player) => {
  if (iniciarRitual(player)) consumirNaMao(player, ITENS.selo);
});
ganchos.iniciarRitual = (p) => void iniciarRitual(p);
ganchos.invocarArconte = (p) => void iniciarRitual(p);
