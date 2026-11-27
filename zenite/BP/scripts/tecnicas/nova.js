// Supernova: projétil carmesim que explode numa onda de choque.
import { alvosEm, causarDano, empurrar, isAlvoValido } from '../core/combate.js';
import { COR, PARTICULAS, SONS } from '../core/config.js';
import { cfgMundo } from '../core/configuracoes.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { particula, som, tremorArea } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';
import * as V from '../core/vec.js';
import { blocoEm, dentroDoMundo, obstaculo, olhar } from './comum.js';

const VELOCIDADE = 1.6;
const VIDA = 28;
const RAIO = 7;

/** Explosão da Supernova (também usada pelo Arconte). */
export function explodirNova(autor, dim, c, cfg, potencia = 1) {
  som(dim, SONS.novaImpacto, c, 1.2, 1);
  particula(dim, PARTICULAS.explosao, c, COR.carmesim, 1.4 * potencia);
  particula(dim, PARTICULAS.onda, c, COR.laranja, 10 * potencia);
  particula(dim, PARTICULAS.anel, c, COR.carmesim, 5 * potencia);
  particula(dim, PARTICULAS.brilho, c, COR.branco, 4 * potencia, 0.9);
  for (const alvo of alvosEm(dim, c, RAIO, autor, cfg)) {
    const d = V.dist(alvo.location, c);
    const k = Math.max(0, 1 - d / RAIO);
    causarDano(alvo, Math.round((2 + 12 * Math.pow(k, 0.7)) * potencia), autor);
    const n = V.norm({ x: alvo.location.x - c.x, y: 0, z: alvo.location.z - c.z });
    empurrar(alvo, n.x === 0 && n.z === 0 ? { x: 0, y: 0, z: 1 } : n, 0.8 + 2.2 * k, 0.5 + 0.6 * k);
  }
  tremorArea(dim, c, 20, 0.35, 0.5);
  if (!cfg.destruicao) return;
  // A explosão de blocos não fere o conjurador nem quem está fora do PvP.
  try {
    for (const p of dim.getPlayers({ location: c, maxDistance: 9 })) {
      if (p.id === autor?.id || !isAlvoValido(autor, p, cfg)) p.addEffect('minecraft:resistance', 10, { amplifier: 4, showParticles: false });
    }
    dim.createExplosion(c, 3.2, autor && autor.isValid ? { breaksBlocks: true, causesFire: false, source: autor } : { breaksBlocks: true, causesFire: false });
  } catch {
    /* ignora */
  }
}

registrarTecnica('nova', {
  lancar(player) {
    const dim = player.dimension;
    const { cabeca, dir } = olhar(player);
    let pos = V.add(cabeca, V.scale(dir, 1.0));
    const cfg = cfgMundo();
    som(dim, SONS.novaDisparo, pos, 1, 1);
    iniciarEfeito({
      dono: player.id,
      passo(i) {
        if (i >= VIDA) return false;
        const prox = V.add(pos, V.scale(dir, VELOCIDADE));
        for (let s = 1; s <= 4; s++) {
          const p = V.lerp(pos, prox, s / 4);
          if (!dentroDoMundo(dim, p.y)) return false;
          const atingiu = obstaculo(blocoEm(dim, p)) || alvosEm(dim, { x: p.x, y: p.y - 0.9, z: p.z }, 1.5, player, cfg).length > 0;
          if (atingiu) {
            explodirNova(player, dim, V.lerp(pos, prox, (s - 1) / 4), cfg);
            return false;
          }
        }
        pos = prox;
        particula(dim, PARTICULAS.brilho, pos, COR.carmesim, 1.0, 0.95);
        particula(dim, PARTICULAS.brilho, pos, COR.branco, 0.4);
        particula(dim, PARTICULAS.rastro, pos, COR.laranja, 0.5);
        return true;
      },
    });
    return true;
  },
});
