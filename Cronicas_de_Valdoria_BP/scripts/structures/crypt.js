// Cripta Ancestral: mausoléu na superfície e masmorra subterrânea construída em duas etapas quando o jogador se aproxima.
// Etapa A: escadaria, salão de entrada, ossuário (ondas), sala secreta, biblioteca (chave) e corredor de espinhos.
// Etapa B: salão das chamas, portão selado, arena do Senhor dos Mortos e câmara do tesouro.
import { NS } from "../core/util.js";
import { Plan, B, prepareGround } from "./builder.js";

export const F = -16; // piso da masmorra (relativo ao chão da superfície)
const WALL = "minecraft:deepslate_bricks";
const AIR = "minecraft:air";
const SOUL = "minecraft:soul_lantern";
const wallMix = (p) => p.pick([[WALL, 55], ["minecraft:cracked_deepslate_bricks", 20], ["minecraft:deepslate_tiles", 15],
  ["minecraft:polished_deepslate", 10]]);
const floorMix = (p) => p.pick([["minecraft:deepslate_tiles", 50], ["minecraft:polished_deepslate", 30], ["minecraft:cobbled_deepslate", 20]]);

/** Salas: interior de (x1, F+1, z1) a (x2, F+h, z2). */
export const ROOMS_A = {
  hall: { x1: -4, z1: -22, x2: 4, z2: -14, h: 5, nome: "Salão de Entrada" },
  ossuario: { x1: -18, z1: -23, x2: -9, z2: -13, h: 5, nome: "Ossuário" },
  segredo: { x1: -24, z1: -20, x2: -21, z2: -16, h: 4, nome: "Sala Secreta" },
  biblioteca: { x1: 9, z1: -23, x2: 18, z2: -13, h: 5, nome: "Biblioteca" },
  espinhos: { x1: -1, z1: -36, x2: 1, z2: -24, h: 3, nome: "Corredor dos Espinhos" },
};
export const ROOMS_B = {
  chamas: { x1: -6, z1: -48, x2: 6, z2: -38, h: 6, nome: "Salão das Chamas" },
  arena: { x1: -10, z1: -71, x2: 10, z2: -51, h: 9, nome: "Câmara do Trono" },
  tesouro: { x1: -4, z1: -78, x2: 4, z2: -73, h: 5, nome: "Câmara do Tesouro" },
};
const SPIKES = { a: [-25, -26, -29, -30, -33, -34], b: [-27, -28, -31, -32] };
const FLAME_ROWS = [-40, -43, -46];

function shell(p, r) {
  p.fill(r.x1 - 1, F - 1, r.z1 - 1, r.x2 + 1, F + r.h + 1, r.z2 + 1, WALL);
}
function carve(p, r, key) {
  p.fill(r.x1, F + 1, r.z1, r.x2, F + r.h, r.z2, AIR);
  p.box(`sala_${key}`, r.x1, F + 1, r.z1, r.x2, F + r.h, r.z2);
}
function dress(p, r) {
  for (let x = r.x1; x <= r.x2; x++) for (let z = r.z1; z <= r.z2; z++) p.set(x, F, z, floorMix(p));
  for (let y = F + 1; y <= F + r.h; y++) {
    for (let x = r.x1 - 1; x <= r.x2 + 1; x++) {
      if (p.rnd() < 0.4) p.set(x, y, r.z1 - 1, wallMix(p));
      if (p.rnd() < 0.4) p.set(x, y, r.z2 + 1, wallMix(p));
    }
    for (let z = r.z1; z <= r.z2; z++) {
      if (p.rnd() < 0.4) p.set(r.x1 - 1, y, z, wallMix(p));
      if (p.rnd() < 0.4) p.set(r.x2 + 1, y, z, wallMix(p));
    }
  }
}
function pass(p, x1, z1, x2, z2, h = 3) {
  p.fill(x1, F + 1, z1, x2, F + h, z2, AIR);
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) p.set(x, F, z, floorMix(p));
}
const cobweb = (p, x, y, z, ch = 0.7) => p.rnd() < ch && p.set(x, y, z, "minecraft:web");

