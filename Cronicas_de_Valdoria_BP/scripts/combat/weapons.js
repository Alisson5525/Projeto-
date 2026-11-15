// Combate com armas: ataque carregado por tipo, habilidade das armas especiais, efeitos ao acertar, esquiva e defesa.
import { world, system, InputButton, ButtonState } from "@minecraft/server";
import { V, ok, tick, effect, chance, heldItem, isPlayer, rand, NS, heal } from "../core/util.js";
import { particle, sound, anim, psound, shake } from "../core/fx.js";
import { dealDamage, enemiesNear, onMeleeHit, addBleed, addVulnerable, grantIframes } from "../core/damage.js";
import { stats, itemData, hasBuff, removeBuff, spendEnergy, hasEnergy } from "../rpg/stats.js";
import { getData, markDirty } from "../core/store.js";
import { register, useAbility, ANIM, cooldownLeft, setCooldown } from "../abilities/registry.js";
import { launch, zone, areaDamage, aim, ground, knockFrom, stun, dash, chain } from "../abilities/engine.js";

export const RUNE_ELEMENT = {
  [`${NS}:runa_fogo`]: "fire", [`${NS}:runa_gelo`]: "ice", [`${NS}:runa_trovao`]: "lightning",
  [`${NS}:runa_luz`]: "holy", [`${NS}:runa_sombra`]: "dark",
};

/** Dano-base efetivo da arma em mãos para habilidades de arma. */
export function weaponPower(player, wd) {
  const s = stats(player);
  return wd.dmg * s.melee * (1 + (s.weap[wd.type] || 0) + s.upgrade * 0.06);
}

function weaponElement(item, wd) {
  let rune;
  try {
    rune = item?.getDynamicProperty(`${NS}:runa`);
  } catch {
    rune = undefined;
  }
  return wd.el || (typeof rune === "string" ? rune : "physical");
}

function arc(player, radius, degrees) {
  const dir = V.flat(player.getViewDirection());
  const cos = Math.cos((degrees / 2) * Math.PI / 180);
  return enemiesNear(player, player.location, radius, false).filter((e) => {
    const to = V.flat(V.sub(e.location, player.location));
    return V.dist2d(e.location, player.location) < 1.2 || V.dot(dir, to) >= cos;
  });
}

