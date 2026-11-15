// Habilidades de classe (3 por classe, liberadas nos níveis 5, 10 e 20).
import { system } from "@minecraft/server";
import { V, ok, effect, health, rand } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { dealDamage, enemiesNear, addVulnerable, grantIframes } from "../core/damage.js";
import { addBuff } from "../rpg/stats.js";
import { register } from "./registry.js";
import { launch, zone, areaDamage, beam, aim, ground, knockFrom, root, stun, dash, blink, healTarget, healArea, buffAllies, summon, summonsOf } from "./engine.js";

const C = (id, def) => register(id, Object.assign({ tipo: "classe", scale: "spell" }, def));
const NEG = ["poison", "wither", "slowness", "weakness", "blindness", "nausea", "mining_fatigue", "darkness", "hunger"];

// ---------------------------------------------------------------- GUERREIRO
C("golpe_giratorio", { nome: "Golpe Giratório", desc: "Gira a arma atingindo todos ao redor.", cost: 16, cd: 10, anim: "spin", scale: "melee",
  element: "physical",
  fn: (c) => {
    particle(c.dim, "vento_explosao", V.up(c.src.location, 1), { radius: 2 });
    sound(c.dim, "item.trident.riptide_1", c.src.location, 1.4, 0.8);
    areaDamage(c.src, c.src.location, 3.5, c.dmg(7), "physical", { kind: "weapon", onHit: (e) => knockFrom(e, c.src.location, 0.9, 0.3) });
  } });
C("postura_batalha", { nome: "Postura de Batalha", desc: "Por 10s: +25% de redução de dano e +10% de dano.", cost: 15, cd: 30, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "postura", 200, { dr: 0.25, melee: 0.1 }, "Postura de Batalha");
    particle(c.dim, "escudo", c.src.location);
  } });
C("furia_guerra", { nome: "Fúria de Guerra", desc: "Por 12s: +30% de dano e ataques mais rápidos.", cost: 25, cd: 60, anim: "roar", scale: "none",
  fn: (c) => {
    addBuff(c.src, "furia", 240, { melee: 0.3, agi: 15 }, "Fúria de Guerra");
    particle(c.dim, "sangue_explosao", V.up(c.src.location, 1), { radius: 1 });
    sound(c.dim, "mob.ravager.roar", c.src.location, 1.6, 0.8);
  } });

// ---------------------------------------------------------------- CAVALEIRO
C("investida_escudo", { nome: "Investida de Escudo", desc: "Avança atordoando inimigos no caminho.", cost: 15, cd: 12, anim: "thrust", scale: "melee",
  element: "physical",
  fn: (c) => {
    dash(c.src, c.src.getViewDirection(), 2.2, 0.1);
    const hit = new Set();
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(c.src) || ++n > 7) return system.clearRun(run);
      areaDamage(c.src, c.src.location, 2, c.dmg(6), "physical", { kind: "weapon", exclude: hit,
        onHit: (e) => { hit.add(e.id); stun(e, 20); knockFrom(e, c.src.location, 1.2, 0.3); } });
    }, 1);
  } });
C("baluarte", { nome: "Baluarte", desc: "Por 8s: -50% de dano recebido.", cost: 22, cd: 45, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "baluarte", 160, { dmgTaken: -0.5, kbImmune: 1 }, "Baluarte");
    particle(c.dim, "escudo", c.src.location);
    sound(c.dim, "item.shield.block", c.src.location, 0.6, 1);
  } });
C("juramento", { nome: "Juramento", desc: "Cura 25% de você e aliados e concede Resistência.", cost: 28, cd: 60, anim: "self", scale: "heal",
  element: "holy",
  fn: (c) => {
    const h = health(c.src);
    const amount = (h ? h.effectiveMax : 20) * 0.25;
    healArea(c.src, c.src.location, 8, amount);
    buffAllies(c.src, c.src.location, 8, [["resistance", 200, 0]]);
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 2.5 });
  } });

