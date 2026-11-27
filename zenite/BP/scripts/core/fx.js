// Efeitos: partículas coloridas, formas de partículas, sons, títulos, câmera.
import { MolangVariableMap } from '@minecraft/server';
import { COR } from './config.js';
import { cfgJogador } from './configuracoes.js';
import * as V from './vec.js';

/**
 * Uma partícula do Zênite com cor (RGB 0..1) e tamanho em blocos.
 * @param {import('@minecraft/server').Dimension} dim
 * @param {string} id
 * @param {V.V3} pos
 * @param {{red:number,green:number,blue:number}} [cor]
 * @param {number} [tamanho]
 * @param {number} [alfa]
 */
export function particula(dim, id, pos, cor = COR.branco, tamanho = 1, alfa = 1) {
  try {
    const m = new MolangVariableMap();
    m.setColorRGBA('variable.cor', { red: cor.red, green: cor.green, blue: cor.blue, alpha: alfa });
    m.setFloat('variable.tamanho', tamanho);
    dim.spawnParticle(id, pos, m);
  } catch {
    /* fora do mundo ou chunk descarregado */
  }
}

/** Anel horizontal de partículas. */
export function anel(dim, centro, raio, n, id, cor, tamanho, fase = 0) {
  for (let i = 0; i < n; i++) {
    const a = fase + (i / n) * Math.PI * 2;
    particula(dim, id, { x: centro.x + Math.cos(a) * raio, y: centro.y, z: centro.z + Math.sin(a) * raio }, cor, tamanho);
  }
}

/** Linha de partículas de a até b, uma a cada `passo` blocos. */
export function linha(dim, a, b, passo, id, cor, tamanho) {
  const d = V.dist(a, b);
  const n = Math.max(1, Math.floor(d / passo));
  for (let i = 0; i <= n; i++) particula(dim, id, V.lerp(a, b, i / n), cor, tamanho);
}

/** Pontos bem distribuídos numa esfera (espiral de Fibonacci). */
export function esfera(dim, centro, raio, n, id, cor, tamanho, giro = 0) {
  const ouro = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = giro + i * ouro;
    particula(dim, id, { x: centro.x + Math.cos(a) * r * raio, y: centro.y + y * raio, z: centro.z + Math.sin(a) * r * raio }, cor, tamanho);
  }
}

/** Som no mundo (todos ouvem por perto). */
export function som(dim, id, pos, volume = 1, pitch = 1) {
  try {
    dim.playSound(id, pos, { volume, pitch });
  } catch {
    /* ignora */
  }
}

/** Som só para um jogador. */
export function somJogador(player, id, volume = 1, pitch = 1) {
  try {
    player.playSound(id, { volume, pitch });
  } catch {
    /* ignora */
  }
}

/** Tremor de câmera (respeita a preferência do jogador). */
export function tremor(player, intensidade, segundos) {
  try {
    if (!cfgJogador(player).tremor) return;
    player.runCommand(`camerashake add @s ${intensidade.toFixed(2)} ${segundos.toFixed(2)} positional`);
  } catch {
    /* ignora */
  }
}

/** Tremor para todos os jogadores num raio. */
export function tremorArea(dim, centro, raio, intensidade, segundos) {
  try {
    for (const p of dim.getPlayers({ location: centro, maxDistance: raio })) tremor(p, intensidade, segundos);
  } catch {
    /* ignora */
  }
}

/** Clarão de tela com cor (RGB 0..1). Tempos em segundos. */
export function flash(player, cor, entrada = 0.08, segura = 0.05, saida = 0.5) {
  try {
    player.camera.fade({ fadeColor: cor, fadeTime: { fadeInTime: entrada, holdTime: segura, fadeOutTime: saida } });
  } catch {
    /* ignora */
  }
}

/** Título + subtítulo. Tempos em ticks. */
export function titulo(player, t, sub, entrada = 5, fica = 40, saida = 15) {
  try {
    player.onScreenDisplay.setTitle(t, { subtitle: sub, fadeInDuration: entrada, stayDuration: fica, fadeOutDuration: saida });
  } catch {
    /* ignora */
  }
}
