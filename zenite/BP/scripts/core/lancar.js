// Registro das técnicas e o funil único de lançamento:
// debounce → liberação → recarga → custo → lançar → gastar Éter → recarga.
import { system } from '@minecraft/server';
import { SONS, TECNICA_POR_ID } from './config.js';
import { ehCriativo, maxEter, obterEstado } from './estado.js';
import { somJogador } from './fx.js';
import { custoDe, tecnicaLiberada } from './progression.js';
import { tr } from './texto.js';

/**
 * @typedef {object} ContextoLance
 * @property {import('./estado.js').Estado} estado
 * @property {(typeof import('./config.js').TECNICAS)[number]} tec
 * @property {number} tick
 * @property {boolean} criativo
 * @property {string} origem
 */
/** @typedef {{ lancar: (player: import('@minecraft/server').Player, ctx: ContextoLance) => boolean | void }} DefTecnica */

/** @type {Map<string, DefTecnica>} */
const implementacoes = new Map();
/** @type {((player: import('@minecraft/server').Player, id: string) => void)[]} */
const ouvintes = [];

/** @param {string} id @param {DefTecnica} def */
export function registrarTecnica(id, def) {
  implementacoes.set(id, def);
}

/** Chamado depois de cada lançamento bem-sucedido. */
export function aoLancar(cb) {
  ouvintes.push(cb);
}

/**
 * Mensagem curta na barra de ação que o HUD respeita por alguns ticks.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').RawMessage[]} partes
 */
export function avisar(player, partes, ticks = 30) {
  const e = obterEstado(player);
  e.aviso = { raw: { rawtext: partes }, ate: system.currentTick + ticks };
  try {
    player.onScreenDisplay.setActionBar(e.aviso.raw);
  } catch {
    /* ignora */
  }
}

function negar(player, partes) {
  somJogador(player, SONS.negado, 0.8);
  avisar(player, partes);
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {string} id
 * @param {string} origem
 * @returns {boolean} se a técnica foi lançada
 */
export function tentarLancar(player, id, origem) {
  const tec = TECNICA_POR_ID[id];
  const def = implementacoes.get(id);
  if (!tec || !def) return false;
  const e = obterEstado(player);
  const agora = system.currentTick;
  if (agora - e.ultimoLance < 4 || e.canalizando) return false;
  const criativo = ehCriativo(player);
  if (!tecnicaLiberada(tec, { nivel: e.nivel, abobada: e.abobada, criativo })) {
    e.ultimoLance = agora;
    negar(player, tec.requer === 'abobada' ? [tr('zenite.msg.requer_coracao')] : [tr('zenite.msg.requer_nivel'), { text: ` §f${tec.nivel}` }]);
    return false;
  }
  const desligando = !!tec.alternavel && e.veu;
  const pronta = e.recargas[id] ?? 0;
  if (!desligando && pronta > agora) {
    e.ultimoLance = agora;
    negar(player, [tr('zenite.msg.recarga'), { text: ` §c${((pronta - agora) / 20).toFixed(1)}s` }]);
    return false;
  }
  const max = maxEter(e);
  const gratis = criativo || e.dentroAbobada === player.id;
  if (tec.custo === 'cheio' && !gratis && e.eter < max - 0.01) {
    e.ultimoLance = agora;
    negar(player, [tr('zenite.msg.requer_cheio')]);
    return false;
  }
  const custo = desligando || gratis ? 0 : custoDe(tec, max);
  if (e.eter + 1e-9 < custo) {
    e.ultimoLance = agora;
    negar(player, [tr('zenite.msg.sem_eter')]);
    return false;
  }
  let ok = false;
  try {
    ok = def.lancar(player, { estado: e, tec, tick: agora, criativo, origem }) !== false;
  } catch (err) {
    console.warn(`[Zênite] erro ao lançar ${id}: ${err}`);
  }
  e.ultimoLance = agora;
  if (!ok) return false;
  e.eter = Math.max(0, e.eter - custo);
  if (!desligando) e.recargas[id] = agora + Math.round(tec.recarga * (e.dentroAbobada === player.id ? 0.5 : 1));
  e.sujo = true;
  for (const cb of ouvintes) {
    try {
      cb(player, id);
    } catch {
      /* ignora */
    }
  }
  return true;
}