// ------------------------------------------------------------------ ataques carregados (usar com arma corpo a corpo)
const HEAVY = {
  adaga: { nome: "Estocada Dupla", windup: 4, energy: 8, cd: 1.5, anim: "thrust", fn: (p, w, el) => {
    dash(p, p.getViewDirection(), 0.8, 0.05);
    for (const delay of [2, 7]) system.runTimeout(() => ok(p) && arc(p, 3, 70).slice(0, 2).forEach((e) => dealDamage(p, e, w * 0.95, el, { kind: "weapon" })), delay);
  } },
  espada_curta: { nome: "Corte Rápido", windup: 5, energy: 8, cd: 1.8, anim: "slash", fn: (p, w, el) => {
    particle(p.dimension, "vento_explosao", V.add(V.up(p.location, 1), V.flat(p.getViewDirection())), { radius: 0.8 });
    arc(p, 3.2, 110).forEach((e) => dealDamage(p, e, w * 1.35, el, { kind: "weapon" }));
  } },
  espada_longa: { nome: "Corte Giratório", windup: 8, energy: 12, cd: 3, anim: "spin", fn: (p, w, el) => {
    particle(p.dimension, "vento_explosao", V.up(p.location, 1), { radius: 1.6 });
    sound(p.dimension, "item.trident.riptide_1", p.location, 1.5, 0.6);
    areaDamage(p, p.location, 3.4, w * 1.4, el, { kind: "weapon", area: false, onHit: (e) => knockFrom(e, p.location, 0.8, 0.25) });
  } },
  espada_grande: { nome: "Golpe Devastador", windup: 14, energy: 18, cd: 4.5, anim: "over", fn: (p, w, el) => {
    const pt = V.add(p.location, V.mul(V.flat(p.getViewDirection()), 2));
    particle(p.dimension, "onda_choque", pt, { radius: 1.5 });
    particle(p.dimension, "detritos", pt);
    shake(p, 0.2, 0.3);
    sound(p.dimension, "mace.heavy_smash_ground", pt, 1, 1);
    arc(p, 4.2, 80).forEach((e) => { dealDamage(p, e, w * 2.2, el, { kind: "weapon" }); stun(e, 20); });
  } },
  katana: { nome: "Iaijutsu", windup: 8, energy: 14, cd: 4, anim: "slash", fn: (p, w, el) => {
    const start = p.location;
    dash(p, p.getViewDirection(), 2.4, 0.05);
    grantIframes(p, 6);
    system.runTimeout(() => {
      if (!ok(p)) return;
      const hit = new Set();
      const steps = Math.max(1, Math.round(V.dist(start, p.location) / 0.8));
      for (let i = 0; i <= steps; i++) {
        const q = V.lerp(start, p.location, i / steps);
        particle(p.dimension, "cor_rastro", V.up(q, 1), { color: "physical" });
        for (const e of enemiesNear(p, q, 1.8, false)) {
          if (hit.has(e.id)) continue;
          hit.add(e.id);
          dealDamage(p, e, w * 1.6, el, { kind: "weapon" });
          if (chance(0.5)) addBleed(e, p, w * 0.15, 4);
        }
      }
    }, 5);
  } },
  lanca: { nome: "Investida da Lança", windup: 8, energy: 12, cd: 3.5, anim: "thrust", fn: (p, w, el) => {
    dash(p, p.getViewDirection(), 1.6, 0.05);
    const dir = V.flat(p.getViewDirection());
    system.runTimeout(() => {
      if (!ok(p)) return;
      const hit = new Set();
      for (let i = 1; i <= 5; i++) {
        const q = V.add(p.location, V.mul(dir, i));
        for (const e of enemiesNear(p, q, 1.2, false)) {
          if (hit.has(e.id)) continue;
          hit.add(e.id);
          dealDamage(p, e, w * 1.6, el, { kind: "weapon" });
          knockFrom(e, p.location, 1.4, 0.3);
        }
      }
      sound(p.dimension, "item.spear.attack_hit", p.location, 1, 1);
    }, 3);
  } },
  machado_guerra: { nome: "Redemoinho", windup: 10, energy: 16, cd: 4.5, anim: "spin", fn: (p, w, el) => {
    zone(p, { follow: p, radius: 3, duration: 24, interval: 8, pulse: () => {
      particle(p.dimension, "vento_explosao", V.up(p.location, 1), { radius: 1.4 });
      sound(p.dimension, "item.trident.riptide_1", p.location, 1.2, 0.5);
      areaDamage(p, p.location, 3.2, w * 0.9, el, { kind: "weapon", area: false });
    } });
  } },
  martelo_guerra: { nome: "Impacto Sísmico", windup: 16, energy: 18, cd: 5, anim: "slam", fn: (p, w, el) => {
    particle(p.dimension, "onda_choque", p.location, { radius: 2.5 });
    particle(p.dimension, "detritos", p.location);
    shake(p, 0.35, 0.4);
    sound(p.dimension, "mace.heavy_smash_ground", p.location, 0.8, 1.2);
    areaDamage(p, p.location, 4.2, w * 1.8, el, { kind: "weapon", area: false, onHit: (e) => { stun(e, 30); knockFrom(e, p.location, 0.6, 0.5); } });
  } },
  maca: { nome: "Golpe Esmagador", windup: 10, energy: 12, cd: 3.5, anim: "over", fn: (p, w, el) => {
    const t = arc(p, 3.6, 60)[0];
    if (!t) return;
    dealDamage(p, t, w * 2.0, el, { kind: "weapon" });
    addVulnerable(t, 0.15, 4);
    effect(t, "weakness", 80, 0, true);
    particle(p.dimension, "critico", V.up(t.location, 1));
    sound(p.dimension, "random.anvil_land", t.location, 1.4, 0.5);
  } },
  alabarda: { nome: "Varredura", windup: 12, energy: 14, cd: 4, anim: "slash", fn: (p, w, el) => {
    particle(p.dimension, "vento_explosao", V.add(V.up(p.location, 1), V.mul(V.flat(p.getViewDirection()), 1.5)), { radius: 2 });
    arc(p, 4.4, 160).forEach((e) => { dealDamage(p, e, w * 1.6, el, { kind: "weapon" }); knockFrom(e, p.location, 2.0, 0.45); });
  } },
  foice: { nome: "Colheita", windup: 10, energy: 14, cd: 4, anim: "slash", fn: (p, w, el) => {
    let total = 0;
    particle(p.dimension, "sombra_explosao", V.add(V.up(p.location, 1), V.flat(p.getViewDirection())), { radius: 1.6 });
    arc(p, 4, 180).forEach((e) => { total += dealDamage(p, e, w * 1.5, el, { kind: "weapon" }); });
    if (total > 0) heal(p, total * 0.3);
  } },
};
export { HEAVY };

