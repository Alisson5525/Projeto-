// Cidadela de Nyxhal, o Reino Sombrio (49 x 49 blocos): muralha de pedra-negra com quatro torres e portão ao sul, um pátio em
// terra corrompida com braseiros de fogo das almas e os três Selos de Sombra (obeliscos guardados por Cavaleiros Corrompidos),
// gárgulas de pedra nas muralhas e, ao norte, o Salão do Trono de Azrakar, fechado pela Barreira Sombria até os três selos caírem.
// Dentro do salão: oito pilares, o trono no estrado e os quatro Círculos de Luz que protegem do Eclipse do Rei Demônio.
import { Plan, B, prepareGround } from "./builder.js";

export const R = 24;
const W = 20; // muralha em |x| = 20 e |z| = 20
const H = 9; // altura da muralha
const AIR = "minecraft:air";
const BRICK = "minecraft:polished_blackstone_bricks";
const CRACKED = "minecraft:cracked_polished_blackstone_bricks";
/** Selos de Sombra (x, z locais). */
export const SEALS = [[-12, 6], [12, 6], [0, 15]];
/** Salão do Trono: x -11..11, z -19..-3, piso y 0, teto y 12. */
export const HALL = { x0: -11, x1: 11, z0: -19, z1: -3, top: 12 };
export const LIGHTS = [[-8, -6], [8, -6], [-8, -16], [8, -16]];

const brick = (p) => (p.rnd() < 0.15 ? CRACKED : p.rnd() < 0.08 ? "minecraft:gilded_blackstone" : BRICK);

function wallSeg(p, x0, z0, x1, z1) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let y = 1; y <= H; y++) p.set(x, y, z, brick(p));
      if ((x + z) % 2 === 0) p.set(x, H + 1, z, "minecraft:polished_blackstone_brick_wall");
    }
  }
}
function tower(p, cx, cz) {
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
    const edge = Math.abs(x) === 3 || Math.abs(z) === 3;
    for (let y = 1; y <= 15; y++) p.set(cx + x, y, cz + z, edge ? brick(p) : y === 10 ? "minecraft:polished_blackstone" : AIR);
    p.set(cx + x, 15, cz + z, "minecraft:polished_blackstone");
    if (edge && (x + z) % 2 === 0) p.set(cx + x, 16, cz + z, "minecraft:polished_blackstone_brick_wall");
  }
  for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) for (let y = 11; y <= 12; y++) p.set(cx + x, y, cz + z, "minecraft:purple_stained_glass_pane");
  p.set(cx, 16, cz, "minecraft:soul_lantern");
  p.set(cx, 14, cz, B.lantern("minecraft:soul_lantern", true));
}
function brazier(p, x, z) {
  p.set(x, 1, z, "minecraft:polished_blackstone_wall").set(x, 2, z, "minecraft:soul_soil").set(x, 3, z, "minecraft:soul_fire");
}
function deadTree(p, x, z) {
  const h = 3 + Math.floor(p.rnd() * 3);
  for (let y = 1; y <= h; y++) p.set(x, y, z, B.log("minecraft:dark_oak_log"));
  p.set(x + 1, h, z, B.log("minecraft:dark_oak_log", "x")).set(x - 1, h - 1, z, B.log("minecraft:dark_oak_log", "x"))
    .set(x, h, z + 1, B.log("minecraft:dark_oak_log", "z"));
}

/** Um Selo de Sombra: base de pedra-negra, coluna de obsidiana chorona com o selo no meio e fogo das almas no alto (intacto) ou ruína. */
export function sealObelisk(p, sx, sz, broken) {
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(sx + x, 1, sz + z, "minecraft:polished_blackstone");
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.set(sx + x, 2, sz + z, broken ? AIR : "minecraft:polished_blackstone_wall");
  if (broken) {
    p.set(sx, 2, sz, "minecraft:crying_obsidian").set(sx, 3, sz, AIR).set(sx, 4, sz, AIR).set(sx, 5, sz, AIR).set(sx, 6, sz, AIR);
    for (const [x, z] of [[1, 0], [-1, 1], [0, -1]]) p.set(sx + x, 2, sz + z, "minecraft:obsidian");
    return;
  }
  p.set(sx, 2, sz, "minecraft:crying_obsidian").set(sx, 3, sz, "valdoria:selo_sombra").set(sx, 4, sz, "minecraft:crying_obsidian")
    .set(sx, 5, sz, "minecraft:soul_soil").set(sx, 6, sz, "minecraft:soul_fire");
}

