// Ruínas de Kar'Dum: o portão anão escavado na encosta (superfície) e as salas sob a montanha, construídas em duas etapas
// quando o jogador se aproxima (mesmo esquema da Cripta).
// Etapa A: escadaria, Salão dos Reis (inscrição do enigma), Ponte Partida (lajes que desabam sobre um fosso de magma),
//          Galeria dos Pilões (armadilha) e Forja Rúnica.
// Etapa B: Portão Rúnico (aberto pelo enigma das quatro runas), Salão do Trono de Durgan e Câmara do Tesouro.
import { NS } from "../core/util.js";
import { Plan, B, prepareGround } from "./builder.js";

export const F = -14; // piso das salas (relativo ao chão da superfície)
const AIR = "minecraft:air";
const WALL = "minecraft:polished_andesite";
const STEPS = 14;
const wallMix = (p) => p.pick([["minecraft:stone_bricks", 40], ["minecraft:polished_andesite", 25], ["minecraft:cracked_stone_bricks", 15],
  ["minecraft:andesite", 10], ["minecraft:tuff_bricks", 10]]);
const floorMix = (p) => p.pick([["minecraft:polished_andesite", 45], ["minecraft:stone_bricks", 25], ["minecraft:polished_tuff", 20],
  ["minecraft:cracked_stone_bricks", 10]]);

/** Salas: interior de (x1, F+1, z1) a (x2, F+h, z2). */
export const ROOMS_A = {
  salao: { x1: -9, z1: -37, x2: 9, z2: -19, h: 7, nome: "Salão dos Reis" },
  ponte: { x1: -28, z1: -33, x2: -13, z2: -23, h: 6, nome: "Ponte Partida" },
  pilones: { x1: 13, z1: -29, x2: 27, z2: -27, h: 4, nome: "Galeria dos Pilões" },
  forja: { x1: 28, z1: -35, x2: 40, z2: -21, h: 7, nome: "Forja Rúnica" },
};
export const ROOMS_B = {
  trono: { x1: -11, z1: -65, x2: 11, z2: -42, h: 10, nome: "Salão do Trono" },
  tesouro: { x1: -4, z1: -73, x2: 4, z2: -67, h: 5, nome: "Câmara do Tesouro" },
};
/** Fosso da ponte (x) e linhas da ponte (z). */
const PIT = { x1: -25, x2: -15, depth: 6 };
const BRIDGE_Z = [-29, -28, -27];
export const HAMMER_ROWS = [16, 20, 24];
export const RUNES = ["martelo", "bigorna", "chama", "montanha"];
export const RUNE_NAMES = { martelo: "o Martelo", bigorna: "a Bigorna", chama: "a Chama", montanha: "a Montanha" };
export const RUNE_VERBS = { martelo: "o Martelo bate", bigorna: "a Bigorna sustenta", chama: "a Chama desperta", montanha: "a Montanha guarda" };

function shell(p, r, extraDown = 0) {
  p.fill(r.x1 - 1, F - 1 - extraDown, r.z1 - 1, r.x2 + 1, F + r.h + 1, r.z2 + 1, WALL);
}
function carve(p, r, key) {
  p.fill(r.x1, F + 1, r.z1, r.x2, F + r.h, r.z2, AIR);
  p.box(`sala_${key}`, r.x1, F + 1, r.z1, r.x2, F + r.h, r.z2);
}
function dress(p, r) {
  for (let x = r.x1; x <= r.x2; x++) for (let z = r.z1; z <= r.z2; z++) p.set(x, F, z, floorMix(p));
  for (let y = F + 1; y <= F + r.h; y++) {
    for (let x = r.x1 - 1; x <= r.x2 + 1; x++) {
      if (p.rnd() < 0.45) p.set(x, y, r.z1 - 1, wallMix(p));
      if (p.rnd() < 0.45) p.set(x, y, r.z2 + 1, wallMix(p));
    }
    for (let z = r.z1; z <= r.z2; z++) {
      if (p.rnd() < 0.45) p.set(r.x1 - 1, y, z, wallMix(p));
      if (p.rnd() < 0.45) p.set(r.x2 + 1, y, z, wallMix(p));
    }
  }
}
function pass(p, x1, z1, x2, z2, h = 4) {
  p.fill(x1, F + 1, z1, x2, F + h, z2, AIR);
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) p.set(x, F, z, floorMix(p));
}
/** Estátua de um rei anão (3 blocos) sobre um plinto. */
function statue(p, x, z, faceDir) {
  p.set(x, F + 1, z, "minecraft:chiseled_stone_bricks").set(x, F + 2, z, "minecraft:polished_andesite")
    .set(x, F + 3, z, "minecraft:polished_andesite").set(x, F + 4, z, "minecraft:chiseled_tuff");
  const [dx, dz] = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[faceDir];
  p.set(x + dx, F + 3, z + dz, B.slab("minecraft:polished_diorite_slab", true)); // barba
  p.set(x, F + 5, z, "minecraft:gold_block");
}