// ---------------------------------------------------------------- ARQUEIRO
C("disparo_perfurante", { nome: "Disparo Perfurante", desc: "Disparo de energia que atravessa todos na linha.", cost: 16, cd: 10, element: "physical",
  scale: "none",
  fn: (c) => {
    const p = c.s ? c.s.ranged : 1;
    beam(c.src, 30, 10 * p, "physical", { pierce: true, particle: "vento_rastro", kind: "weapon" });
    sound(c.dim, "crossbow.shoot", c.src.location, 0.8, 1);
  } });
C("salto_evasivo", { nome: "Salto Evasivo", desc: "Salta para trás e ganha velocidade.", cost: 10, cd: 8, anim: "self", scale: "none",
  fn: (c) => {
    dash(c.src, V.mul(c.src.getViewDirection(), -1), 1.8, 0.45);
    grantIframes(c.src, 8);
    effect(c.src, "speed", 60, 0);
    particle(c.dim, "esquiva", V.up(c.src.location, 1));
  } });
C("chuva_flechas", { nome: "Chuva de Flechas", desc: "Saraivada de flechas espectrais sobre a área mirada.", cost: 28, cd: 20, anim: "area", scale: "none",
  element: "physical",
  fn: (c) => {
    const pt = ground(c.dim, aim(c.src, 32, true).point);
    const p = c.s ? c.s.ranged : 1;
    particle(c.dim, "alerta_anel", pt, { radius: 3.5 });
    for (let i = 0; i < 10; i++) {
      system.runTimeout(() => {
        if (!ok(c.src)) return;
        const o = V.add(pt, { x: rand(-3, 3), y: 0, z: rand(-3, 3) });
        launch(c.src, { from: V.up(o, 10), dir: { x: 0, y: -1, z: 0 }, speed: 1.8, radius: 0.5, element: "physical", damage: 3.5 * p,
          aoe: 1.0, trail: "vento_rastro", impact: "critico", range: 14, kind: "weapon" });
      }, i * 3);
    }
  } });

// ---------------------------------------------------------------- MAGO
C("escudo_arcano", { nome: "Escudo Arcano", desc: "Escudo que absorve dano por 15s.", cost: 20, cd: 30, anim: "self", scale: "none",
  fn: (c) => {
    effect(c.src, "absorption", 300, 1, true);
    particle(c.dim, "cor_circulo_magico", c.src.location, { color: "arcane", radius: 1.2 });
    particle(c.dim, "arcano_explosao", V.up(c.src.location, 1), { radius: 1 });
  } });
C("teleporte", { nome: "Teleporte", desc: "Teleporta até 10 blocos para frente.", cost: 15, cd: 12, anim: "self", scale: "none",
  fn: (c) => blink(c.src, 10) });
C("canalizacao", { nome: "Canalização", desc: "Por 10s: feitiços custam metade e têm +20% de poder.", cost: 10, cd: 90, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "canalizacao", 200, { spellCost: -0.5, spell: 0.2 }, "Canalização");
    particle(c.dim, "cor_circulo_magico", c.src.location, { color: "arcane", radius: 2 });
  } });

// ---------------------------------------------------------------- BRUXO
C("maldicao", { nome: "Maldição", desc: "O alvo recebe +25% de dano e definha por 6s.", cost: 15, cd: 15, element: "dark",
  fn: (c) => {
    const t = aim(c.src, 20, false).entity;
    if (!t) return;
    addVulnerable(t, 0.25, 6);
    effect(t, "wither", 120, 1, true);
    particle(c.dim, "sombra_explosao", V.up(t.location, 1), { radius: 0.8 });
    line(c.dim, V.up(c.src.location, 1.5), V.up(t.location, 1), "sombra_rastro", {}, 0.6);
  } });