function throneHall(p) {
  const { x0, x1, z0, z1, top } = HALL;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    p.set(x, 0, z, Math.abs(x) <= 1 && z < z1 ? "minecraft:red_nether_brick" : (x + z) % 2 ? "minecraft:polished_blackstone" : "minecraft:blackstone");
    for (let y = 1; y < top; y++) p.set(x, y, z, edge ? brick(p) : AIR);
    p.set(x, top, z, "minecraft:polished_blackstone_bricks");
    if (edge && (x + z) % 2 === 0) p.set(x, top + 1, z, "minecraft:polished_blackstone_brick_wall");
  }
  // janelas altas e lanternas das almas
  for (const z of [-7, -11, -15]) for (const x of [x0, x1]) for (let y = 6; y <= 9; y++) p.set(x, y, z, "minecraft:purple_stained_glass");
  for (const x of [-6, 6]) for (const z of [-6, -9, -12, -15]) {
    for (let y = 1; y < top; y++) p.set(x, y, z, y % 4 === 0 ? "minecraft:chiseled_polished_blackstone" : "minecraft:polished_blackstone");
    p.set(x, top - 1, z + 1, B.lantern("minecraft:soul_lantern", true));
  }
  // estrado e trono
  for (let x = -4; x <= 4; x++) for (let z = -18; z <= -16; z++) p.set(x, 1, z, "minecraft:polished_blackstone");
  p.set(0, 2, -17, B.stairs("minecraft:polished_blackstone_stairs", "north"));
  for (let y = 2; y <= 5; y++) p.set(0, y, -18, "minecraft:crying_obsidian");
  p.set(-1, 2, -17, "minecraft:gilded_blackstone").set(1, 2, -17, "minecraft:gilded_blackstone").set(0, 6, -18, "minecraft:gilded_blackstone");
  for (const x of [-3, 3]) p.set(x, 2, -17, "minecraft:soul_soil").set(x, 3, -17, "minecraft:soul_fire");
  // os quatro Círculos de Luz (lanterna do mar no piso, cercada de pedra quartzo)
  for (const [lx, lz] of LIGHTS) {
    p.set(lx, 0, lz, "minecraft:sea_lantern");
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(lx + dx, 0, lz + dz, "minecraft:quartz_block");
    p.mark("luz", lx, 1, lz);
  }
  // porta sul fechada pela Barreira Sombria
  for (let x = -2; x <= 2; x++) for (let y = 1; y <= 5; y++) p.set(x, y, z1, "valdoria:barreira_sombria").mark("barreira", x, y, z1);
  for (let x = -3; x <= 3; x++) p.set(x, 6, z1, "minecraft:chiseled_polished_blackstone");
  p.mark("chefe", 0, 1, -12).mark("trono", 0, 1, -14).mark("bau_trono", 2, 2, -16);
  p.box("arena", x0 + 1, 0, z0 + 1, x1 - 1, top - 1, z1 - 1);
}

