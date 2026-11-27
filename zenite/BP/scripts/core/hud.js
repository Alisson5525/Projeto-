// Monta o texto da barra de ação (puro: estado → RawMessage).
import { GLIFO, TECNICA_POR_ID } from './config.js';

/**
 * Barra de Éter. Com glifos: tampa + 10 segmentos (quartos) + tampa.
 * Em texto: 20 traços coloridos.
 * @param {number} eter @param {number} max @param {boolean} glifos
 */
export function barraEter(eter, max, glifos) {
  const fr = max > 0 ? Math.max(0, Math.min(1, eter / max)) : 0;
  if (!glifos) {
    const cheios = Math.round(fr * 20);
    return `§b${'|'.repeat(cheios)}§8${'|'.repeat(20 - cheios)}`;
  }
  const quartos = [GLIFO.vazio, GLIFO.q1, GLIFO.q2, GLIFO.q3, GLIFO.cheio];
  let s = GLIFO.tampaEsq;
  const seg = max / 10;
  for (let i = 0; i < 10; i++) {
    const f = Math.max(0, Math.min(1, (eter - i * seg) / seg));
    s += quartos[Math.round(f * 4)];
  }
  return s + GLIFO.tampaDir;
}

/**
 * @typedef {object} EstadoHud
 * @property {number} eter
 * @property {number} max
 * @property {string} tecnica id da técnica selecionada
 * @property {number} prontaEm ticks até poder lançar de novo (0 = pronta)
 * @property {boolean} [veu]
 * @property {boolean} [dentroAbobada]
 * @property {boolean} [canalizando]
 * @property {boolean} [glifos]
 * @property {boolean} [infinito] criativo: Éter infinito
 */

/** @param {EstadoHud} e @returns {import('@minecraft/server').RawMessage} */
export function montarHud(e) {
  /** @type {import('@minecraft/server').RawMessage[]} */
  const r = [];
  const sep = { text: '  §8|  ' };
  if (e.infinito) {
    r.push({ text: e.glifos ? `§f${GLIFO.eter} §e` : '§e✦ ' }, { translate: 'zenite.hud.eter' }, { text: ' ' }, { translate: 'zenite.hud.infinito' });
  } else {
    r.push(
      { text: e.glifos ? `§f${GLIFO.eter} ` : '§b✦ ' },
      { translate: 'zenite.hud.eter' },
      { text: ` ${e.glifos ? '§f' : ''}${barraEter(e.eter, e.max, !!e.glifos)} §f${Math.floor(e.eter)}§7/${e.max}` },
    );
  }
  const tec = TECNICA_POR_ID[e.tecnica];
  if (tec) {
    r.push(sep, { text: `${e.glifos ? `§f${tec.glifo} ` : ''}${tec.corTexto}` }, { translate: `zenite.tec.${tec.id}.nome` });
    if (e.prontaEm > 0) r.push({ text: ` §c${(e.prontaEm / 20).toFixed(1)}s` });
    else r.push({ text: ' §a' }, { translate: 'zenite.hud.pronta' });
  }
  if (e.veu) r.push(sep, { text: e.glifos ? `§f${GLIFO.veu} §b` : '§b' }, { translate: 'zenite.hud.veu' });
  if (e.dentroAbobada) r.push(sep, { text: e.glifos ? `§f${GLIFO.abobada} §5` : '§5' }, { translate: 'zenite.hud.abobada' });
  if (e.canalizando) r.push(sep, { text: '§d' }, { translate: 'zenite.hud.canalizando' });
  return { rawtext: r };
}
