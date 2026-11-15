// Habilidades raciais (3 por raça) - todas funcionais e com efeito real na jogabilidade.
import { system } from "@minecraft/server";
import { V, ok, effect, health, heal, rand, NS } from "../core/util.js";
import { particle, sound, anim, shake } from "../core/fx.js";
import { dealDamage, enemiesNear, addBleed, grantIframes } from "../core/damage.js";
import { addBuff } from "../rpg/stats.js";
import { register } from "./registry.js";
import { launch, zone, areaDamage, aim, ground, knockFrom, root, stun, dash, healTarget, healArea, buffAllies } from "./engine.js";
import { addEnergy } from "../rpg/stats.js";

const R = (id, def) => register(id, Object.assign({ tipo: "raca", scale: "spell" }, def));
const NEGATIVE = ["poison", "wither", "slowness", "weakness", "blindness", "nausea", "mining_fatigue", "darkness", "hunger"];

// ---------------------------------------------------------------- HUMANO
R("segundo_folego", { nome: "Segundo Fôlego", desc: "Recupera 35% da vida e remove efeitos negativos.", cost: 15, cd: 90, anim: "self",
  element: "holy", scale: "none",
  fn: (c) => {
    const h = health(c.src);
    if (h) healTarget(c.src, c.src, h.effectiveMax * 0.35);
    for (const n of NEGATIVE) c.src.removeEffect(n);
    particle(c.dim, "nivel_anel", c.src.location);
  } });
R("grito_guerra", { nome: "Grito de Guerra", desc: "Você e aliados (10 blocos) ganham Força e Velocidade por 12s.", cost: 20, cd: 60, anim: "roar",
  element: "physical", scale: "none",
  fn: (c) => {
    buffAllies(c.src, c.src.location, 10, [["strength", 240, 0], ["speed", 240, 0]]);
    particle(c.dim, "cor_anel", c.src.location, { color: "gold", radius: 3 });
    sound(c.dim, "raid.horn", c.src.location, 1.2, 0.6);
  } });
R("determinacao", { nome: "Determinação", desc: "Por 8s: -40% de dano recebido e imunidade a repulsão.", cost: 20, cd: 75, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "determinacao", 160, { dmgTaken: -0.4, kbImmune: 1 }, "Determinação");
    particle(c.dim, "escudo", c.src.location);
  } });

// ---------------------------------------------------------------- ELFO
R("flecha_espiritual", { nome: "Flecha Espiritual", desc: "Flecha teleguiada de energia natural que enraíza.", cost: 14, cd: 8, element: "nature",
  fn: (c) => launch(c.src, { from: V.add(c.src.getHeadLocation(), c.src.getViewDirection()), dir: c.src.getViewDirection(), speed: 1.9,
    radius: 0.45, element: "nature", damage: c.dmg(6), homing: 0.2, trail: "natureza_rastro", onHit: (e) => root(e, 20) }) });
R("passos_silvestres", { nome: "Passos Silvestres", desc: "Invisibilidade e Velocidade II por 8s.", cost: 18, cd: 40, anim: "self", scale: "none",
  fn: (c) => {
    effect(c.src, "invisibility", 160, 0);
    effect(c.src, "speed", 160, 1);
    particle(c.dim, "natureza_explosao", V.up(c.src.location, 1), { radius: 1 });
  } });
R("bencao_floresta", { nome: "Bênção da Floresta", desc: "Regeneração II para você e aliados por 8s.", cost: 22, cd: 45, anim: "self", scale: "heal",
  element: "nature",
  fn: (c) => {
    buffAllies(c.src, c.src.location, 6, [["regeneration", 160, 1]]);
    particle(c.dim, "natureza_explosao", V.up(c.src.location, 1), { radius: 2.5 });
  } });