/** Planta completa (sem o preparo do terreno). */
export function nyxhalPlan(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  // muralha, torres e portão
  wallSeg(p, -W, -W, W, -W);
  wallSeg(p, -W, W, W, W);
  wallSeg(p, -W, -W, -W, W);
  wallSeg(p, W, -W, W, W);
  for (const [x, z] of [[-W, -W], [W, -W], [-W, W], [W, W]]) tower(p, x, z);
  for (let x = -2; x <= 2; x++) for (let y = 1; y <= 5; y++) p.set(x, y, W, AIR);
  for (const x of [-4, 4]) for (let y = 1; y <= 12; y++) for (let z = W - 1; z <= W + 1; z++) p.set(x, y, z, brick(p));
  for (let x = -3; x <= 3; x++) p.set(x, 6, W, "minecraft:chiseled_polished_blackstone");
  for (let x = -2; x <= 2; x++) p.set(x, 5, W, ["minecraft:iron_bars", { "minecraft:connection_east": x < 2, "minecraft:connection_west": x > -2 }]);
  // caminho de passeio no alto da muralha (para as gárgulas) e escadas no pátio
  for (const sx of [-1, 1]) for (let k = 0; k < 8; k++) p.set(sx * (8 + k), 1 + k, W - 1, B.stairs("minecraft:polished_blackstone_brick_stairs", sx > 0 ? "east" : "west"));
  // pátio
  for (const [sx, sz] of SEALS) sealObelisk(p, sx, sz, false);
  SEALS.forEach(([sx, sz], i) => {
    p.mark("selo", sx, 3, sz);
    p.mark(`cav_${i}`, sx - 3, 1, sz + 2).mark(`cav_${i}`, sx + 3, 1, sz + 2);
  });
  for (const [x, z] of [[-6, 18], [6, 18], [-17, -1], [17, -1], [-6, -1], [6, -1]]) brazier(p, x, z);
  for (const [x, z] of [[-16, 15], [16, 14], [-17, -12], [17, -15]]) deadTree(p, x, z);
  throneHall(p);
  // inscrição na entrada do pátio
  p.set(3, 1, 16, ["minecraft:lectern", { "minecraft:cardinal_direction": "north", powered_bit: false }]).mark("inscricao", 3, 1, 16);
  // gárgulas: sobre a muralha e na fachada do salão; cavaleiros no portão
  for (const [x, z] of [[-9, W], [9, W], [-W, 1], [W, 1]]) p.mark("gargula", x, H + 1, z);
  p.mark("gargula", -8, 1, -1).mark("gargula", 8, 1, -1);
  p.mark("cavaleiro", -3, 1, 17).mark("cavaleiro", 3, 1, 17);
  p.chest(-14, 1, 17, "north", "nyxhal_patio", { lore: "diario_cavaleiro_corrompido" });
  p.box("area", -R - 2, -2, -R - 2, R + 2, 20, R + 2);
  return p;
}

export const NYXHAL = {
  id: "nyxhal", nome: "Cidadela de Nyxhal", raio: R, alturaMax: 7, xp: 320, xpLimpo: 200, limpeza: false, distGen: 64,
  biomas: ["plains", "savanna", "desert", "badlands", "swamp", "taiga", "forest", "meadow", "windswept", "dark_forest", "roofed"],
  nomes: ["Cidadela de Nyxhal"],
  descricao: "A fortaleza do Reino Sombrio: muralhas de pedra-negra, gárgulas, os três Selos de Sombra e o Salão do Trono de Azrakar.",
  dica: "§5O ar escurece. Muralhas de pedra-negra se erguem sobre a terra morta: Nyxhal!",
  guards: [["gargula", "valdoria:gargula"], ["cavaleiro", "valdoria:cavaleiro_corrompido"]],
  async plan(dim, origin, rot, rnd) {
    const p = nyxhalPlan(origin, rot, rnd);
    const ground = (x, z) => {
      if (Math.abs(x) <= 2 && z >= 0) return "minecraft:polished_blackstone_bricks";
      return p.pick([["minecraft:blackstone", 4], ["minecraft:soul_soil", 2], ["minecraft:basalt", 1], ["minecraft:coarse_dirt", 3],
        ["minecraft:soul_sand", 1]]);
    };
    const prep = await prepareGround(dim, p, -R - 2, -R - 2, R + 2, R + 2, 20, "minecraft:blackstone", ground);
    return { plans: [prep, p], plan: p };
  },
};