// ====================================================================== superfície: o portão na encosta
export const KARDUM = {
  id: "kardum", nome: "Ruínas de Kar'Dum", raio: 10, alturaMax: 9, minY: 62, xp: 120, limpeza: false, distGen: 30,
  biomas: ["mountain", "peaks", "stony", "hills", "meadow", "grove", "windswept", "slopes", "taiga"],
  descricao: "Portões anões selados depois da Ruptura. Sob a montanha: o Salão dos Reis, a Forja Rúnica e o trono de Durgan.",
  dica: "§6Um martelo distante ecoa sob a montanha...",
  nomes: ["Ruínas de Kar'Dum", "Portões de Kar'Dum", "Salões de Kar'Dum"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const ground = (x, z) => (Math.abs(x) <= 3 && z > -3 ? p.pick([["minecraft:stone_bricks", 3], ["minecraft:cracked_stone_bricks", 1]])
      : p.pick([["minecraft:stone", 4], ["minecraft:andesite", 2], ["minecraft:gravel", 2], ["minecraft:coarse_dirt", 1], ["minecraft:tuff", 1]]));
    const prep = await prepareGround(dim, p, -10, -10, 10, 10, 16, "minecraft:stone", ground);
    // massa de pedra da encosta onde o portão foi escavado
    for (let z = -10; z <= -3; z++) {
      const top = 8 + Math.floor(p.rnd() * 2);
      for (let x = -8; x <= 8; x++) {
        const h = Math.max(2, top - Math.floor(Math.abs(x) / 2) - (z === -3 ? 0 : Math.floor(p.rnd() * 2)));
        p.fill(x, 1, z, x, h, z, p.pick([["minecraft:stone", 5], ["minecraft:andesite", 2], ["minecraft:tuff", 1]]));
      }
    }
    // fachada
    for (let x = -6; x <= 6; x++) {
      for (let y = 1; y <= 8; y++) p.set(x, y, -3, Math.abs(x) === 6 || y === 8 ? "minecraft:polished_andesite" : wallMix(p));
    }
    for (let x = -6; x <= 6; x++) p.set(x, 9, -3, x % 2 === 0 ? "minecraft:chiseled_stone_bricks" : B.slab("minecraft:stone_brick_slab"));
    for (const x of [-4, 4]) for (let y = 1; y <= 7; y++) p.set(x, y, -2, y === 7 ? "minecraft:gold_block" : "minecraft:polished_andesite");
    // porta em arco (o túnel termina no entulho; a Etapa A escava a escadaria)
    p.fill(-2, 1, -9, 2, 5, -3, AIR);
    p.fill(-2, 0, -4, 2, 0, -3, "minecraft:stone_bricks");
    p.set(-2, 5, -3, B.stairs("minecraft:stone_brick_stairs", "east", true)).set(2, 5, -3, B.stairs("minecraft:stone_brick_stairs", "west", true))
      .set(0, 6, -3, "minecraft:chiseled_stone_bricks").set(0, 7, -3, "minecraft:gold_block");
    for (let x = -2; x <= 2; x++) for (let y = 1; y <= 4; y++) p.set(x, y, -5, p.pick([["minecraft:cobbled_deepslate", 3], ["minecraft:gravel", 1], ["minecraft:andesite", 1]]));
    // estátuas guardiãs dos dois lados
    for (const x of [-6, 6]) {
      p.set(x, 1, -1, "minecraft:chiseled_stone_bricks").set(x, 2, -1, "minecraft:polished_andesite").set(x, 3, -1, "minecraft:polished_andesite")
        .set(x, 4, -1, "minecraft:chiseled_tuff").set(x, 3, 0, B.slab("minecraft:polished_diorite_slab", true))
        .set(x, 5, -1, B.slab("minecraft:stone_brick_slab"));
    }
    // entulho e restos de uma guarda antiga
    for (const [x, z] of [[-3, 2], [4, 3], [-7, 4], [6, 6], [0, 6]]) p.set(x, 1, z, p.pick([["minecraft:cobblestone", 2], ["minecraft:andesite", 1], ["minecraft:mossy_cobblestone", 1]]));
    p.set(3, 1, 1, B.facing("minecraft:anvil", "east")).set(-3, 1, 0, B.lantern()).set(3, 1, -1, B.lantern());
    p.set(-5, 1, 2, B.barrel()).set(5, 1, 4, "minecraft:iron_block");
    p.mark("entrada", 0, 1, -1);
    p.box("area", -10, -2, -10, 10, 12, 10);
    return { plans: [prep, p], plan: p };
  },
  afterBuild(rec) {
    rec.m = { a: 0, b: 0, portao: false, runas: [], chefe: "pronto", tesouro: false, derrotadoEm: 0 };
  },
};

