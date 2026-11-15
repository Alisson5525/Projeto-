// Vila de Valdoria: muralha com 4 portões e torres, praça com poço, mercado, ferraria, taverna, templo, alquimista,
// salão da Guilda dos Aventureiros, casas, estábulo e plantações. Os moradores são criados pelo módulo de NPCs.
import { Plan, B, prepareGround } from "./builder.js";
import { house, gableRoof, watchtower, lampPost, smallTree } from "./arch.js";

const R = 24; // muralha em |x| = 24 ou |z| = 24
const AIR = "minecraft:air";

function wallMix(p) {
  return p.pick([["minecraft:stone_bricks", 6], ["minecraft:cobblestone", 3], ["minecraft:mossy_stone_bricks", 2], ["minecraft:mossy_cobblestone", 1]]);
}

function gate(p, axis, c) {
  // portão de 3 de largura no muro (axis "z": muro norte/sul em z = c; axis "x": muro leste/oeste em x = c)
  const at = (i, y) => (axis === "z" ? [i, y, c] : [c, y, i]);
  for (let i = -1; i <= 1; i++) for (let y = 1; y <= 4; y++) p.set(...at(i, y), AIR);
  for (const i of [-2, 2]) for (let y = 1; y <= 6; y++) p.set(...at(i, y), B.log("minecraft:stripped_spruce_log"));
  for (let i = -2; i <= 2; i++) p.set(...at(i, 5), B.log("minecraft:stripped_spruce_log", axis === "z" ? "x" : "z"));
  for (const i of [-1, 1]) p.set(...at(i, 4), B.lantern("minecraft:lantern", true));
  for (const i of [-2, 2]) p.set(...at(i, 7), B.lantern("minecraft:lantern"));
  p.set(...at(0, 6), "minecraft:chiseled_stone_bricks");
}

