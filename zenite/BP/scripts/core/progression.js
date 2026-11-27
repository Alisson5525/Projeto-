// Regras de progressão: maestria, Éter e liberação de técnicas (puro).
import { LIMIARES_XP, NIVEL_MAX } from './config.js';

/** @param {number} xp @returns {number} nível 1..10 */
export function nivelPorXp(xp) {
  let nivel = 1;
  for (let i = 0; i < LIMIARES_XP.length; i++) if (xp >= LIMIARES_XP[i]) nivel = i + 1;
  return Math.min(nivel, NIVEL_MAX);
}

/** @param {number} xp */
export function progressoNivel(xp) {
  const nivel = nivelPorXp(xp);
  const base = LIMIARES_XP[nivel - 1];
  const proximo = nivel < NIVEL_MAX ? LIMIARES_XP[nivel] : null;
  const fracao = proximo === null ? 1 : (xp - base) / (proximo - base);
  return { nivel, base, proximo, fracao };
}

/** @param {number} nivel */
export const eterMax = (nivel) => 100 + 10 * (nivel - 1);

/** Éter por segundo. @param {number} nivel @param {boolean} conjunto armadura completa */
export const regenEter = (nivel, conjunto) => (2 + 0.2 * (nivel - 1)) * (conjunto ? 2 : 1);

/** @param {number} eter @param {number} max */
export function clampEter(eter, max) {
  if (!Number.isFinite(eter)) return 0;
  return Math.max(0, Math.min(max, eter));
}

/** @param {number} vidaMax */
export const xpPorAbate = (vidaMax) => Math.round(5 + vidaMax / 2);

/**
 * @param {{nivel:number, requer?:string}} tec
 * @param {{nivel:number, abobada:boolean, criativo:boolean}} ctx
 */
export function tecnicaLiberada(tec, ctx) {
  if (ctx.criativo) return true;
  if (tec.requer === 'abobada') return !!ctx.abobada;
  return ctx.nivel >= tec.nivel;
}

/** @param {{custo:number|string}} tec @param {number} max */
export const custoDe = (tec, max) => (tec.custo === 'cheio' ? max : /** @type {number} */ (tec.custo));
