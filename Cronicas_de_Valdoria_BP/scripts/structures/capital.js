// Aurendel, a Capital de Valdoria (85 x 85 blocos): muralha com três portões e torres, Praça da Coroa com fonte e estátua,
// mercado, Catedral da Luz, Guilda, alquimia, academia, taverna, Ferraria e Arsenal Real, joalheria, casas, estábulos e, ao
// norte, o castelo: muralha interna, Salão do Trono, jardim real e a Torre do Mago da Corte.
// A cidade é grande demais para ser construída de uma vez (os chunks das bordas costumam não estar carregados), então a
// planta completa é dividida em 3 x 3 setores: o setor central é construído ao criar o local e os outros quando seus chunks
// carregam (scripts/npc/capital.js).
import { Plan, B, prepareGround } from "./builder.js";
import { house, gableRoof, watchtower, lampPost, smallTree } from "./arch.js";

export const R = 42; // muralha externa em |x| = 42 ou |z| = 42
export const SECTION_EDGES = [[-44, -15], [-14, 14], [15, 44]];
export const CENTER_SECTION = 4;
const AIR = "minecraft:air";
const W1 = "minecraft:stone_bricks";

const wallMix = (p) => p.pick([["minecraft:stone_bricks", 7], ["minecraft:polished_andesite", 2], ["minecraft:cracked_stone_bricks", 1]]);

/** Terreno da cidade (usado no preparo de cada setor). */
export function cityGround(p) {
  return (x, z) => {
    const d = Math.hypot(x, z);
    if (d <= 10.5) return (Math.abs(x) + Math.abs(z)) % 4 === 0 ? "minecraft:chiseled_stone_bricks" : (d <= 4.5 ? "minecraft:polished_andesite" : "minecraft:stone_bricks");
    const avenue = Math.abs(x) <= 3 && z >= -17 && z <= R;
    const cross = Math.abs(z) <= 2 && Math.abs(x) <= R;
    if (avenue || cross) return (x + z) % 5 === 0 ? "minecraft:polished_andesite" : "minecraft:stone_bricks";
    if (z <= -17 && Math.abs(x) <= 34) return p.pick([["minecraft:grass_block", 8], ["minecraft:moss_block", 1]]);
    return p.pick([["minecraft:grass_path", 5], ["minecraft:grass_block", 6], ["minecraft:coarse_dirt", 1]]);
  };
}

// ---------------------------------------------------------------------- peças
function bigGate(p, axis, c, w = 3, h = 6) {
  // portão de (2w+1) de largura num muro (axis "z": muro norte/sul em z = c; "x": muro leste/oeste em x = c)
  const at = (i, y) => (axis === "z" ? [i, y, c] : [c, y, i]);
  for (let i = -w; i <= w; i++) for (let y = 1; y <= h; y++) p.set(...at(i, y), AIR);
  for (let i = -w; i <= w; i++) p.set(...at(i, h + 1), "minecraft:chiseled_stone_bricks");
  for (const s of [-1, 1]) {
    // torres do portão
    const base = s * (w + 3);
    for (let i = base - 2; i <= base + 2; i++) {
      for (let k = -2; k <= 2; k++) {
        for (let y = 1; y <= h + 6; y++) {
          const edge = Math.abs(i - base) === 2 || Math.abs(k) === 2;
          const pos = axis === "z" ? [i, y, c + k] : [c + k, y, i];
          p.set(...pos, edge ? wallMix(p) : (y === h + 2 ? "minecraft:spruce_planks" : AIR));
        }
        const top = axis === "z" ? [i, h + 7, c + k] : [c + k, h + 7, i];
        if (Math.abs(i - base) === 2 || Math.abs(k) === 2) p.set(...top, (i + k) % 2 === 0 ? W1 : AIR);
      }
    }
    const lamp = axis === "z" ? [s * (w + 1), h - 1, c + (c > 0 ? 1 : -1)] : [c + (c > 0 ? 1 : -1), h - 1, s * (w + 1)];
    p.set(...lamp, B.lantern("minecraft:lantern", true));
  }
  for (let i = -w; i <= w; i++) p.set(...at(i, h), B.fence("minecraft:iron_bars", axis === "z", axis !== "z")); // grade levantada
  for (let i = -w + 1; i <= w - 1; i += 2) {
    const ban = axis === "z" ? [i, h - 1, c + (c > 0 ? 1 : -1)] : [c + (c > 0 ? 1 : -1), h - 1, i];
    p.set(...ban, "minecraft:red_wool");
  }
}