// ---------------------------------------------------------------- ANÃO
R("pele_de_pedra", { nome: "Pele de Pedra", desc: "Resistência III por 6s, mas fica mais lento.", cost: 18, cd: 50, anim: "self", scale: "none",
  fn: (c) => {
    effect(c.src, "resistance", 120, 2, true);
    effect(c.src, "slowness", 120, 0);
    particle(c.dim, "detritos", c.src.location);
    sound(c.dim, "dig.stone", c.src.location, 0.6, 1);
  } });
R("golpe_sismico", { nome: "Golpe Sísmico", desc: "Golpeia o chão: dano em área e atordoamento.", cost: 22, cd: 18, anim: "slam", element: "earth",
  scale: "melee",
  fn: (c) => {
    particle(c.dim, "onda_choque", c.src.location, { radius: 2 });
    particle(c.dim, "detritos", c.src.location);
    sound(c.dim, "mace.heavy_smash_ground", c.src.location, 0.9, 1);
    areaDamage(c.src, c.src.location, 4, c.dmg(7), "earth", { kind: "weapon", onHit: (e) => stun(e, 30) });
  } });
R("visao_forja", { nome: "Visão da Forja", desc: "Revela minérios num raio de 10 blocos por alguns segundos.", cost: 15, cd: 60, anim: "self", scale: "none",
  fn: (c) => {
    const base = c.src.location;
    const dim = c.dim;
    const found = [];
    const job = function* () {
      for (let x = -10; x <= 10; x++) {
        for (let y = -8; y <= 8; y++) {
          for (let z = -10; z <= 10; z++) {
            try {
              const b = dim.getBlock({ x: Math.floor(base.x) + x, y: Math.floor(base.y) + y, z: Math.floor(base.z) + z });
              if (b && b.typeId.includes("ore")) found.push(b.center());
            } catch { /* fora do mundo */ }
          }
          yield;
        }
      }
      let n = 0;
      const run = system.runInterval(() => {
        for (const p of found.slice(0, 60)) particle(dim, "cor_ponto", p, { color: "gold" });
        if (++n >= 8) system.clearRun(run);
      }, 10);
      if (ok(c.src)) c.src.onScreenDisplay.setActionBar(`§6Visão da Forja: ${found.length} minérios detectados.`);
    };
    system.runJob(job());
  } });

// ---------------------------------------------------------------- ORC
R("rugido_brutal", { nome: "Rugido Brutal", desc: "Inimigos próximos ficam fracos e lentos por 6s.", cost: 18, cd: 30, anim: "roar", scale: "none",
  fn: (c) => {
    for (const e of enemiesNear(c.src, c.src.location, 8)) {
      effect(e, "weakness", 120, 1, true);
      effect(e, "slowness", 120, 0, true);
    }
    particle(c.dim, "onda_choque", c.src.location, { radius: 2 });
    sound(c.dim, "mob.ravager.roar", c.src.location, 1.3, 1);
  } });
R("investida", { nome: "Investida", desc: "Avança causando dano e repelindo quem estiver no caminho.", cost: 16, cd: 14, anim: "thrust",
  element: "physical", scale: "melee",
  fn: (c) => {
    const dir = c.src.getViewDirection();
    dash(c.src, dir, 2.6, 0.1);
    grantIframes(c.src, 6);
    const hit = new Set();
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(c.src) || ++n > 8) return system.clearRun(run);
      particle(c.dim, "poeira", c.src.location, { radius: 0.6 });
      areaDamage(c.src, c.src.location, 2, c.dmg(8), "physical", { kind: "weapon", exclude: hit,
        onHit: (e) => { hit.add(e.id); knockFrom(e, c.src.location, 1.6, 0.4); } });
    }, 1);
  } });
R("sede_batalha", { nome: "Sede de Batalha", desc: "Roubo de vida de 20% por 12s.", cost: 20, cd: 60, anim: "roar", scale: "none",
  fn: (c) => {
    addBuff(c.src, "sede_batalha", 240, { lifesteal: 0.2 }, "Sede de Batalha");
    particle(c.dim, "sangue_explosao", V.up(c.src.location, 1), { radius: 1 });
  } });

