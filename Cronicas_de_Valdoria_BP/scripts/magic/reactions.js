// Reações elementais: cada escola deixa uma marca no alvo, e certas combinações reagem com efeitos próprios.
// Valem para feitiços, armas com runa/elemento, flechas elementais e criaturas que usam elementos.
//   Gelo acumula FRIO (3 cargas = Congelado, preso por 1,5 s)
//   Fogo em alvo com Frio      -> CHOQUE TÉRMICO: consome o frio, +40% do golpe como dano de fogo e vapor
//   Raio em alvo com Frio      -> ESTILHAÇAR: consome o frio, +60% do golpe como dano físico em estilhaços
//   Raio em alvo na água/chuva -> CONDUÇÃO: a descarga salta para até 2 inimigos próximos (30%)
//   Vento em alvo em chamas    -> LABAREDA: o fogo se espalha para inimigos a 3 blocos
//   Sombrio acumula CORRUPÇÃO; Sagrado em alvo corrompido -> PURIFICAÇÃO: +25% por carga e cura quem purificou
//   Sangue em alvo sangrando   -> HEMORRAGIA: +25% do golpe
//   Arcano deixa o alvo INSTÁVEL; o próximo golpe de outra escola -> RESSONÂNCIA: explosão arcana em área (30%)
//   Natural em alvo envenenado/corrompido -> PODRIDÃO: veneno mais forte e lentidão
import { world, system } from "@minecraft/server";
import { V, ok, tick, effect, isPlayer } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { onElementHit, dealDamage, enemiesNear, debuff } from "../core/damage.js";
import { root } from "../abilities/engine.js";

const marks = new Map(); // alvo -> {frio, frioAte, corr, corrAte, inst, instAte, instEl}
const REACT = "reacao";

export const REACOES = [
  ["§bFrio §7(Gelo)", "acumula; 3 cargas congelam o alvo por 1,5 s"],
  ["§6Choque Térmico §7(Fogo em alvo com Frio)", "+40% do golpe como fogo"],
  ["§eEstilhaçar §7(Raio em alvo com Frio)", "+60% do golpe em estilhaços"],
  ["§eCondução §7(Raio em alvo na água ou na chuva)", "salta para 2 inimigos próximos"],
  ["§fLabareda §7(Vento em alvo em chamas)", "o fogo se espalha num raio de 3 blocos"],
  ["§6Purificação §7(Sagrado em alvo com Corrupção)", "+25% por carga e cura você"],
  ["§4Hemorragia §7(Sangue em alvo sangrando)", "+25% do golpe"],
  ["§dRessonância §7(outra escola em alvo Instável pelo Arcano)", "explosão arcana em área"],
  ["§aPodridão §7(Natural em alvo envenenado ou corrompido)", "veneno mais forte e lentidão"],
];

function m(target) {
  let s = marks.get(target.id);
  if (!s) marks.set(target.id, (s = { frio: 0, frioAte: 0, corr: 0, corrAte: 0, inst: false, instAte: 0, instEl: "" }));
  return s;
}
function say(src, txt) {
  if (isPlayer(src)) try { src.onScreenDisplay.setActionBar(txt); } catch { /* */ }
}
function extra(src, target, amount, el) {
  if (amount > 0.05 && ok(target)) dealDamage(src, target, amount, el, { kind: REACT });
}
function wet(target) {
  try {
    if (target.isInWater) return true;
    const w = String(target.dimension.getWeather?.() || "");
    return /rain|thunder/i.test(w);
  } catch {
    return false;
  }
}
function burning(target) {
  try { return !!target.getComponent("minecraft:onfire"); } catch { return false; }
}
function poisoned(target) {
  try { return !!target.getEffect("poison") || !!target.getEffect("wither"); } catch { return false; }
}