function outerWalls(p) {
  for (let i = -R; i <= R; i++) {
    for (const [x, z] of [[i, -R], [i, R], [-R, i], [R, i]]) {
      for (let y = 1; y <= 7; y++) p.set(x, y, z, wallMix(p));
      p.set(x, 8, z, (i + R) % 2 === 0 ? W1 : B.slab("minecraft:stone_brick_slab"));
    }
  }
  // passarela interna
  for (let i = -R + 1; i <= R - 1; i++) {
    for (const [x, z] of [[i, -R + 1], [i, R - 1], [-R + 1, i], [R - 1, i]]) p.set(x, 7, z, B.slab("minecraft:stone_brick_slab", true));
  }
  bigGate(p, "z", R, 3, 6);
  bigGate(p, "x", R, 2, 5);
  bigGate(p, "x", -R, 2, 5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) watchtower(p, sx * (R - 3), sz * (R - 3), 13, sz > 0 ? "north" : "south");
  // escadas de acesso à muralha (sul)
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) p.set(sx * (12 + k), 1 + k, R - 1, B.stairs("minecraft:stone_brick_stairs", sx > 0 ? "east" : "west"));
}

function plaza(p) {
  // fonte em dois níveis e a estátua do rei fundador
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      const d = Math.hypot(x, z);
      if (d <= 4.4 && d > 3.4) p.set(x, 1, z, "minecraft:polished_andesite");
      else if (d <= 3.4) p.set(x, 0, z, "minecraft:water").set(x, -1, z, "minecraft:stone_bricks");
    }
  }
  p.fill(-1, 0, -1, 1, 1, 1, "minecraft:chiseled_stone_bricks");
  p.set(0, 2, 0, "minecraft:polished_andesite").set(0, 3, 0, "minecraft:polished_andesite").set(0, 4, 0, "minecraft:chiseled_stone_bricks")
    .set(0, 5, 0, "minecraft:gold_block");
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(dx, 2, dz, ["minecraft:water", {}]);
  p.set(1, 3, 0, B.slab("minecraft:stone_brick_slab", true)).set(-1, 3, 0, B.slab("minecraft:stone_brick_slab", true));
  // bancos, árvores e lampiões
  for (const [x, z, d] of [[-7, 4, "east"], [7, 4, "west"], [-7, -4, "east"], [7, -4, "west"], [4, 7, "north"], [-4, 7, "north"]]) {
    p.set(x, 1, z, B.stairs("minecraft:spruce_stairs", d));
  }
  for (const [x, z] of [[7, 7], [-7, 7], [7, -7], [-7, -7]]) smallTree(p, x, z, 4);
  for (const [x, z] of [[5, 9], [-5, 9], [9, -5], [-9, 5], [5, -9], [-5, -9]]) lampPost(p, x, z, 3);
  p.mark("npc_cidadao", 3, 1, 6).mark("npc_cidadao", -6, 1, -2).mark("npc_cidadao", 8, 1, 1);
}

function stall(p, x0, z0, wool, front) {
  for (const dx of [0, 2]) for (const dz of [0, 2]) for (let y = 1; y <= 2; y++) p.set(x0 + dx, y, z0 + dz, B.fence("minecraft:spruce_fence"));
  for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 2; dz++) p.set(x0 + dx, 3, z0 + dz, wool);
  for (let dx = 0; dx <= 2; dx++) p.set(x0 + dx, 1, z0 + front, B.slab("minecraft:spruce_slab", true));
  p.set(x0 + 1, 2, z0 + front, B.barrel());
}

function market(p) {
  // bancas ao longo da avenida sul
  stall(p, 5, 13, "minecraft:red_wool", 0);
  stall(p, 5, 18, "minecraft:yellow_wool", 0);
  stall(p, -8, 13, "minecraft:blue_wool", 0);
  stall(p, -8, 18, "minecraft:green_wool", 0);
  stall(p, 5, 23, "minecraft:purple_wool", 0);
  p.mark("npc_mercador", 6, 1, 15).mark("npc_mercador", -7, 1, 20).mark("npc_cidadao", 2, 1, 24).mark("npc_cidadao", -2, 1, 33);
  for (const z of [12, 22, 32, 40]) lampPost(p, 4, z, 3), lampPost(p, -4, z, 3);
  for (const x of [-38, -28, -18, 18, 28, 38]) lampPost(p, x, 3, 3);
}

