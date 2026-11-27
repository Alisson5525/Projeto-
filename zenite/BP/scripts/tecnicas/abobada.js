// Abóbada Celeste: a técnica suprema. Ergue uma cúpula estrelada (raio 14) que
// congela os inimigos lá dentro e torna o conjurador mais forte por 20 s.
import { EasingType, system, world } from '@minecraft/server';
import { causarDano, isAlvoValido } from '../core/combate.js';
import { BLOCO_FIRMAMENTO, CHAVES, COR, NEVOA_ABOBADA, PARTICULAS, SONS } from '../core/config.js';
import { cfgJogador, cfgMundo } from '../core/configuracoes.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { obterEstado } from '../core/estado.js';
import { flash, particula, som, titulo } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';
import { tr } from '../core/texto.js';
import * as V from '../core/vec.js';
import { blocoEm } from './comum.js';

export const RAIO = 14;
const DURACAO = 400;
const FECHAR = 20;
const TAG = CHAVES.congelado;
const ID_NEVOA = 'zenite_abobada';

/** @type {V.V3[] | undefined} */
let cascaCache;
const casca = () => (cascaCache ??= V.pontosEsfera(RAIO));

/**
 * @typedef {object} Abobada
 * @property {import('@minecraft/server').Player} dono
 * @property {string} donoId
 * @property {import('@minecraft/server').Dimension} dim
 * @property {V.V3} centro bloco central (pés do conjurador)
 * @property {V.V3[]} colocados
 * @property {Map<string, {ent: import('@minecraft/server').Entity, pos: V.V3}>} congelados
 * @property {Map<string, import('@minecraft/server').Player>} comNevoa
 */
/** @type {Map<string, Abobada>} */
const ativas = new Map();

