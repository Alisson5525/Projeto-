import { MolangVariableMap, world } from '@minecraft/server';
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

export function sound(dim, id, loc, volume = 1, pitch = 1) {
  try {
    dim.playSound(id, loc, { volume, pitch });
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