function onHit(src, target, dmg, el, kind) {
  if (kind === REACT || kind === "dot" || !ok(target) || dmg <= 0) return;
  const now = tick();
  const s = m(target);
  if (s.frioAte < now) s.frio = 0;
  if (s.corrAte < now) s.corr = 0;
  if (s.instAte < now) s.inst = false;
  const dim = target.dimension;
  const at = V.up(target.location, 1);

  // Ressonância: golpe de outra escola em alvo instável
  if (s.inst && el !== "arcane" && el !== "physical") {
    s.inst = false;
    particle(dim, "arcano_explosao", at, { radius: 2 });
    sound(dim, "mob.shulker.shoot", at, 0.6, 1);
    for (const e of enemiesNear(src, target.location, 2.5, true)) extra(src, e, dmg * 0.3, "arcane");
    say(src, "§dRessonância!");
  }

  if (el === "ice") {
    s.frio = Math.min(3, s.frio + 1);
    s.frioAte = now + 120;
    if (s.frio >= 3) {
      s.frio = 0;
      root(target, 30);
      particle(dim, "gelo_prisao", target.location, {});
      sound(dim, "random.glass", target.location, 0.7, 1);
      say(src, "§bCongelado!");
    }
  } else if (el === "fire") {
    if (s.frio > 0) {
      extra(src, target, dmg * 0.4, "fire");
      s.frio = 0;
      particle(dim, "fumaca", at, {});
      sound(dim, "random.fizz", at, 0.8, 1);
      say(src, "§6Choque Térmico!");
    }
  } else if (el === "lightning") {
    if (s.frio > 0) {
      extra(src, target, dmg * 0.6, "physical");
      s.frio = 0;
      particle(dim, "gelo_explosao", at, { radius: 1.2 });
      sound(dim, "random.glass", at, 1.3, 1);
      say(src, "§eEstilhaçar!");
    } else if (wet(target)) {
      let n = 0;
      for (const e of enemiesNear(src, target.location, 6, true)) {
        if (e.id === target.id || n >= 2) continue;
        n++;
        particle(dim, "raio_rastro", V.up(e.location, 1), {});
        extra(src, e, dmg * 0.3, "lightning");
      }
      if (n) say(src, "§eCondução!");
    }
  } else if (el === "wind") {
    if (burning(target)) {
      for (const e of enemiesNear(src, target.location, 3, true)) if (e.id !== target.id) try { e.setOnFire(4, true); } catch { /* */ }
      particle(dim, "fogo_explosao", at, { radius: 1.5 });
      say(src, "§fLabareda!");
    }
  } else if (el === "dark") {
    s.corr = Math.min(4, s.corr + 1);
    s.corrAte = now + 200;
  } else if (el === "holy") {
    if (s.corr > 0) {
      extra(src, target, dmg * 0.25 * s.corr, "holy");
      if (ok(src)) try {
        const h = src.getComponent("minecraft:health");
        if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + s.corr));
      } catch { /* */ }
      particle(dim, "sagrado_explosao", at, { radius: 1 });
      say(src, `§6Purificação ×${s.corr}!`);
      s.corr = 0;
    }
  } else if (el === "blood") {
    const d = debuff(target);
    if (d.bleed && d.bleed.until > now) {
      extra(src, target, dmg * 0.25, "blood");
      say(src, "§4Hemorragia!");
    }
  } else if (el === "nature") {
    if (poisoned(target) || s.corr > 0) {
      effect(target, "poison", 80, 1, true);
      effect(target, "slowness", 60, 1, true);
      particle(dim, "esporos", at, { radius: 1 });
      say(src, "§aPodridão!");
    }
  } else if (el === "arcane") {
    s.inst = true;
    s.instAte = now + 100;
    particle(dim, "arcano_rastro", at, {});
  }
}

export function startReactions() {
  onElementHit(onHit);
  world.afterEvents.entityDie.subscribe((ev) => marks.delete(ev.deadEntity.id));
  system.runInterval(() => {
    const now = tick();
    for (const [id, s] of marks) if (s.frioAte < now && s.corrAte < now && s.instAte < now) marks.delete(id);
  }, 200);
}