function cathedral(p) {
  // nave 15 x 21, paredes altas, vitrais, altar e campanário
  const x1 = 23, x2 = 37, z1 = 16, z2 = 37, h = 11;
  p.fill(x1, 1, z1, x2, h + 9, z2, AIR);
  p.fill(x1, 0, z1, x2, 0, z2, "minecraft:polished_andesite");
  for (let x = x1; x <= x2; x++) {
    for (let z = z1; z <= z2; z++) {
      const edge = x === x1 || x === x2 || z === z1 || z === z2;
      if (!edge) continue;
      for (let y = 1; y <= h; y++) {
        const pillar = (x - x1) % 4 === 0 && (z - z1) % 4 === 0;
        let b = pillar || y === 1 || y === h ? "minecraft:smooth_quartz" : "minecraft:calcite";
        const winX = (x === x1 || x === x2) && (z - z1) % 4 === 2 && y >= 3 && y <= 8;
        const winZ = (z === z1 || z === z2) && (x - x1) % 4 === 2 && y >= 3 && y <= 8;
        if (winX || winZ) b = y % 2 ? "minecraft:yellow_stained_glass" : "minecraft:light_blue_stained_glass";
        p.set(x, y, z, b);
      }
    }
  }
  gableRoof(p, x1, z1, x2, z2, h + 1, { stairs: "minecraft:deepslate_tile_stairs", slab: "minecraft:deepslate_tile_slab",
    gable: "minecraft:calcite", axis: "z" });
  // porta principal (oeste, para a avenida) com arco
  for (let z = 25; z <= 28; z++) for (let y = 1; y <= 4; y++) p.set(x1, y, z, AIR);
  p.set(x1, 5, 25, "minecraft:chiseled_quartz_block").set(x1, 5, 28, "minecraft:chiseled_quartz_block");
  p.set(x1 - 1, 1, 24, B.lantern()).set(x1 - 1, 1, 29, B.lantern());
  // bancos, tapete e altar
  for (let x = x1 + 3; x <= x2 - 5; x += 2) {
    for (const z of [19, 20, 21, 22, 31, 32, 33, 34]) p.set(x, 1, z, B.stairs("minecraft:birch_stairs", "west"));
  }
  for (let x = x1 + 1; x <= x2 - 3; x++) for (let z = 25; z <= 28; z++) p.set(x, 1, z, ["minecraft:yellow_carpet", {}]);
  p.fill(x2 - 2, 1, 23, x2 - 1, 1, 30, "minecraft:smooth_quartz");
  p.set(x2 - 1, 2, 26, "minecraft:enchanting_table").set(x2 - 1, 2, 24, B.candle(4)).set(x2 - 1, 2, 29, B.candle(4))
    .set(x2 - 1, 2, 27, "minecraft:gold_block");
  for (const z of [20, 33]) for (let y = 7; y <= 10; y++) p.set(30, y, z, ["minecraft:iron_chain", { pillar_axis: "y" }]);
  p.set(30, 6, 20, B.lantern("minecraft:lantern", true)).set(30, 6, 33, B.lantern("minecraft:lantern", true));
  // campanário no canto sudeste
  for (let y = h + 1; y <= h + 9; y++) {
    for (let x = x2 - 3; x <= x2; x++) {
      for (let z = z2 - 3; z <= z2; z++) {
        const edge = x === x2 - 3 || x === x2 || z === z2 - 3 || z === z2;
        p.set(x, y, z, edge ? (y >= h + 6 && y <= h + 7 && (x === x2 - 2 || x === x2 - 1 || z === z2 - 2 || z === z2 - 1) ? AIR : "minecraft:calcite") : AIR);
      }
    }
  }
  p.set(x2 - 2, h + 7, z2 - 2, ["minecraft:bell", { attachment: "hanging", direction: 0, toggle_bit: false }]);
  p.fill(x2 - 3, h + 10, z2 - 3, x2, h + 10, z2, "minecraft:deepslate_tiles");
  p.set(x2 - 2, h + 11, z2 - 2, "minecraft:gold_block");
  p.mark("npc_curandeira", x2 - 3, 1, 26);
}