const busy = new Map();

export function heavyAttack(player, item) {
  const wd = itemData(item);
  if (!wd || wd.k !== "weapon") return false;
  const h = HEAVY[wd.type];
  if (!h) return false;
  const key = `pesado_${wd.type}`;
  const left = cooldownLeft(player, key);
  if (left > 0 || (busy.get(player.id) || 0) > tick()) {
    if (left > 0) player.onScreenDisplay.setActionBar(`§c${h.nome}: ${(left / 20).toFixed(1)}s`);
    return false;
  }
  if (!hasEnergy(player, h.energy)) {
    player.onScreenDisplay.setActionBar(`§9Energia insuficiente para ${h.nome}`);
    return false;
  }
  spendEnergy(player, h.energy);
  markDirty(player);
  setCooldown(player, key, h.cd);
  const windup = Math.round(h.windup * (1 - stats(player).atkSpeed));
  busy.set(player.id, tick() + windup + 4);
  const el = weaponElement(item, wd);
  anim(player, "animation.valdoria.player.preparar_golpe", 0.1);
  effect(player, "slowness", windup, 1);
  psound(player, "item.spear.use", 0.8, 0.6);
  system.runTimeout(() => {
    if (!ok(player)) return;
    anim(player, ANIM[h.anim]);
    sound(player.dimension, "game.player.attack.strong", player.location, 0.85, 1);
    player.onScreenDisplay.setActionBar(`§6${h.nome}!`);
    try {
      h.fn(player, weaponPower(player, wd), el);
    } catch (e) {
      console.warn(`[Valdoria] ataque pesado: ${e}`);
    }
  }, windup);
  return true;
}

// ------------------------------------------------------------------ habilidades das armas especiais
const W = (id, def) => register(id, Object.assign({ tipo: "arma", scale: "melee", cost: 25 }, def));
W("corte_flamejante", { nome: "Corte Flamejante", desc: "Onda de fogo que atravessa inimigos.", cd: 10, element: "fire", anim: "slash",
  fn: (c) => launch(c.src, { from: V.up(c.src.location, 1.1), dir: V.flat(c.src.getViewDirection()), speed: 1.2, radius: 1.3, pierce: true,
    element: "fire", damage: c.dmg(10), range: 14, trail: "fogo_zona", explodeAtEnd: false, kind: "weapon", onHit: (e) => e.setOnFire(4, true) }) });