// ---------------------------------------------------------------- VAMPIRO
R("mordida", { nome: "Mordida Sanguinária", desc: "Drena a vida de um alvo próximo.", cost: 10, cd: 10, element: "blood",
  fn: (c) => {
    const t = aim(c.src, 4, false).entity || enemiesNear(c.src, c.src.location, 3)[0];
    if (!t) return;
    dealDamage(c.src, t, c.dmg(8), "blood");
    healTarget(c.src, c.src, c.dmg(8) * 0.8);
    particle(c.dim, "sangue_explosao", V.up(t.location, 1), { radius: 0.5 });
    sound(c.dim, "mob.zombie.unfect", t.location, 1.4, 0.8);
  } });
R("forma_nevoa", { nome: "Forma de Névoa", desc: "Por 4s: invisível, intangível e veloz.", cost: 20, cd: 35, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "imune", 80, {}, "Forma de Névoa");
    effect(c.src, "invisibility", 80, 0);
    effect(c.src, "speed", 80, 2);
    zone(c.src, { follow: c.src, radius: 1, duration: 80, interval: 4, pulse: () => particle(c.dim, "sombra_rastro", V.up(c.src.location, 1)) });
  } });
R("enxame_morcegos", { nome: "Enxame de Morcegos", desc: "Nuvem de morcegos que fere e cega inimigos por 4s.", cost: 22, cd: 25, anim: "area",
  element: "dark",
  fn: (c) => {
    const pt = ground(c.dim, aim(c.src, 16, true).point);
    zone(c.src, { center: pt, radius: 3, duration: 80, interval: 10, particle: "sombra_zona", particleEvery: 5,
      pulse: (z) => {
        sound(c.dim, "mob.bat.takeoff", z.center, 1, 0.5);
        areaDamage(c.src, z.center, 3, c.dmg(2), "dark", { onHit: (e) => effect(e, "blindness", 40, 0, true) });
      } });
  } });

// ---------------------------------------------------------------- DRACONIANO
R("sopro_dragao", { nome: "Sopro do Dragão", desc: "Cone de fogo por 1,5s que incendeia inimigos.", cost: 24, cd: 16, element: "fire",
  fn: (c) => {
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(c.src) || ++n > 6) return system.clearRun(run);
      const dir = c.src.getViewDirection();
      const mouth = V.add(c.src.getHeadLocation(), V.mul(dir, 0.6));
      for (let i = 1; i <= 5; i++) particle(c.dim, "fogo_rastro", V.add(mouth, V.mul(V.add(dir, { x: rand(-0.15, 0.15), y: rand(-0.1, 0.1), z: rand(-0.15, 0.15) }), i * 1.1)));
      for (const e of enemiesNear(c.src, c.src.location, 6.5, false)) {
        const to = V.norm(V.sub(V.up(e.location, 1), mouth));
        if (V.dot(to, dir) < 0.75) continue;
        dealDamage(c.src, e, c.dmg(3), "fire");
        e.setOnFire(3, true);
      }
      sound(c.dim, "mob.blaze.breathe", mouth, 0.8, 0.6);
    }, 5);
  } });
R("asas_rudimentares", { nome: "Asas Rudimentares", desc: "Salto impulsionado com planagem por 6s.", cost: 12, cd: 12, anim: "self", scale: "none",
  fn: (c) => {
    dash(c.src, c.src.getViewDirection(), 1.6, 1.0);
    effect(c.src, "slow_falling", 120, 0);
    particle(c.dim, "fumaca", c.src.location);
    sound(c.dim, "mob.enderdragon.flap", c.src.location, 1.4, 0.6);
  } });