function castle(p) {
  // muralha interna do castelo (z = -16, x = +-34) com portão
  for (let x = -34; x <= 34; x++) {
    for (let y = 1; y <= 9; y++) p.set(x, y, -16, wallMix(p));
    p.set(x, 10, -16, (x % 2 === 0) ? W1 : AIR);
  }
  for (let z = -41; z <= -16; z++) {
    for (const x of [-34, 34]) {
      for (let y = 1; y <= 9; y++) p.set(x, y, z, wallMix(p));
      p.set(x, 10, z, (z % 2 === 0) ? W1 : AIR);
    }
  }
  bigGate(p, "z", -16, 2, 5);
  p.mark("npc_cavaleiro_real", -3, 1, -14).mark("npc_cavaleiro_real", 3, 1, -14);
  // pátio: caminho até o castelo
  for (let z = -20; z <= -17; z++) for (let x = -2; x <= 2; x++) p.set(x, 0, z, "minecraft:polished_andesite");

  // torre de menagem: Salão do Trono
  const x1 = -13, x2 = 13, z1 = -38, z2 = -21, h = 12;
  p.fill(x1, 1, z1, x2, h + 12, z2, AIR);
  p.fill(x1, 0, z1, x2, 0, z2, "minecraft:polished_deepslate");
  for (let x = x1; x <= x2; x++) {
    for (let z = z1; z <= z2; z++) {
      const edge = x === x1 || x === x2 || z === z1 || z === z2;
      if (edge) {
        for (let y = 1; y <= h; y++) {
          const win = (x === x1 || x === x2) && (z - z1) % 4 === 2 && y >= 4 && y <= 8;
          p.set(x, y, z, win ? B.fence("minecraft:glass_pane", false, true) : (y === 1 ? "minecraft:polished_andesite" : wallMix(p)));
        }
        p.set(x, h + 1, z, (x + z) % 2 === 0 ? W1 : AIR);
      }
    }
  }
  p.fill(x1 + 1, h, z1 + 1, x2 - 1, h, z2 - 1, "minecraft:dark_oak_planks"); // teto
  // torres dos cantos (5 x 5, mais altas)
  for (const [cx, cz] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) {
    for (let y = 1; y <= h + 8; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        for (let z = cz - 2; z <= cz + 2; z++) {
          const edge = Math.abs(x - cx) === 2 || Math.abs(z - cz) === 2;
          if (edge) p.set(x, y, z, wallMix(p));
        }
      }
    }
    for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) {
      if (Math.abs(x - cx) === 2 || Math.abs(z - cz) === 2) p.set(x, h + 9, z, (x + z) % 2 === 0 ? W1 : AIR);
    }
    p.fill(cx - 1, h + 8, cz - 1, cx + 1, h + 8, cz + 1, "minecraft:dark_oak_planks");
    p.set(cx, h + 9, cz, B.fence("minecraft:dark_oak_fence")).set(cx, h + 10, cz, B.fence("minecraft:dark_oak_fence")).set(cx, h + 11, cz, "minecraft:red_wool");
  }
  // portão do castelo
  for (let x = -2; x <= 2; x++) for (let y = 1; y <= 5; y++) p.set(x, y, z2, AIR);
  p.set(-2, 6, z2, "minecraft:chiseled_stone_bricks").set(2, 6, z2, "minecraft:chiseled_stone_bricks").set(0, 7, z2, "minecraft:gold_block");
  p.set(-3, 3, z2 + 1, B.lantern()).set(3, 3, z2 + 1, B.lantern());
  // interior: tapete, colunas, estandartes, lustres e o trono
  for (let z = z1 + 4; z <= z2 - 1; z++) for (let x = -1; x <= 1; x++) p.set(x, 1, z, ["minecraft:red_carpet", {}]);
  for (let z = z1 + 3; z <= z2 - 2; z += 4) {
    for (const x of [-7, 7]) {
      p.fill(x, 1, z, x, h - 1, z, "minecraft:polished_andesite");
      p.set(x, 1, z, "minecraft:chiseled_stone_bricks").set(x, h - 1, z, "minecraft:gold_block");
      for (let y = 4; y <= 7; y++) p.set(x + (x > 0 ? 1 : -1), y, z, "minecraft:red_wool");
    }
  }
  for (const z of [z1 + 6, z1 + 12]) {
    for (let y = h - 3; y <= h - 1; y++) p.set(0, y, z, ["minecraft:iron_chain", { pillar_axis: "y" }]);
    p.set(0, h - 4, z, B.lantern("minecraft:lantern", true));
  }
  // estrado e trono
  p.fill(-4, 1, z1 + 1, 4, 1, z1 + 3, "minecraft:polished_deepslate");
  for (let x = -4; x <= 4; x++) p.set(x, 1, z1 + 4, B.stairs("minecraft:polished_deepslate_stairs", "south"));
  p.fill(-3, 2, z1 + 1, 3, 2, z1 + 2, "minecraft:red_carpet");
  p.set(0, 2, z1 + 1, B.stairs("minecraft:quartz_stairs", "south")).set(-1, 2, z1 + 1, "minecraft:gold_block").set(1, 2, z1 + 1, "minecraft:gold_block")
    .set(0, 3, z1 + 1, "minecraft:gold_block").set(0, 4, z1 + 1, "minecraft:gold_block").set(-1, 3, z1 + 1, B.slab("minecraft:quartz_slab"))
    .set(1, 3, z1 + 1, B.slab("minecraft:quartz_slab"));
  for (let y = 3; y <= 9; y++) p.set(0, y, z1, "minecraft:red_wool");
  p.set(-4, 2, z1 + 1, B.lantern()).set(4, 2, z1 + 1, B.lantern());
  p.mark("npc_rei", 0, 2, z1 + 3);
  p.mark("trono", 0, 2, z1 + 1);
  // mesa da Chancelaria (ala oeste do salão)
  p.set(-11, 1, z2 - 5, B.slab("minecraft:dark_oak_slab", true)).set(-11, 1, z2 - 6, B.slab("minecraft:dark_oak_slab", true))
    .set(-11, 1, z2 - 4, "minecraft:lectern").set(-12, 1, z2 - 7, "minecraft:bookshelf").set(-12, 2, z2 - 7, "minecraft:bookshelf")
    .set(-11, 2, z2 - 5, B.candle(2));
  p.chest(-12, 1, z2 - 3, "east", "capital_chancelaria");
  p.mark("npc_chanceler", -10, 1, z2 - 5);
  for (const [x, z] of [[-3, z1 + 6], [3, z1 + 6], [-3, z1 + 12], [3, z1 + 12]]) p.mark("npc_cavaleiro_real", x, 1, z);
  p.box("salao_trono", x1 + 1, 1, z1 + 1, x2 - 1, h - 1, z2 - 1);

  // Torre do Mago da Corte (leste do castelo)
  const tx = 24, tz = -31, tr = 4, th = 16;
  for (let y = 0; y <= th; y++) {
    for (let x = tx - tr; x <= tx + tr; x++) {
      for (let z = tz - tr; z <= tz + tr; z++) {
        const d = Math.hypot(x - tx, z - tz);
        if (d > tr + 0.3) continue;
        if (y === 0) p.set(x, 0, z, "minecraft:polished_deepslate");
        else if (d > tr - 0.8) {
          const win = y % 5 === 3 && (x === tx || z === tz);
          p.set(x, y, z, win ? "minecraft:purple_stained_glass" : p.pick([["minecraft:deepslate_bricks", 4], ["minecraft:polished_deepslate", 1]]));
        } else p.set(x, y, z, y === 6 || y === 11 ? "minecraft:dark_oak_planks" : AIR);
      }
    }
  }
  for (let k = 0; k <= 6; k++) {
    const y = th + 1 + k;
    const rr = tr - Math.floor(k * 0.7);
    for (let x = tx - rr; x <= tx + rr; x++) for (let z = tz - rr; z <= tz + rr; z++) {
      if (Math.hypot(x - tx, z - tz) <= rr + 0.3) p.set(x, y, z, "minecraft:purple_terracotta");
    }
  }
  p.set(tx, th + 8, tz, "minecraft:amethyst_block");
  for (let y = 1; y <= 2; y++) p.set(tx - tr, y, tz, AIR);
  // escada de mão até os andares
  for (let y = 1; y <= 11; y++) p.set(tx + tr - 1, y, tz, B.ladder("west"));
  p.set(tx + tr - 1, 6, tz, B.ladder("west")).set(tx + tr - 1, 11, tz, B.ladder("west"));
  p.set(tx + 2, 1, tz - 2, "minecraft:enchanting_table").set(tx + 2, 1, tz + 2, "minecraft:bookshelf").set(tx + 1, 1, tz + 3, "minecraft:bookshelf")
    .set(tx - 2, 1, tz - 3, "minecraft:brewing_stand").set(tx, 1, tz + 3, B.cluster()).set(tx + 3, 1, tz, B.candle(3))
    .set(tx, 7, tz, "minecraft:lodestone").set(tx + 1, 7, tz + 1, B.cluster());
  p.mark("npc_mago_corte", tx, 1, tz);

  // Jardim Real (oeste do castelo)
  for (let x = -31; x <= -17; x++) {
    for (let z = -39; z <= -19; z++) {
      const edge = x === -31 || x === -17 || z === -39 || z === -19;
      if (edge && !(z === -19 && x >= -25 && x <= -23)) p.set(x, 1, z, ["minecraft:oak_leaves", { persistent_bit: true, update_bit: false }]);
      else if ((x + z) % 4 === 0 && !edge) p.set(x, 1, z, p.pick([["minecraft:poppy", 2], ["minecraft:cornflower", 2], ["minecraft:oxeye_daisy", 1],
        ["minecraft:allium", 1]]));
    }
  }
  for (let x = -26; x <= -22; x++) for (let z = -31; z <= -27; z++) {
    if (Math.abs(x + 24) === 2 || Math.abs(z + 29) === 2) p.set(x, 1, z, "minecraft:polished_andesite");
    else p.set(x, 0, z, "minecraft:water");
  }
  smallTree(p, -28, -35, 5);
  smallTree(p, -20, -35, 5);
  smallTree(p, -28, -23, 4);
  for (const [x, z, d] of [[-24, -25, "north"], [-24, -33, "south"]]) p.set(x, 1, z, B.stairs("minecraft:birch_stairs", d));
  p.mark("npc_cidadao", -24, 1, -22);
}