// ====================================================================== superfície: mausoléu e cemitério
export const CRYPT = {
  id: "cripta", nome: "Cripta Ancestral", raio: 9, alturaMax: 3, minY: 40, xp: 80, limpeza: false, biomas: [""],
  descricao: "Mausoléu sobre uma masmorra: ossuário, biblioteca, armadilhas, portão selado e a Câmara do Trono de Malachar.",
  dica: "§8Um mausoléu sombrio surge entre as árvores",
  nomes: ["Cripta de Malachar", "Cripta dos Reis Esquecidos", "Cripta do Véu Cinzento", "Cripta da Coroa Partida"],
  async plan(dim, origin, rot, rnd) {
    const p = new Plan(origin, rot, rnd);
    const ground = (x, z) => (Math.abs(x) <= 5 && Math.abs(z) <= 5 ? "minecraft:deepslate_tiles"
      : Math.abs(x) <= 1 && z > 5 ? "minecraft:cobbled_deepslate"
        : p.pick([["minecraft:coarse_dirt", 3], ["minecraft:podzol", 2], ["minecraft:grass_block", 3], ["minecraft:gravel", 1]]));
    const prep = await prepareGround(dim, p, -9, -9, 9, 9, 14, "minecraft:dirt", ground);

    for (let y = 1; y <= 5; y++) {
      for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
          if (Math.abs(x) !== 4 && Math.abs(z) !== 4) continue;
          p.set(x, y, z, Math.abs(x) === 4 && Math.abs(z) === 4 ? "minecraft:polished_deepslate" : wallMix(p));
        }
      }
    }
    p.fill(-4, 6, -4, 4, 6, 4, "minecraft:deepslate_tiles").fill(-3, 7, -3, 3, 7, 3, "minecraft:deepslate_tiles");
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) p.set(x, 8, z, B.slab("minecraft:deepslate_tile_slab"));
    p.set(0, 8, 0, "minecraft:chiseled_deepslate").set(0, 9, 0, B.lantern(SOUL));
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) p.set(x, 6, z, "minecraft:chiseled_deepslate");
    // porta em arco ao sul e janelas gradeadas
    p.fill(-1, 1, 4, 1, 3, 4, AIR);
    p.set(-1, 3, 4, B.stairs("minecraft:deepslate_brick_stairs", "west", true)).set(1, 3, 4, B.stairs("minecraft:deepslate_brick_stairs", "east", true));
    for (const x of [-4, 4]) for (const y of [2, 3]) p.set(x, y, 0, B.bars(true, false));
    // interior: sarcófagos, velas e a lápide que sela a escadaria
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, 0, z, "minecraft:polished_deepslate");
    p.set(0, 0, 0, "minecraft:chiseled_deepslate");
    for (const x of [-3, 3]) {
      for (let z = -2; z <= 0; z++) p.set(x, 1, z, "minecraft:polished_deepslate");
      p.set(x, 2, -1, B.skull()).set(x, 2, 1, B.candle(2));
    }
    p.set(-3, 1, -3, B.candle(3)).set(3, 1, -3, B.candle(3)).set(0, 5, 2, B.lantern(SOUL, true));
    cobweb(p, -3, 5, -3), cobweb(p, 3, 5, -3), cobweb(p, 3, 5, 3, 0.5);
    // cemitério ao redor
    for (const [x, z] of [[-7, -5], [-7, -1], [-7, 3], [7, -5], [7, -1], [7, 3], [-6, 7], [6, 7]]) {
      p.set(x, 1, z, B.stairs("minecraft:mossy_stone_brick_stairs", x < 0 ? "west" : "east"));
      p.set(x + (x < 0 ? 1 : -1), 0, z, "minecraft:coarse_dirt");
      if (rnd() < 0.4) p.set(x, 1, z + 1, B.candle(1));
    }
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(rnd() * 17) - 8;
      const z = Math.floor(rnd() * 17) - 8;
      if (Math.abs(x) > 5 || Math.abs(z) > 5) p.set(x, 0, z, "minecraft:coarse_dirt").set(x, 1, z, "minecraft:deadbush");
    }
    for (const x of [-2, 2]) {
      p.set(x, 1, 7, B.fence("minecraft:dark_oak_fence")).set(x, 2, 7, B.fence("minecraft:dark_oak_fence")).set(x, 3, 7, B.lantern(SOUL));
    }
    p.mark("entrada", 0, 1, 0);
    p.box("area", -9, -2, -9, 9, 10, 9);
    return { plans: [prep, p], plan: p };
  },
  afterBuild(rec) {
    rec.m = { a: 0, b: 0, portao: false, chefe: "pronto", ondas: 0, tesouro: false, derrotadoEm: 0 };
  },
};

