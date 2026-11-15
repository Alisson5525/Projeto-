// Ninho do Dragão: cratera vulcânica com borda rochosa, pilares de fogo eterno, costelas gigantes, poças de lava e o tesouro
// de Ignaroth. O dragão desce dos céus quando alguém entra na cratera (ver lairs.js).
import { Plan, B, prepareGround } from "./builder.js";

const R = 23;

/** Costelas de um esqueleto colossal ao longo do eixo z local, com crânio na ponta. */
function ribcage(p, cx, cz, len, rnd) {
  for (let i = 0; i <= len; i++) p.set(cx, 4 + (i > 1 && i < len - 1 ? 1 : 0), cz + i, B.log("minecraft:bone_block", "z"));
  for (let i = 1; i < len; i += 2) {
    if (rnd() < 0.15) continue; // costela quebrada
    for (const sx of [-1, 1]) {
      const top = 4 + (i > 1 && i < len - 1 ? 1 : 0);
      p.set(cx + sx, top, cz + i, B.log("minecraft:bone_block", "x"));
      p.set(cx + 2 * sx, top - 1, cz + i, B.log("minecraft:bone_block", "x"));
      for (let y = 1; y <= top - 2; y++) p.set(cx + 3 * sx, y, cz + i, B.log("minecraft:bone_block", "y"));
    }
  }
  // crânio com órbitas vazias
  for (let x = -1; x <= 1; x++) for (let y = 1; y <= 3; y++) for (let z = -3; z <= -1; z++) p.set(cx + x, y, cz + z, "minecraft:bone_block");
  p.set(cx - 1, 2, cz - 3, "minecraft:air").set(cx + 1, 2, cz - 3, "minecraft:air").set(cx, 1, cz - 4, "minecraft:bone_block");
}