/** Ordem das runas do local (determinística pela semente) e o texto da inscrição. */
export function runeOrder(seed) {
  const arr = [...RUNES];
  let s = Math.abs(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function inscription(order) {
  const words = ["Primeiro", "depois", "então", "por fim"];
  return order.map((r, i) => `${words[i]} ${RUNE_VERBS[r]}`).join("; ") + ".";
}

/** Caminho seguro pela ponte (a partir da semente): uma laje inteira por coluna, ligada à vizinha. */
function bridgeTiles(rnd) {
  const solid = new Set();
  let z = BRIDGE_Z[1 + Math.floor(rnd() * 3) - 1] ?? -28;
  for (let x = PIT.x2; x >= PIT.x1; x--) {
    solid.add(`${x},${z}`);
    const nz = Math.max(-29, Math.min(-27, z + (rnd() < 0.5 ? 0 : rnd() < 0.5 ? -1 : 1)));
    if (nz !== z) solid.add(`${x},${nz}`);
    z = nz;
  }
  for (let x = PIT.x1; x <= PIT.x2; x++) for (const bz of BRIDGE_Z) if (rnd() < 0.3) solid.add(`${x},${bz}`);
  return solid;
}

// ====================================================================== etapa A
export function stageA(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  const R = ROOMS_A;
  // 1) cascas
  for (let i = 1; i <= STEPS; i++) p.fill(-3, -i - 1, -4 - i, 3, Math.min(-i + 5, 0), -4 - i, WALL);
  shell(p, R.salao);
  shell(p, R.ponte, PIT.depth);
  shell(p, R.pilones);
  shell(p, R.forja);
  p.fill(-13, F - 1, -30, -9, F + 5, -26, WALL).fill(9, F - 1, -30, 13, F + 5, -26, WALL);
  // 2) escavação e acabamento das salas
  for (const [k, r] of Object.entries(R)) carve(p, r, k);
  for (const r of Object.values(R)) dress(p, r);
  // 3) passagens e escadaria por último (o acabamento das paredes não pode tapá-las)
  for (let i = 1; i <= STEPS; i++) p.fill(-2, -i + 1, -4 - i, 2, -i + 4, -4 - i, AIR);
  p.fill(-2, 1, -5, 2, 4, -5, AIR); // o entulho do portão
  pass(p, -13, -29, -9, -27);
  pass(p, 9, -29, 13, -27);
  pass(p, 27, -29, 28, -27);
  for (let i = 1; i <= STEPS; i++) {
    for (let x = -2; x <= 2; x++) p.set(x, -i, -4 - i, B.stairs("minecraft:stone_brick_stairs", "south"));
    if (i % 4 === 0) p.set(-3, -i + 2, -4 - i, B.lantern()).set(3, -i + 2, -4 - i, B.lantern());
  }

  // Salão dos Reis
  for (const z of [-23, -28, -33]) {
    for (const x of [-6, 6]) {
      p.fill(x, F + 1, z, x, F + 6, z, "minecraft:polished_andesite").set(x, F + 7, z, "minecraft:gold_block");
      p.set(x, F + 1, z, "minecraft:chiseled_stone_bricks");
    }
  }
  for (const x of [-3, 3]) {
    for (let z = -32; z <= -24; z++) p.set(x, F + 1, z, B.slab("minecraft:spruce_slab", true));
    p.set(x, F + 1, -32, "minecraft:stripped_spruce_log").set(x, F + 1, -24, "minecraft:stripped_spruce_log");
    for (const z of [-30, -27]) p.set(x, F + 2, z, B.candle(2));
  }
  for (const [x, z] of [[-8, -21], [8, -21], [-8, -36], [8, -36]]) p.set(x, F + 1, z, B.fire("minecraft:campfire", "south"));
  for (const z of [-26, -31]) {
    statue(p, -9, z, "east");
    statue(p, 9, z, "west");
  }
  for (const z of [-22, -30]) p.set(0, F + 7, z, B.lantern("minecraft:lantern", true));
  p.set(3, F + 1, -21, B.facing("minecraft:lectern", "south")).mark("inscricao", 3, F + 1, -21);
  p.chest(-8, F + 1, -24, "east", "kardum");
  p.set(-8, F + 1, -25, B.barrel()).set(8, F + 1, -24, B.barrel());
  // Portão Rúnico na parede norte (5 x 5)
  for (let x = -2; x <= 2; x++) {
    for (let y = F + 1; y <= F + 5; y++) p.set(x, y, -38, `${NS}:portao_anao`).mark("portao", x, y, -38);
  }
  p.fill(-3, F + 6, -38, 3, F + 6, -38, "minecraft:chiseled_stone_bricks").set(0, F + 7, -38, "minecraft:gold_block");
  p.set(-6, F + 1, -35, `${NS}:runa_montanha`).mark("runa_montanha", -6, F + 1, -35);
  p.set(-6, F, -35, "minecraft:gold_block");
  for (const [x, z] of [[-4, -22], [4, -34], [-2, -29]]) p.mark("fantasma", x, F + 1, z);
  p.mark("sentinela", 6, F + 1, -36).mark("sentinela", -7, F + 1, -21);

  // Ponte Partida: fosso de magma e lajes (inteiras seguram; as rachadas cedem)
  p.fill(PIT.x1, F - PIT.depth, R.ponte.z1, PIT.x2, F, R.ponte.z2, AIR);
  p.fill(PIT.x1, F - PIT.depth, R.ponte.z1, PIT.x2, F - PIT.depth, R.ponte.z2, "minecraft:magma");
  for (const [x, z] of [[-20, -31], [-17, -25], [-23, -24], [-22, -32]]) p.set(x, F - PIT.depth, z, "minecraft:basalt");
  const solid = bridgeTiles(rnd);
  for (let x = PIT.x1; x <= PIT.x2; x++) {
    for (const z of BRIDGE_Z) {
      if (solid.has(`${x},${z}`)) p.set(x, F, z, "minecraft:deepslate_tiles");
      else p.set(x, F, z, "minecraft:cracked_deepslate_tiles").mark("laje_fraca", x, F, z);
    }
  }
  for (let y = F - PIT.depth + 1; y <= F; y++) p.set(PIT.x2, y, -24, B.ladder("west")); // saída do fosso (presa à parede leste)
  p.box("fosso", PIT.x1, F - PIT.depth, R.ponte.z1, PIT.x2, F - 1, R.ponte.z2);
  for (const z of [-24, -32]) p.set(-13, F + 1, z, B.lantern()).set(-28, F + 1, z, B.lantern());
  for (const z of [-26, -30]) p.set(-20, F + 6, z, B.lantern("minecraft:lantern", true));
  // plataforma do arquivo (lado oeste)
  p.set(-27, F + 1, -28, `${NS}:runa_chama`).mark("runa_chama", -27, F + 1, -28).set(-27, F, -28, "minecraft:gold_block");
  p.chest(-28, F + 1, -31, "east", "kardum_arquivo", { lore: "diario_mestre_runa" });
  p.set(-28, F + 1, -25, "minecraft:bookshelf").set(-28, F + 2, -25, "minecraft:bookshelf").set(-28, F + 1, -24, B.skull());
  p.mark("fantasma_ponte", -27, F + 1, -25);

  // Galeria dos Pilões: martelos de pedra no teto descem em sequência
  for (const x of HAMMER_ROWS) {
    for (const z of [-29, -28, -27]) {
      p.set(x, F + R.pilones.h, z, "minecraft:polished_basalt").mark(`pilao_${x}`, x, F + 1, z);
      p.set(x, F, z, "minecraft:polished_tuff");
    }
    p.set(x, F + 1, -30, "minecraft:chiseled_tuff").set(x, F + 1, -26, "minecraft:chiseled_tuff");
  }
  for (const x of [14, 26]) p.set(x, F + 3, -30, B.lantern()).set(x, F + 3, -26, B.lantern());

  // Forja Rúnica
  for (let z = R.forja.z1; z <= R.forja.z2; z++) {
    p.set(40, F, z, "minecraft:lava");
    p.set(39, F + 1, z, z % 3 === 0 ? "minecraft:chiseled_stone_bricks" : "minecraft:stone_bricks");
  }
  for (const x of [30, 33, 36]) p.set(x, F + 1, -35, B.facing("minecraft:lit_blast_furnace", "south"));
  p.set(31, F + 1, -28, B.facing("minecraft:anvil", "east")).set(35, F + 1, -28, B.facing("minecraft:anvil", "east"));
  p.set(28, F + 1, -34, "minecraft:smithing_table").set(28, F + 1, -22, B.barrel()).set(29, F + 1, -21, B.barrel());
  for (let x = 32; x <= 34; x++) for (let z = -32; z <= -31; z++) p.set(x, F, z, "minecraft:magma");
  p.set(33, F + 1, -31, B.fire("minecraft:campfire", "south"));
  for (const [x, z] of [[30, -25], [36, -25], [33, -33]]) {
    for (let y = F + 4; y <= F + 7; y++) p.set(x, y, z, ["minecraft:iron_chain", { pillar_axis: "y" }]);
    p.set(x, F + 3, z, B.lantern("minecraft:lantern", true));
  }
  p.set(31, F + 1, -23, `${NS}:runa_martelo`).mark("runa_martelo", 31, F + 1, -23).set(31, F, -23, "minecraft:gold_block");
  p.set(37, F + 1, -33, `${NS}:runa_bigorna`).mark("runa_bigorna", 37, F + 1, -33).set(37, F, -33, "minecraft:gold_block");
  p.chest(37, F + 1, -21, "south", "kardum");
  p.mark("sentinela_forja", 32, F + 1, -26).mark("sentinela_forja", 36, F + 1, -30);
  return p;
}

// ====================================================================== etapa B
export function stageB(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  const R = ROOMS_B;
  shell(p, R.trono);
  shell(p, R.tesouro);
  p.fill(-3, F - 1, -42, 3, F + 6, -39, WALL);
  for (const [k, r] of Object.entries(R)) carve(p, r, k);
  for (const r of Object.values(R)) dress(p, r);
  pass(p, -2, -41, 2, -39, 5);
  for (let x = -2; x <= 2; x++) for (let y = F + 1; y <= F + 5; y++) p.mark("porta_arena", x, y, -41);

  // Salão do Trono
  const cz = -54;
  for (let x = R.trono.x1; x <= R.trono.x2; x++) {
    for (let z = R.trono.z1; z <= R.trono.z2; z++) {
      const d = Math.hypot(x, z - cz);
      if (d >= 7.5 && d < 8.5) p.set(x, F, z, "minecraft:chiseled_stone_bricks");
      else if (d < 1.5) p.set(x, F, z, "minecraft:gold_block");
      else if (d >= 3.5 && d < 4.3) p.set(x, F, z, "minecraft:polished_tuff");
    }
  }
  for (const z of [-46, -54, -62]) {
    for (const x of [-9, 9]) {
      p.fill(x, F + 1, z, x, F + 10, z, "minecraft:polished_andesite").set(x, F + 1, z, "minecraft:chiseled_stone_bricks")
        .set(x, F + 6, z, "minecraft:gold_block");
    }
  }
  for (const [x, z] of [[-10, -43], [10, -43], [-10, -64], [10, -64]]) p.set(x, F + 1, z, B.fire("minecraft:soul_campfire", "south"));
  for (const [x, z] of [[-5, -48], [5, -48], [-5, -60], [5, -60]]) {
    for (let y = F + 7; y <= F + 10; y++) p.set(x, y, z, ["minecraft:iron_chain", { pillar_axis: "y" }]);
    p.set(x, F + 6, z, B.lantern("minecraft:soul_lantern", true));
  }
  // estalactites: pontos de queda na Fúria da Montanha
  for (const [x, z] of [[-6, -51], [6, -51], [0, -46], [-3, -58], [3, -58], [-7, -56], [7, -56], [0, -50]]) {
    p.set(x, F + 10, z, ["minecraft:pointed_dripstone", { dripstone_thickness: "base", hanging: true }])
      .set(x, F + 9, z, ["minecraft:pointed_dripstone", { dripstone_thickness: "tip", hanging: true }]);
    p.mark("estalactite", x, F + 1, z);
  }
  // trono (desmorona na vitória e revela o tesouro)
  for (let x = -2; x <= 2; x++) p.set(x, F + 1, -64, "minecraft:polished_andesite").mark("trono", x, F + 1, -64);
  p.set(0, F + 2, -64, B.stairs("minecraft:polished_blackstone_brick_stairs", "north")).mark("trono", 0, F + 2, -64);
  for (const [x, y] of [[-1, F + 2], [1, F + 2], [-1, F + 3], [1, F + 3], [0, F + 3], [0, F + 4]]) {
    p.set(x, y, -65, "minecraft:gold_block").mark("trono", x, y, -65);
  }
  p.set(0, F + 1, -65, "minecraft:gold_block").mark("trono", 0, F + 1, -65);
  p.set(-2, F + 2, -64, B.lantern()).set(2, F + 2, -64, B.lantern());
  p.mark("chefe", 0, F + 1, -60);
  for (let x = -1; x <= 1; x++) for (let y = F + 1; y <= F + 3; y++) p.set(x, y, -66, "minecraft:polished_deepslate").mark("selo", x, y, -66);

  // Câmara do Tesouro (baús preenchidos na vitória)
  for (const [x, z] of [[-3, -72], [3, -72], [0, -73]]) p.set(x, F + 1, z, B.facing("minecraft:chest", "south")).mark("bau_tesouro", x, F + 1, z);
  p.set(-4, F + 1, -73, "minecraft:gold_block").set(4, F + 1, -73, "minecraft:gold_block").set(-4, F + 1, -68, "minecraft:raw_gold_block")
    .set(4, F + 1, -68, "minecraft:raw_iron_block").set(-4, F + 2, -73, "minecraft:raw_gold_block");
  p.set(-2, F + 1, -73, B.candle(3)).set(2, F + 1, -73, B.candle(3)).set(0, F + 5, -70, B.lantern("minecraft:lantern", true));
  return p;
}

export { PIT, BRIDGE_Z };
