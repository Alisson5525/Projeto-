// Configurações do mundo (operadores) e preferências de cada jogador.
import { world, PlayerPermissionLevel } from '@minecraft/server';
import { CHAVES } from './config.js';

const PADRAO_MUNDO = Object.freeze({ destruicao: true, pvp: false, boasVindas: true });
const PADRAO_JOGADOR = Object.freeze({ camera: true, tremor: true, hud: true, glifos: true });

/** @type {{destruicao:boolean,pvp:boolean,boasVindas:boolean} | null} */
let cacheMundo = null;
/** @type {Map<string, {camera:boolean,tremor:boolean,hud:boolean,glifos:boolean}>} */
const cacheJogador = new Map();

function ler(dono, chave, padrao) {
  try {
    const v = dono.getDynamicProperty(chave);
    if (typeof v === 'string') return { ...padrao, ...JSON.parse(v) };
  } catch {
    /* propriedade corrompida: volta ao padrão */
  }
  return { ...padrao };
}

export function cfgMundo() {
  if (!cacheMundo) cacheMundo = ler(world, CHAVES.cfgMundo, PADRAO_MUNDO);
  return cacheMundo;
}

/** @param {Partial<{destruicao:boolean,pvp:boolean,boasVindas:boolean}>} cfg */
export function salvarCfgMundo(cfg) {
  cacheMundo = { ...PADRAO_MUNDO, ...cfgMundo(), ...cfg };
  world.setDynamicProperty(CHAVES.cfgMundo, JSON.stringify(cacheMundo));
}

/** @param {import('@minecraft/server').Player} player */
export function cfgJogador(player) {
  let c = cacheJogador.get(player.id);
  if (!c) {
    c = ler(player, CHAVES.cfgJogador, PADRAO_JOGADOR);
    cacheJogador.set(player.id, c);
  }
  return c;
}

/** @param {import('@minecraft/server').Player} player @param {Partial<{camera:boolean,tremor:boolean,hud:boolean,glifos:boolean}>} cfg */
export function salvarCfgJogador(player, cfg) {
  const c = { ...PADRAO_JOGADOR, ...cfgJogador(player), ...cfg };
  cacheJogador.set(player.id, c);
  player.setDynamicProperty(CHAVES.cfgJogador, JSON.stringify(c));
}

/** @param {string} id */
export function esquecerJogador(id) {
  cacheJogador.delete(id);
}

/** @param {import('@minecraft/server').Player} player */
export function ehOperador(player) {
  try {
    return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
  } catch {
    return false;
  }
}
