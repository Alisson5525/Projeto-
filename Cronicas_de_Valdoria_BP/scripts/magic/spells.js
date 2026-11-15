// Feitiços das 10 escolas mágicas + feitiços combinados.
import { system } from "@minecraft/server";
import { V, ok, rand, effect, pick } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { addDrainMark, addBleed, addVulnerable, enemiesNear, dealDamage } from "../core/damage.js";
import { register } from "../abilities/registry.js";
import { launch, zone, areaDamage, chain, beam, aim, ground, knockFrom, root, dash, healTarget, healArea, buffAllies, summon } from "../abilities/engine.js";

export const SCHOOLS = {
  fire: { nome: "Fogo", cor: "§c", icone: "textures/items/valdoria/runa_fogo" },
  ice: { nome: "Gelo", cor: "§b", icone: "textures/items/valdoria/runa_gelo" },
  lightning: { nome: "Eletricidade", cor: "§e", icone: "textures/items/valdoria/runa_trovao" },
  arcane: { nome: "Arcana", cor: "§d", icone: "textures/items/valdoria/cristal_aetherita" },
  holy: { nome: "Sagrada", cor: "§6", icone: "textures/items/valdoria/runa_luz" },
  dark: { nome: "Sombria", cor: "§5", icone: "textures/items/valdoria/runa_sombra" },
  nature: { nome: "Natural", cor: "§a", icone: "textures/items/valdoria/essencia_natural" },
  wind: { nome: "Vento", cor: "§f", icone: "textures/items/valdoria/anel_tempestade" },
  blood: { nome: "Sangue", cor: "§4", icone: "textures/items/valdoria/talisma_sangue" },
  summon: { nome: "Invocação", cor: "§3", icone: "textures/items/valdoria/grimorio_arquimago" },
};

/** Lista ordenada de feitiços: id -> metadados (o efeito fica no registro de habilidades). */
export const SPELLS = {};

function spell(id, school, nivel, def) {
  SPELLS[id] = { id, school, nivel, combo: def.combo };
  register(id, Object.assign({ tipo: def.combo ? "combo" : "magia", element: school, scale: "spell", nivel }, def));
}

export function spellReq(id) {
  const sp = SPELLS[id];
  const n = sp.nivel;
  return { nivel: n, int: 5 + Math.floor(n * 0.6), essencia: sp.combo ? 3 : Math.ceil(n / 8), cristal: n >= 20 || sp.combo ? 1 : 0 };
}

function fromHand(src) {
  return V.add(src.getHeadLocation(), V.mul(src.getViewDirection(), 0.8));
}
function dirOf(ctx) {
  if (ctx.target && ok(ctx.target)) return V.norm(V.sub(V.up(ctx.target.location, 1), fromHand(ctx.src)));
  return ctx.src.getViewDirection();
}
function pointOf(ctx, range) {
  if (ctx.target && ok(ctx.target)) return ctx.target.location;
  return ground(ctx.dim, aim(ctx.src, range, true).point);
}
function targetOf(ctx, range) {
  if (ctx.target && ok(ctx.target)) return ctx.target;
  return aim(ctx.src, range, false).entity;
}