R("rugido_draconico", { nome: "Rugido Dracônico", desc: "Amedronta inimigos e concede Força por 10s.", cost: 22, cd: 45, anim: "roar", scale: "none",
  fn: (c) => {
    for (const e of enemiesNear(c.src, c.src.location, 7)) {
      effect(e, "slowness", 100, 1, true);
      effect(e, "weakness", 100, 0, true);
    }
    effect(c.src, "strength", 200, 0, true);
    particle(c.dim, "fogo_explosao", V.up(c.src.location, 1.5), { radius: 1.5 });
    sound(c.dim, "mob.enderdragon.growl", c.src.location, 1.4, 0.7);
  } });

// ---------------------------------------------------------------- FADA
R("po_de_fada", { nome: "Pó de Fada", desc: "Cura e regenera aliados próximos.", cost: 18, cd: 20, anim: "self", element: "nature", scale: "heal",
  fn: (c) => {
    healArea(c.src, c.src.location, 6, 3 * c.heal);
    buffAllies(c.src, c.src.location, 6, [["regeneration", 120, 0]]);
    particle(c.dim, "fada_brilho", V.up(c.src.location, 1.5));
    particle(c.dim, "cor_anel", c.src.location, { color: { red: 1, green: 0.7, blue: 0.95 }, radius: 3 });
  } });
R("luz_ofuscante", { nome: "Luz Ofuscante", desc: "Clarão que cega, desacelera e fere inimigos.", cost: 18, cd: 20, anim: "area", element: "holy",
  fn: (c) => {
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 3 });
    areaDamage(c.src, c.src.location, 6, c.dmg(3), "holy", { onHit: (e) => { effect(e, "blindness", 60, 0, true); effect(e, "slowness", 60, 1, true); } });
  } });
R("voo_breve", { nome: "Voo Breve", desc: "Levita por 2,5s e plana em seguida.", cost: 15, cd: 25, anim: "self", scale: "none",
  fn: (c) => {
    effect(c.src, "levitation", 50, 1);
    system.runTimeout(() => ok(c.src) && effect(c.src, "slow_falling", 140, 0), 50);
    zone(c.src, { follow: c.src, radius: 1, duration: 60, interval: 3, pulse: () => particle(c.dim, "fada_brilho", c.src.location) });
  } });

// ---------------------------------------------------------------- DEMÔNIO
R("chamas_infernais", { nome: "Chamas Infernais", desc: "Anel de fogo ao seu redor por 5s.", cost: 22, cd: 25, anim: "area", element: "fire",
  fn: (c) => zone(c.src, { follow: c.src, radius: 5, duration: 100, interval: 10, particle: "fogo_zona", particleEvery: 4,
    pulse: (z) => areaDamage(c.src, z.center, 5, c.dmg(2.5), "fire", { onHit: (e) => e.setOnFire(2, true) }) }) });
R("pacto_sombrio", { nome: "Pacto Sombrio", desc: "Sacrifica 20% da vida para restaurar toda a energia.", cost: 0, cd: 40, anim: "self", scale: "none",
  fn: (c) => {
    const h = health(c.src);
    if (!h || h.currentValue <= h.effectiveMax * 0.2 + 1) return;
    h.setCurrentValue(h.currentValue - h.effectiveMax * 0.2);
    addEnergy(c.src, 9999);
    particle(c.dim, "sombra_explosao", V.up(c.src.location, 1), { radius: 1.2 });
    sound(c.dim, "mob.wither.shoot", c.src.location, 0.7, 0.7);
  } });
R("forma_demoniaca", { nome: "Forma Demoníaca", desc: "Por 10s: Força II, +20% sombrio e aura de fogo.", cost: 30, cd: 80, anim: "roar", element: "fire",
  fn: (c) => {
    effect(c.src, "strength", 200, 1, true);
    addBuff(c.src, "forma_demoniaca", 200, { dark: 0.2 }, "Forma Demoníaca");
    zone(c.src, { follow: c.src, radius: 3, duration: 200, interval: 20, particle: "brasas", particleEvery: 2,
      pulse: (z) => areaDamage(c.src, z.center, 3, c.dmg(2), "fire", { onHit: (e) => e.setOnFire(2, true) }) });
    particle(c.dim, "fogo_explosao", V.up(c.src.location, 1), { radius: 2 });
  } });