C("drenar_alma", { nome: "Drenar Alma", desc: "Canaliza um feixe que drena vida por 2s.", cost: 20, cd: 12, element: "dark",
  fn: (c) => {
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(c.src) || ++n > 8) return system.clearRun(run);
      const r = beam(c.src, 14, c.dmg(2.2), "dark", { particle: "sombra_rastro" });
      if (r.targets.length) healTarget(c.src, c.src, c.dmg(2.2) * 0.6);
    }, 5);
  } });
C("servo_sombrio", { nome: "Servo Sombrio", desc: "Invoca um guerreiro esquelético por 40s.", cost: 30, cd: 60, anim: "area", element: "summon",
  fn: (c) => summon(c.src, "valdoria:guerreiro_esqueletico", c.d?.espec === "necromante" ? 2 : 1, 40, c.summon) });

// ---------------------------------------------------------------- PALADINO
C("golpe_sagrado", { nome: "Golpe Sagrado", desc: "Seus próximos golpes em 6s causam dano sagrado extra e curam.", cost: 15, cd: 12, anim: "self",
  scale: "none",
  fn: (c) => {
    addBuff(c.src, "golpe_sagrado", 120, {}, "Golpe Sagrado");
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 0.8 });
  } });
C("aura_devocao", { nome: "Aura de Devoção", desc: "Aliados próximos ganham Resistência e Regeneração por 10s.", cost: 25, cd: 45, anim: "self",
  scale: "none",
  fn: (c) => {
    buffAllies(c.src, c.src.location, 8, [["resistance", 200, 0], ["regeneration", 200, 0]]);
    particle(c.dim, "cor_anel", c.src.location, { color: "holy", radius: 4 });
  } });
C("martelo_justica", { nome: "Martelo da Justiça", desc: "Arremessa um martelo sagrado que atordoa.", cost: 18, cd: 14, element: "holy",
  fn: (c) => launch(c.src, { from: V.add(c.src.getHeadLocation(), c.src.getViewDirection()), dir: c.src.getViewDirection(), speed: 1.4,
    radius: 0.6, element: "holy", damage: c.dmg(8), trail: "sagrado_rastro", impact: "sagrado_explosao", onHit: (e) => stun(e, 40) }) });

// ---------------------------------------------------------------- ASSASSINO
C("passo_sombrio", { nome: "Passo Sombrio", desc: "Teleporta para trás do alvo.", cost: 14, cd: 10, anim: "self", scale: "none",
  fn: (c) => {
    const t = aim(c.src, 14, false).entity;
    if (!t) return blink(c.src, 6);
    const behind = V.add(t.location, V.mul(V.flat(t.getViewDirection()), -1.4));
    particle(c.dim, "sombra_explosao", V.up(c.src.location, 1), { radius: 0.6 });
    try {
      c.src.teleport(behind, { facingLocation: V.up(t.location, 1), checkForBlocks: true });
    } catch { /* bloqueado */ }
    particle(c.dim, "sombra_explosao", V.up(behind, 1), { radius: 0.6 });
    sound(c.dim, "mob.endermen.portal", behind, 1.5, 0.6);
  } });
C("laminas_envenenadas", { nome: "Lâminas Envenenadas", desc: "Seus golpes em 8s envenenam.", cost: 12, cd: 20, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "veneno", 160, {}, "Lâminas Envenenadas");
    particle(c.dim, "natureza_explosao", V.up(c.src.location, 1), { radius: 0.5 });
  } });
C("desaparecer", { nome: "Desaparecer", desc: "Invisibilidade e Velocidade II por 6s; próximo golpe crítico.", cost: 18, cd: 30, anim: "self",
  scale: "none",
  fn: (c) => {
    effect(c.src, "invisibility", 120, 0);
    effect(c.src, "speed", 120, 1);
    addBuff(c.src, "emboscada", 120, { crit: 1 }, "Emboscada");
    particle(c.dim, "sombra_explosao", V.up(c.src.location, 1), { radius: 1 });
  } });

