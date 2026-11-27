// Arconte do Eclipse: IA de 3 fases sobre o comportamento vanilla de perseguição e golpe.
import { GameMode, system, world } from '@minecraft/server';
import { causarDano, empurrar, isAlvoValido } from '../core/combate.js';
import { CHAVES, COR, ENTIDADE_ARCONTE, PARTICULAS, PROJETEIS, SONS, XP_ARCONTE } from '../core/config.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { esfera, flash, linha, particula, som, titulo, tremorArea } from '../core/fx.js';
import { tr } from '../core/texto.js';
import * as V from '../core/vec.js';
import { ganharXp } from '../sistemas/maestria.js';
import { blocoEm, obstaculo } from '../tecnicas/comum.js';
import { explodirNova } from '../tecnicas/nova.js';

const PERIODO = 5;
const DIMENSOES = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
const CFG_ARCONTE = { pvp: true, destruicao: false, boasVindas: false };

/** @param {number} vida @param {number} max @returns {1|2|3} */
export function faseDoArconte(vida, max) {
  const f = max > 0 ? vida / max : 0;
  if (f > 0.66) return 1;
  if (f > 0.33) return 2;
  return 3;
}

/**
 * @typedef {object} EstadoArconte
 * @property {number} fase
 * @property {number} ocupadoAte
 * @property {Record<string, number>} prox tick em que cada ataque fica disponível
 */
/** @type {Map<string, EstadoArconte>} */
const estados = new Map();

function estadoDe(a, agora) {
  let s = estados.get(a.id);
  if (!s) {
    s = { fase: 1, ocupadoAte: 0, prox: { puxao: agora + 100, passo: agora + 160, novas: agora + 80, veu: agora + 200, feixe: agora + 60 } };
    estados.set(a.id, s);
  }
  return s;
}

const centro = (e) => V.add(e.location, { x: 0, y: 1.2, z: 0 });
const definir = (a, prop, valor) => {
  try {
    a.setProperty(prop, valor);
  } catch {
    /* ignora */
  }
};

function falar(dim, onde, chave, raio = 64) {
  try {
    for (const p of dim.getPlayers({ location: onde, maxDistance: raio })) p.sendMessage(tr(chave));
  } catch {
    /* ignora */
  }
}

/** Jogador mais próximo que o Arconte pode atacar (nunca criativo/espectador). */
function alvoDe(a) {
  let melhor;
  let dmin = 40;
  try {
    for (const p of a.dimension.getPlayers({ location: a.location, maxDistance: 40 })) {
      const m = p.getGameMode();
      if (m === GameMode.Creative || m === GameMode.Spectator) continue;
      const d = V.dist(p.location, a.location);
      if (d < dmin) {
        dmin = d;
        melhor = p;
      }
    }
  } catch {
    return undefined;
  }
  return melhor;
}

// ---------------------------------------------------------------- ataques
function puxao(a, alvo) {
  definir(a, CHAVES.estadoArconte, 1);
  som(a.dimension, SONS.poco, alvo.location, 1, 0.7);
  iniciarEfeito({
    passo(i) {
      if (i >= 20 || !a.isValid || !alvo.isValid) return false;
      const dim = a.dimension;
      particula(dim, PARTICULAS.sugar, centro(alvo), COR.roxo, 2);
      if (i % 2 === 0) {
        linha(dim, centro(a), centro(alvo), 0.9, PARTICULAS.rastro, COR.violeta, 0.25);
        const n = V.norm(V.sub(a.location, alvo.location));
        try {
          if (V.dist(a.location, alvo.location) > 2.5) alvo.applyKnockback({ x: n.x * 0.55, z: n.z * 0.55 }, 0.12);
        } catch {
          /* ignora */
        }
      }
      return true;
    },
    fim: () => definir(a, CHAVES.estadoArconte, 0),
  });
}

