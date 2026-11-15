// Registro e fluxo de conjuração de habilidades (raciais, de classe, de arma e feitiços).
import { system } from "@minecraft/server";
import { V, ok, tick, isPlayer, effect, hpPct, health, NS, say } from "../core/util.js";
import { particle, sound, psound, anim, COLORS, SCHOOL_SOUND } from "../core/fx.js";
import { stats, spendEnergy, hasEnergy } from "../rpg/stats.js";
import { getData, markDirty } from "../core/store.js";

/**
 * @typedef {object} Ability
 * @property {string} nome
 * @property {string} desc
 * @property {string} tipo raca|classe|arma|magia|combo|ataque
 * @property {string} [element]
 * @property {number} cost energia
 * @property {number} [hpCost] fração da vida máxima (magia de sangue)
 * @property {number} cd segundos
 * @property {number} [prep] ticks de preparação
 * @property {string} [scale] spell|melee|heal|none
 * @property {string} [anim] animação de lançamento
 * @property {number} [nivel] nível requerido (magias)
 * @property {number} [alcance] alcance em blocos (informativo)
 * @property {string[]} [combo] escolas combinadas
 * @property {(ctx: any) => void} fn
 */

/** @type {Record<string, Ability>} */
export const ABILITIES = {};
const cooldowns = new Map(); // jogador -> Map(id -> tick pronto)
const casting = new Map(); // jogador -> tick final da preparação

export function register(id, def) {
  ABILITIES[id] = def;
}

export function cooldownLeft(player, id) {
  const t = cooldowns.get(player.id)?.get(id);
  return t ? Math.max(0, t - tick()) : 0;
}

export function setCooldown(player, id, seconds) {
  if (getData(player).cfg.semRecarga) seconds = 0;
  let m = cooldowns.get(player.id);
  if (!m) cooldowns.set(player.id, (m = new Map()));
  m.set(id, tick() + Math.round(seconds * 20));
}

export function isCasting(player) {
  const t = casting.get(player.id);
  return t !== undefined && t > tick();
}

const ANIM = {
  proj: "animation.valdoria.player.conjurar_lancar",
  area: "animation.valdoria.player.conjurar_area",
  self: "animation.valdoria.player.conjurar_proprio",
  prep: "animation.valdoria.player.conjurar_preparo",
  roar: "animation.valdoria.player.rugido",
  slash: "animation.valdoria.player.ataque_varredura",
  slam: "animation.valdoria.player.ataque_impacto",
  thrust: "animation.valdoria.player.ataque_estocada",
  spin: "animation.valdoria.player.ataque_giro",
  over: "animation.valdoria.player.ataque_vertical",
};
export { ANIM };

/** Monta o contexto de poder para a habilidade. */
export function makeCtx(src, ab, extra = {}) {
  const el = ab.element || "physical";
  if (isPlayer(src)) {
    const s = stats(src);
    const d = getData(src);
    const base = ab.scale === "melee" ? s.melee * (1 + s.upgrade * 0.06) : ab.scale === "none" ? 1 : ab.scale === "heal" ? s.heal : s.spell;
    const lvl = 1 + d.nivel * 0.012;
    return Object.assign({
      src, dim: src.dimension, s, d, element: el, level: d.nivel,
      power: base * (s.elem[el] || 1) * lvl,
      heal: s.heal * lvl,
      summon: (s.elem.summon || 1),
      dmg(x) { return x * this.power; },
    }, extra);
  }
  const p = extra.power ?? 1;
  return Object.assign({ src, dim: src.dimension, s: undefined, d: undefined, element: el, level: 1, power: p, heal: p,
    summon: 1, dmg(x) { return x * this.power; } }, extra);
}

/** Usa uma habilidade como jogador, respeitando requisitos, custo, recarga e preparação. */
export function useAbility(player, id, opts = {}) {
  const ab = ABILITIES[id];
  if (!ab) return false;
  const left = cooldownLeft(player, id);
  if (left > 0) {
    player.onScreenDisplay.setActionBar(`§c${ab.nome}: recarga ${(left / 20).toFixed(1)}s`);
    psound(player, "note.bass", 0.7, 0.5);
    return false;
  }
  if (isCasting(player)) return false;
  const s = stats(player);
  if ((ab.tipo === "magia" || ab.tipo === "combo") && s.noSpells) {
    player.onScreenDisplay.setActionBar("§cVocê não pode conjurar feitiços nesta forma.");
    return false;
  }
  const cost = Math.round(ab.cost * (ab.tipo === "magia" || ab.tipo === "combo" ? s.spellCost : 1) * (opts.costMult ?? 1));
  const d = getData(player);
  if (ab.hpCost) {
    const h = health(player);
    if (!h || h.currentValue <= h.effectiveMax * ab.hpCost + 1) {
      player.onScreenDisplay.setActionBar("§cVida insuficiente para esta magia de sangue.");
      return false;
    }
    h.setCurrentValue(h.currentValue - h.effectiveMax * ab.hpCost);
    particle(player.dimension, "sangue_explosao", V.up(player.location, 1), { radius: 0.4 });
  } else if (!hasEnergy(player, cost)) {
    player.onScreenDisplay.setActionBar(`§9Energia insuficiente (${Math.floor(d.energia)}/${cost})`);
    psound(player, "note.bass", 0.5, 0.5);
    return false;
  } else {
    spendEnergy(player, cost);
  }
  markDirty(player);
  setCooldown(player, id, ab.cd * (1 - s.cdr));
  const prep = Math.round((ab.prep ?? 0) * (ab.tipo === "magia" || ab.tipo === "combo" ? s.castSpeed : 1));
  const el = ab.element || "physical";
  const color = COLORS[el] || COLORS.arcane;
  const fire = () => {
    if (!ok(player)) return;
    casting.delete(player.id);
    anim(player, ANIM[ab.anim || "proj"] || ab.anim);
    const snd = SCHOOL_SOUND[el];
    if (snd) sound(player.dimension, snd[0], player.location, 0.9 + Math.random() * 0.2, 0.9);
    try {
      ab.fn(makeCtx(player, ab, opts.ctx));
    } catch (e) {
      console.warn(`[Valdoria] habilidade ${id}: ${e}`);
    }
  };
  if (prep > 0) {
    casting.set(player.id, tick() + prep);
    anim(player, ANIM.prep, 0.1);
    effect(player, "slowness", prep, 1);
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(player)) return system.clearRun(run);
      if (n % 3 === 0) particle(player.dimension, "cor_circulo_magico", V.up(player.location, 0.05), { color, radius: 1.1 });
      particle(player.dimension, "cor_carga", V.add(V.up(player.location, 1.3), V.mul(player.getViewDirection(), 0.7)), { color });
      if (++n >= prep) {
        system.clearRun(run);
        fire();
      }
    }, 1);
    psound(player, "mob.evocation_illager.prepare_attack", 1.4, 0.4);
  } else fire();
  return true;
}

/** Usado por criaturas: sem custo/recarga do jogador. */
export function castAs(entity, id, power = 1, extra = {}) {
  const ab = ABILITIES[id];
  if (!ab || !ok(entity)) return;
  try {
    ab.fn(makeCtx(entity, ab, Object.assign({ power }, extra)));
  } catch (e) {
    console.warn(`[Valdoria] criatura usando ${id}: ${e}`);
  }
}

export function abilityLine(player, id) {
  const ab = ABILITIES[id];
  if (!ab) return "";
  const cd = cooldownLeft(player, id);
  return cd > 0 ? `§7${ab.nome} §c${(cd / 20).toFixed(0)}s` : `§f${ab.nome} §aOK`;
}

export { say, hpPct };
