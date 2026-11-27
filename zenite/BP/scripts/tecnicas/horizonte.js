// Horizonte de Eventos: 2 s de concentração, as esferas ciano e carmesim se fundem
// e uma esfera violeta apaga tudo em seu caminho.
import { alvosEm, causarDano, empurrar } from '../core/combate.js';
import { blocoProtegido, COR, PARTICULAS, SONS } from '../core/config.js';
import { cfgMundo } from '../core/configuracoes.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { esfera, flash, linha, particula, som, titulo, tremorArea } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';
import { tr } from '../core/texto.js';
import * as V from '../core/vec.js';
import { blocoEm, dentroDoMundo, olhar } from './comum.js';

const CARGA = 40;
const VOO = 45;
const PASSO = 2;
const BOLA = V.pontosBola(3);

/** Apaga uma bola de blocos (protegidos ficam). */
export function apagarBola(dim, centro) {
  if (!dentroDoMundo(dim, centro.y)) return;
  const c = V.bloco(centro);
  for (const o of BOLA) {
    const b = blocoEm(dim, V.add(c, o));
    if (!b || b.isAir || blocoProtegido(b.typeId)) continue;
    try {
      b.setType('minecraft:air');
    } catch {
      /* ignora */
    }
  }
}

function disparar(player, origem, dir) {
  const dim = player.dimension;
  const cfg = cfgMundo();
  som(dim, SONS.horizonteDisparo, origem, 1.4, 1);
  try {
    for (const p of dim.getPlayers({ location: origem, maxDistance: 32 })) flash(p, { red: 0.55, green: 0.25, blue: 0.95 }, 0.05, 0.05, 0.6);
  } catch {
    /* ignora */
  }
  tremorArea(dim, origem, 40, 0.6, 0.9);
  titulo(player, tr('zenite.titulo.horizonte'), '', 0, 25, 10);
  const atingidos = new Set();
  let pos = { ...origem };
  iniciarEfeito({
    dono: player.id,
    passo(i) {
      if (i >= VOO) {
        particula(dim, PARTICULAS.explosao, pos, COR.violeta, 1.5);
        particula(dim, PARTICULAS.anel, pos, COR.violeta, 7);
        return false;
      }
      pos = V.add(pos, V.scale(dir, PASSO));
      particula(dim, PARTICULAS.brilho, pos, COR.violeta, 5.5, 0.85);
      particula(dim, PARTICULAS.brilho, pos, COR.branco, 2.4, 0.9);
      particula(dim, PARTICULAS.rastro, V.sub(pos, V.scale(dir, PASSO)), COR.roxo, 2.5);
      if (i % 2 === 0) esfera(dim, pos, 3, 14, PARTICULAS.estrela, COR.violeta, 0.35, i);
      if (cfg.destruicao) apagarBola(dim, pos);
      for (const alvo of alvosEm(dim, { x: pos.x, y: pos.y - 0.9, z: pos.z }, 3.8, player, cfg)) {
        if (atingidos.has(alvo.id)) continue;
        atingidos.add(alvo.id);
        causarDano(alvo, 45, player);
        empurrar(alvo, dir, 1.5, 0.6);
      }
      return true;
    },
  });
}

registrarTecnica('horizonte', {
  lancar(player, ctx) {
    const e = ctx.estado;
    e.canalizando = true;
    player.addEffect('minecraft:slowness', CARGA + 4, { amplifier: 3, showParticles: false });
    som(player.dimension, SONS.horizonteCarga, player.location, 1, 1);
    iniciarEfeito({
      dono: player.id,
      passo(i) {
        if (!player.isValid) return false;
        const dim = player.dimension;
        const { cabeca, dir } = olhar(player);
        const { direita, cima } = V.basePerpendicular(dir);
        const base = V.add(cabeca, V.scale(dir, 1.8));
        const t = Math.min(1, i / CARGA);
        const sep = 1.6 * (1 - t * t);
        const giro = i * 0.35;
        const off = V.add(V.scale(direita, Math.cos(giro) * sep), V.scale(cima, Math.sin(giro) * sep * 0.5));
        const azul = V.add(base, off);
        const verm = V.sub(base, off);
        particula(dim, PARTICULAS.brilho, azul, COR.ciano, 0.75);
        particula(dim, PARTICULAS.brilho, verm, COR.carmesim, 0.75);
        particula(dim, PARTICULAS.brilho, azul, COR.branco, 0.3);
        particula(dim, PARTICULAS.brilho, verm, COR.branco, 0.3);
        if (i % 3 === 0) particula(dim, PARTICULAS.sugar, base, COR.violeta, 1.2 + 0.6 * t);
        if (i > 20 && i % 2 === 0) linha(dim, azul, verm, 0.4, PARTICULAS.rastro, COR.violeta, 0.25);
        if (i >= CARGA) {
          e.canalizando = false;
          disparar(player, base, dir);
          return false;
        }
        return true;
      },
      fim() {
        e.canalizando = false;
      },
    });
    return true;
  },
});