function districts(p) {
  // ---- faixa norte (entre a praça e o castelo)
  house(p, { x1: 14, z1: -14, x2: 26, z2: -5, h: 6, door: ["south", 20], wood: "minecraft:stripped_dark_oak_log",
    plaster: "minecraft:white_terracotta", base: "minecraft:stone_bricks", floor: "minecraft:dark_oak_planks",
    roof: { stairs: "minecraft:spruce_stairs", slab: "minecraft:spruce_slab", gable: "minecraft:dark_oak_planks" } });
  for (let x = 17; x <= 23; x++) p.set(x, 1, -10, x === 17 || x === 23 ? B.log("minecraft:dark_oak_log", "x") : B.slab("minecraft:dark_oak_slab", true));
  for (let x = 15; x <= 25; x++) if (x % 3) p.set(x, 1, -13, "minecraft:bookshelf");
  p.set(15, 1, -6, "minecraft:cartography_table").set(25, 1, -6, B.facing("minecraft:lectern", "west"));
  p.mark("npc_mestre_guilda", 20, 1, -12);
  house(p, { x1: 30, z1: -13, x2: 38, z2: -6, h: 4, door: ["south", 34], wood: "minecraft:stripped_mangrove_log",
    roof: { stairs: "minecraft:mangrove_stairs", slab: "minecraft:mangrove_slab", gable: "minecraft:mangrove_planks" } });
  p.set(31, 1, -12, "minecraft:brewing_stand").set(37, 1, -12, ["minecraft:cauldron", { cauldron_liquid: "water", fill_level: 6 }])
    .set(33, 1, -12, B.cluster()).set(37, 1, -7, B.barrel());
  p.mark("npc_alquimista", 34, 1, -10);
  house(p, { x1: -26, z1: -14, x2: -14, z2: -5, h: 5, door: ["south", -20], wood: "minecraft:stripped_birch_log",
    plaster: "minecraft:calcite", base: "minecraft:stone_bricks", floor: "minecraft:birch_planks",
    roof: { stairs: "minecraft:stone_brick_stairs", slab: "minecraft:stone_brick_slab", gable: "minecraft:stone_bricks" } });
  for (const x of [-24, -21, -18]) p.set(x, 1, -12, "minecraft:target").set(x, 1, -8, B.stairs("minecraft:birch_stairs", "north"));
  p.set(-25, 1, -13, "minecraft:bookshelf").set(-15, 1, -13, "minecraft:bookshelf");
  p.mark("npc_instrutor", -20, 1, -10);
  house(p, { x1: -38, z1: -13, x2: -30, z2: -6, h: 4, door: ["south", -34] });

  // ---- sudoeste: taverna, ferraria, arsenal, casas e estábulos
  house(p, { x1: -27, z1: 6, x2: -14, z2: 15, h: 5, door: ["north", -20], wood: "minecraft:stripped_spruce_log",
    plaster: "minecraft:spruce_planks", base: "minecraft:cobblestone", floor: "minecraft:oak_planks",
    roof: { stairs: "minecraft:spruce_stairs", slab: "minecraft:spruce_slab", gable: "minecraft:spruce_planks" } });
  for (let x = -26; x <= -21; x++) p.set(x, 1, 9, x === -21 ? "minecraft:spruce_planks" : B.slab("minecraft:spruce_slab", true));
  for (let x = -26; x <= -23; x++) p.set(x, 1, 7, B.barrel());
  for (const [tx, tz] of [[-17, 9], [-17, 13], [-22, 13]]) {
    p.set(tx, 1, tz, B.fence("minecraft:spruce_fence")).set(tx, 2, tz, ["minecraft:brown_carpet", {}]);
    p.set(tx - 1, 1, tz, B.stairs("minecraft:oak_stairs", "west")).set(tx + 1, 1, tz, B.stairs("minecraft:oak_stairs", "east"));
  }
  p.set(-15, 1, 14, B.fire("minecraft:campfire", "west"));
  p.mark("npc_taverneiro", -24, 1, 8).mark("npc_cidadao", -18, 1, 11);
  house(p, { x1: -40, z1: 6, x2: -31, z2: 14, h: 4, door: ["east", 10], open: ["north"], base: "minecraft:stone_bricks",
    floor: "minecraft:stone_bricks", roof: { stairs: "minecraft:stone_stairs", slab: "minecraft:cobblestone_slab", gable: "minecraft:cobblestone" } });
  p.set(-39, 1, 13, B.facing("minecraft:blast_furnace", "north")).set(-38, 1, 13, B.facing("minecraft:furnace", "north"))
    .set(-36, 1, 10, B.facing("minecraft:anvil", "east")).set(-33, 1, 13, "minecraft:smithing_table").set(-39, 1, 8, "minecraft:grindstone");
  p.mark("npc_ferreiro", -35, 1, 9);
  house(p, { x1: -40, z1: 18, x2: -31, z2: 26, h: 5, door: ["east", 22], wood: "minecraft:stripped_dark_oak_log",
    plaster: "minecraft:polished_andesite", base: "minecraft:stone_bricks", floor: "minecraft:polished_deepslate",
    roof: { stairs: "minecraft:deepslate_tile_stairs", slab: "minecraft:deepslate_tile_slab", gable: "minecraft:deepslate_tiles" } });
  for (const z of [19, 21, 23, 25]) p.set(-39, 1, z, B.barrel());
  p.set(-39, 2, 20, "minecraft:iron_block").set(-39, 2, 24, "minecraft:iron_block").set(-33, 1, 25, "minecraft:smithing_table")
    .set(-36, 1, 25, B.facing("minecraft:anvil", "north"));
  p.mark("npc_armeiro", -35, 1, 22);
  house(p, { x1: -26, z1: 19, x2: -20, z2: 25, h: 4, door: ["north", -23] });
  house(p, { x1: -16, z1: 19, x2: -9, z2: 25, h: 4, door: ["north", -12], wood: "minecraft:stripped_oak_log" });
  house(p, { x1: -26, z1: 30, x2: -19, z2: 38, h: 4, door: ["north", -22], wood: "minecraft:stripped_birch_log" });
  house(p, { x1: -15, z1: 30, x2: -8, z2: 38, h: 4, door: ["east", 34] });
  // estábulos do Capitão
  for (let x = -40; x <= -31; x++) {
    for (let z = 30; z <= 39; z++) {
      const edge = x === -40 || x === -31 || z === 30 || z === 39;
      if (edge && !(x === -31 && (z === 34 || z === 35))) p.set(x, 1, z, B.fence("minecraft:spruce_fence", x === -40 || x === -31, z === 30 || z === 39));
    }
  }
  for (let x = -40; x <= -31; x++) for (let z = 36; z <= 39; z++) p.set(x, 4, z, B.slab("minecraft:spruce_slab"));
  for (const [x, z] of [[-40, 36], [-31, 36], [-40, 39], [-31, 39]]) for (let y = 2; y <= 3; y++) p.set(x, y, z, B.fence("minecraft:spruce_fence"));
  p.set(-39, 1, 38, B.log("minecraft:hay_block")).set(-38, 1, 38, B.log("minecraft:hay_block"));
  p.mark("cavalo", -36, 1, 33).mark("cavalo", -34, 1, 36).mark("npc_capitao", -29, 1, 35);

  // ---- sudeste: joalheria, casas e a catedral
  house(p, { x1: 8, z1: 6, x2: 16, z2: 13, h: 4, door: ["north", 12], wood: "minecraft:stripped_cherry_log",
    plaster: "minecraft:white_terracotta", floor: "minecraft:cherry_planks",
    roof: { stairs: "minecraft:cherry_stairs", slab: "minecraft:cherry_slab", gable: "minecraft:cherry_planks" } });
  for (let x = 10; x <= 14; x++) p.set(x, 1, 9, x === 12 ? "minecraft:glass" : B.slab("minecraft:cherry_slab", true));
  p.set(9, 1, 12, B.barrel()).set(15, 1, 12, "minecraft:gold_block").set(10, 2, 9, B.cluster());
  p.mark("npc_joalheiro", 12, 1, 11);
  house(p, { x1: 20, z1: 5, x2: 27, z2: 12, h: 4, door: ["north", 23] });
  house(p, { x1: 31, z1: 5, x2: 39, z2: 12, h: 4, door: ["north", 35], wood: "minecraft:stripped_oak_log" });
  house(p, { x1: 8, z1: 18, x2: 15, z2: 25, h: 4, door: ["west", 21], wood: "minecraft:stripped_birch_log" });
  house(p, { x1: 8, z1: 30, x2: 16, z2: 38, h: 4, door: ["west", 34] });
  cathedral(p);
  p.mark("npc_cidadao", 19, 1, 28).mark("npc_cidadao", 30, 1, 3);
}