function passoSombrio(a, alvo) {
  const h = V.norm({ x: alvo.location.x - a.location.x, y: 0, z: alvo.location.z - a.location.z });
  const destino = { x: alvo.location.x + h.x * 2, y: alvo.location.y, z: alvo.location.z + h.z * 2 };
  const dim = a.dimension;
  const livre = !obstaculo(blocoEm(dim, destino)) && !obstaculo(blocoEm(dim, V.add(destino, { x: 0, y: 1, z: 0 }))) && !obstaculo(blocoEm(dim, V.add(destino, { x: 0, y: 2, z: 0 })));
  if (!livre) return false;
  esfera(dim, centro(a), 1.4, 24, PARTICULAS.estrela, COR.roxo, 0.35);
  som(dim, SONS.passo, a.location, 1, 0.6);
  try {
    a.teleport(destino, { facingLocation: centro(alvo) });
  } catch {
    return false;
  }
  esfera(dim, V.add(destino, { x: 0, y: 1.2, z: 0 }), 1.4, 24, PARTICULAS.estrela, COR.violeta, 0.35);
  som(dim, SONS.passo, destino, 1, 0.6);
  return true;
}

function chuvaDeNovas(a, alvo, fase) {
  definir(a, CHAVES.estadoArconte, 1);
  const qtd = fase >= 3 ? 5 : 3;
  for (let k = 0; k < qtd; k++) {
    system.runTimeout(() => {
      if (!a.isValid || !alvo.isValid) return;
      const dim = a.dimension;
      let pos = V.add(a.location, { x: 0, y: 2.6, z: 0 });
      const mira = V.add(alvo.location, { x: (Math.random() - 0.5) * 3, y: 1, z: (Math.random() - 0.5) * 3 });
      const dir = V.norm(V.sub(mira, pos));
      som(dim, SONS.novaDisparo, pos, 1, 0.7);
      iniciarEfeito({
        passo(i) {
          if (i >= 45) return false;
          const prox = V.add(pos, V.scale(dir, 1.1));
          for (let s = 1; s <= 3; s++) {
            const p = V.lerp(pos, prox, s / 3);
            const acerto = obstaculo(blocoEm(dim, p)) || dim.getEntities({ location: { x: p.x, y: p.y - 0.9, z: p.z }, maxDistance: 1.3 }).some((e) => e.id !== a.id && isAlvoValido(a, e, CFG_ARCONTE));
            if (acerto) {
              explodirNova(a, dim, p, CFG_ARCONTE, 0.6);
              return false;
            }
          }
          pos = prox;
          particula(dim, PARTICULAS.brilho, pos, COR.carmesim, 0.9, 0.95);
          particula(dim, PARTICULAS.brilho, pos, COR.roxo, 0.45);
          return true;
        },
      });
    }, k * 6);
  }
  system.runTimeout(() => a.isValid && definir(a, CHAVES.estadoArconte, 0), qtd * 6 + 4);
}

function veuNegro(a) {
  definir(a, CHAVES.estadoArconte, 2);
  const dim = a.dimension;
  try {
    for (const p of dim.getPlayers({ location: a.location, maxDistance: 40 })) p.onScreenDisplay.setActionBar(tr('zenite.arconte.veu'));
  } catch {
    /* ignora */
  }
  iniciarEfeito({
    passo(i) {
      if (i >= 80 || !a.isValid) return false;
      a.addEffect('minecraft:resistance', 6, { amplifier: 4, showParticles: false });
      if (i % 4 === 0) esfera(dim, centro(a), 1.9, 14, PARTICULAS.hex, COR.roxo, 0.5, i);
      for (const e of dim.getEntities({ location: centro(a), maxDistance: 3 })) {
        if (!PROJETEIS.has(e.typeId)) continue;
        particula(dim, PARTICULAS.hex, e.location, COR.violeta, 0.8);
        try {
          e.remove();
        } catch {
          /* ignora */
        }
      }
      return true;
    },
    fim: () => definir(a, CHAVES.estadoArconte, 0),
  });
}