// =========================================================== FOGO
spell("bola_fogo", "fire", 1, {
  nome: "Bola de Fogo", desc: "Projétil flamejante que explode em área e incendeia.", cost: 12, cd: 1.5, prep: 6, alcance: 30,
  fn: (c) => launch(c.src, { from: fromHand(c.src), dir: dirOf(c), speed: 1.3, radius: 0.5, element: "fire", damage: c.dmg(7), aoe: 2.2,
    onHit: (e) => e.setOnFire(3, true), onImpact: (p) => particle(c.dim, "fumaca", p) }),
});
spell("pilar_chamas", "fire", 8, {
  nome: "Pilar de Chamas", desc: "Uma coluna de fogo irrompe do chão no ponto mirado.", cost: 26, cd: 8, prep: 10, anim: "area", alcance: 22,
  fn: (c) => {
    const pt = pointOf(c, 22);
    particle(c.dim, "alerta_anel", pt, { radius: 2.2 });
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      particle(c.dim, "fogo_zona", pt, { radius: 2 });
      particle(c.dim, "fogo_explosao", V.up(pt, 1), { radius: 2 });
      particle(c.dim, "fumaca", V.up(pt, 2));
      sound(c.dim, "mob.blaze.shoot", pt, 0.7, 1.2);
      areaDamage(c.src, pt, 2.4, c.dmg(12), "fire", { onHit: (e) => { e.setOnFire(4, true); knockFrom(e, pt, 0.2, 0.7); } });
    }, 12);
  },
});
spell("chuva_meteoros", "fire", 22, {
  nome: "Chuva de Meteoros", desc: "Sete meteoros caem sobre a área mirada.", cost: 55, cd: 25, prep: 16, anim: "area", alcance: 36,
  fn: (c) => {
    const pt = pointOf(c, 36);
    particle(c.dim, "alerta_anel", pt, { radius: 4.5 });
    for (let i = 0; i < 7; i++) {
      system.runTimeout(() => {
        if (!ok(c.src)) return;
        const o = V.add(pt, { x: rand(-4, 4), y: 0, z: rand(-4, 4) });
        launch(c.src, { from: V.add(o, { x: rand(-3, 3), y: 16, z: rand(-3, 3) }), dir: { x: 0, y: -1, z: 0 }, speed: 1.6, radius: 0.8,
          element: "fire", damage: c.dmg(9), aoe: 2.4, trail: "meteoro", impact: "fogo_explosao", range: 24,
          onImpact: (p) => { particle(c.dim, "detritos", p); sound(c.dim, "random.explode", p, 1.2, 0.7); },
          onHit: (e) => e.setOnFire(3, true) });
      }, i * 6);
    }
  },
});

// =========================================================== GELO
spell("lanca_gelo", "ice", 1, {
  nome: "Lança de Gelo", desc: "Projétil veloz que fere e desacelera.", cost: 10, cd: 1.2, prep: 4, alcance: 32,
  fn: (c) => launch(c.src, { from: fromHand(c.src), dir: dirOf(c), speed: 2.0, radius: 0.4, element: "ice", damage: c.dmg(6),
    onHit: (e) => effect(e, "slowness", 60, 1, true) }),
});
spell("prisao_gelo", "ice", 10, {
  nome: "Prisão de Gelo", desc: "Aprisiona o alvo em gelo por 3 segundos.", cost: 28, cd: 14, prep: 8, alcance: 24,
  fn: (c) => {
    const t = targetOf(c, 24);
    const victims = t ? [t] : enemiesNear(c.src, pointOf(c, 24), 1.8);
    for (const e of victims) {
      root(e, 60);
      dealDamage(c.src, e, c.dmg(4), "ice");
      particle(c.dim, "gelo_prisao", e.location);
      particle(c.dim, "gelo_explosao", V.up(e.location, 1), { radius: 0.8 });
      sound(c.dim, "random.glass", e.location, 0.8, 1);
    }
  },
});
spell("nevasca", "ice", 20, {
  nome: "Nevasca", desc: "Tempestade de neve por 6 segundos: dano contínuo e lentidão intensa.", cost: 50, cd: 24, prep: 14, anim: "area", alcance: 26,
  fn: (c) => zone(c.src, { center: pointOf(c, 26), radius: 5, duration: 120, interval: 20, particle: "gelo_zona", particleEvery: 4,
    pulse: (z) => areaDamage(c.src, z.center, 5, c.dmg(2.2), "ice", { onHit: (e) => effect(e, "slowness", 40, 2, true) }) }),
});