W("explosao_glacial", { nome: "Explosão Glacial", desc: "Nova congelante ao seu redor.", cd: 12, element: "ice", anim: "slam",
  fn: (c) => {
    particle(c.dim, "gelo_explosao", V.up(c.src.location, 1), { radius: 4 });
    particle(c.dim, "cor_anel", c.src.location, { color: "ice", radius: 5 });
    areaDamage(c.src, c.src.location, 5, c.dmg(8), "ice", { onHit: (e) => effect(e, "slowness", 60, 2, true) });
  } });
W("queda_trovao", { nome: "Queda do Trovão", desc: "Salta e golpeia o chão chamando raios.", cd: 16, element: "lightning", anim: "slam",
  fn: (c) => {
    dash(c.src, c.src.getViewDirection(), 0.6, 0.9);
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      const center = c.src.location;
      for (let i = 0; i < 6; i++) particle(c.dim, "raio_queda", V.add(center, V.rotY({ x: 3, y: 0, z: 0 }, i * 60)));
      particle(c.dim, "raio_explosao", V.up(center, 0.5), { radius: 3 });
      sound(c.dim, "item.trident.thunder", center, 1, 1);
      areaDamage(c.src, center, 4.2, c.dmg(14), "lightning", { onHit: (e) => stun(e, 30) });
    }, 14);
  } });
W("julgamento_aurora", { nome: "Julgamento da Aurora", desc: "Pilar sagrado à sua frente.", cd: 12, element: "holy", anim: "over",
  fn: (c) => {
    const pt = ground(c.dim, V.add(c.src.location, V.mul(V.flat(c.src.getViewDirection()), 4)));
    particle(c.dim, "sagrado_pilar", pt);
    areaDamage(c.src, pt, 3, c.dmg(13), "holy");
  } });
W("passo_umbral", { nome: "Passo Umbral", desc: "Teleporta às costas do alvo e golpeia.", cd: 10, element: "dark", anim: "slash",
  fn: (c) => {
    const t = aim(c.src, 14, false).entity;
    if (!t) return;
    const behind = V.add(t.location, V.mul(V.flat(t.getViewDirection()), -1.3));
    try { c.src.teleport(behind, { facingLocation: V.up(t.location, 1), checkForBlocks: true }); } catch { /* */ }
    particle(c.dim, "sombra_explosao", V.up(behind, 1), { radius: 0.7 });
    system.runTimeout(() => ok(t) && dealDamage(c.src, t, c.dmg(14), "dark", { kind: "weapon" }), 2);
  } });
W("sopro_garra", { nome: "Sopro da Garra", desc: "A lâmina libera um cone de fogo dracônico.", cd: 14, element: "fire", anim: "slash",
  fn: (c) => {
    const dir = c.src.getViewDirection();
    for (let i = 1; i <= 6; i++) particle(c.dim, "fogo_explosao", V.add(V.up(c.src.location, 1.2), V.mul(dir, i)), { radius: 0.6 });
    for (const e of enemiesNear(c.src, c.src.location, 7, false)) {
      if (V.dot(V.norm(V.sub(e.location, c.src.location)), dir) < 0.7) continue;
      dealDamage(c.src, e, c.dmg(12), "fire");
      e.setOnFire(5, true);
    }
  } });
W("runa_explosiva", { nome: "Runa Explosiva", desc: "Grava uma runa no chão que explode após 1,5s.", cd: 12, element: "arcane", anim: "slam",
  fn: (c) => {
    const pt = ground(c.dim, aim(c.src, 16, true).point);
    zone(c.src, { center: pt, radius: 3.5, duration: 30, interval: 30, particle: "cor_circulo_magico", color: "arcane", particleEvery: 5,
      onEnd: (z) => {
        particle(c.dim, "arcano_explosao", V.up(z.center, 0.5), { radius: 3.5 });
        sound(c.dim, "random.explode", z.center, 1.3, 0.8);
        areaDamage(c.src, z.center, 3.5, c.dmg(16), "arcane", { onHit: (e) => knockFrom(e, z.center, 1.2, 0.5) });
      } });
  } });
