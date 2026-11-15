// Efeitos visuais e sonoros coordenados. Todas as chamadas são protegidas para não interromper a lógica.
import { MolangVariableMap } from "@minecraft/server";
import { NS, V } from "./util.js";

export const COLORS = {
  fire: { red: 1, green: 0.45, blue: 0.1 },
  ice: { red: 0.6, green: 0.9, blue: 1 },
  lightning: { red: 1, green: 0.95, blue: 0.45 },
  arcane: { red: 0.72, green: 0.42, blue: 1 },
  holy: { red: 1, green: 0.93, blue: 0.6 },
  dark: { red: 0.45, green: 0.18, blue: 0.65 },
  nature: { red: 0.45, green: 0.95, blue: 0.35 },
  wind: { red: 0.85, green: 1, blue: 0.95 },
  blood: { red: 0.9, green: 0.1, blue: 0.15 },
  summon: { red: 0.45, green: 1, blue: 0.85 },
  earth: { red: 0.75, green: 0.6, blue: 0.4 },
  physical: { red: 0.95, green: 0.95, blue: 0.95 },
  gold: { red: 1, green: 0.8, blue: 0.25 },
  red: { red: 1, green: 0.2, blue: 0.15 },
};

/** Partículas temáticas por escola: [rastro, explosão, zona] */
export const SCHOOL_FX = {
  fire: ["fogo_rastro", "fogo_explosao", "fogo_zona"],
  ice: ["gelo_rastro", "gelo_explosao", "gelo_zona"],
  lightning: ["raio_rastro", "raio_explosao", "raio_explosao"],
  arcane: ["arcano_rastro", "arcano_explosao", "cor_circulo_magico"],
  holy: ["sagrado_rastro", "sagrado_explosao", "sagrado_explosao"],
  dark: ["sombra_rastro", "sombra_explosao", "sombra_zona"],
  nature: ["natureza_rastro", "natureza_explosao", "natureza_espinhos"],
  wind: ["vento_rastro", "vento_explosao", "vento_tornado"],
  blood: ["sangue_rastro", "sangue_explosao", "sangue_explosao"],
  summon: ["arcano_rastro", "invocacao", "invocacao"],
  earth: ["poeira", "detritos", "poeira"],
  physical: ["cor_rastro", "critico", "poeira"],
};

export function particle(dim, name, loc, opts = {}) {
  try {
    const vars = new MolangVariableMap();
    const c = opts.color ? (typeof opts.color === "string" ? COLORS[opts.color] : opts.color) : COLORS.physical;
    vars.setColorRGB("variable.color", c);
    vars.setFloat("variable.radius", opts.radius ?? 1);
    dim.spawnParticle(name.includes(":") ? name : `${NS}:${name}`, loc, vars);
  } catch {
    /* fora da área carregada */
  }
}

export function line(dim, from, to, name = "cor_ponto", opts = {}, step = 0.5) {
  const d = V.dist(from, to);
  const n = Math.min(80, Math.max(1, Math.floor(d / step)));
  for (let i = 0; i <= n; i++) particle(dim, name, V.lerp(from, to, i / n), opts);
}

export function ring(dim, center, radius, color, name = "cor_anel") {
  particle(dim, name, center, { color, radius });
}

export function sound(dim, id, loc, pitch = 1, volume = 1) {
  try {
    dim.playSound(id, loc, { pitch, volume });
  } catch {
    /* som inexistente ou área descarregada */
  }
}

export function psound(player, id, pitch = 1, volume = 1) {
  try {
    player.playSound(id, { pitch, volume });
  } catch {
    /* jogador saiu */
  }
}

export function anim(entity, name, blendOut = 0.15, stop) {
  try {
    const opts = { blendOutTime: blendOut };
    if (stop) opts.stopExpression = stop;
    entity.playAnimation(name, opts);
  } catch {
    /* animação ausente */
  }
}

export function shake(player, intensity = 0.3, seconds = 0.5) {
  try {
    player.runCommand(`camerashake add @s ${intensity} ${seconds} positional`);
  } catch {
    /* comando indisponível */
  }
}

export const SCHOOL_SOUND = {
  fire: ["mob.blaze.shoot", "random.explode"],
  ice: ["random.glass", "random.glass"],
  lightning: ["item.trident.thunder", "ambient.weather.lightning.impact"],
  arcane: ["mob.evocation_illager.cast_spell", "mob.shulker.shoot"],
  holy: ["beacon.activate", "random.orb"],
  dark: ["mob.wither.shoot", "mob.vex.charge"],
  nature: ["block.beehive.work", "random.break"],
  wind: ["mob.breeze.shoot", "mob.phantom.swoop"],
  blood: ["mob.zombie.unfect", "mob.evocation_fangs.attack"],
  summon: ["mob.evocation_illager.prepare_attack", "mob.evocation_illager.cast_spell"],
  earth: ["mob.irongolem.throw", "mace.heavy_smash_ground"],
  physical: ["game.player.attack.strong", "game.player.attack.critical"],
};