export const NINHO = {
  id: "ninho", nome: "Ninho do Dragão", raio: 24, alturaMax: 7, xp: 120, limpeza: false, distGen: 46, minY: 50,
  nomes: ["Ninho de Ignaroth", "Cratera das Cinzas", "Caldeira da Asa Rubra", "Ninho do Domínio do Fogo"],
  descricao: "Cratera vulcânica cercada de ossos colossais. Ignaroth, o Dragão Ancestral, desce dos céus quando alguém ousa entrar.",
  dica: "§cO ar cheira a enxofre e cinzas",
  biomas: ["badlands", "mesa", "desert", "savanna", "windswept", "stony", "peaks", "meadow", "plains", "sunflower", "jagged", "grove", "taiga"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const floor = (x, z) => {
      const d = Math.hypot(x, z);
      if (d <= 4) return p.pick([["minecraft:blackstone", 3], ["minecraft:gilded_blackstone", 1], ["minecraft:smooth_basalt", 2]]);
      if (d <= 18) {
        return p.pick([["minecraft:smooth_basalt", 4], ["minecraft:blackstone", 3], ["minecraft:coarse_dirt", 2], ["minecraft:tuff", 2],
          ["minecraft:gravel", 1], ["minecraft:magma", 0.3]]);
      }
      if (d <= 22) return p.pick([["minecraft:stone", 3], ["minecraft:andesite", 2], ["minecraft:smooth_basalt", 2], ["minecraft:tuff", 1]]);
      return p.pick([["minecraft:stone", 2], ["minecraft:coarse_dirt", 2], ["minecraft:grass_block", 3]]);
    };
    const prep = await prepareGround(dim, p, -24, -24, 24, 24, 26, "minecraft:stone", floor);
    const rock = () => p.pick([["minecraft:stone", 4], ["minecraft:smooth_basalt", 3], ["minecraft:blackstone", 2], ["minecraft:tuff", 2],
      ["minecraft:andesite", 1]]);

    // borda da cratera: crista irregular entre r 19 e 23, com a entrada ao sul (+z)
    for (let x = -R; x <= R; x++) {
      for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, z);
        if (d < 19 || d > 23.4) continue;
        if (z > 14 && Math.abs(x) <= 3) continue;
        const ang = Math.atan2(z, x);
        const crest = 1 - Math.min(1, Math.abs(d - 21.2) / 2.3);
        const h = Math.max(1, Math.round(1 + crest * (4 + Math.sin(ang * 5 + 1.3) * 1.6 + Math.sin(ang * 11) * 0.9) + rnd() * 1.2));
        for (let y = 1; y <= h; y++) p.set(x, y, z, rock());
        if (rnd() < 0.12) p.set(x, h + 1, z, "minecraft:smooth_basalt");
      }
    }
    // pilares de fogo eterno (netherrack + fogo) ao redor da arena
    for (const a of [30, 80, 130, 200, 250, 320]) {
      const r = (a * Math.PI) / 180;
      const px = Math.round(Math.cos(r) * 16.5);
      const pz = Math.round(Math.sin(r) * 16.5);
      const h = 4 + Math.floor(rnd() * 3);
      for (let y = 1; y <= h; y++) p.set(px, y, pz, y === h ? "minecraft:chiseled_polished_blackstone" : B.log("minecraft:basalt", "y"));
      p.set(px, h + 1, pz, "minecraft:netherrack").set(px, h + 2, pz, "minecraft:fire");
    }
    // poças de lava rasas (bordas de magma) longe da entrada
    for (const [lx, lz] of [[-13, -7], [12, -10], [-9, 10]]) {
      for (let x = -1; x <= 2; x++) {
        for (let z = -1; z <= 1; z++) {
          const edge = x === -1 || x === 2 || z === -1 || z === 1;
          p.set(lx + x, 0, lz + z, edge ? "minecraft:magma" : "minecraft:lava");
          if (!edge) p.set(lx + x, -1, lz + z, "minecraft:blackstone");
        }
      }
    }
    // esqueletos colossais
    ribcage(p, -12, 1, 9, rnd);
    ribcage(p, 10, -6, 7, rnd);
    // o ninho: anel de basalto com ossos e ouro
    for (let a = 0; a < 360; a += 12) {
      const r = (a * Math.PI) / 180;
      const x = Math.round(Math.cos(r) * 4.5);
      const z = Math.round(Math.sin(r) * 4.5);
      p.set(x, 1, z, rnd() < 0.7 ? B.log("minecraft:basalt", "y") : B.log("minecraft:bone_block", "y"));
      if (rnd() < 0.35) p.set(x, 2, z, B.log("minecraft:basalt", "y"));
    }
    for (const [x, z] of [[-2, -1], [1, 2], [2, -2], [-1, 2]]) p.set(x, 1, z, rnd() < 0.5 ? "minecraft:gilded_blackstone" : "minecraft:raw_gold_block");
    // o tesouro do dragão ao norte (os baús surgem após a vitória)
    for (let x = -5; x <= 5; x++) {
      for (let z = -15; z <= -11; z++) {
        if (rnd() < 0.45) p.set(x, 1, z, p.pick([["minecraft:gilded_blackstone", 4], ["minecraft:raw_gold_block", 1], ["minecraft:gold_block", 0.3]]));
      }
    }
    p.set(-3, 1, -13, "minecraft:air").set(0, 1, -14, "minecraft:air").set(3, 1, -13, "minecraft:air");
    // restos do último cavaleiro, perto da entrada
    p.set(6, 1, 15, B.skull()).set(7, 1, 16, "minecraft:web").set(5, 1, 16, "minecraft:iron_bars");
    p.chest(6, 1, 16, "north", "ninho", { lore: "ultimo_cavaleiro" });
    p.mark("chefe", 0, 1, 0);
    for (const [x, z] of [[-3, -13], [0, -14], [3, -13]]) p.mark("tesouro", x, 1, z);
    p.box("arena", -19, -3, -19, 19, 34, 19);
    p.box("area", -R, -3, -R, R, 30, R);
    return { plans: [prep, p], plan: p };
  },
  afterBuild(rec, plan) {
    rec.m = { chefe: "pronto", vitorias: 0, derrotadoEm: 0, boss: plan.marks.chefe[0], arena: plan.marks.arena, tesouro: plan.marks.tesouro };
  },
};