W("lanca_luz", { nome: "Lança de Luz", desc: "Arremessa uma lança espectral perfurante.", cd: 10, element: "holy", anim: "thrust",
  fn: (c) => launch(c.src, { from: V.add(c.src.getHeadLocation(), c.src.getViewDirection()), dir: c.src.getViewDirection(), speed: 2.2,
    radius: 0.6, pierce: true, element: "holy", damage: c.dmg(14), trail: "sagrado_rastro", range: 32, explodeAtEnd: false, kind: "weapon" }) });
W("onda_abismo", { nome: "Onda do Abismo", desc: "Uma onda de sombra em cone; você recupera parte do dano causado.", cd: 16, element: "dark",
  anim: "slash",
  fn: (c) => {
    const dir = V.flat(c.src.getViewDirection());
    for (let i = 1; i <= 7; i++) {
      system.runTimeout(() => ok(c.src) && particle(c.dim, "sombra_explosao", V.add(V.up(c.src.location, 1), V.mul(dir, i)), { radius: 0.4 + i * 0.25 }), i);
    }
    let total = 0;
    for (const e of enemiesNear(c.src, c.src.location, 8, false)) {
      if (V.dot(V.norm(V.flat(V.sub(e.location, c.src.location))), dir) < 0.6) continue;
      const dmg = c.dmg(15);
      dealDamage(c.src, e, dmg, "dark", { kind: "weapon" });
      total += dmg;
    }
    if (total > 0) {
      heal(c.src, total * 0.3);
      particle(c.dim, "sangue_rastro", V.up(c.src.location, 1));
    }
  } });
W("juizo_celeste", { nome: "Juízo Celeste", desc: "Marca o chão sob o inimigo (ou o ponto) para onde você olha, até 14 blocos; lanças de luz caem ali logo depois.",
  cd: 14, element: "holy", anim: "thrust",
  fn: (c) => {
    const pt = ground(c.dim, aim(c.src, 14, true).point);
    particle(c.dim, "cor_circulo_magico", pt, { color: "holy", radius: 3 });
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      particle(c.dim, "sagrado_pilar", pt, {});
      particle(c.dim, "sagrado_explosao", V.up(pt, 0.5), { radius: 3 });
      for (const e of enemiesNear(c.src, pt, 3.2, false)) dealDamage(c.src, e, c.dmg(18), "holy", { kind: "weapon" });
    }, 14);
  } });
W("terremoto", { nome: "Terremoto", desc: "Ondas de choque sucessivas a partir do impacto.", cd: 18, element: "earth", anim: "slam",
  fn: (c) => {
    const center = c.src.location;
    shake(c.src, 0.5, 1.2);
    const hit = new Set();
    for (let i = 1; i <= 4; i++) {
      system.runTimeout(() => {
        if (!ok(c.src)) return;
        particle(c.dim, "onda_choque", center, { radius: i * 1.2 });
        particle(c.dim, "detritos", V.add(center, { x: rand(-i, i), y: 0, z: rand(-i, i) }));
        for (const e of enemiesNear(c.src, center, i * 2 + 0.5)) {
          if (hit.has(e.id) || V.dist2d(e.location, center) < (i - 1) * 2) continue;
          hit.add(e.id);
          dealDamage(c.src, e, c.dmg(10), "earth", { kind: "weapon" });
          knockFrom(e, center, 0.4, 0.7);
        }
        sound(c.dim, "mace.heavy_smash_ground", center, 0.7, 1);
      }, i * 6);
    }
  } });

export function weaponSkill(player, item) {
  const wd = itemData(item);
  if (!wd?.skill) return false;
  const id = { julgamento: "julgamento_aurora", passo_sombrio: "passo_umbral", sopro_dragao: "sopro_garra" }[wd.skill] || wd.skill;
  return useAbility(player, id);
}

