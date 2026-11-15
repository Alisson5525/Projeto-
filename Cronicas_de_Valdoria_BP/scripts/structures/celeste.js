// Santuário Celestial (Crônica VII). Duas partes num mesmo local:
// - no chão, o Círculo dos Ventos: oito colunas de quartzo em volta da Pedra dos Ventos, que leva à ilha (e uma inscrição);
// - no céu (SY blocos acima), a ilha flutuante: praça com o Altar do Sacrifício, duas ilhotas ligadas por pontes (Altar do Valor a
//   oeste, Altar da Sabedoria a leste) e, ao norte, a escadaria fechada pelo Portão Celestial que sobe à Plataforma do Guardião,
//   arena circular onde Auriel desce do céu. Debaixo da ilha, nuvens de lã branca.
import { Plan, B, prepareGround } from "./builder.js";

export const RG = 9; // raio do Círculo dos Ventos (chão)
export const RI = 18; // raio da ilha principal
export const ISLETS = [[-28, 0], [28, 0]]; // ilhotas do Valor (oeste) e da Sabedoria (leste)
export const RS = 6; // raio das ilhotas
export const ARENA = { x: 0, z: -9, r: 8, h: 6 }; // Plataforma do Guardião: centro, raio e altura acima da ilha
export const FOOTPRINT = 36;
/** Juramentos na ordem dos altares: 0 Valor (oeste), 1 Sabedoria (leste), 2 Sacrifício (praça). */
export const OATHS = ["valor", "sabedoria", "sacrificio"];
const AIR = "minecraft:air";
const LEAF = (id) => [id, { persistent_bit: true, update_bit: false }];

/** Altura da ilha acima da origem: ~72 blocos sobre o chão, entre y 150 e y 250. */
export function skyOffset(originY) {
  return Math.max(150, Math.min(250, originY + 72)) - originY;
}

function noiseR(rnd) {
  const k = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  return (ang) => 1 + 0.08 * Math.sin(ang * 3 + k[0]) + 0.05 * Math.sin(ang * 5 + k[1]) + 0.04 * Math.sin(ang * 7 + k[2]);
}

/** Disco flutuante: topo em y = top, afinando para baixo até `depth` blocos. */
function islandDisc(p, cx, cz, r, top, depth, topBlock) {
  const nr = noiseR(p.rnd);
  for (let x = -r - 2; x <= r + 2; x++) for (let z = -r - 2; z <= r + 2; z++) {
    const d = Math.hypot(x, z);
    const rr = r * nr(Math.atan2(z, x));
    if (d > rr) continue;
    const t = 1 - d / rr;
    const dep = Math.max(1, Math.round(Math.pow(t, 0.65) * depth));
    for (let k = 1; k <= dep; k++) {
      const y = top - k;
      const b = k <= 2 ? "minecraft:dirt" : k === dep && p.rnd() < 0.08 ? "minecraft:glowstone" :
        p.pick([["minecraft:stone", 5], ["minecraft:calcite", 3], ["minecraft:andesite", 2], ["minecraft:amethyst_block", 0.3]]);
      p.set(cx + x, y, cz + z, b);
    }
    p.set(cx + x, top, cz + z, typeof topBlock === "function" ? topBlock(x, z, d) : topBlock);
  }
}

function cloud(p, cx, y, cz, r) {
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
    const d = Math.hypot(x, z * 1.4);
    if (d <= r && p.rnd() < 0.85) p.set(cx + x, y, cz + z, "minecraft:white_wool");
    if (d <= r * 0.55 && p.rnd() < 0.7) p.set(cx + x, y + 1, cz + z, "minecraft:white_wool");
  }
}

function pillar(p, x, y0, z, h, cap = "minecraft:chiseled_quartz_block") {
  for (let y = y0; y < y0 + h; y++) p.set(x, y, z, B.log("minecraft:quartz_pillar"));
  p.set(x, y0 + h, z, cap);
}

function tree(p, x, y, z) {
  const h = 4 + Math.floor(p.rnd() * 2);
  for (let k = 0; k < h; k++) p.set(x, y + k, z, B.log("minecraft:birch_log"));
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 2; dy <= h + 1; dy++) {
    const d = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - h + 1);
    if (d <= 3 && !(dx === 0 && dz === 0 && dy < h)) p.set(x + dx, y + dy, z + dz, LEAF(p.rnd() < 0.7 ? "minecraft:cherry_leaves" : "minecraft:azalea_leaves_flowered"));
  }
}

/** Altar do Juramento i sobre um estrado de ouro e quartzo. */
function altar(p, i, x, y, z) {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) p.set(x + dx, y, z + dz, dx || dz ? "minecraft:smooth_quartz" : "minecraft:gold_block");
  p.set(x, y + 1, z, "valdoria:altar_juramento").mark("altar", x, y + 1, z).mark(`altar_${i}`, x, y + 1, z);
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    pillar(p, x + dx, y + 1, z + dz, 2);
    p.set(x + dx, y + 4, z + dz, B.lantern("minecraft:lantern"));
  }
}

