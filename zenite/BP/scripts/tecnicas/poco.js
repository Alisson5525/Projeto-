// Poço Gravitacional: esfera ciano que suga e esmaga tudo ao redor.
import { alvosEm, causarDano, isAlvoValido } from '../core/combate.js';
import { blocoProtegido, COR, PARTICULAS, SONS } from '../core/config.js';
import { cfgMundo } from '../core/configuracoes.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { anel, particula, som } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';
import * as V from '../core/vec.js';
import { alvoMirado, blocoEm, olhar } from './comum.js';

const VIAGEM = 6;
const DURACAO = 80;
const RAIO_PUXAO = 9;
const BOLA = V.pontosBola(1.8);

function orbe(dim, pos, i) {
  particula(dim, PARTICULAS.brilho, pos, COR.ciano, 1.3, 0.9);
  particula(dim, PARTICULAS.brilho, pos, COR.branco, 0.55);
  if (i % 2 === 0) particula(dim, PARTICULAS.sugar, pos, COR.ciano, 3.5);
  anel(dim, pos, 1.4, 5, PARTICULAS.estrela, COR.azul, 0.2, i * 0.35);
}

function puxar(player, dim, centro, cfg) {
  for (const ent of dim.getEntities({ location: centro, maxDistance: RAIO_PUXAO })) {
    if (ent.id === player.id) continue;
    const solto = ent.typeId === 'minecraft:item' || ent.typeId === 'minecraft:xp_orb';
    if (!solto && !isAlvoValido(player, ent, cfg)) continue;
    const delta = V.sub(centro, V.add(ent.location, { x: 0, y: solto ? 0 : 0.8, z: 0 }));
    const d = V.len(delta);
    if (d < 0.6) continue;
    const n = V.scale(delta, 1 / d);
    const forca = 0.08 + 0.22 * (1 - d / RAIO_PUXAO);
    try {
      if (ent.typeId === 'minecraft:player') ent.applyKnockback({ x: n.x * forca * 3, z: n.z * forca * 3 }, n.y * forca * 1.5 + 0.05);
      else ent.applyImpulse(V.scale(n, forca));
    } catch {
      /* entidades sem física */
    }
  }
}

function corroer(dim, centro) {
  const c = V.bloco(centro);
  for (const o of BOLA) {
    const b = blocoEm(dim, V.add(c, o));
    if (!b || b.isAir || b.isLiquid || blocoProtegido(b.typeId)) continue;
    try {
      b.setType('minecraft:air');
      particula(dim, PARTICULAS.faisca, b.center(), COR.ciano, 0.15);
    } catch {
      /* ignora */
    }
  }
}

registrarTecnica('poco', {
  lancar(player) {
    const dim = player.dimension;
    const { cabeca, dir } = olhar(player);
    const mira = alvoMirado(player, 24);
    let alvo = mira.pos;
    if (mira.bloco) alvo = V.sub(alvo, V.scale(dir, 1.5));
    else if (!mira.entidade) alvo = V.add(cabeca, V.scale(dir, 14));
    const origem = V.add(cabeca, V.scale(dir, 1.2));
    const cfg = cfgMundo();
    som(dim, SONS.poco, origem, 1, 1);
    iniciarEfeito({
      dono: player.id,
      passo(i) {
        if (i < VIAGEM) {
          orbe(dim, V.lerp(origem, alvo, (i + 1) / VIAGEM), i);
          return true;
        }
        if (i < VIAGEM + DURACAO) {
          orbe(dim, alvo, i);
          if (player.isValid) puxar(player, dim, alvo, cfg);
          if (i % 10 === 0) {
            for (const a of alvosEm(dim, alvo, 2.5, player, cfg)) causarDano(a, 3, player);
            if (cfg.destruicao) corroer(dim, alvo);
          }
          return true;
        }
        particula(dim, PARTICULAS.explosao, alvo, COR.ciano, 1.0);
        particula(dim, PARTICULAS.onda, alvo, COR.ciano, 6);
        som(dim, SONS.novaImpacto, alvo, 0.6, 1.5);
        for (const a of alvosEm(dim, alvo, 2.5, player, cfg)) causarDano(a, 4, player);
        return false;
      },
    });
    return true;
  },
});