// =========================================================== ELETRICIDADE
spell("relampago", "lightning", 3, {
  nome: "Relâmpago Concentrado", desc: "Raio instantâneo que atinge o primeiro inimigo na linha.", cost: 14, cd: 2, prep: 5, alcance: 24,
  fn: (c) => {
    const r = c.target ? { end: V.up(c.target.location, 1) } : beam(c.src, 24, c.dmg(9), "lightning", { particle: "raio_rastro" });
    if (c.target) {
      line(c.dim, fromHand(c.src), r.end, "raio_rastro", {}, 0.4);
      dealDamage(c.src, c.target, c.dmg(9), "lightning");
    }
    particle(c.dim, "raio_explosao", r.end, { radius: 0.8 });
    sound(c.dim, "ambient.weather.lightning.impact", r.end, 1.6, 0.5);
  },
});
spell("corrente_eletrica", "lightning", 12, {
  nome: "Corrente Elétrica", desc: "Salta entre até 5 inimigos próximos.", cost: 30, cd: 9, prep: 8, alcance: 20,
  fn: (c) => {
    const first = targetOf(c, 20) || enemiesNear(c.src, pointOf(c, 20), 8)[0];
    if (!first) return;
    chain(c.src, first, 5, 7, c.dmg(8), "lightning", { particle: "raio_rastro",
      onHit: (e) => particle(c.dim, "raio_explosao", V.up(e.location, 1), { radius: 0.5 }) });
  },
});
spell("tempestade_raios", "lightning", 24, {
  nome: "Tempestade de Raios", desc: "Raios caem sobre inimigos na área por 6 segundos.", cost: 60, cd: 28, prep: 16, anim: "area", alcance: 30,
  fn: (c) => zone(c.src, { center: pointOf(c, 30), radius: 6, duration: 120, interval: 10,
    pulse: (z) => {
      const foes = enemiesNear(c.src, z.center, 6);
      const loc = foes.length ? pick(foes).location : V.add(z.center, { x: rand(-5, 5), y: 0, z: rand(-5, 5) });
      particle(c.dim, "raio_queda", loc);
      particle(c.dim, "raio_explosao", V.up(loc, 0.5), { radius: 1.2 });
      sound(c.dim, "ambient.weather.thunder", loc, 1.4, 0.6);
      areaDamage(c.src, loc, 1.6, c.dmg(8), "lightning");
    } }),
});

// =========================================================== ARCANA
spell("projeteis_arcanos", "arcane", 1, {
  nome: "Projéteis Arcanos", desc: "Três projéteis teleguiados.", cost: 14, cd: 2.5, prep: 5, alcance: 28,
  fn: (c) => {
    for (let i = 0; i < 3; i++) {
      system.runTimeout(() => ok(c.src) && launch(c.src, { from: fromHand(c.src), dir: V.add(dirOf(c), { x: rand(-0.2, 0.2), y: 0.15, z: rand(-0.2, 0.2) }),
        speed: 1.0, radius: 0.45, element: "arcane", damage: c.dmg(4), homing: 0.3, trail: "arcano_rastro" }), i * 3);
    }
  },
});
spell("onda_choque", "arcane", 9, {
  nome: "Onda de Choque Arcana", desc: "Explosão ao redor que repele inimigos.", cost: 24, cd: 8, prep: 6, anim: "area", alcance: 5,
  fn: (c) => {
    particle(c.dim, "onda_choque", c.src.location, { radius: 2.5 });
    particle(c.dim, "cor_anel", c.src.location, { color: "arcane", radius: 4.5 });
    areaDamage(c.src, c.src.location, 5, c.dmg(6), "arcane", { onHit: (e) => knockFrom(e, c.src.location, 2.2, 0.5) });
  },
});
spell("esfera_destruicao", "arcane", 26, {
  nome: "Esfera de Destruição", desc: "Orbe lento e devastador com enorme explosão.", cost: 65, cd: 30, prep: 18, alcance: 30,
  fn: (c) => launch(c.src, { from: fromHand(c.src), dir: dirOf(c), speed: 0.55, radius: 0.9, element: "arcane", damage: c.dmg(22), aoe: 5,
    trail: "arcano_runas", impact: "arcano_explosao", range: 30,
    onImpact: (p) => { particle(c.dim, "onda_choque", p, { radius: 3 }); sound(c.dim, "random.explode", p, 0.8, 1); },
    onHit: (e, pr) => knockFrom(e, pr.pos, 1.5, 0.5) }),
});