// ---------------------------------------------------------------------- planta completa
export function cityPlan(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  outerWalls(p);
  plaza(p);
  market(p);
  districts(p);
  castle(p);
  p.mark("guarda", 6, 1, R - 3).mark("guarda", -6, 1, R - 3).mark("guarda", R - 3, 1, 4).mark("guarda", -R + 3, 1, -4);
  p.box("area", -R - 2, -3, -R - 2, R + 2, 30, R + 2);
  p.box("muros", -R, -3, -R, R, 30, R);
  return p;
}

// ---------------------------------------------------------------------- setores
const inv = (dx, dz, rot) => {
  // inverso de rotXZ (rotação de 90° * rot)
  switch (rot & 3) {
    case 1: return [dz, -dx];
    case 2: return [-dx, -dz];
    case 3: return [-dz, dx];
    default: return [dx, dz];
  }
};
const sectionOf = (lx, lz) => {
  const ix = SECTION_EDGES.findIndex(([a, b]) => lx >= a && lx <= b);
  const iz = SECTION_EDGES.findIndex(([a, b]) => lz >= a && lz <= b);
  return ix < 0 || iz < 0 ? -1 : iz * 3 + ix;
};
export function localOf(plan, w) {
  const [lx, lz] = inv(w.x - plan.origin.x, w.z - plan.origin.z, plan.rot);
  return { x: lx, y: w.y - plan.origin.y, z: lz };
}
export function sectionAt(plan, w) {
  const l = localOf(plan, w);
  return sectionOf(l.x, l.z);
}
/** Bordas locais de um setor: [x1, z1, x2, z2]. */
export function sectionBounds(i) {
  const [x1, x2] = SECTION_EDGES[i % 3];
  const [z1, z2] = SECTION_EDGES[Math.floor(i / 3)];
  return [x1, z1, x2, z2];
}