/** A ilha (coordenadas locais com y relativo ao topo da ilha `S`). */
function sky(p, S) {
  const flowers = ["minecraft:lily_of_the_valley", "minecraft:allium", "minecraft:azure_bluet", "minecraft:oxeye_daisy"];
  const path = (x, z) => (Math.abs(x) <= 1 && z >= 0 && z <= 15) || (Math.abs(z) <= 1 && Math.abs(x) >= 2);
  islandDisc(p, 0, 0, RI, S, 15, (x, z) => (path(x, z) ? "minecraft:smooth_quartz" : "minecraft:grass_block"));
  for (const [cx, cz] of ISLETS) islandDisc(p, cx, cz, RS, S, 8, "minecraft:grass_block");
  // pontes até as ilhotas (3 de largura, parapeito de vidro)
  for (const sx of [-1, 1]) for (let k = 13; k <= 24; k++) {
    for (let dz = -1; dz <= 1; dz++) p.set(sx * k, S, dz, "minecraft:quartz_bricks");
    for (const dz of [-2, 2]) {
      p.set(sx * k, S, dz, "minecraft:quartz_bricks");
      p.set(sx * k, S + 1, dz, k % 4 === 0 ? B.lantern("minecraft:lantern") : "minecraft:white_stained_glass");
    }
    for (let dz = -1; dz <= 1; dz++) p.set(sx * k, S + 1, dz, AIR);
  }
  // flores e árvores
  for (let i = 0; i < 70; i++) {
    const a = p.rnd() * 6.28;
    const r = 6 + p.rnd() * (RI - 8);
    const x = Math.round(Math.cos(a) * r);
    const z = Math.round(Math.sin(a) * r);
    if (z < 1 && Math.abs(x) <= ARENA.r + 2) continue;
    if (Math.abs(x) <= 3 || Math.abs(z) <= 2) continue;
    p.set(x, S + 1, z, p.pick(flowers.map((f) => [f, 1])));
  }
  for (const [x, z] of [[-13, 9], [12, 11], [-9, 14], [14, 4], [-14, 2]]) tree(p, x, S + 1, z);
  // a praça e o Altar do Sacrifício
  altar(p, 2, 0, S, 9);
  // chegada da Pedra dos Ventos (ao sul) e a pedra de volta
  for (let x = -2; x <= 2; x++) for (let z = 14; z <= 17; z++) p.set(x, S, z, "minecraft:smooth_quartz");
  p.set(0, S + 1, 17, "valdoria:pedra_ventos").mark("descida", 0, S + 1, 17).mark("chegada", 0, S + 1, 14);
  for (const x of [-3, 3]) pillar(p, x, S + 1, 17, 3);
  p.set(4, S + 1, 14, ["minecraft:lectern", { "minecraft:cardinal_direction": "west", powered_bit: false }]).mark("inscricao", 4, S + 1, 14);
  // ilhotas: altares do Valor e da Sabedoria
  ISLETS.forEach(([cx, cz], i) => {
    altar(p, i, cx, S, cz);
    if (i === 0) for (const [dx, dz] of [[0, -4], [0, 4], [-4, 0], [-3, 3]]) p.mark("onda", cx + dx, S + 1, cz + dz);
  });
  p.chest(28, S + 1, -4, "south", "celeste_ilha", { lore: "diario_peregrino" });
  // a Plataforma do Guardião: maciço de quartzo, piso com raios de ouro, parapeito de vidro e quatro colunas
  const { x: ax, z: az, r: ar, h: ah } = ARENA;
  for (let x = -ar - 1; x <= ar + 1; x++) for (let z = -ar - 1; z <= ar + 1; z++) {
    const d = Math.hypot(x, z);
    if (d > ar + 0.5) continue;
    for (let y = S + 1; y < S + ah; y++) p.set(ax + x, y, az + z, d > ar - 0.5 ? "minecraft:quartz_bricks" : "minecraft:stone");
    const ray = (x === 0 || z === 0 || Math.abs(x) === Math.abs(z)) && d > 1.5;
    p.set(ax + x, S + ah, az + z, d < 1.5 ? "minecraft:gold_block" : ray ? "minecraft:chiseled_quartz_block" : "minecraft:smooth_quartz");
    if (d > ar - 0.5) {
      p.set(ax + x, S + ah + 1, az + z, "minecraft:quartz_bricks");
      p.set(ax + x, S + ah + 2, az + z, "minecraft:white_stained_glass");
    }
  }
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
    pillar(p, ax + dx, S + ah + 1, az + dz, 5);
    p.set(ax + dx, S + ah + 7, az + dz, ["minecraft:end_rod", { facing_direction: 1 }]);
  }
  // escadaria (sobe para o norte) e o Portão Celestial no parapeito sul
  const gz = az + ar; // borda sul da plataforma
  for (let k = 0; k < ah; k++) for (let x = -2; x <= 2; x++) {
    p.set(x, S + 1 + k, gz + ah - k, B.stairs("minecraft:quartz_stairs", "north"));
    for (let y = S + 1; y < S + 1 + k; y++) p.set(x, y, gz + ah - k, "minecraft:quartz_bricks");
  }
  for (let x = -2; x <= 2; x++) {
    p.set(x, S + ah, gz, "minecraft:smooth_quartz");
    for (let y = S + ah + 1; y <= S + ah + 4; y++) p.set(x, y, gz, "valdoria:barreira_celeste").mark("barreira", x, y, gz);
  }
  for (const x of [-3, 3]) pillar(p, x, S + 1, gz, ah + 5, "minecraft:gold_block");
  for (let x = -3; x <= 3; x++) p.set(x, S + ah + 6, gz, "minecraft:chiseled_quartz_block");
  p.mark("chefe", ax, S + ah + 1, az - 2).mark("bau", ax, S + ah + 1, az - ar + 2);
  p.box("arena", ax - ar + 1, S + ah, az - ar + 1, ax + ar - 1, S + ah + 16, az + ar - 1);
  // guardiões: sentinelas aos pés da escadaria e na ilhota da Sabedoria; harpias rondando
  p.mark("sentinela", -4, S + 1, gz + ah + 2).mark("sentinela", 4, S + 1, gz + ah + 2);
  p.mark("sentinela", 25, S + 1, 3).mark("sentinela", 31, S + 1, -3);
  for (const [x, z] of [[-12, -6], [12, -6], [-6, 12], [10, 12]]) p.mark("harpia", x, S + 5, z);
  // nuvens sob a ilha
  for (const [x, z, r] of [[-10, 6, 5], [8, -4, 6], [0, 18, 4], [-22, -8, 4], [24, 10, 5], [16, -16, 4], [-18, 16, 4]]) {
    cloud(p, x, S - 18 - Math.floor(p.rnd() * 4), z, r);
  }
}

