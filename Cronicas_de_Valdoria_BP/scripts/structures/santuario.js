// Santuário do Véu Negro: catedral sombria em ruínas (nave com pilares, vitrais roxos, teto desabado, trono sobre um estrado)
// e um pátio com obeliscos de fogo das almas. Vaelith, a Rainha das Trevas, desperta quando alguém entra na nave (ver lairs.js).
import { Plan, B, prepareGround } from "./builder.js";

export const SANTUARIO = {
  id: "santuario", nome: "Santuário do Véu Negro", raio: 20, alturaMax: 5, xp: 140, limpeza: false, distGen: 40, minY: 50,
  nomes: ["Santuário do Véu Negro", "Catedral da Coroa Partida", "Capela da Lua Minguante", "Abadia das Sombras"],
  descricao: "Catedral sombria onde Vaelith, a Dama de Véu Negro, reúne seus acólitos. A Rainha das Trevas aguarda no trono.",
  dica: "§5Um sino rachado ecoa à distância",
  biomas: ["forest", "dark", "roofed", "taiga", "swamp", "birch", "plains", "meadow", "pale", "grove", "old_growth"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const ground = (x, z) => {
      if (Math.abs(x) <= 8 && z >= -18 && z <= 8) return p.pick([["minecraft:polished_blackstone", 5], ["minecraft:polished_blackstone_bricks", 3],
        ["minecraft:cracked_polished_blackstone_bricks", 1]]);
      if (Math.abs(x) <= 1 && z > 8) return p.pick([["minecraft:polished_blackstone_bricks", 3], ["minecraft:cracked_polished_blackstone_bricks", 1]]);
      return p.pick([["minecraft:podzol", 3], ["minecraft:coarse_dirt", 3], ["minecraft:grass_block", 3], ["minecraft:gravel", 1], ["minecraft:soul_soil", 1]]);
    };
    const prep = await prepareGround(dim, p, -20, -20, 20, 20, 24, "minecraft:stone", ground);
    const wall = () => p.pick([["minecraft:polished_blackstone_bricks", 6], ["minecraft:cracked_polished_blackstone_bricks", 2],
      ["minecraft:deepslate_tiles", 2], ["minecraft:cracked_deepslate_tiles", 1]]);
    const H = 12;
    // paredes da nave
    for (let y = 1; y <= H; y++) {
      for (let z = -18; z <= 8; z++) p.set(-8, y, z, wall()).set(8, y, z, wall());
      for (let x = -7; x <= 7; x++) {
        p.set(x, y, -18, wall());
        if (!(Math.abs(x) <= 1 && y <= 5)) p.set(x, y, 8, wall());
      }
    }
    // arco da porta
    p.set(-1, 5, 8, B.stairs("minecraft:polished_blackstone_brick_stairs", "east", true))
      .set(1, 5, 8, B.stairs("minecraft:polished_blackstone_brick_stairs", "west", true)).set(0, 6, 8, "minecraft:chiseled_polished_blackstone");
    // contrafortes e vitrais
    for (const z of [-15, -10, -5, 0, 5]) {
      for (const sx of [-1, 1]) {
        for (let y = 1; y <= 8; y++) p.set(9 * sx, y, z, "minecraft:deepslate_bricks");
        p.set(9 * sx, 9, z, B.stairs("minecraft:deepslate_brick_stairs", sx > 0 ? "west" : "east"));
      }
    }
    for (const z of [-13, -8, -3, 2]) {
      for (const sx of [-1, 1]) {
        for (let y = 4; y <= 9; y++) for (const dz of [0, 1]) p.set(8 * sx, y, z + dz, y === 9 ? "minecraft:black_stained_glass" : "minecraft:purple_stained_glass");
      }
    }
    // rosácea na parede do fundo
    for (let x = -3; x <= 3; x++) {
      for (let y = 6; y <= 11; y++) {
        const d = Math.hypot(x, (y - 8.5) * 1.1);
        if (d <= 1.2) p.set(x, y, -18, "minecraft:magenta_stained_glass");
        else if (d <= 2.4) p.set(x, y, -18, "minecraft:purple_stained_glass");
        else if (d <= 3.2) p.set(x, y, -18, "minecraft:crying_obsidian");
      }
    }
    // teto com rombos
    p.fill(-7, H + 1, -17, 7, H + 1, 7, "minecraft:deepslate_tiles");
    for (let x = -8; x <= 8; x++) {
      p.set(x, H + 1, -18, "minecraft:deepslate_brick_slab").set(x, H + 1, 8, "minecraft:deepslate_brick_slab");
      if (x % 2 === 0) p.set(x, H + 2, -18, "minecraft:deepslate_bricks").set(x, H + 2, 8, "minecraft:deepslate_bricks");
    }
    for (const [hx, hz, hr] of [[-3, -4, 2.6], [4, 3, 2.2], [2, -12, 1.8]]) {
      for (let x = -7; x <= 7; x++) for (let z = -17; z <= 7; z++) if (Math.hypot(x - hx, z - hz) <= hr + rnd() * 0.8) p.set(x, H + 1, z, "minecraft:air");
      p.set(hx, 1, hz, "minecraft:cobbled_deepslate").set(hx + 1, 1, hz, B.slab("minecraft:deepslate_tile_slab"));
    }
    // torres da fachada com pináculos
    for (const sx of [-1, 1]) {
      const cx = 9 * sx;
      for (let y = 1; y <= 17; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) p.set(cx + dx, y, 8 + dz, "minecraft:deepslate_bricks");
      p.set(cx, 18, 8, "minecraft:polished_blackstone_bricks").set(cx, 19, 8, "minecraft:polished_blackstone_bricks")
        .set(cx, 20, 8, B.lantern("minecraft:soul_lantern"));
      for (const [dx, dz, f] of /** @type {[number, number, string][]} */ ([[-1, 0, "east"], [1, 0, "west"], [0, -1, "south"], [0, 1, "north"]])) {
        p.set(cx + dx, 18, 8 + dz, B.stairs("minecraft:deepslate_brick_stairs", f));
      }
    }
    // pilares internos, velas e lanternas
    for (const z of [-14, -9, -4, 1, 6]) {
      for (const sx of [-1, 1]) {
        for (let y = 1; y <= H; y++) p.set(5 * sx, y, z, y % 4 === 0 ? "minecraft:chiseled_polished_blackstone" : B.log("minecraft:polished_basalt", "y"));
        p.set(4 * sx, 1, z, B.candle(1 + Math.floor(rnd() * 3), "minecraft:purple_candle"));
      }
    }
    for (const z of [-11, -5, 1]) p.set(0, H, z, B.lantern("minecraft:soul_lantern", true));
    // tapete central
    for (let z = -11; z <= 7; z++) for (let x = -1; x <= 1; x++) if (rnd() < 0.9) p.set(x, 1, z, x === 0 ? "minecraft:purple_carpet" : "minecraft:black_carpet");
    // estrado e trono
    p.fill(-5, 1, -17, 5, 1, -12, "minecraft:polished_blackstone_bricks");
    for (let x = -5; x <= 5; x++) p.set(x, 1, -12, B.stairs("minecraft:polished_blackstone_brick_stairs", "south"));
    p.fill(-3, 2, -17, 3, 2, -15, "minecraft:polished_blackstone_bricks");
    for (let x = -3; x <= 3; x++) p.set(x, 2, -15, B.stairs("minecraft:polished_blackstone_brick_stairs", "south"));
    for (let y = 3; y <= 6; y++) for (let x = -1; x <= 1; x++) p.set(x, y, -17, y === 6 && x === 0 ? "minecraft:crying_obsidian" : "minecraft:obsidian");
    p.set(0, 3, -16, B.stairs("minecraft:polished_blackstone_stairs", "south"))
      .set(-1, 3, -16, "minecraft:chiseled_polished_blackstone").set(1, 3, -16, "minecraft:chiseled_polished_blackstone")
      .set(-1, 7, -17, B.candle(3, "minecraft:purple_candle")).set(1, 7, -17, B.candle(3, "minecraft:purple_candle"));
    // véus negros atrás do trono e altares de fogo das almas
    for (const sx of [-1, 1]) {
      for (let y = 3; y <= 10; y++) p.set(3 * sx, y, -17, y <= 4 ? "minecraft:purple_wool" : "minecraft:black_wool");
      p.set(6 * sx, 1, -16, "minecraft:soul_soil").set(6 * sx, 2, -16, "minecraft:soul_fire");
    }
    // nicho lateral com o decreto
    p.chest(-7, 1, -6, "east", "santuario", { lore: "decreto_veu" });
    p.set(-7, 2, -6, B.lantern("minecraft:soul_lantern")).set(-7, 1, -5, "minecraft:web");
    // pátio: obeliscos com fogo das almas, lápides e mato seco
    for (const sx of [-1, 1]) {
      for (let y = 1; y <= 4; y++) p.set(5 * sx, y, 13, y === 4 ? "minecraft:chiseled_polished_blackstone" : "minecraft:polished_blackstone_bricks");
      p.set(5 * sx, 5, 13, "minecraft:soul_soil").set(5 * sx, 6, 13, "minecraft:soul_fire");
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.round((rnd() - 0.5) * 30);
      const z = 10 + Math.round(rnd() * 9);
      if (Math.abs(x) <= 2 || Math.abs(x) > 16) continue;
      p.set(x, 1, z, rnd() < 0.5 ? "minecraft:chiseled_deepslate" : "minecraft:deadbush");
    }
    for (const [x, z] of [[-14, -6], [14, -2], [-13, 4], [13, 6]]) p.set(x, 1, z, "minecraft:web");
    // guardas: acólitos no pátio e espectros perto da porta
    for (const [x, z] of [[-4, 12], [4, 12], [0, 17]]) p.mark("acolito", x, 1, z);
    for (const [x, z] of [[-3, 4], [3, 4]]) p.mark("espectro", x, 1, z);
    p.mark("chefe", 0, 3, -15);
    for (const [x, z] of [[-4, -13], [4, -13]]) p.mark("tesouro", x, 2, z);
    for (let x = -1; x <= 1; x++) for (let y = 1; y <= 4; y++) p.mark("porta", x, y, 8);
    p.box("arena", -7, 0, -17, 7, 12, 7);
    p.box("area", -20, -2, -20, 20, 22, 20);
    return { plans: [prep, p], plan: p };
  },
  guards: [["acolito", "valdoria:espiao_veu"], ["espectro", "valdoria:espectro"]],
  afterBuild(rec, plan) {
    rec.m = { chefe: "pronto", vitorias: 0, derrotadoEm: 0, boss: plan.marks.chefe[0], arena: plan.marks.arena, tesouro: plan.marks.tesouro,
      porta: plan.marks.porta, rot: rec.rot };
  },
};