/** Divide as operações, baús e marcações da planta completa nos 9 setores (as caixas são recortadas nas bordas). */
export function splitSections(full) {
  const secs = Array.from({ length: 9 }, () => {
    const p = new Plan(full.origin, full.rot, full.rnd);
    return p;
  });
  for (const op of full.ops) {
    if (op.k === "s") {
      const i = sectionAt(full, op.p);
      if (i >= 0) secs[i].ops.push(op);
      continue;
    }
    const a = localOf(full, op.a);
    const b = localOf(full, op.b);
    const lx1 = Math.min(a.x, b.x), lx2 = Math.max(a.x, b.x), lz1 = Math.min(a.z, b.z), lz2 = Math.max(a.z, b.z);
    for (let i = 0; i < 9; i++) {
      const [sx1, sz1, sx2, sz2] = sectionBounds(i);
      const x1 = Math.max(lx1, sx1), x2 = Math.min(lx2, sx2), z1 = Math.max(lz1, sz1), z2 = Math.min(lz2, sz2);
      if (x1 > x2 || z1 > z2) continue;
      const wa = full.world(x1, a.y, z1);
      const wb = full.world(x2, b.y, z2);
      secs[i].ops.push({ k: "f", a: wa, b: wb, id: op.id });
    }
  }
  for (const c of full.chests) {
    const i = sectionAt(full, c.pos);
    if (i >= 0) secs[i].chests.push(c);
  }
  for (const [name, list] of Object.entries(full.marks)) {
    if (name === "area" || name === "muros" || name === "salao_trono") continue;
    for (const pos of list) {
      const i = sectionAt(full, pos);
      if (i >= 0) (secs[i].marks[name] = secs[i].marks[name] || []).push(pos);
    }
  }
  return secs;
}