// =========================================================== SAGRADA
spell("raio_luz", "holy", 2, {
  nome: "Raio de Luz", desc: "Feixe sagrado; dano dobrado contra mortos-vivos.", cost: 12, cd: 2, prep: 5, alcance: 22,
  fn: (c) => {
    if (c.target) {
      line(c.dim, fromHand(c.src), V.up(c.target.location, 1), "sagrado_rastro", {}, 0.4);
      dealDamage(c.src, c.target, c.dmg(8), "holy");
      return;
    }
    const r = beam(c.src, 22, c.dmg(8), "holy", { particle: "sagrado_rastro" });
    particle(c.dim, "sagrado_explosao", r.end, { radius: 0.7 });
  },
});
spell("cura", "holy", 4, {
  nome: "Cura", desc: "Restaura vida sua e de aliados próximos.", cost: 20, cd: 6, prep: 8, anim: "self", scale: "heal", alcance: 5,
  fn: (c) => {
    healTarget(c.src, c.src, 4 * c.heal);
    healArea(c.src, c.src.location, 5, 4 * c.heal);
    particle(c.dim, "sagrado_explosao", V.up(c.src.location, 1), { radius: 1.5 });
  },
});
spell("escudo_divino", "holy", 14, {
  nome: "Escudo Divino", desc: "Absorção de dano e resistência temporária.", cost: 35, cd: 30, prep: 10, anim: "self", alcance: 0,
  fn: (c) => {
    effect(c.src, "absorption", 400, 2, true);
    effect(c.src, "resistance", 120, 0, true);
    particle(c.dim, "escudo", c.src.location);
  },
});

// =========================================================== SOMBRIA
spell("projetil_sombrio", "dark", 2, {
  nome: "Projétil Sombrio", desc: "Projétil que causa definhamento.", cost: 12, cd: 1.6, prep: 5, alcance: 28,
  fn: (c) => launch(c.src, { from: fromHand(c.src), dir: dirOf(c), speed: 1.3, radius: 0.5, element: "dark", damage: c.dmg(7),
    onHit: (e) => effect(e, "wither", 80, 0, true) }),
});
spell("nevoa_sombria", "dark", 11, {
  nome: "Névoa Sombria", desc: "Névoa que cega e fere inimigos; você fica invisível.", cost: 30, cd: 18, prep: 8, anim: "area", alcance: 4,
  fn: (c) => {
    effect(c.src, "invisibility", 100, 0, false);
    zone(c.src, { center: c.src.location, radius: 4, duration: 100, interval: 20, particle: "sombra_zona", particleEvery: 5,
      pulse: (z) => areaDamage(c.src, z.center, 4, c.dmg(2.5), "dark", { onHit: (e) => effect(e, "blindness", 60, 0, true) }) });
  },
});
spell("lanca_abissal", "dark", 23, {
  nome: "Lança Abissal", desc: "Lança perfurante que atravessa todos na linha.", cost: 50, cd: 15, prep: 12, alcance: 30,
  fn: (c) => launch(c.src, { from: fromHand(c.src), dir: dirOf(c), speed: 2.4, radius: 0.6, pierce: true, element: "dark", damage: c.dmg(14),
    trail: "sombra_rastro", range: 30, explodeAtEnd: false }),
});