// ------------------------------------------------------------------ efeitos ao acertar (golpes comuns)
function onHit(player, target, dmg, procs) {
  const item = heldItem(player);
  const wd = itemData(item);
  if (wd && wd.k === "weapon") {
    const el = weaponElement(item, wd);
    const strong = !!wd.el;
    if (el === "fire" && chance(strong ? 0.35 : 0.2)) target.setOnFire(3, true);
    else if (el === "ice") effect(target, "slowness", 40, strong ? 1 : 0, true);
    else if (el === "lightning" && chance(strong ? 0.25 : 0.15)) chain(player, target, 3, 6, dmg * 0.35, "lightning", { particle: "raio_rastro" });
    else if (el === "holy") dealDamage(player, target, 2 + dmg * 0.12, "holy", { kind: "dot" });
    else if (el === "dark") effect(target, "wither", 40, 0, true);
    else if (el === "earth" && chance(0.3)) knockFrom(target, player.location, 0.3, 0.4);
    if (el !== "physical") particle(player.dimension, ({ fire: "fogo_rastro", ice: "gelo_rastro", lightning: "raio_rastro", holy: "sagrado_rastro",
      dark: "sombra_rastro", earth: "poeira" })[el] || "critico", V.up(target.location, 1));
  }
  if (hasBuff(player, "golpe_sagrado")) {
    dealDamage(player, target, 6 * stats(player).spell, "holy", { kind: "dot" });
    heal(player, 2);
    particle(player.dimension, "sagrado_explosao", V.up(target.location, 1), { radius: 0.5 });
  }
  if (hasBuff(player, "veneno")) effect(target, "poison", 80, 1, true);
  if (hasBuff(player, "dilacerar")) addBleed(target, player, 1.5 + dmg * 0.08, 5);
  if (hasBuff(player, "emboscada")) removeBuff(player, "emboscada");
}

// ------------------------------------------------------------------ esquiva e postura de defesa
const dodgeReady = new Map();
const guarding = new Set();

function dodge(player) {
  if ((dodgeReady.get(player.id) || 0) > tick()) return;
  if (!hasEnergy(player, 10)) {
    player.onScreenDisplay.setActionBar("§9Energia insuficiente para esquivar");
    return;
  }
  spendEnergy(player, 10);
  dodgeReady.set(player.id, tick() + 24);
  const mv = player.inputInfo.getMovementVector();
  const fwd = V.flat(player.getViewDirection());
  const right = { x: -fwd.z, y: 0, z: fwd.x };
  let dir = V.add(V.mul(fwd, mv.y), V.mul(right, -mv.x));
  if (V.len(dir) < 0.1) dir = V.mul(fwd, -1);
  const s = stats(player);
  dash(player, dir, 1.3 + s.attrs.agi * 0.01, 0.15);
  grantIframes(player, 8);
  anim(player, "animation.valdoria.player.esquiva", 0.1);
  particle(player.dimension, "esquiva", V.up(player.location, 0.8));
  sound(player.dimension, "mob.phantom.swoop", player.location, 1.8, 0.5);
}

export function startWeapons() {
  onMeleeHit(onHit);
  world.afterEvents.playerButtonInput.subscribe((ev) => {
    const p = ev.player;
    if (ev.button !== InputButton.Jump || ev.newButtonState !== ButtonState.Pressed) return;
    if (p.isSneaking && p.isOnGround) dodge(p);
  });
  // postura de defesa: agachado com arma corpo a corpo
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      const wd = itemData(heldItem(p));
      const g = p.isSneaking && wd && wd.k === "weapon";
      if (g && !guarding.has(p.id)) {
        guarding.add(p.id);
        anim(p, "animation.valdoria.player.guarda", 0.2, "!query.is_sneaking");
      } else if (!g) guarding.delete(p.id);
    }
  }, 4);
}

export { isPlayer };