/** Prepara o terreno de um setor (mesma regra em todos). */
export function prepareSection(dim, full, i) {
  const [x1, z1, x2, z2] = sectionBounds(i);
  const cx1 = Math.max(x1, -R - 2), cx2 = Math.min(x2, R + 2), cz1 = Math.max(z1, -R - 2), cz2 = Math.min(z2, R + 2);
  return prepareGround(dim, full, cx1, cz1, cx2, cz2, 26, "minecraft:dirt", cityGround(full));
}

export const CAPITAL = {
  id: "capital", nome: "Aurendel, Capital de Valdoria", raio: 20, alturaMax: 7, xp: 300, limpeza: false, distGen: 58,
  biomas: ["plains", "meadow", "sunflower", "savanna", "forest", "birch", "cherry", "river"],
  nomes: ["Aurendel, Capital de Valdoria"],
  descricao: "A capital do reino: o castelo do Rei Aldemar III, a Chancelaria, a Catedral da Luz, o mercado e as guildas.",
  dica: "§6Torres e estandartes vermelhos surgem no horizonte: Aurendel, a capital!",
  async plan(dim, origin, rot, rnd) {
    const full = cityPlan(origin, rot, rnd);
    const secs = splitSections(full);
    const prep = await prepareSection(dim, full, CENTER_SECTION);
    const center = secs[CENTER_SECTION];
    // a planta devolvida ao registro: marcações completas, mas só os baús do setor central
    const view = new Plan(full.origin, full.rot, full.rnd);
    view.marks = full.marks;
    view.chests = center.chests;
    return { plans: [prep, center], plan: view };
  },
};