export const VILLAGE = {
  id: "vila", nome: "Vila de Valdoria", raio: 26, alturaMax: 6, xp: 80, limpeza: false, biomas: ["plains", "forest", "meadow", "savanna",
    "taiga", "birch", "sunflower", "cherry", "river", "grove"],
  distGen: 38,
  nomes: ["Vila de Pedravale", "Vila de Ribeira Alta", "Vila de Carvalhal", "Vila de Monteclaro", "Vila de Vauverde", "Vila de Brumafria"],
  descricao: "Vila murada do Reino de Valdoria: mercado, ferraria, taverna, templo, alquimista e o salão da Guilda dos Aventureiros.",
  dica: "§6Você avista as muralhas de uma vila",
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const ground = (x, z) => {
      const road = Math.abs(x) <= 2 || Math.abs(z) <= 2;
      if (Math.hypot(x, z) <= 7.5) return (Math.abs(x) + Math.abs(z)) % 3 === 0 ? "minecraft:polished_andesite" : "minecraft:stone_bricks";
      if (road && Math.abs(x) <= R && Math.abs(z) <= R) return p.pick([["minecraft:grass_path", 7], ["minecraft:gravel", 2], ["minecraft:coarse_dirt", 1]]);
      return p.pick([["minecraft:grass_block", 12], ["minecraft:coarse_dirt", 1]]);
    };
    const prep = await prepareGround(dim, p, -R - 2, -R - 2, R + 2, R + 2, 18, "minecraft:dirt", ground);

    // ---------------------------------------------------------------- muralha, portões e torres
    for (let i = -R; i <= R; i++) {
      for (const [x, z] of [[i, -R], [i, R], [-R, i], [R, i]]) {
        for (let y = 1; y <= 4; y++) p.set(x, y, z, wallMix(p));
        if ((i + R) % 2 === 0) p.set(x, 5, z, "minecraft:stone_bricks");
        else p.set(x, 5, z, B.slab("minecraft:stone_brick_slab"));
      }
    }
    gate(p, "z", R);
    gate(p, "z", -R);
    gate(p, "x", R);
    gate(p, "x", -R);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) watchtower(p, sx * (R - 2), sz * (R - 2), 9, sz > 0 ? "north" : "south");

    // ---------------------------------------------------------------- praça central com poço, bancos e árvores
    p.set(0, 0, 0, "minecraft:water").set(0, -1, 0, "minecraft:water").set(0, -2, 0, "minecraft:cobblestone");
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && z === 0) continue;
        p.set(x, 1, z, "minecraft:cobblestone").set(x, -1, z, "minecraft:cobblestone");
        if (Math.abs(x) === 1 && Math.abs(z) === 1) p.set(x, 2, z, B.fence("minecraft:spruce_fence")).set(x, 3, z, B.fence("minecraft:spruce_fence"));
        p.set(x, 4, z, B.slab("minecraft:spruce_slab"));
      }
    }
    p.set(0, 4, 0, B.slab("minecraft:spruce_slab")).set(0, 3, 0, ["minecraft:iron_chain", { pillar_axis: "y" }]);
    for (const [x, z, d] of [[-5, 4, "north"], [5, -4, "south"], [4, 5, "west"], [-4, -5, "east"]]) {
      p.set(x, 1, z, B.stairs("minecraft:spruce_stairs", d));
    }
    for (const [x, z] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) smallTree(p, x, z, 4);
    p.set(-3, 1, -6, ["minecraft:flower_pot", { update_bit: false }]);
    for (const [x, z] of [[3, 12], [-3, 12], [3, -12], [-3, -12], [12, 3], [-5, 3], [12, -3], [-12, -3], [3, 20], [-3, -20]]) lampPost(p, x, z);

    // ---------------------------------------------------------------- Salão da Guilda dos Aventureiros (NE)
    house(p, { x1: 9, z1: -19, x2: 20, z2: -10, h: 6, door: ["south", 14], wood: "minecraft:stripped_dark_oak_log",
      plaster: "minecraft:white_terracotta", base: "minecraft:stone_bricks", floor: "minecraft:dark_oak_planks",
      roof: { stairs: "minecraft:spruce_stairs", slab: "minecraft:spruce_slab", gable: "minecraft:dark_oak_planks" } });
    for (let x = 12; x <= 17; x++) p.set(x, 1, -15, x === 12 || x === 17 ? B.log("minecraft:dark_oak_log", "x") : B.slab("minecraft:dark_oak_slab", true));
    for (const x of [12, 14, 16]) p.set(x, 1, -16, B.stairs("minecraft:spruce_stairs", "north")).set(x + 1, 1, -14, B.stairs("minecraft:spruce_stairs", "south"));
    for (let x = 10; x <= 19; x++) if (x % 3 !== 0) p.set(x, 1, -18, "minecraft:bookshelf").set(x, 2, -18, "minecraft:bookshelf");
    p.set(10, 1, -12, B.facing("minecraft:lectern", "east")).set(19, 1, -12, "minecraft:cartography_table")
      .set(19, 1, -13, "minecraft:crafting_table").set(10, 1, -16, "minecraft:fletching_table");
    p.set(14, 2, -15, B.candle(3)).set(15, 2, -15, B.candle(2));
    p.mark("npc_mestre_guilda", 14, 1, -17).mark("npc_instrutor", 18, 1, -11);
    // quadro de avisos ao lado da porta
    p.set(16, 1, -9, B.log("minecraft:dark_oak_log")).set(16, 2, -9, "minecraft:dark_oak_planks").set(17, 2, -9, "minecraft:dark_oak_planks")
      .set(17, 1, -9, B.log("minecraft:dark_oak_log"));

    // ---------------------------------------------------------------- casas
    house(p, { x1: 3, z1: -20, x2: 7, z2: -15, h: 4, door: ["south", 5] });
    house(p, { x1: -7, z1: -20, x2: -3, z2: -15, h: 4, door: ["south", -5], wood: "minecraft:stripped_oak_log" });
    for (const [x, z] of [[4, -19], [-4, -19]]) p.set(x, 1, z, B.barrel()).set(x + (x > 0 ? 2 : -2), 1, z, "minecraft:crafting_table");
    p.set(6, 1, -16, ["minecraft:red_carpet", {}]).set(-6, 1, -16, ["minecraft:blue_carpet", {}]);

    // ---------------------------------------------------------------- Templo da Luz (NW) com a curandeira
    house(p, { x1: -19, z1: -19, x2: -9, z2: -9, h: 7, door: ["south", -14], wood: "minecraft:stripped_birch_log",
      plaster: "minecraft:calcite", base: "minecraft:stone_bricks", floor: "minecraft:polished_andesite",
      roof: { stairs: "minecraft:stone_brick_stairs", slab: "minecraft:stone_brick_slab", gable: "minecraft:stone_bricks", axis: "z" } });
    p.fill(-16, 1, -18, -12, 1, -17, "minecraft:chiseled_stone_bricks");
    p.set(-14, 2, -18, "minecraft:enchanting_table").set(-16, 2, -17, B.candle(3)).set(-12, 2, -17, B.candle(3));
    for (const z of [-15, -13, -11]) for (const x of [-17, -16, -12, -11]) p.set(x, 1, z, B.stairs("minecraft:birch_stairs", "south"));
    p.set(-18, 1, -10, B.barrel()).set(-10, 1, -10, ["minecraft:flower_pot", { update_bit: false }]);
    p.mark("npc_curandeira", -14, 1, -16);

    // ---------------------------------------------------------------- Ferraria (SE): meio aberta, com forja e bigorna
    house(p, { x1: 5, z1: 9, x2: 12, z2: 16, h: 4, door: ["north", 8], open: ["west"], base: "minecraft:stone_bricks",
      floor: "minecraft:stone_bricks", roof: { stairs: "minecraft:stone_stairs", slab: "minecraft:cobblestone_slab", gable: "minecraft:cobblestone" } });
    p.set(11, 1, 15, B.facing("minecraft:blast_furnace", "west")).set(11, 1, 14, B.facing("minecraft:furnace", "west"))
      .set(11, 1, 13, ["minecraft:cauldron", { cauldron_liquid: "lava", fill_level: 6 }]).set(8, 1, 12, B.facing("minecraft:anvil", "north"))
      .set(9, 1, 15, "minecraft:smithing_table").set(6, 1, 15, "minecraft:grindstone").set(6, 1, 10, B.barrel()).set(7, 1, 10, B.barrel());
    for (let y = 5; y <= 9; y++) p.set(11, y, 15, "minecraft:cobblestone");
    p.mark("npc_ferreiro", 9, 1, 12);

    // ---------------------------------------------------------------- Alquimia (SE)
    house(p, { x1: 15, z1: 9, x2: 21, z2: 15, h: 4, door: ["north", 18], wood: "minecraft:stripped_mangrove_log",
      plaster: "minecraft:white_terracotta", roof: { stairs: "minecraft:mangrove_stairs", slab: "minecraft:mangrove_slab", gable: "minecraft:mangrove_planks" } });
    p.set(16, 1, 14, "minecraft:brewing_stand").set(20, 1, 14, "minecraft:brewing_stand").set(18, 1, 14, ["minecraft:cauldron", { cauldron_liquid: "water", fill_level: 6 }])
      .set(16, 1, 10, "minecraft:bookshelf").set(20, 1, 10, B.barrel()).set(16, 2, 14, B.candle(2)).set(20, 1, 12, B.cluster());
    p.mark("npc_alquimista", 18, 1, 12);

    // ---------------------------------------------------------------- Estábulo (SE)
    for (let x = 12; x <= 19; x++) {
      for (let z = 18; z <= 22; z++) {
        const edge = x === 12 || x === 19 || z === 18 || z === 22;
        if (edge && !(z === 18 && (x === 15 || x === 16))) p.set(x, 1, z, B.fence("minecraft:spruce_fence", x === 12 || x === 19, z === 18 || z === 22));
        if ((x === 12 || x === 19) && (z === 18 || z === 22)) p.set(x, 2, z, B.fence("minecraft:spruce_fence")).set(x, 3, z, B.fence("minecraft:spruce_fence"));
      }
    }
    for (let x = 12; x <= 19; x++) for (let z = 18; z <= 22; z++) if (z >= 20) p.set(x, 4, z, B.slab("minecraft:spruce_slab"));
    p.set(18, 1, 21, B.log("minecraft:hay_block")).set(17, 1, 21, B.log("minecraft:hay_block")).set(13, 1, 21, ["minecraft:cauldron", { cauldron_liquid: "water", fill_level: 6 }]);
    p.mark("cavalo", 14, 1, 20).mark("cavalo", 16, 1, 19);

    // ---------------------------------------------------------------- mercado: 4 bancas na rua leste-oeste
    const stall = (x0, z0, wool, front) => {
      for (const dx of [0, 2]) for (const dz of [0, 2]) for (let y = 1; y <= 2; y++) p.set(x0 + dx, y, z0 + dz, B.fence("minecraft:spruce_fence"));
      for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 2; dz++) p.set(x0 + dx, 3, z0 + dz, wool);
      for (let dx = 0; dx <= 2; dx++) p.set(x0 + dx, 1, z0 + front, B.slab("minecraft:spruce_slab", true));
      p.set(x0 + 1, 2, z0 + front, B.barrel());
    };
    stall(9, 4, "minecraft:red_wool", 0);
    stall(17, 4, "minecraft:yellow_wool", 0);
    stall(9, -6, "minecraft:blue_wool", 2);
    stall(17, -6, "minecraft:green_wool", 2);
    p.mark("npc_mercador", 10, 1, 5);

    // ---------------------------------------------------------------- Taverna do Javali Dourado (SW)
    house(p, { x1: -19, z1: 4, x2: -8, z2: 13, h: 5, door: ["north", -13], wood: "minecraft:stripped_spruce_log",
      plaster: "minecraft:spruce_planks", base: "minecraft:cobblestone", floor: "minecraft:oak_planks",
      roof: { stairs: "minecraft:spruce_stairs", slab: "minecraft:spruce_slab", gable: "minecraft:spruce_planks" } });
    for (let x = -18; x <= -14; x++) p.set(x, 1, 7, x === -14 ? "minecraft:spruce_planks" : B.slab("minecraft:spruce_slab", true));
    for (let x = -18; x <= -15; x++) p.set(x, 1, 5, B.barrel()).set(x, 2, 5, x % 2 ? B.barrel() : AIR);
    for (const [tx, tz] of [[-11, 7], [-11, 11], [-15, 11]]) {
      p.set(tx, 1, tz, B.fence("minecraft:spruce_fence")).set(tx, 2, tz, ["minecraft:brown_carpet", {}]);
      p.set(tx - 1, 1, tz, B.stairs("minecraft:oak_stairs", "west")).set(tx + 1, 1, tz, B.stairs("minecraft:oak_stairs", "east"));
    }
    p.set(-9, 1, 12, B.fire("minecraft:campfire", "west")).set(-18, 1, 12, "minecraft:smoker");
    p.mark("npc_taverneiro", -16, 1, 6).mark("forasteiro", -15, 1, 12);

    // ---------------------------------------------------------------- plantações (SW) com canais de água
    for (let x = -19; x <= -6; x++) {
      for (let z = 16; z <= 22; z++) {
        if (z === 19) {
          p.set(x, 0, z, "minecraft:water");
          continue;
        }
        p.set(x, 0, z, ["minecraft:farmland", { moisturized_amount: 7 }]);
        const crop = x < -12 ? "minecraft:wheat" : x < -8 ? "minecraft:carrots" : "minecraft:potatoes";
        p.set(x, 1, z, [crop, { growth: 2 + Math.floor(p.rnd() * 6) }]);
      }
    }
    for (let x = -19; x <= -5; x++) for (const z of [15, 23]) p.set(x, 1, z, B.fence("minecraft:oak_fence", false, true));
    p.set(-12, 1, 15, AIR).set(-20, 1, 19, "minecraft:composter");
    p.mark("npc_fazendeiro", -12, 1, 14);

    // ---------------------------------------------------------------- moradores ao ar livre e guardas
    p.mark("npc_anciao", -3, 1, -4).mark("npc_capitao", 3, 1, 21);
    p.mark("guarda", -3, 1, -21).mark("guarda", 21, 1, 3).mark("guarda", -21, 1, -3);
    p.mark("ataque", 0, 1, R + 8).mark("ataque", 0, 1, -R - 8).mark("ataque", R + 8, 1, 0);
    p.box("area", -R - 2, -3, -R - 2, R + 2, 16, R + 2);
    p.box("muros", -R, -3, -R, R, 16, R);
    return { plans: [prep, p], plan: p };
  },
};

export { gableRoof };
