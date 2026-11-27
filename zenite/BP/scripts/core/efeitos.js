// Laço central de efeitos animados: cada efeito avança um passo por tick
// até devolver false; erros num efeito encerram só aquele efeito.
import { system } from '@minecraft/server';

/** @typedef {{ passo: (i: number) => boolean | void, fim?: () => void, dono?: string, i?: number }} Efeito */

/** @type {Set<Efeito>} */
const ativos = new Set();
let iniciado = false;

/** @param {Efeito} ef */
export function iniciarEfeito(ef) {
  ef.i = 0;
  ativos.add(ef);
  return ef;
}

/** @param {Efeito} ef */
export function encerrarEfeito(ef) {
  if (!ativos.delete(ef)) return;
  try {
    ef.fim?.();
  } catch (err) {
    console.warn(`[Zênite] fim de efeito: ${err}`);
  }
}

export function iniciarLoopEfeitos() {
  if (iniciado) return;
  iniciado = true;
  system.runInterval(() => {
    for (const ef of [...ativos]) {
      let continuar = false;
      try {
        continuar = ef.passo(ef.i++) !== false;
      } catch (err) {
        console.warn(`[Zênite] efeito: ${err}`);
      }
      if (!continuar) encerrarEfeito(ef);
    }
  }, 1);
}