// ====================================================================== etapa A
export function stageA(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  const R = ROOMS_A;
  // 1) cascas
  for (let i = 1; i <= 15; i++) p.fill(-2, -i - 1, 2 - i, 2, Math.min(-i + 4, 0), 2 - i, WALL);
  for (const r of Object.values(R)) shell(p, r);
  p.fill(-8, F - 1, -20, -4, F + 4, -16, WALL).fill(4, F - 1, -20, 8, F + 4, -16, WALL);
  // 2) escavação e acabamento das salas
  for (const [k, r] of Object.entries(R)) carve(p, r, k);
  for (const r of Object.values(R)) dress(p, r);
  // 3) escadaria e passagens depois do acabamento (antes, o acabamento das paredes tapava parte delas)
  for (let i = 1; i <= 15; i++) p.fill(-1, -i + 1, 2 - i, 1, -i + 3, 2 - i, AIR);
  pass(p, -8, -19, -5, -17);
  pass(p, 5, -19, 8, -17);
  pass(p, -1, -23, 1, -23);
  for (let i = 1; i <= 15; i++) {
    for (let x = -1; x <= 1; x++) p.set(x, -i, 2 - i, B.stairs("minecraft:deepslate_brick_stairs", "south"));
    if (i % 5 === 0) p.set(-2, -i + 2, 2 - i, B.lantern(SOUL)).set(2, -i + 2, 2 - i, B.lantern(SOUL));
  }

  // Salão de Entrada
  for (const [x, z] of [[-3, -16], [3, -16], [-3, -20], [3, -20]]) p.fill(x, F + 1, z, x, F + 5, z, "minecraft:polished_deepslate");
  p.set(0, F + 5, -16, B.lantern(SOUL, true)).set(0, F + 5, -20, B.lantern(SOUL, true));
  p.set(-4, F + 1, -22, B.skull()).set(4, F + 1, -14, B.log("minecraft:bone_block")).set(-2, F + 1, -22, B.candle(3)).set(2, F + 1, -22, B.candle(2));
  p.fill(-1, F + 4, -23, 1, F + 4, -23, "minecraft:chiseled_deepslate");
  cobweb(p, -4, F + 5, -14), cobweb(p, 4, F + 5, -22), cobweb(p, -4, F + 5, -22);
  p.mark("esqueleto", -2, F + 1, -15).mark("esqueleto", 2, F + 1, -21);

  // Ossuário (ondas de mortos-vivos) e a passagem secreta
  for (const [x, z] of [[-16, -15], [-11, -15], [-16, -21], [-11, -21]]) p.fill(x, F + 1, z, x, F + 5, z, "minecraft:bone_block");
  for (const z of [-22, -20, -16, -14]) {
    p.set(-18, F + 1, z, B.log("minecraft:bone_block"));
    if (p.rnd() < 0.6) p.set(-18, F + 2, z, B.skull());
    p.set(-9, F + 1, z, B.log("minecraft:bone_block"));
  }
  p.fill(-14, F + 1, -23, -12, F + 1, -23, "minecraft:chiseled_deepslate");
  p.set(-14, F + 2, -23, B.candle(2)).set(-12, F + 2, -23, B.candle(3)).set(-13, F + 2, -23, B.skull());
  p.set(-18, F + 1, -17, B.candle(1)).set(-18, F + 1, -19, B.candle(1)).set(-13, F + 5, -18, B.lantern(SOUL, true));
  cobweb(p, -18, F + 5, -23), cobweb(p, -9, F + 5, -13), cobweb(p, -18, F + 5, -13);
  for (const [x, z] of [[-16, -14], [-10, -14], [-17, -18], [-9, -18], [-16, -22], [-10, -22]]) p.mark("onda", x, F + 1, z);
  p.mark("bau_ossuario", -13, F + 1, -21);
  for (const x of [-20, -19]) for (const y of [F + 1, F + 2]) p.set(x, y, -18, "minecraft:cracked_deepslate_tiles").mark("parede_secreta", x, y, -18);

  // Sala secreta do coveiro
  p.chest(-24, F + 1, -18, "east", "cripta_segredo", { lore: "lamento_coveiro" });
  p.set(-24, F + 1, -16, B.barrel()).set(-24, F + 1, -20, B.barrel()).set(-21, F + 1, -20, "minecraft:raw_gold_block");
  p.set(-23, F + 1, -16, B.candle(3)).set(-22, F + 1, -20, "minecraft:bookshelf");
  cobweb(p, -21, F + 4, -16);

  // Biblioteca (a chave do selo)
  for (let x = 9; x <= 18; x++) {
    for (let y = F + 1; y <= F + 3; y++) {
      if (p.rnd() > 0.12) p.set(x, y, -23, "minecraft:bookshelf");
      if (p.rnd() > 0.12) p.set(x, y, -13, "minecraft:bookshelf");
    }
  }
  for (let z = -22; z <= -14; z++) for (let y = F + 1; y <= F + 3; y++) if (p.rnd() > 0.12 && z !== -18) p.set(18, y, z, "minecraft:bookshelf");
  for (const x of [12, 15]) {
    for (const z of [-21, -20, -16, -15]) {
      p.set(x, F + 1, z, "minecraft:bookshelf").set(x, F + 2, z, "minecraft:bookshelf");
      if (p.rnd() < 0.3) p.set(x, F + 3, z, B.candle(1 + Math.floor(p.rnd() * 3)));
    }
  }
  p.set(10, F + 1, -22, B.facing("minecraft:lectern", "south")).set(10, F + 1, -14, B.facing("minecraft:lectern", "north"));
  p.chest(17, F + 1, -18, "west", "cripta", { item: `${NS}:chave_cripta` });
  p.set(17, F + 1, -17, B.candle(3)).set(13, F + 5, -18, B.lantern(SOUL, true)).set(16, F + 5, -15, B.lantern(SOUL, true));
  cobweb(p, 9, F + 5, -23), cobweb(p, 18, F + 5, -13), cobweb(p, 18, F + 5, -23), cobweb(p, 11, F + 4, -18, 0.5);
  p.mark("espectro", 11, F + 2, -16).mark("espectro", 16, F + 2, -21).mark("espectro", 14, F + 2, -14);

  // Corredor dos Espinhos
  for (const [g, rows] of Object.entries(SPIKES)) {
    for (const z of rows) for (let x = -1; x <= 1; x++) p.set(x, F, z, `${NS}:armadilha_espinhos`).mark(`espinho_${g}`, x, F, z);
  }
  for (const z of [-24, -36]) p.set(-2, F + 2, z, B.lantern(SOUL)).set(2, F + 2, z, B.lantern(SOUL));
  p.set(-1, F + 1, -35, B.skull()).set(1, F + 1, -24, B.log("minecraft:bone_block"));
  return p;
}