// =========================================================== NATURAL
spell("raizes", "nature", 3, {
  nome: "Raízes Aprisionadoras", desc: "Raízes prendem inimigos na área por 3 segundos.", cost: 16, cd: 8, prep: 6, anim: "area", alcance: 22,
  fn: (c) => {
    const pt = pointOf(c, 22);
    particle(c.dim, "natureza_espinhos", pt, { radius: 3 });
    areaDamage(c.src, pt, 3, c.dmg(3), "nature", { onHit: (e) => root(e, 60) });
  },
});
spell("espinhos", "nature", 13, {
  nome: "Espinhos Mágicos", desc: "Uma linha de espinhos irrompe à sua frente.", cost: 30, cd: 10, prep: 8, anim: "area", alcance: 12,
  fn: (c) => {
    const dir = V.flat(dirOf(c));
    const hit = new Set();
    for (let i = 1; i <= 8; i++) {
      system.runTimeout(() => {
        if (!ok(c.src)) return;
        const p = ground(c.dim, V.add(c.src.location, V.mul(dir, i * 1.5)));
        particle(c.dim, "natureza_espinhos", p, { radius: 1.2 });
        areaDamage(c.src, p, 1.5, c.dmg(9), "nature", { exclude: hit, onHit: (e) => { hit.add(e.id); knockFrom(e, p, 0.1, 0.5); } });
      }, i * 2);
    }
  },
});
spell("cura_natural", "nature", 6, {
  nome: "Cura Natural", desc: "Regeneração para você e aliados próximos.", cost: 22, cd: 20, prep: 8, anim: "self", scale: "heal", alcance: 5,
  fn: (c) => {
    buffAllies(c.src, c.src.location, 5, [["regeneration", Math.round(200 * Math.min(1.5, c.heal)), 1]]);
    particle(c.dim, "natureza_explosao", V.up(c.src.location, 1), { radius: 2 });
  },
});

// =========================================================== VENTO
spell("laminas_vento", "wind", 2, {
  nome: "Lâminas de Vento", desc: "Três lâminas cortantes em leque.", cost: 12, cd: 2, prep: 4, alcance: 24,
  fn: (c) => {
    for (const a of [-12, 0, 12]) launch(c.src, { from: fromHand(c.src), dir: V.rotY(dirOf(c), a), speed: 1.8, radius: 0.45, element: "wind",
      damage: c.dmg(4), range: 24, onHit: (e) => knockFrom(e, c.src.location, 0.4, 0.15) });
  },
});
spell("rajada", "wind", 7, {
  nome: "Rajada de Ar", desc: "Cone de vento que arremessa inimigos para longe.", cost: 18, cd: 7, prep: 4, alcance: 6,
  fn: (c) => {
    const dir = V.flat(dirOf(c));
    particle(c.dim, "vento_explosao", V.add(V.up(c.src.location, 1), V.mul(dir, 2)), { radius: 1.5 });
    for (const e of enemiesNear(c.src, c.src.location, 6)) {
      if (V.dot(V.flat(V.sub(e.location, c.src.location)), dir) < 0.45) continue;
      dealDamage(c.src, e, c.dmg(4), "wind");
      knockFrom(e, c.src.location, 2.8, 0.6);
    }
  },
});
spell("salto_aereo", "wind", 5, {
  nome: "Salto Aéreo", desc: "Impulso para cima e para frente com queda lenta.", cost: 10, cd: 6, prep: 0, anim: "self", alcance: 0,
  fn: (c) => {
    particle(c.dim, "vento_explosao", c.src.location, { radius: 1 });
    dash(c.src, c.src.getViewDirection(), 1.3, 0.95);
    effect(c.src, "slow_falling", 80, 0, false);
  },
});

// =========================================================== SANGUE (custa vida)
spell("drenar_vida", "blood", 8, {
  nome: "Drenar Vida", desc: "Raio que rouba vida (custa 5% da sua vida).", cost: 0, hpCost: 0.05, cd: 4, prep: 6, alcance: 16,
  fn: (c) => {
    const onHit = (e) => healTarget(c.src, c.src, c.dmg(7) * 0.7);
    if (c.target) {
      line(c.dim, V.up(c.target.location, 1), fromHand(c.src), "sangue_rastro", {}, 0.4);
      dealDamage(c.src, c.target, c.dmg(7), "blood");
      onHit(c.target);
      return;
    }
    beam(c.src, 16, c.dmg(7), "blood", { particle: "sangue_rastro", onHit });
  },
});
spell("marca_drenagem", "blood", 16, {
  nome: "Marca de Drenagem", desc: "Marca o alvo: seus golpes nele curam 30% do dano (10s). Custa 8% da vida.", cost: 0, hpCost: 0.08, cd: 18, prep: 6, alcance: 20,
  fn: (c) => {
    const t = targetOf(c, 20);
    if (!t) return;
    addDrainMark(t, c.src, 0.3, 10);
    particle(c.dim, "sangue_explosao", V.up(t.location, 1), { radius: 0.6 });
    particle(c.dim, "cor_anel", t.location, { color: "blood", radius: 1 });
  },
});
spell("explosao_sangue", "blood", 25, {
  nome: "Explosão Sanguínea", desc: "Explosão que causa sangramento. Custa 18% da vida.", cost: 0, hpCost: 0.18, cd: 22, prep: 10, anim: "area", alcance: 5,
  fn: (c) => {
    particle(c.dim, "sangue_explosao", V.up(c.src.location, 1), { radius: 4 });
    particle(c.dim, "cor_anel", c.src.location, { color: "blood", radius: 5 });
    areaDamage(c.src, c.src.location, 5, c.dmg(18), "blood", { onHit: (e) => addBleed(e, c.src, 2 * c.power, 5) });
  },
});

