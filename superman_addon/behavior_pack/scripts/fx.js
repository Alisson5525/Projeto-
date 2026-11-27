import { MolangVariableMap, system, world } from '@minecraft/server';
import { getSettings } from './config.js';

/** Particula com variaveis Molang opcionais: {dir:{x,y,z}, len:number, color:{r,g,b}, ...} */
export function particle(dim, id, loc, vars) {
  try {
    let m;
    if (vars) {
      m = new MolangVariableMap();
      for (const [k, v] of Object.entries(vars)) {
        if (typeof v === 'number') m.setFloat(`variable.${k}`, v);
        else if (v && 'r' in v) m.setColorRGB(`variable.${k}`, { red: v.r, green: v.g, blue: v.b });
        else if (v && 'x' in v) m.setVector3(`variable.${k}`, v);
      }
    }
    dim.spawnParticle(id, loc, m);
  } catch (e) {
    // fora da area carregada
  }
}

/** Quantidade de particulas conforme a qualidade escolhida nas configuracoes. */
export function q(n) {
  const p = getSettings().particles;
  return Math.max(1, Math.round(n * (p === 1 ? 0.4 : p === 3 ? 1.6 : 1)));
}

/** Som no mundo com leve variacao de tom (evita repeticao mecanica). */
export function sound(dim, id, loc, volume = 1, pitch = 1, jitter = 0.07) {
  try {
    const p = Math.max(0.1, pitch * (1 + (Math.random() * 2 - 1) * jitter));
    dim.playSound(id, loc, { volume, pitch: p });
  } catch (e) { /* ignore */ }
}

export function shake(player, intensity, seconds) {
  if (!getSettings().shake) return;
  try {
    player.runCommand(`camerashake add @s ${Math.min(4, intensity).toFixed(2)} ${seconds.toFixed(2)} positional`);
  } catch (e) { /* ignore */ }
}

/** Treme a camera de todos os jogadores perto de um ponto (intensidade cai com a distancia). */
export function shakeArea(dim, loc, radius, intensity, seconds) {
  if (!getSettings().shake) return;
  for (const p of world.getAllPlayers()) {
    if (p.dimension.id !== dim.id) continue;
    const d = Math.hypot(p.location.x - loc.x, p.location.y - loc.y, p.location.z - loc.z);
    if (d > radius) continue;
    shake(p, intensity * (1 - d / radius) + 0.05, seconds);
  }
}

export function actionbar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch (e) { /* ignore */ }
}

export function flash(player, r, g, b, inT = 0.05, hold = 0.05, out = 0.45) {
  try {
    player.camera.fade({
      fadeColor: { red: r, green: g, blue: b },
      fadeTime: { fadeInTime: inT, holdTime: hold, fadeOutTime: out },
    });
  } catch (e) { /* ignore */ }
}

/** Executa um efeito daqui a `ticks` ticks (sequencias de ondas, ecos de explosao). */
export function later(ticks, fn) {
  try {
    system.runTimeout(() => {
      try { fn(); } catch (e) { /* entidade/dimensao invalida */ }
    }, Math.max(1, Math.round(ticks)));
  } catch (e) { /* */ }
}

/** Varias ondas de choque saindo uma depois da outra. */
export function ringBurst(dim, loc, radii, color, gap = 3, id = 'superman:shockwave') {
  radii.forEach((r, i) => {
    const run = () => particle(dim, id, loc, { radius: r, color });
    if (i === 0) run();
    else later(i * gap, run);
  });
}

/** Clarao branco na tela de todos os jogadores perto de um ponto. */
export function flashArea(dim, loc, radius, strength = 1) {
  for (const p of world.getAllPlayers()) {
    try {
      if (p.dimension.id !== dim.id) continue;
      const d = Math.hypot(p.location.x - loc.x, p.location.y - loc.y, p.location.z - loc.z);
      if (d > radius) continue;
      const k = strength * (1 - d / radius);
      if (k < 0.15) continue;
      p.camera.fade({ fadeColor: { red: 1, green: 0.95, blue: 0.8 }, fadeTime: { fadeInTime: 0.03, holdTime: 0.03 * k, fadeOutTime: 0.3 + 0.4 * k } });
    } catch (e) { /* */ }
  }
}