// ---------------------------------------------------------------- DRUIDA
C("espinhos_aura", { nome: "Pele de Espinhos", desc: "Por 10s, atacantes corpo a corpo sofrem 40% do dano de volta.", cost: 18, cd: 40,
  anim: "self", scale: "none", element: "nature",
  fn: (c) => {
    addBuff(c.src, "espinhos", 200, { rPhys: 0.1 }, "Pele de Espinhos");
    particle(c.dim, "natureza_espinhos", c.src.location, { radius: 1.2 });
  } });
C("invocar_guardiao", { nome: "Invocar Guardião", desc: "Invoca um Guardião Vegetal por 40s.", cost: 35, cd: 90, anim: "area", element: "summon",
  fn: (c) => summon(c.src, "valdoria:guardiao_vegetal", c.d?.espec === "guardiao_bosque" ? 2 : 1, 40, c.summon) });
C("chuva_curativa", { nome: "Chuva Curativa", desc: "Zona de cura por 6s.", cost: 28, cd: 45, anim: "area", scale: "heal", element: "nature",
  fn: (c) => zone(c.src, { center: c.src.location, radius: 5, duration: 120, interval: 20, particle: "natureza_rastro", particleEvery: 2,
    pulse: (z) => healArea(c.src, z.center, 5, 2 * c.heal) }) });

// ---------------------------------------------------------------- INVOCADOR
C("lobos_espectrais", { nome: "Lobos Espectrais", desc: "Invoca 2 lobos espectrais por 40s.", cost: 30, cd: 50, anim: "area", element: "summon",
  fn: (c) => summon(c.src, "valdoria:lobo_espectral", c.d?.espec === "senhor_bestas" ? 3 : 2, 40, c.summon) });
C("legiao", { nome: "Legião", desc: "Invoca 2 guerreiros esqueléticos por 40s.", cost: 40, cd: 70, anim: "area", element: "summon",
  fn: (c) => summon(c.src, "valdoria:guerreiro_esqueletico", 2, 40, c.summon) });
C("elo_vital", { nome: "Elo Vital", desc: "Cura totalmente suas invocações e concede Força por 15s.", cost: 20, cd: 30, anim: "self", scale: "none",
  fn: (c) => {
    for (const e of summonsOf(c.src)) {
      const h = health(e);
      if (h) h.resetToMaxValue();
      effect(e, "strength", 300, 1, true);
      line(c.dim, V.up(c.src.location, 1), V.up(e.location, 1), "cor_ponto", { color: "summon" }, 0.6);
    }
  } });

// ---------------------------------------------------------------- CLÉRIGO
C("prece", { nome: "Prece", desc: "Cura 40% da vida sua e de aliados próximos.", cost: 30, cd: 35, anim: "self", scale: "heal", element: "holy",
  fn: (c) => {
    const h = health(c.src);
    healArea(c.src, c.src.location, 10, (h ? h.effectiveMax : 20) * 0.4 * Math.min(1.6, c.heal));
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1.5), { radius: 3 });
  } });
C("purificacao", { nome: "Purificação", desc: "Remove efeitos negativos e fere mortos-vivos ao redor.", cost: 20, cd: 20, anim: "area", element: "holy",
  fn: (c) => {
    for (const n of NEG) c.src.removeEffect(n);
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 4 });
    areaDamage(c.src, c.src.location, 5, c.dmg(6), "holy");
  } });
C("santuario", { nome: "Santuário", desc: "Zona sagrada por 8s: aliados resistem e regeneram; inimigos ficam lentos.", cost: 35, cd: 70,
  anim: "area", element: "holy",
  fn: (c) => zone(c.src, { center: c.src.location, radius: 5, duration: 160, interval: 20, particle: "cor_anel", color: "holy",
    pulse: (z) => {
      buffAllies(c.src, z.center, 5, [["resistance", 30, 0], ["regeneration", 30, 0]]);
      for (const e of enemiesNear(c.src, z.center, 5)) effect(e, "slowness", 30, 1, true);
      particle(c.dim, "cor_circulo_magico", z.center, { color: "holy", radius: 4.5 });
    } }) });

export const CLASS_READY = true;
export { dealDamage, root, healTarget };