// ====================================================================== etapa B
export function stageB(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  const R = ROOMS_B;
  for (const r of Object.values(R)) shell(p, r);
  for (const [k, r] of Object.entries(R)) carve(p, r, k);
  for (const r of Object.values(R)) dress(p, r);
  p.fill(-7, F - 1, -50, 7, F + 7, -49, "minecraft:reinforced_deepslate"); // parede do selo (resistente)
  pass(p, -1, -37, 1, -37);
  pass(p, -1, -50, 1, -50);

  // Salão das Chamas: bocais no chão disparam em ondas (linha a linha)
  FLAME_ROWS.forEach((z, g) => {
    for (const x of [-4, 0, 4]) p.set(x, F, z, `${NS}:bocal_chamas`).mark(`chama_${g}`, x, F, z);
  });
  for (const [x, z] of [[-6, -38], [6, -38], [-6, -48], [6, -48]]) p.fill(x, F + 1, z, x, F + 6, z, "minecraft:polished_deepslate");
  p.set(-3, F + 6, -43, B.lantern(SOUL, true)).set(3, F + 6, -43, B.lantern(SOUL, true));
  p.set(-2, F + 1, -48, B.lantern(SOUL)).set(2, F + 1, -48, B.lantern(SOUL)).set(-5, F + 1, -38, B.skull()).set(5, F + 1, -47, B.candle(3));
  p.mark("espectro_b", -3, F + 2, -45).mark("espectro_b", 3, F + 2, -41);
  for (let x = -1; x <= 1; x++) {
    for (let y = F + 1; y <= F + 3; y++) {
      p.set(x, y, -49, `${NS}:portao_selado`).mark("portao", x, y, -49);
      p.mark("porta_arena", x, y, -50);
    }
  }
  p.fill(-1, F + 4, -48, 1, F + 4, -48, "minecraft:chiseled_deepslate");

  // Câmara do Trono (arena)
  const cz = -61;
  for (let x = -10; x <= 10; x++) {
    for (let z = -71; z <= -51; z++) {
      const d = Math.hypot(x, z - cz);
      if (d >= 6.5 && d < 7.5) p.set(x, F, z, "minecraft:chiseled_deepslate");
      else if (d < 1) p.set(x, F, z, "minecraft:crying_obsidian");
      else if (d >= 2.5 && d < 3.3) p.set(x, F, z, "minecraft:polished_blackstone_bricks");
    }
  }
  for (const [x, z] of [[-7, -55], [-6, -55], [6, -55], [7, -55], [-7, -67], [-6, -67], [6, -67], [7, -67]]) {
    p.fill(x, F + 1, z, x, F + 9, z, "minecraft:polished_deepslate");
  }
  for (const [x, z] of [[0, -68], [-7, -58], [7, -58]]) {
    p.set(x, F + 1, z, "minecraft:chiseled_deepslate").mark("filacterio", x, F + 2, z);
    p.set(x + 1, F + 1, z, B.candle(2)).set(x - 1, F + 1, z, B.candle(3));
  }
  for (const [x, z, d] of [[-10, -56, "east"], [10, -56, "west"], [-10, -66, "east"], [10, -66, "west"]]) {
    p.set(x, F + 1, z, B.fire("minecraft:soul_campfire", String(d)));
  }
  for (const [x, z] of [[-4, -57], [4, -57], [-4, -65], [4, -65]]) p.set(x, F + 9, z, B.lantern(SOUL, true));
  // trono: desmorona quando o chefe cai, revelando a passagem para o tesouro
  p.set(0, F + 1, -70, B.stairs("minecraft:polished_blackstone_brick_stairs", "north")).mark("trono", 0, F + 1, -70);
  for (const [x, y] of [[-1, F + 1], [1, F + 1], [-1, F + 2], [1, F + 2], [0, F + 2], [0, F + 3], [0, F + 4]]) {
    p.set(x, y, -71, "minecraft:polished_blackstone_bricks").mark("trono", x, y, -71);
  }
  p.set(0, F + 1, -71, "minecraft:polished_blackstone_bricks").mark("trono", 0, F + 1, -71);
  p.set(-1, F + 3, -71, B.skull()).set(1, F + 3, -71, B.skull()).mark("trono", -1, F + 3, -71).mark("trono", 1, F + 3, -71);
  p.mark("chefe", 0, F + 1, cz);
  for (let x = -1; x <= 1; x++) for (let y = F + 1; y <= F + 3; y++) p.set(x, y, -72, "minecraft:reinforced_deepslate").mark("selo", x, y, -72);

  // Câmara do Tesouro (baús preenchidos na vitória)
  for (const [x, z] of [[-3, -77], [3, -77], [0, -78]]) p.set(x, F + 1, z, B.facing("minecraft:chest", "south")).mark("bau_tesouro", x, F + 1, z);
  p.set(-4, F + 1, -78, "minecraft:gold_block").set(4, F + 1, -78, "minecraft:gold_block").set(-4, F + 1, -73, "minecraft:raw_gold_block");
  p.set(4, F + 1, -73, B.facing("minecraft:lectern", "west")).set(-4, F + 2, -78, B.cluster()).set(4, F + 2, -78, B.cluster());
  p.set(-2, F + 1, -78, B.candle(3)).set(2, F + 1, -78, B.candle(3)).set(0, F + 5, -75, B.lantern("minecraft:lantern", true));
  return p;
}

export { SPIKES, FLAME_ROWS };
