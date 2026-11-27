// Véu Assintótico: barreira liga/desliga. Tudo se aproxima, nada chega.
import { system, world } from '@minecraft/server';
import { alvosEm, empurrar } from '../core/combate.js';
import { COR, PARTICULAS, PROJETEIS, SONS, TECNICA_POR_ID } from '../core/config.js';
import { ehCriativo, obterEstado } from '../core/estado.js';
import { esfera, particula, som } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';
import * as V from '../core/vec.js';

const PERIODO = 2;
/** Projéteis presos no ar: id → { ent, pos, dono }. */
const congelados = new Map();

const centroDe = (p) => V.add(p.location, { x: 0, y: 1, z: 0 });

function ligar(player, e) {
  e.veu = true;
  som(player.dimension, SONS.veuOn, player.location, 1, 1);
  esfera(player.dimension, centroDe(player), 1.6, 26, PARTICULAS.hex, COR.ciano, 0.45);
}

function desligar(player, e) {
  e.veu = false;
  try {
    som(player.dimension, SONS.veuOff, player.location, 1, 1);
    esfera(player.dimension, centroDe(player), 1.6, 18, PARTICULAS.estrela, COR.prata, 0.25);
  } catch {
    /* jogador saindo */
  }
  for (const [id, c] of congelados) if (c.dono === player) congelados.delete(id);
}

registrarTecnica('veu', {
  lancar(player, ctx) {
    if (ctx.estado.veu) desligar(player, ctx.estado);
    else ligar(player, ctx.estado);
    return true;
  },
});

/** @param {import('@minecraft/server').Player} p */
function manter(p, e, agora) {
  const gratis = ehCriativo(p) || e.dentroAbobada === p.id;
  if (!gratis) {
    e.eter -= TECNICA_POR_ID.veu.dreno * (e.conjunto ? 0.5 : 1) * (PERIODO / 20);
    if (e.eter <= 0) {
      e.eter = 0;
      desligar(p, e);
      return;
    }
  }
  p.addEffect('minecraft:resistance', 12, { amplifier: 4, showParticles: false });
  p.addEffect('minecraft:fire_resistance', 12, { amplifier: 0, showParticles: false });
  const dim = p.dimension;
  const centro = centroDe(p);
  for (const ent of dim.getEntities({ location: centro, maxDistance: 3.5 })) {
    if (!PROJETEIS.has(ent.typeId) || congelados.has(ent.id)) continue;
    let dono;
    try {
      dono = /** @type {any} */ (ent.getComponent('minecraft:projectile'))?.owner;
    } catch {
      dono = undefined;
    }
    if (dono && dono.id === p.id) continue;
    congelados.set(ent.id, { ent, pos: { ...ent.location }, dono: p });
    ent.clearVelocity();
    particula(dim, PARTICULAS.hex, ent.location, COR.ciano, 0.9);
    som(dim, SONS.veuBloqueio, ent.location, 0.9, 0.9 + Math.random() * 0.3);
  }
  if (agora % 4 === 0) {
    for (const alvo of alvosEm(dim, p.location, 1.9, p)) {
      const d = V.norm({ x: alvo.location.x - p.location.x, y: 0, z: alvo.location.z - p.location.z });
      empurrar(alvo, d.x === 0 && d.z === 0 ? { x: 1, y: 0, z: 0 } : d, 0.9, 0.25);
      particula(dim, PARTICULAS.hex, V.lerp(centro, V.add(alvo.location, { x: 0, y: 1, z: 0 }), 0.6), COR.prata, 0.7);
    }
  }
  if (agora % 10 === 0) esfera(dim, centro, 1.5, 8, PARTICULAS.estrela, COR.prata, 0.12, Math.random() * 6);
}

export function iniciarVeu() {
  system.runInterval(() => {
    const agora = system.currentTick;
    for (const p of world.getAllPlayers()) {
      try {
        const e = obterEstado(p);
        if (e.veu) manter(p, e, agora);
      } catch {
        /* ignora */
      }
    }
    for (const [id, c] of congelados) {
      try {
        const dono = c.dono;
        if (!c.ent.isValid || !dono.isValid || !obterEstado(dono).veu || V.dist(dono.location, c.pos) > 6) {
          congelados.delete(id);
          continue;
        }
        c.ent.teleport(c.pos);
        c.ent.clearVelocity();
      } catch {
        congelados.delete(id);
      }
    }
  }, PERIODO);
}