function eclipseTotal(a, alvo, s) {
  const dim = a.dimension;
  const origem = V.add(a.location, { x: 0, y: 2.2, z: 0 });
  const dir = V.norm(V.sub(centro(alvo), origem));
  const fim = V.add(origem, V.scale(dir, 32));
  definir(a, CHAVES.estadoArconte, 3);
  som(dim, SONS.arconteFeixe, origem, 1.4, 1);
  try {
    for (const p of dim.getPlayers({ location: a.location, maxDistance: 40 })) p.onScreenDisplay.setActionBar(tr('zenite.arconte.aviso_feixe'));
  } catch {
    /* ignora */
  }
  s.ocupadoAte = system.currentTick + 42;
  iniciarEfeito({
    passo(i) {
      if (!a.isValid) return false;
      a.addEffect('minecraft:slowness', 6, { amplifier: 10, showParticles: false });
      if (i < 30) {
        if (i % 3 === 0) linha(dim, origem, fim, 1.3, PARTICULAS.rastro, COR.carmesim, 0.25 + i * 0.01);
        particula(dim, PARTICULAS.brilho, origem, COR.carmesim, 0.5 + i * 0.05);
        return true;
      }
      if (i === 30) {
        som(dim, SONS.horizonteDisparo, origem, 1.2, 0.8);
        tremorArea(dim, origem, 32, 0.5, 0.6);
        for (const e of dim.getEntities({ location: V.lerp(origem, fim, 0.5), maxDistance: 17.5 })) {
          if (e.id === a.id || !isAlvoValido(a, e, CFG_ARCONTE)) continue;
          const c = centro(e);
          const t = Math.max(0, Math.min(32, V.dot(V.sub(c, origem), dir)));
          if (V.dist(c, V.add(origem, V.scale(dir, t))) > 1.8) continue;
          causarDano(e, 18, a);
          empurrar(e, dir, 1.2, 0.5);
          if (e.typeId === 'minecraft:player') flash(/** @type {any} */ (e), { red: 0.6, green: 0, blue: 0.05 }, 0.02, 0.05, 0.4);
        }
      }
      if (i < 40) {
        linha(dim, origem, fim, 0.8, PARTICULAS.brilho, COR.carmesim, 1.1);
        if (i % 2 === 0) linha(dim, origem, fim, 1.6, PARTICULAS.brilho, COR.branco, 0.45);
        return true;
      }
      return false;
    },
    fim: () => definir(a, CHAVES.estadoArconte, 0),
  });
}

// ---------------------------------------------------------------- cérebro
function mudarFase(a, s, nova) {
  const dim = a.dimension;
  s.fase = nova;
  definir(a, CHAVES.faseArconte, nova);
  som(dim, SONS.arconteRugido, a.location, 1.5, nova === 3 ? 0.8 : 1);
  esfera(dim, centro(a), 2.8, 48, PARTICULAS.estrela, nova === 3 ? COR.carmesim : COR.violeta, 0.5);
  if (nova === 2) {
    falar(dim, a.location, 'zenite.arconte.fase2');
    falar(dim, a.location, 'zenite.arconte.ecos', 40);
    for (const dx of [-2.5, 2.5]) {
      try {
        dim.spawnEntity('minecraft:vex', V.add(a.location, { x: dx, y: 1.5, z: 0 }));
      } catch {
        /* ignora */
      }
    }
  } else if (nova === 3) {
    falar(dim, a.location, 'zenite.arconte.fase3');
    try {
      a.triggerEvent(CHAVES.eventoFuria);
    } catch {
      /* ignora */
    }
    try {
      for (const p of dim.getPlayers({ location: a.location, maxDistance: 48 })) flash(p, { red: 0.5, green: 0.02, blue: 0.05 }, 0.05, 0.1, 0.8);
    } catch {
      /* ignora */
    }
    tremorArea(dim, a.location, 40, 0.5, 1.0);
  }
}