// ---------------------------------------------------------------- CELESTIAL
R("halo_protetor", { nome: "Halo Protetor", desc: "Absorção II para você e aliados por 15s.", cost: 22, cd: 40, anim: "self", scale: "none",
  fn: (c) => {
    buffAllies(c.src, c.src.location, 8, [["absorption", 300, 1]]);
    particle(c.dim, "escudo", c.src.location);
  } });
R("julgamento", { nome: "Julgamento", desc: "Pilar de luz que cai sobre o ponto mirado.", cost: 25, cd: 18, anim: "area", element: "holy",
  fn: (c) => {
    const pt = ground(c.dim, aim(c.src, 22, true).point);
    particle(c.dim, "alerta_anel", pt, { radius: 2.5 });
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      particle(c.dim, "sagrado_pilar", pt);
      particle(c.dim, "sagrado_explosao", V.up(pt, 0.5), { radius: 2.5 });
      sound(c.dim, "beacon.power", pt, 1.5, 1);
      areaDamage(c.src, pt, 2.6, c.dmg(12), "holy");
    }, 16);
  } });
R("asas_luz", { nome: "Asas de Luz", desc: "Ascende, plana e fica invulnerável por 2s.", cost: 20, cd: 35, anim: "self", scale: "none",
  fn: (c) => {
    effect(c.src, "levitation", 30, 2);
    effect(c.src, "slow_falling", 160, 0);
    grantIframes(c.src, 40);
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 1.5 });
  } });

// ---------------------------------------------------------------- LICANTROPO
R("transformacao", { nome: "Transformação Lupina", desc: "Por 20s: Força II, Velocidade II, salto, roubo de vida 10%. Sem feitiços.",
  cost: 25, cd: 120, anim: "roar", scale: "none",
  fn: (c) => {
    anim(c.src, "animation.valdoria.player.transformacao", 0.3);
    shake(c.src, 0.25, 0.8);
    sound(c.dim, "mob.wolf.growl", c.src.location, 0.6, 1.2);
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      sound(c.dim, "mob.wolf.whine", c.src.location, 0.7, 1.5);
      effect(c.src, "strength", 400, 1, true);
      effect(c.src, "speed", 400, 1, true);
      effect(c.src, "jump_boost", 400, 1, true);
      effect(c.src, "regeneration", 400, 0, true);
      addBuff(c.src, "transformacao", 400, { lifesteal: 0.1, noSpells: 1, dr: 0.1 }, "Forma Lupina");
      zone(c.src, { follow: c.src, radius: 1, duration: 400, interval: 5,
        pulse: () => particle(c.dim, "cor_aura", V.up(c.src.location, 0.5), { color: { red: 0.4, green: 0.4, blue: 0.5 } }) });
      particle(c.dim, "fumaca", V.up(c.src.location, 1));
    }, 25);
  } });
R("uivo", { nome: "Uivo", desc: "Aliados ganham Força por 10s; inimigos ficam lentos.", cost: 18, cd: 40, anim: "roar", scale: "none",
  fn: (c) => {
    buffAllies(c.src, c.src.location, 10, [["strength", 200, 0]]);
    for (const e of enemiesNear(c.src, c.src.location, 10)) effect(e, "slowness", 120, 0, true);
    sound(c.dim, "mob.wolf.whine", c.src.location, 0.8, 1.5);
    particle(c.dim, "onda_choque", c.src.location, { radius: 2 });
  } });
R("dilacerar", { nome: "Dilacerar", desc: "Seus próximos golpes em 6s causam sangramento.", cost: 12, cd: 15, anim: "self", scale: "none",
  fn: (c) => {
    addBuff(c.src, "dilacerar", 120, {}, "Dilacerar");
    particle(c.dim, "sangue_explosao", V.up(c.src.location, 1), { radius: 0.5 });
  } });

export const RACIAL_READY = true;
export { NS, addBleed, heal };
