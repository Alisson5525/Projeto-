// Torre do Mago em Ruínas: torre redonda de 4 andares, topo desabado de um lado; biblioteca, laboratório e círculo arcano.
import { NS } from "../core/util.js";
import { Plan, B, prepareGround } from "./builder.js";

const H = 24;
const FLOORS = [6, 12, 18];

export const TOWER = {
  id: "torre", nome: "Torre do Mago em Ruínas", raio: 8, alturaMax: 4, xp: 60, xpLimpo: 200, repovoar: 60,
  nomes: ["Torre de Aldric", "Torre do Eremita", "Torre das Cinzas", "Torre do Vento Norte", "Torre Partida"],
  descricao: "Antiga torre de um arquimago: biblioteca, laboratório e um círculo arcano no topo desabado. Espectros vagam por ela.",
  dica: "§dUma torre em ruínas desponta no horizonte",
  biomas: [""], // qualquer bioma de superfície (exceto água, filtrado pelo terreno)
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const stone = () => p.pick([["minecraft:stone_bricks", 50], ["minecraft:mossy_stone_bricks", 30], ["minecraft:cracked_stone_bricks", 15],
      ["minecraft:andesite", 5]]);
    const ground = (x, z) => (Math.hypot(x, z) <= 6.5 ? p.pick([["minecraft:stone_bricks", 3], ["minecraft:mossy_stone_bricks", 2]])
      : p.pick([["minecraft:grass_block", 4], ["minecraft:coarse_dirt", 1]]));
    const prep = await prepareGround(dim, p, -8, -8, 8, 8, H + 4, "minecraft:stone", ground);

    const collapseCenter = 0; // desaba do lado leste (ângulo 0)
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) {
        const d = Math.hypot(x, z);
        if (d < 4.5 || d > 5.5) continue;
        const ang = (Math.atan2(z, x) * 180) / Math.PI;
        const diff = Math.abs(((ang - collapseCenter + 540) % 360) - 180);
        const top = diff < 70 ? 13 + Math.floor(rnd() * 5) + Math.floor(diff / 14) : H - Math.floor(rnd() * 2);
        for (let y = 1; y <= top; y++) p.set(x, y, z, stone());
      }
    }
    // base com degraus ao redor
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) {
        const d = Math.hypot(x, z);
        if (d > 5.5 && d <= 6.5 && rnd() < 0.8) p.set(x, 1, z, B.slab("minecraft:stone_brick_slab"));
      }
    }
    // pisos (madeira) com abertura para a escada de mão
    for (const fy of FLOORS) {
      for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
          if (Math.hypot(x, z) >= 4.5 || (x === 0 && z === -4)) continue;
          if (fy === 18 && x > 1 && rnd() < 0.55) continue; // piso superior desabado
          p.set(x, fy, z, fy === 18 && Math.abs(x) <= 1 && Math.abs(z) <= 1 ? "minecraft:chiseled_stone_bricks" : "minecraft:spruce_planks");
        }
      }
    }
    for (let y = 1; y <= 18; y++) p.set(0, y, -4, B.ladder("south"));
    // porta ao sul com degrau
    p.set(0, 1, 5, "minecraft:air").set(0, 2, 5, "minecraft:air").set(0, 3, 5, B.stairs("minecraft:stone_brick_stairs", "south", true));
    p.set(0, 0, 6, B.stairs("minecraft:stone_brick_stairs", "north"));
    // janelas
    for (const y of [3, 9, 15]) {
      p.set(0, y, 5, B.fence("minecraft:glass_pane", false, true)).set(-5, y, 0, B.fence("minecraft:glass_pane", true, false));
      p.set(5, y, 0, B.fence("minecraft:glass_pane", true, false));
    }
    // térreo: abandono
    p.set(-3, 1, 2, "minecraft:cauldron").set(3, 1, 2, B.barrel()).set(3, 1, 1, B.barrel()).set(-2, 1, -2, B.stairs("minecraft:spruce_stairs", "east"));
    p.set(-3, 5, -2, "minecraft:web").set(3, 5, -1, "minecraft:web").set(2, 1, -3, "minecraft:cobblestone").set(1, 1, 3, "minecraft:gravel");
    p.set(-1, 1, 3, B.lantern());
    // 1º andar: biblioteca
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const d = Math.hypot(x, z);
        if (d >= 3.5 && d < 4.5 && !(x === 0 && z <= -3) && !(x === -4 && z === 0) && !(x === 4 && z === 0)) {
          p.set(x, 7, z, "minecraft:bookshelf").set(x, 8, z, rnd() < 0.85 ? "minecraft:bookshelf" : "minecraft:air");
        }
      }
    }
    p.set(0, 7, 0, B.facing("minecraft:lectern", "south")).set(1, 7, 1, B.candle(3)).set(-1, 7, 1, B.candle(2));
    p.chest(2, 7, 2, "west", "torre", { lore: "aldric_1" });
    p.set(-2, 10, 2, "minecraft:web").set(-1, 7, -2, "minecraft:moss_carpet").set(0, 7, -2, "minecraft:moss_carpet");
    // 2º andar: laboratório de alquimia
    p.set(2, 13, 0, "minecraft:brewing_stand").set(-2, 13, 0, "minecraft:cauldron").set(-2, 13, 2, B.barrel()).set(2, 13, 2, B.barrel());
    p.set(1, 13, -2, B.cluster()).set(-1, 13, -1, B.cluster()).set(0, 13, 1, B.candle(4)).set(3, 13, -1, B.lantern("minecraft:soul_lantern"));
    p.chest(0, 13, 3, "north", "torre");
    // topo: círculo arcano desabado
    p.set(0, 19, 0, "minecraft:enchanting_table");
    for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [1, 1], [-1, -1], [-1, 1]]) p.set(x, 19, z, B.cluster());
    for (const [x, z] of [[-3, 2], [-3, -2]]) p.set(x, 19, z, B.lantern("minecraft:soul_lantern"));
    p.chest(0, 19, -2, "south", "torre_topo", { lore: "aldric_2" });
    // escombros do desabamento do lado leste
    for (let i = 0; i < 26; i++) {
      const a = (rnd() - 0.5) * 2.2;
      const r = 6 + rnd() * 4;
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      if (Math.abs(x) > 8 || Math.abs(z) > 8) continue;
      p.set(x, 1, z, p.pick([["minecraft:cobblestone", 3], ["minecraft:mossy_cobblestone", 3], ["minecraft:stone_bricks", 2], ["minecraft:gravel", 1]]));
      if (rnd() < 0.3) p.set(x, 2, z, B.slab("minecraft:cobblestone_slab"));
    }
    p.mark("espectro", 2, 8, -1).mark("espectro", -2, 14, -1).mark("xama", 2, 1, 0);
    p.box("area", -8, -2, -8, 8, H + 2, 8);
    return { plans: [prep, p], plan: p };
  },
  guards: [["espectro", `${NS}:espectro`], ["xama", `${NS}:goblin_xama`]],
};