function pensar(a, agora) {
  const s = estadoDe(a, agora);
  const vida = a.getComponent('minecraft:health');
  if (!vida) return;
  const fase = faseDoArconte(vida.currentValue, vida.effectiveMax);
  if (fase > s.fase) mudarFase(a, s, fase);
  if (a.hasTag(CHAVES.congelado)) return;
  const alvo = alvoDe(a);
  if (!alvo) {
    if (agora % 20 < PERIODO && vida.currentValue < vida.effectiveMax) vida.setCurrentValue(Math.min(vida.effectiveMax, vida.currentValue + vida.effectiveMax * 0.01));
    return;
  }
  if (s.ocupadoAte > agora) return;
  const ritmo = s.fase === 3 ? 0.7 : 1;
  const pronto = (k) => s.prox[k] <= agora;
  if (s.fase >= 3 && pronto('feixe')) {
    eclipseTotal(a, alvo, s);
    s.prox.feixe = agora + 200;
    return;
  }
  if (s.fase >= 2 && pronto('veu') && vida.currentValue < vida.effectiveMax * 0.9) {
    veuNegro(a);
    s.prox.veu = agora + 300;
    s.ocupadoAte = agora + 20;
    return;
  }
  if (s.fase >= 2 && pronto('novas')) {
    chuvaDeNovas(a, alvo, s.fase);
    s.prox.novas = agora + Math.round(120 * ritmo);
    s.ocupadoAte = agora + 30;
    return;
  }
  if (pronto('puxao') && V.dist(a.location, alvo.location) > 5) {
    puxao(a, alvo);
    s.prox.puxao = agora + Math.round(140 * ritmo);
    s.ocupadoAte = agora + 25;
    return;
  }
  if (pronto('passo')) {
    if (passoSombrio(a, alvo)) s.ocupadoAte = agora + 10;
    s.prox.passo = agora + Math.round(180 * ritmo);
  }
}

function morte(a, matador) {
  const dim = a.dimension;
  const onde = centro(a);
  estados.delete(a.id);
  som(dim, SONS.arconteMorte, onde, 1.6, 1);
  falar(dim, onde, 'zenite.arconte.morte');
  iniciarEfeito({
    passo(i) {
      if (i < 24) {
        const r = 4 * (1 - i / 24);
        esfera(dim, onde, r + 0.3, 18, PARTICULAS.estrela, i % 2 ? COR.violeta : COR.ouro, 0.4, i * 0.4);
        return true;
      }
      particula(dim, PARTICULAS.explosao, onde, COR.ouro, 2.2);
      particula(dim, PARTICULAS.onda, { x: onde.x, y: onde.y - 1.1, z: onde.z }, COR.violeta, 24);
      particula(dim, PARTICULAS.brilho, onde, COR.branco, 8, 0.9);
      tremorArea(dim, onde, 40, 0.6, 1.0);
      return false;
    },
  });
  const premiados = new Set();
  if (matador && matador.typeId === 'minecraft:player') {
    ganharXp(/** @type {any} */ (matador), XP_ARCONTE);
    premiados.add(matador.id);
  }
  try {
    for (const p of dim.getPlayers({ location: onde, maxDistance: 48 })) {
      titulo(p, tr('zenite.titulo.vitoria'), tr('zenite.titulo.vitoria_sub'), 10, 70, 20);
      flash(p, { red: 1, green: 0.9, blue: 0.6 }, 0.05, 0.1, 1.0);
      if (!premiados.has(p.id) && p.getGameMode() !== GameMode.Creative) ganharXp(p, XP_ARCONTE);
    }
  } catch {
    /* ignora */
  }
}

export function iniciarArconte() {
  system.runInterval(() => {
    const agora = system.currentTick;
    for (const id of DIMENSOES) {
      let lista = [];
      try {
        lista = world.getDimension(id).getEntities({ type: ENTIDADE_ARCONTE });
      } catch {
        continue;
      }
      for (const a of lista) {
        try {
          pensar(a, agora);
        } catch (err) {
          console.warn(`[Zênite] Arconte: ${err}`);
        }
      }
    }
  }, PERIODO);
  world.afterEvents.entityDie.subscribe((ev) => {
    try {
      const morto = ev.deadEntity;
      if (morto.typeId === ENTIDADE_ARCONTE) morte(morto, ev.damageSource?.damagingEntity);
      else if (morto.typeId === 'minecraft:player' && ev.damageSource?.damagingEntity?.typeId === ENTIDADE_ARCONTE) falar(morto.dimension, morto.location, 'zenite.arconte.vitoria');
    } catch {
      /* ignora */
    }
  });
}
