// Estado de cada feiticeiro: Éter, maestria, técnica selecionada, recargas.
// Os campos duráveis ficam numa propriedade dinâmica (JSON) do jogador.
import { GameMode } from '@minecraft/server';
import { CHAVES, TECNICA_POR_ID } from './config.js';
import { clampEter, eterMax, nivelPorXp } from './progression.js';

/**
 * @typedef {object} Estado
 * @property {number} eter
 * @property {number} xp
 * @property {number} nivel
 * @property {string} selecionada
 * @property {boolean} abobada técnica suprema liberada
 * @property {Record<string, number>} recargas tick em que cada técnica volta
 * @property {boolean} veu
 * @property {boolean} canalizando
 * @property {number} ultimoLance
 * @property {number} ultimoXpLance
 * @property {number} ultimoUso
 * @property {boolean} conjunto armadura completa
 * @property {string | undefined} dentroAbobada id do dono da Abóbada onde o jogador está
 * @property {{raw: import('@minecraft/server').RawMessage, ate: number} | undefined} aviso
 * @property {boolean} sujo precisa salvar
 */

/** @type {Map<string, Estado>} */
const estados = new Map();

/** @param {import('@minecraft/server').Player} player @returns {Estado} */
export function obterEstado(player) {
  let e = estados.get(player.id);
  if (e) return e;
  /** @type {any} */
  let salvo = {};
  try {
    const s = player.getDynamicProperty(CHAVES.dados);
    if (typeof s === 'string') salvo = JSON.parse(s);
  } catch {
    salvo = {};
  }
  const xp = Number.isFinite(salvo.xp) ? Math.max(0, salvo.xp) : 0;
  const nivel = nivelPorXp(xp);
  e = {
    eter: clampEter(Number.isFinite(salvo.eter) ? salvo.eter : eterMax(nivel), eterMax(nivel)),
    xp,
    nivel,
    selecionada: TECNICA_POR_ID[salvo.selecionada] ? salvo.selecionada : 'poco',
    abobada: !!salvo.abobada,
    recargas: {},
    veu: false,
    canalizando: false,
    ultimoLance: -100,
    ultimoXpLance: -100,
    ultimoUso: -100,
    conjunto: false,
    dentroAbobada: undefined,
    aviso: undefined,
    sujo: false,
  };
  estados.set(player.id, e);
  return e;
}

/** @param {import('@minecraft/server').Player} player */
export function salvarEstado(player) {
  const e = estados.get(player.id);
  if (!e) return;
  try {
    player.setDynamicProperty(CHAVES.dados, JSON.stringify({ v: 1, eter: Math.round(e.eter * 10) / 10, xp: e.xp, selecionada: e.selecionada, abobada: e.abobada }));
    e.sujo = false;
  } catch {
    /* jogador saindo ou contexto restrito: salva na próxima */
  }
}

/** @param {string} id */
export function descartarEstado(id) {
  estados.delete(id);
}

/** @param {Estado} e */
export const maxEter = (e) => eterMax(e.nivel);

/** @param {import('@minecraft/server').Player} player */
export function ehCriativo(player) {
  try {
    return player.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
}