/** O Círculo dos Ventos no chão. */
function groundCircle(p) {
  for (let x = -RG; x <= RG; x++) for (let z = -RG; z <= RG; z++) {
    const d = Math.hypot(x, z);
    if (d > RG - 1.5) continue;
    p.set(x, 0, z, d < 1.5 ? "minecraft:gold_block" : d < 4 || (d > 6 && d < 7) ? "minecraft:smooth_quartz" : "minecraft:calcite");
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 6.28 + 0.39;
    const x = Math.round(Math.cos(a) * (RG - 2));
    const z = Math.round(Math.sin(a) * (RG - 2));
    pillar(p, x, 1, z, 3 + (k % 2) * 2);
    p.set(x, 5 + (k % 2) * 2, z, ["minecraft:end_rod", { facing_direction: 1 }]);
  }
  p.set(0, 1, 0, "valdoria:pedra_ventos").mark("subida", 0, 1, 0).mark("retorno", 0, 1, 3);
  p.set(0, 1, -4, ["minecraft:lectern", { "minecraft:cardinal_direction": "south", powered_bit: false }]).mark("inscricao_chao", 0, 1, -4);
}

/** Planta completa (sem o preparo do terreno). */
export function celestePlan(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  const S = skyOffset(p.origin.y);
  groundCircle(p);
  sky(p, S);
  p.mark("ceu", 0, S, 0);
  p.box("area", -FOOTPRINT - 2, -2, -FOOTPRINT - 2, FOOTPRINT + 2, S + 24, FOOTPRINT + 2);
  return p;
}

export const CELESTE = {
  id: "celeste", nome: "Santuário Celestial", raio: 14, alcance: FOOTPRINT, alturaMax: 8, xp: 360, limpeza: false, distGen: 56,
  biomas: ["plains", "savanna", "forest", "birch", "flower", "cherry", "taiga", "sunflower", "desert", "swamp", "river"],
  nomes: ["Santuário Celestial"],
  descricao: "O Círculo dos Ventos no chão e, muito acima, a ilha flutuante dos Três Juramentos e a Plataforma do Guardião.",
  dica: "§bUma sombra cobre o chão. Lá no alto, uma ilha flutua entre as nuvens: o Santuário Celestial!",
  guards: [["sentinela", "valdoria:sentinela_celeste"], ["harpia", "valdoria:harpia"]],
  async plan(dim, origin, rot, rnd) {
    const p = celestePlan(origin, rot, rnd);
    const prep = await prepareGround(dim, p, -RG, -RG, RG, RG, 12, "minecraft:dirt", "minecraft:grass_block");
    return { plans: [prep, p], plan: p };
  },
};