// ---------------------------------------------------------------- registro persistente
function lerPendentes() {
  try {
    const s = world.getDynamicProperty(CHAVES.abobadas);
    return typeof s === 'string' ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
const gravarPendentes = (lista) => world.setDynamicProperty(CHAVES.abobadas, JSON.stringify(lista));
const mesmo = (r, ab) => r.dim === ab.dim.id && r.x === ab.centro.x && r.y === ab.centro.y && r.z === ab.centro.z;

/** Remove cúpulas que ficaram no mundo (queda, recarga de scripts). Retorna quantas limpou. */
export function limparAbobadasPendentes() {
  const restantes = [];
  let limpas = 0;
  for (const r of lerPendentes()) {
    if ([...ativas.values()].some((ab) => mesmo(r, ab))) {
      restantes.push(r);
      continue;
    }
    let dim;
    try {
      dim = world.getDimension(r.dim);
    } catch {
      continue;
    }
    let incompleta = false;
    for (const o of V.pontosEsfera(r.r ?? RAIO)) {
      const b = blocoEm(dim, { x: r.x + o.x, y: r.y + o.y, z: r.z + o.z });
      if (!b) {
        if (o.y + r.y >= dim.heightRange.min && o.y + r.y < dim.heightRange.max) incompleta = true;
        continue;
      }
      if (b.typeId === BLOCO_FIRMAMENTO) {
        try {
          b.setType('minecraft:air');
        } catch {
          incompleta = true;
        }
      }
    }
    if (incompleta) restantes.push(r);
    else limpas++;
  }
  gravarPendentes(restantes);
  return limpas;
}

// ---------------------------------------------------------------- cinema
function cinematica(player, centro) {
  if (!cfgJogador(player).camera) return;
  const alvo = () => V.add(player.location, { x: 0, y: 1.4, z: 0 });
  const pontos = [{ x: 9, y: 4, z: -9 }, { x: -10, y: 7, z: -6 }, { x: 0, y: 11, z: 10 }];
  pontos.forEach((o, k) => {
    system.runTimeout(() => {
      try {
        if (!player.isValid) return;
        player.camera.setCamera('minecraft:free', {
          location: V.add(centro, o),
          facingLocation: alvo(),
          easeOptions: { easeTime: k === 0 ? 0.01 : 1.1, easeType: EasingType.InOutSine },
        });
      } catch {
        /* câmera indisponível */
      }
    }, 2 + k * 22);
  });
  system.runTimeout(() => {
    try {
      if (player.isValid) player.camera.clear();
    } catch {
      /* ignora */
    }
  }, 72);
}

// ---------------------------------------------------------------- ciclo da cúpula
function colocarFatia(ab, i) {
  const lista = casca();
  const por = Math.ceil(lista.length / FECHAR);
  for (let k = i * por; k < Math.min(lista.length, (i + 1) * por); k++) {
    const o = lista[k];
    const p = { x: ab.centro.x + o.x, y: ab.centro.y + o.y, z: ab.centro.z + o.z };
    const b = blocoEm(ab.dim, p);
    if (!b || !b.isAir) continue;
    try {
      b.setType(BLOCO_FIRMAMENTO);
      ab.colocados.push(p);
    } catch {
      /* ignora */
    }
  }
  const y = ab.centro.y + RAIO - (2 * RAIO * (i + 1)) / FECHAR;
  const r = Math.sqrt(Math.max(0, RAIO * RAIO - (y - ab.centro.y) ** 2));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + i * 0.4;
    particula(ab.dim, PARTICULAS.estrela, { x: ab.centro.x + 0.5 + Math.cos(a) * r, y, z: ab.centro.z + 0.5 + Math.sin(a) * r }, COR.violeta, 0.6);
  }
}

function congelar(ab, ent) {
  if (!ab.congelados.has(ent.id)) {
    ab.congelados.set(ent.id, { ent, pos: { ...ent.location } });
    try {
      ent.addTag(TAG);
      if (ent.typeId === 'minecraft:player') titulo(/** @type {any} */ (ent), ' ', tr('zenite.titulo.preso'), 5, 60, 20);
    } catch {
      /* ignora */
    }
  }
  try {
    ent.addEffect('minecraft:slowness', 10, { amplifier: 10, showParticles: false });
    ent.addEffect('minecraft:weakness', 10, { amplifier: 10, showParticles: false });
    ent.addEffect('minecraft:mining_fatigue', 10, { amplifier: 4, showParticles: false });
    if (ent.typeId === 'minecraft:player') ent.addEffect('minecraft:darkness', 40, { amplifier: 0, showParticles: false });
  } catch {
    /* ignora */
  }
}

function nevoa(ab, p, ligar) {
  try {
    if (ligar && !ab.comNevoa.has(p.id)) {
      p.runCommand(`fog @s push ${NEVOA_ABOBADA} ${ID_NEVOA}`);
      ab.comNevoa.set(p.id, p);
    } else if (!ligar && ab.comNevoa.has(p.id)) {
      ab.comNevoa.delete(p.id);
      p.runCommand(`fog @s remove ${ID_NEVOA}`);
    }
  } catch {
    /* ignora */
  }
}

function manter(ab, i) {
  if (!ab.dono.isValid) return false;
  if (i < FECHAR) colocarFatia(ab, i);
  if (i >= DURACAO) return false;
  const dim = ab.dim;
  const cv = { x: ab.centro.x + 0.5, y: ab.centro.y + 0.5, z: ab.centro.z + 0.5 };
  if (i % 2 === 0) {
    const cfg = cfgMundo();
    const dentro = new Set();
    for (const ent of dim.getEntities({ location: cv, maxDistance: RAIO - 0.8 })) {
      dentro.add(ent.id);
      if (ent.id === ab.donoId) {
        const e = obterEstado(ab.dono);
        e.dentroAbobada = ab.donoId;
        ent.addEffect('minecraft:strength', 10, { amplifier: 1, showParticles: false });
        ent.addEffect('minecraft:speed', 10, { amplifier: 1, showParticles: false });
        ent.addEffect('minecraft:regeneration', 10, { amplifier: 0, showParticles: false });
        nevoa(ab, ab.dono, true);
        continue;
      }
      if (ent.typeId === 'minecraft:player') {
        obterEstado(/** @type {any} */ (ent)).dentroAbobada = ab.donoId;
        nevoa(ab, /** @type {any} */ (ent), true);
      }
      if (isAlvoValido(ab.dono, ent, cfg)) congelar(ab, ent);
    }
    for (const [id, p] of ab.comNevoa) {
      if (!dentro.has(id) && p.isValid) {
        nevoa(ab, p, false);
        const e = obterEstado(p);
        if (e.dentroAbobada === ab.donoId) e.dentroAbobada = undefined;
      }
    }
  }
  for (const [id, c] of ab.congelados) {
    if (!c.ent.isValid) {
      ab.congelados.delete(id);
      continue;
    }
    try {
      c.ent.teleport(c.pos, { keepVelocity: false });
      c.ent.clearVelocity();
    } catch {
      /* ignora */
    }
  }
  if (i % 20 === 10) for (const c of ab.congelados.values()) causarDano(c.ent, 2, ab.dono);
  if (i % 2 === 0) {
    for (let k = 0; k < 5; k++) {
      const d = V.norm({ x: Math.random() - 0.5, y: Math.random() * 0.9, z: Math.random() - 0.5 });
      const cores = [COR.branco, COR.violeta, COR.ciano];
      particula(dim, PARTICULAS.estrela, V.add(cv, V.scale(d, 3 + Math.random() * 9)), cores[k % 3], 0.25 + Math.random() * 0.3);
    }
  }
  if (i % 20 === 0) particula(dim, PARTICULAS.runa, { x: cv.x, y: ab.centro.y + 0.05, z: cv.z }, COR.violeta, 7);
  if (i % 40 === 0) particula(dim, PARTICULAS.onda, { x: cv.x, y: ab.centro.y + 0.1, z: cv.z }, COR.roxo, 20);
  return true;
}

function encerrar(ab) {
  ativas.delete(ab.donoId);
  const lista = ab.colocados;
  let k = 0;
  const cv = { x: ab.centro.x + 0.5, y: ab.centro.y + 1, z: ab.centro.z + 0.5 };
  som(ab.dim, SONS.abobadaFim, cv, 1.2, 1);
  particula(ab.dim, PARTICULAS.explosao, cv, COR.violeta, 2);
  iniciarEfeito({
    passo() {
      for (let n = 0; n < 150 && k < lista.length; n++, k++) {
        const b = blocoEm(ab.dim, lista[k]);
        if (b && b.typeId === BLOCO_FIRMAMENTO) {
          try {
            b.setType('minecraft:air');
          } catch {
            /* ignora */
          }
        }
      }
      return k < lista.length;
    },
    fim() {
      gravarPendentes(lerPendentes().filter((r) => !mesmo(r, ab)));
    },
  });
  for (const p of world.getAllPlayers()) {
    const e = obterEstado(p);
    if (e.dentroAbobada === ab.donoId) e.dentroAbobada = undefined;
  }
  for (const p of ab.comNevoa.values()) {
    try {
      if (p.isValid) p.runCommand(`fog @s remove ${ID_NEVOA}`);
    } catch {
      /* ignora */
    }
  }
  for (const c of ab.congelados.values()) {
    try {
      if (c.ent.isValid) c.ent.removeTag(TAG);
    } catch {
      /* ignora */
    }
  }
}

registrarTecnica('abobada', {
  lancar(player) {
    if (ativas.has(player.id)) return false;
    const dim = player.dimension;
    /** @type {Abobada} */
    const ab = { dono: player, donoId: player.id, dim, centro: V.bloco(player.location), colocados: [], congelados: new Map(), comNevoa: new Map() };
    ativas.set(player.id, ab);
    gravarPendentes([...lerPendentes(), { dim: dim.id, x: ab.centro.x, y: ab.centro.y, z: ab.centro.z, r: RAIO }]);
    const cv = { x: ab.centro.x + 0.5, y: ab.centro.y + 1, z: ab.centro.z + 0.5 };
    som(dim, SONS.abobada, cv, 1.4, 1);
    try {
      for (const p of dim.getPlayers({ location: cv, maxDistance: RAIO + 2 })) flash(p, { red: 0.3, green: 0.1, blue: 0.6 }, 0.15, 0.2, 1.0);
    } catch {
      /* ignora */
    }
    titulo(player, tr('zenite.titulo.abobada'), tr('zenite.titulo.abobada_sub'), 10, 50, 20);
    cinematica(player, cv);
    iniciarEfeito({ dono: player.id, passo: (i) => manter(ab, i), fim: () => encerrar(ab) });
    return true;
  },
});