// =========================================================== INVOCAÇÃO
spell("familiar_arcano", "summon", 6, {
  nome: "Familiar Arcano", desc: "Um orbe orbita você por 30s e dispara em inimigos próximos.", cost: 30, cd: 40, prep: 10, anim: "self", alcance: 8,
  fn: (c) => zone(c.src, { follow: c.src, radius: 8, duration: Math.round(600 * c.summon), interval: 4,
    pulse: (z, n) => {
      const orb = V.add(c.src.location, { x: Math.cos(n * 0.45) * 1.2, y: 2.1, z: Math.sin(n * 0.45) * 1.2 });
      particle(c.dim, "cor_ponto", orb, { color: "summon" });
      if (n % 5 !== 0) return;
      const t = enemiesNear(c.src, c.src.location, 8).sort((a, b) => V.dist(a.location, orb) - V.dist(b.location, orb))[0];
      if (!t) return;
      line(c.dim, orb, V.up(t.location, 1), "cor_ponto", { color: "summon" }, 0.5);
      dealDamage(c.src, t, c.dmg(3), "arcane");
    } }),
});
spell("lobo_espectral", "summon", 10, {
  nome: "Lobo Espectral", desc: "Invoca lobos espectrais aliados por 40s (2 lobos no nível 25).", cost: 35, cd: 45, prep: 10, anim: "self", alcance: 0,
  fn: (c) => summon(c.src, "valdoria:lobo_espectral", c.level >= 25 ? 2 : 1, 40, c.summon),
});
spell("guerreiro_espiritual", "summon", 18, {
  nome: "Guerreiro Espiritual", desc: "Invoca um guerreiro esquelético aliado por 45s.", cost: 45, cd: 60, prep: 14, anim: "area", alcance: 0,
  fn: (c) => summon(c.src, "valdoria:guerreiro_esqueletico", 1, 45, c.summon),
});

// =========================================================== COMBINAÇÕES (exigem o Grimório do Arquimago)
function stormCombo(id, nome, desc, el1, el2, dmgEl, part, onHit) {
  spell(id, el1, 20, {
    nome, desc, cost: 60, cd: 30, prep: 16, anim: "area", alcance: 24, combo: [el1, el2],
    fn: (c) => zone(c.src, { center: pointOf(c, 24), radius: 4.5, duration: 120, interval: 10,
      pulse: (z, n) => {
        particle(c.dim, n % 2 ? part : "vento_tornado", z.center, { radius: 2.5 });
        for (const e of enemiesNear(c.src, z.center, 5)) {
          dealDamage(c.src, e, c.dmg(3.5), dmgEl);
          knockFrom(e, z.center, -0.35, 0.05);
          onHit(e);
        }
      } }),
  });
}
stormCombo("tempestade_flamejante", "Tempestade Flamejante", "Fogo + Vento: tornado de chamas que puxa e queima.", "fire", "wind", "fire",
  "fogo_zona", (e) => e.setOnFire(2, true));
stormCombo("tempestade_glacial", "Tempestade Glacial", "Gelo + Vento: tornado congelante que puxa e desacelera.", "ice", "wind", "ice",
  "gelo_zona", (e) => effect(e, "slowness", 40, 3, true));
spell("chama_sagrada", "holy", 20, {
  nome: "Chama Sagrada", desc: "Luz + Fogo: pilar de fogo sagrado que fere inimigos e cura aliados.", cost: 55, cd: 26, prep: 14, anim: "area",
  alcance: 24, combo: ["holy", "fire"],
  fn: (c) => {
    const pt = pointOf(c, 24);
    particle(c.dim, "alerta_anel", pt, { radius: 3 });
    system.runTimeout(() => {
      if (!ok(c.src)) return;
      particle(c.dim, "sagrado_pilar", pt);
      particle(c.dim, "fogo_zona", pt, { radius: 3 });
      areaDamage(c.src, pt, 3.2, c.dmg(16), "holy", { onHit: (e) => e.setOnFire(4, true) });
      healArea(c.src, pt, 4, 6 * c.heal);
    }, 10);
  },
});
spell("prisao_dimensional", "ice", 20, {
  nome: "Prisão Dimensional Congelante", desc: "Gelo + Arcano: prende o alvo 5s e ele sofre +30% de dano.", cost: 50, cd: 28, prep: 12,
  alcance: 24, combo: ["ice", "arcane"],
  fn: (c) => {
    const t = targetOf(c, 24);
    if (!t) return;
    root(t, 100);
    addVulnerable(t, 0.3, 5);
    particle(c.dim, "gelo_prisao", t.location);
    particle(c.dim, "cor_circulo_magico", t.location, { color: "arcane", radius: 1.4 });
    dealDamage(c.src, t, c.dmg(6), "arcane");
  },
});
spell("espinhos_arcanos", "nature", 20, {
  nome: "Explosão de Espinhos Arcanos", desc: "Natureza + Arcano: espinhos arcanos irrompem e prendem.", cost: 55, cd: 24, prep: 12,
  anim: "area", alcance: 24, combo: ["nature", "arcane"],
  fn: (c) => {
    const pt = pointOf(c, 24);
    particle(c.dim, "natureza_espinhos", pt, { radius: 5 });
    particle(c.dim, "arcano_explosao", V.up(pt, 1), { radius: 4 });
    areaDamage(c.src, pt, 5, c.dmg(14), "arcane", { onHit: (e) => root(e, 40) });
  },
});
spell("descarga_area", "lightning", 20, {
  nome: "Descarga Elétrica em Área", desc: "Raio + Gelo (água congelada): choques contínuos ao seu redor.", cost: 55, cd: 26, prep: 12,
  anim: "area", alcance: 5, combo: ["lightning", "ice"],
  fn: (c) => zone(c.src, { follow: c.src, radius: 5, duration: 100, interval: 10,
    pulse: () => {
      for (const e of enemiesNear(c.src, c.src.location, 5)) {
        line(c.dim, V.up(c.src.location, 1), V.up(e.location, 1), "raio_rastro", {}, 0.6);
        dealDamage(c.src, e, c.dmg(2.5), "lightning");
        effect(e, "slowness", 30, 1, true);
      }
      particle(c.dim, "raio_explosao", V.up(c.src.location, 1), { radius: 1.5 });
    } }),
});

// feitiços próprios de criaturas (não aparecem no grimório)
register("goblin_fogo", { nome: "Fogo Goblin", desc: "", tipo: "criatura", element: "fire", cost: 0, cd: 0,
  fn: (c) => launch(c.src, { from: V.up(c.src.location, 1.1), dir: dirOf(c), speed: 0.9, radius: 0.45, element: "fire", damage: c.dmg(4), aoe: 1.2,
    onHit: (e) => e.setOnFire(2, true) }) });
register("goblin_cura", { nome: "Cura Goblin", desc: "", tipo: "criatura", element: "nature", cost: 0, cd: 0,
  fn: (c) => {
    for (const g of c.dim.getEntities({ location: c.src.location, maxDistance: 8, families: ["goblin"] })) healTarget(c.src, g, 5);
    particle(c.dim, "natureza_explosao", V.up(c.src.location, 1), { radius: 2 });
  } });
