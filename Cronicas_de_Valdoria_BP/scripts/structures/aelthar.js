// Aelthar, o Reino Élfico (57 x 57 blocos): a Árvore-Mãe Ylthariel no centro (tronco oco com escada de mão, salão das raízes
// e, a 14 blocos do chão, a plataforma do Salão do Conselho), quatro árvores-satélite ligadas por pontes (Biblioteca das
// Folhas, Ateliê do Arqueiro e duas casas), a grande escadaria, o Bosque do Druida, o Lago da Lua, a sebe viva com quatro
// passagens e as três Raízes Corrompidas da Praga Cinzenta. Sob a árvore: o Coração de Ylthariel, a caverna de Morthil,
// alcançada por um poço selado por raízes que só se abre quando as três raízes são purificadas.
import { Plan, B, prepareGround } from "./builder.js";

export const R = 28; // sebe viva em d = 27
export const F = -16; // piso da caverna do Coração
export const P = 14; // piso das plataformas
const AIR = "minecraft:air";
const LEAF = (id) => [id, { persistent_bit: true, update_bit: false }];
/** Raízes Corrompidas: posições locais (x, z). */
export const ROOTS = [[-21, -11], [21, -11], [0, -24]];
/** Árvores-satélite: centro e uso da plataforma. */
export const SATS = [{ x: 17, z: 1, uso: "biblioteca" }, { x: -17, z: 1, uso: "atelie" }, { x: 11, z: -17, uso: "casa" }, { x: -11, z: -17, uso: "casa" }];

const hyp = Math.hypot;
/** Raio do tronco da Árvore-Mãe em cada altura (alarga na base, afina no topo). */
export function trunkR(y) {
  if (y <= 0) return 5.6;
  if (y <= 3) return 5.6 - 0.35 * y;
  if (y <= 20) return 4.5;
  return 4.5 - (y - 20) * 0.12;
}
const HOLLOW = (y) => (y >= 1 && y <= 13) || (y >= 15 && y <= 17);

function barkAt(p, x, y, z) {
  const ang = Math.atan2(z, x);
  const stripe = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 16) % 4 === 0;
  if (stripe && y % 7 === 3) return "minecraft:verdant_froglight";
  if (stripe) return B.log("minecraft:stripped_birch_wood");
  return B.log("minecraft:birch_wood");
}
function leafMix(p) {
  return LEAF(p.pick([["minecraft:azalea_leaves", 6], ["minecraft:azalea_leaves_flowered", 3], ["minecraft:cherry_leaves", 1]]));
}

/** Copa elipsoidal oca (casca de folhas), com alguns cogumelos-luz escondidos. */
function canopy(p, cx, cy, cz, rx, ry) {
  for (let x = -rx; x <= rx; x++) {
    for (let z = -rx; z <= rx; z++) {
      for (let y = -ry; y <= ry; y++) {
        const e = (x * x + z * z) / (rx * rx) + (y * y) / (ry * ry);
        if (e > 1 || e < 0.5) continue;
        if (p.rnd() < 0.07 && e > 0.85) continue;
        p.set(cx + x, cy + y, cz + z, p.rnd() < 0.02 ? "minecraft:shroomlight" : leafMix(p));
      }
    }
  }
}
/** Galho reto (madeira de bétula) de (x0,y0,z0) a (x1,y1,z1). */
function branch(p, a, b) {
  const n = Math.ceil(hyp(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 1.5);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t),
      B.log("minecraft:birch_wood"));
  }
}

// ---------------------------------------------------------------------- Árvore-Mãe
function motherTree(p) {
  for (let y = 0; y <= 30; y++) {
    const r = trunkR(y);
    const ri = Math.ceil(r);
    for (let x = -ri; x <= ri; x++) {
      for (let z = -ri; z <= ri; z++) {
        const d = hyp(x, z);
        if (d > r) continue;
        const hollow = HOLLOW(y) && d <= r - 1.2;
        if (hollow) p.set(x, y, z, AIR);
        else if (y === 0 || y === 14) p.set(x, y, z, d <= r - 1.2 ? "minecraft:birch_planks" : barkAt(p, x, y, z));
        else p.set(x, y, z, barkAt(p, x, y, z));
      }
    }
  }
  // a Praga sobe pelo tronco (lado norte): manchas de carvalho pálido (somem quando Morthil é derrotado)
  for (let y = 1; y <= 7; y++) {
    for (let x = -4; x <= 4; x++) {
      const z = -Math.round(Math.sqrt(Math.max(0, trunkR(y) ** 2 - x * x)));
      if (p.rnd() < 0.35 - y * 0.03) p.set(x, y, z, B.log("minecraft:pale_oak_wood")).mark("praga_tronco", x, y, z);
    }
  }
  // raízes de apoio (8 direções)
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    for (let r = 4.5; r <= 9.5; r += 0.5) {
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      const h = Math.max(1, Math.round(4 - (r - 4.5) * 0.7));
      for (let y = 1; y <= h; y++) p.set(x, y, z, B.log("minecraft:birch_wood"));
    }
  }
  // porta sul do salão das raízes, com arco luminoso
  for (let x = -1; x <= 1; x++) for (let z = 3; z <= 6; z++) for (let y = 1; y <= 3; y++) p.set(x, y, z, AIR);
  p.set(0, 4, 4, "minecraft:pearlescent_froglight").set(-1, 4, 4, B.log("minecraft:stripped_birch_wood")).set(1, 4, 4, B.log("minecraft:stripped_birch_wood"));
  // salão das raízes: tapete de musgo, lâmpadas nas paredes, escada de mão até a plataforma (parede norte)
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (hyp(x, z) <= 3.3 && hyp(x, z) > 1.6 && (x + z) % 2 === 0) p.set(x, 1, z, "minecraft:moss_carpet");
  for (const [x, z] of [[-4, 0], [4, 0], [-3, 3], [3, 3]]) p.set(x, 4, z, "minecraft:verdant_froglight");
  for (let y = 1; y <= 15; y++) p.set(0, y, -4, B.log("minecraft:birch_wood"));
  for (let y = 1; y <= 14; y++) p.set(0, y, -3, B.ladder("south"));
  // selo de raízes sobre o poço do Coração (3 x 3 no centro do salão)
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, 0, z, "valdoria:selo_raizes").mark("selo", x, 0, z);
  p.set(0, 1, 2, "minecraft:moss_carpet");
  // salão superior (y 15-17): quatro portas para a plataforma e lanternas
  for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
    for (let lat = -1; lat <= 1; lat++) {
      for (let ax = 3; ax <= 5; ax++) {
        const x = dx ? dx * ax : lat;
        const z = dz ? dz * ax : lat;
        for (let y = 15; y <= 16; y++) p.set(x, y, z, AIR);
      }
    }
  }
  p.set(0, 17, 0, B.lantern("minecraft:lantern", true)).set(0, 18, 0, B.log("minecraft:birch_wood"));
  p.set(0, 15, -3, AIR).set(0, 15, -4, AIR); // saída da escada de mão no salão superior
  // galhos e copa
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    branch(p, [Math.round(Math.cos(a) * 3), 22 + (k % 2), Math.round(Math.sin(a) * 3)],
      [Math.round(Math.cos(a) * 11), 29 + (k % 3), Math.round(Math.sin(a) * 11)]);
  }
  canopy(p, 0, 32, 0, 13, 6);
}

// ---------------------------------------------------------------------- plataformas, pontes e corrimãos
/** Células do piso das plataformas (y = P), em coordenadas locais "x,z". */
export function platformCells() {
  const F2 = new Map();
  const add = (x, z, kind) => {
    const k = `${x},${z}`;
    if (!F2.has(k)) F2.set(k, kind);
  };
  for (let x = -11; x <= 11; x++) for (let z = -11; z <= 11; z++) {
    const d = hyp(x, z);
    if (d > trunkR(P) && d <= 11) add(x, z, "main");
  }
  for (let x = -6; x <= 6; x++) for (let z = -12; z <= -5; z++) if (hyp(x, z) > trunkR(P)) add(x, z, "salao");
  for (const s of SATS) {
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
      const d = hyp(x, z);
      if (d > 2.3 && d <= 5.2) add(s.x + x, s.z + z, "sat");
    }
    // ponte: faixa de 3 blocos da plataforma principal até a satélite
    const L = hyp(s.x, s.z);
    const ux = s.x / L, uz = s.z / L;
    for (let t = 9; t <= L - 3; t += 0.25) {
      for (const o of [-1, 0, 1]) {
        const x = Math.round(ux * t - uz * o);
        const z = Math.round(uz * t + ux * o);
        if (hyp(x, z) > trunkR(P) && hyp(x - s.x, z - s.z) > 2.3) add(x, z, "ponte");
      }
    }
  }
  return F2;
}
const STAIR_TOP = (x, z) => Math.abs(x) <= 1 && z >= 11;

function platforms(p) {
  const cells = platformCells();
  const trunk = (x, z) => hyp(x, z) <= trunkR(P) || SATS.some((s) => hyp(x - s.x, z - s.z) <= 2.3);
  for (const [k, kind] of cells) {
    const [x, z] = k.split(",").map(Number);
    p.set(x, P, z, kind === "ponte" ? "minecraft:stripped_birch_wood" : "minecraft:birch_planks");
  }
  // corrimãos: cercas de bétula ligadas entre si em volta de tudo que é piso
  const rail = new Set();
  for (const k of cells.keys()) {
    const [x, z] = k.split(",").map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz;
      const nk = `${nx},${nz}`;
      if (cells.has(nk) || trunk(nx, nz) || STAIR_TOP(nx, nz)) continue;
      rail.add(nk);
    }
  }
  for (const k of rail) {
    const [x, z] = k.split(",").map(Number);
    const c = (dx, dz) => rail.has(`${x + dx},${z + dz}`);
    p.set(x, P + 1, z, ["minecraft:birch_fence", { "minecraft:connection_north": c(0, -1), "minecraft:connection_south": c(0, 1),
      "minecraft:connection_east": c(1, 0), "minecraft:connection_west": c(-1, 0) }]);
  }
  // vigas sob a plataforma principal e lanternas sob as pontes
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    for (let r = 4.5; r <= 10.5; r += 0.5) p.set(Math.round(Math.cos(a) * r), P - 1, Math.round(Math.sin(a) * r), B.log("minecraft:birch_wood"));
    branch(p, [Math.round(Math.cos(a) * 4), P - 5, Math.round(Math.sin(a) * 4)], [Math.round(Math.cos(a) * 7), P - 2, Math.round(Math.sin(a) * 7)]);
  }
  for (const s of SATS) {
    const L = hyp(s.x, s.z);
    const t = (9 + L - 3) / 2;
    p.set(Math.round((s.x / L) * t), P - 1, Math.round((s.z / L) * t), B.lantern("minecraft:lantern", true));
  }
}

// ---------------------------------------------------------------------- Salão do Conselho (norte da plataforma)
function councilHall(p) {
  for (const x of [-6, 6]) for (const z of [-12, -8, -5]) for (let y = P + 1; y <= P + 5; y++) p.set(x, y, z, B.log("minecraft:stripped_birch_log"));
  for (let x = -7; x <= 7; x++) for (let z = -13; z <= -4; z++) {
    if (hyp(x, z) <= trunkR(P + 6)) continue;
    p.set(x, P + 6, z, LEAF(Math.abs(x) + Math.abs(z) % 3 === 0 ? "minecraft:azalea_leaves" : "minecraft:azalea_leaves_flowered"));
  }
  for (let x = -5; x <= 5; x++) for (let z = -11; z <= -6; z++) if (hyp(x, z) > trunkR(P + 7)) p.set(x, P + 7, z, LEAF("minecraft:azalea_leaves_flowered"));
  for (let x = -3; x <= 3; x++) for (let z = -10; z <= -7; z++) p.set(x, P + 8, z, LEAF("minecraft:azalea_leaves"));
  // trono de Lyrael
  p.set(0, P + 1, -11, B.stairs("minecraft:birch_stairs", "north"));
  p.set(-1, P + 1, -11, "minecraft:verdant_froglight").set(1, P + 1, -11, "minecraft:verdant_froglight");
  for (let y = P + 1; y <= P + 4; y++) p.set(0, y, -12, B.log("minecraft:stripped_birch_log"));
  p.set(0, P + 5, -12, "minecraft:emerald_block").set(-1, P + 4, -12, LEAF("minecraft:azalea_leaves_flowered"))
    .set(1, P + 4, -12, LEAF("minecraft:azalea_leaves_flowered"));
  for (let z = -10; z <= -6; z++) for (let x = -1; x <= 1; x++) p.set(x, P + 1, z, "minecraft:green_carpet");
  for (const [x, z] of [[-5, -11], [5, -11], [-5, -6], [5, -6]]) p.set(x, P + 1, z, "minecraft:flowering_azalea");
  for (const x of [-3, 3]) p.set(x, P + 5, -8, B.lantern("minecraft:lantern", true)).set(x, P + 5, -10, B.lantern("minecraft:lantern", true));
  p.mark("npc_rainha_elfica", 0, P + 1, -9);
}

// ---------------------------------------------------------------------- árvores-satélite
function satellite(p, s) {
  for (let y = 0; y <= 24; y++) {
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const d = hyp(x, z);
      const r = y <= 1 ? 2.9 : 2.3;
      if (d <= r) p.set(s.x + x, y, s.z + z, barkAt(p, x, y, z));
    }
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let r = 3; r <= 4; r++) p.set(s.x + dx * r, 1, s.z + dz * r, B.log("minecraft:birch_wood"));
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let r = 2; r <= 4; r++) p.set(s.x + dx * r, P - 1, s.z + dz * r, B.log("minecraft:birch_wood"));
  canopy(p, s.x, 24, s.z, 7, 4);
  const toC = Math.abs(s.x) > Math.abs(s.z) ? [-Math.sign(s.x), 0] : [0, -Math.sign(s.z)];
  const far = [-toC[0], -toC[1]];
  if (s.uso === "biblioteca") {
    for (let a = -60; a <= 60; a += 12) {
      const r = (a * Math.PI) / 180;
      const x = Math.round(s.x + Math.cos(r) * 4.6 * far[0] - Math.sin(r) * 4.6 * far[1]);
      const z = Math.round(s.z + Math.cos(r) * 4.6 * far[1] + Math.sin(r) * 4.6 * far[0]);
      p.set(x, P + 1, z, "minecraft:bookshelf").set(x, P + 2, z, "minecraft:bookshelf");
    }
    p.set(s.x + far[0] * 3, P + 1, s.z + 2, ["minecraft:lectern", { "minecraft:cardinal_direction": "west", powered_bit: false }]);
    p.set(s.x + far[0] * 3, P + 1, s.z - 2, B.candle(3, "minecraft:white_candle"));
    p.mark("npc_sabio_elfico", s.x + toC[0] * 3, P + 1, s.z).mark("memorias", s.x + far[0] * 3, P + 1, s.z + 2);
  } else if (s.uso === "atelie") {
    p.set(s.x + far[0] * 4, P + 1, s.z, "minecraft:fletching_table").set(s.x + far[0] * 3, P + 1, s.z + 3, "minecraft:target")
      .set(s.x + far[0] * 3, P + 1, s.z - 3, B.barrel()).set(s.x + far[0] * 4, P + 1, s.z + 1, ["minecraft:loom", { direction: 1 }])
      .set(s.x, P + 1, s.z + 4, "minecraft:hay_block");
    p.mark("npc_artesao_elfico", s.x + toC[0] * 3, P + 1, s.z);
  } else {
    p.set(s.x + far[0] * 3, P + 1, s.z + far[1] * 3, B.barrel()).set(s.x + 3, P + 1, s.z - 2, "minecraft:flowering_azalea")
      .set(s.x - 3, P + 1, s.z - 2, ["minecraft:composter", { composter_fill_level: 0 }]).set(s.x, P + 1, s.z - 4, B.candle(2, "minecraft:green_candle"));
    p.mark("npc_elfo", s.x + 3, P + 1, s.z + 1);
  }
  for (let y = P + 1; y <= P + 3; y++) p.set(s.x - 2 * toC[1] + 2 * toC[0], y, s.z + 2 * toC[0] + 2 * toC[1], B.fence("minecraft:birch_fence"));
  p.set(s.x - 2 * toC[1] + 2 * toC[0], P + 4, s.z + 2 * toC[0] + 2 * toC[1], B.lantern("minecraft:lantern"));
}

// ---------------------------------------------------------------------- escadaria, chão, sebe e lugares
function grandStair(p) {
  for (let k = 0; k <= 13; k++) {
    const y = 1 + k, z = 24 - k;
    for (let x = -1; x <= 1; x++) {
      p.set(x, y, z, B.stairs("minecraft:birch_stairs", "north"));
      p.set(x, y + 1, z, AIR).set(x, y + 2, z, AIR);
    }
    for (const x of [-2, 2]) p.set(x, y, z, B.fence("minecraft:birch_fence", true, false));
    if (k % 3 === 2) for (const x of [-1, 1]) for (let yy = 1; yy < y; yy++) p.set(x * 2, yy, z, B.log("minecraft:stripped_birch_log"));
  }
  for (const k of [4, 9]) for (const x of [-2, 2]) p.set(x, 2 + k, 24 - k, B.lantern("minecraft:lantern"));
}

function elvenLamp(p, x, z) {
  p.set(x, 1, z, B.fence("minecraft:birch_fence")).set(x, 2, z, B.fence("minecraft:birch_fence")).set(x, 3, z, "minecraft:pearlescent_froglight");
}

function druidGrove(p, cx, cz) {
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const x = cx + Math.round(Math.cos(a) * 4.5), z = cz + Math.round(Math.sin(a) * 4.5);
    for (let y = 1; y <= 3; y++) p.set(x, y, z, k % 2 ? "minecraft:mossy_cobblestone" : "minecraft:mossy_stone_bricks");
    p.set(x, 4, z, "minecraft:moss_carpet");
  }
  p.set(cx, 1, cz, ["minecraft:cauldron", { cauldron_liquid: "water", fill_level: 6 }]);
  p.set(cx + 2, 1, cz - 1, ["minecraft:composter", { composter_fill_level: 0 }]).set(cx - 2, 1, cz + 1, "minecraft:flowering_azalea")
    .set(cx + 1, 1, cz + 2, "minecraft:azalea").set(cx - 1, 1, cz - 2, "minecraft:firefly_bush").set(cx + 2, 1, cz + 2, "minecraft:lily_of_the_valley")
    .set(cx - 2, 1, cz - 1, "minecraft:azure_bluet");
  p.mark("npc_druida", cx, 1, cz - 2);
}

function moonPond(p, cx, cz) {
  for (let x = -5; x <= 5; x++) for (let z = -4; z <= 4; z++) {
    const e = (x * x) / 20 + (z * z) / 12;
    if (e <= 1) {
      p.set(cx + x, 0, cz + z, "minecraft:water").set(cx + x, -1, cz + z, "minecraft:water").set(cx + x, -2, cz + z, "minecraft:mud");
      if (p.rnd() < 0.12) p.set(cx + x, 1, cz + z, "minecraft:waterlily");
    } else if (e <= 1.45) {
      p.set(cx + x, 0, cz + z, "minecraft:mossy_stone_bricks");
      if (p.rnd() < 0.25) p.set(cx + x, 1, cz + z, p.rnd() < 0.5 ? "minecraft:firefly_bush" : "minecraft:fern");
    }
  }
  p.set(cx, 0, cz, "minecraft:mossy_stone_bricks").set(cx, 1, cz, "minecraft:mossy_stone_bricks").set(cx, 2, cz, "minecraft:pearlescent_froglight");
  p.mark("npc_elfo", cx - 6, 1, cz + 2);
}

/** Uma Raiz Corrompida (corrupted) ou purificada, com o chão em volta. */
export function rootPatch(p, rx, rz, purified) {
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    const d = hyp(x, z);
    if (d > 3.6) continue;
    p.set(rx + x, 0, rz + z, purified ? (p.rnd() < 0.7 ? "minecraft:moss_block" : "minecraft:grass_block")
      : (p.rnd() < 0.75 ? "minecraft:pale_moss_block" : "minecraft:podzol"));
    if (d > 0.5) {
      const deco = purified ? (p.rnd() < 0.25 ? p.pick([["minecraft:azure_bluet", 2], ["minecraft:lily_of_the_valley", 2], ["minecraft:fern", 2], ["minecraft:short_grass", 3]]) : AIR)
        : (p.rnd() < 0.12 ? "minecraft:deadbush" : AIR);
      p.set(rx + x, 1, rz + z, deco);
    }
  }
  const wood = purified ? B.log("minecraft:birch_wood") : B.log("minecraft:pale_oak_wood");
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
    p.set(rx + dx, 1, rz + dz, wood).set(rx + dx, 2, rz + dz, wood);
    p.set(rx + Math.sign(dx), 3, rz + Math.sign(dz), wood);
  }
  p.set(rx, 3, rz, purified ? LEAF("minecraft:azalea_leaves_flowered") : wood);
  p.set(rx, 2, rz, AIR);
  p.set(rx, 1, rz, purified ? "minecraft:flowering_azalea" : "valdoria:raiz_corrompida");
}

// ---------------------------------------------------------------------- o Coração de Ylthariel (caverna de Morthil)
const CAV_R = 11, CAV_H = 12;
const inCave = (x, y, z) => y > F && (x * x + z * z) / (CAV_R * CAV_R) + ((y - F) / CAV_H) ** 2 <= 1;
const PILLARS = [[7, 5], [-7, 5], [6, -6], [-6, -6]];

/** Piso da caverna: cinzento enquanto Morthil vive; musgo e flores depois da vitória. */
export function caveFloor(p, purified) {
  for (let x = -CAV_R; x <= CAV_R; x++) for (let z = -CAV_R; z <= CAV_R; z++) {
    if (x * x + z * z > CAV_R * CAV_R) continue;
    if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
    if (PILLARS.some(([px, pz]) => x >= px && x <= px + 1 && z >= pz && z <= pz + 1)) continue;
    p.set(x, F, z, purified ? p.pick([["minecraft:moss_block", 6], ["minecraft:grass_block", 3], ["minecraft:dirt_with_roots", 1]])
      : p.pick([["minecraft:pale_moss_block", 5], ["minecraft:podzol", 2], ["minecraft:mud", 2], ["minecraft:dirt_with_roots", 1]]));
    if ((Math.abs(x) <= 1 && z === 2) || (x === 0 && z === -9)) continue; // saída do poço e lugar do baú do tesouro
    if (!inCave(x, F + 1, z)) continue;
    const r = p.rnd();
    p.set(x, F + 1, z, purified ? (r < 0.08 ? "minecraft:firefly_bush" : r < 0.2 ? "minecraft:short_grass" : r < 0.26 ? "minecraft:azure_bluet" : AIR)
      : (r < 0.05 ? "minecraft:deadbush" : AIR));
  }
}

function heartCave(p) {
  const shellIds = [["minecraft:dirt_with_roots", 4], ["minecraft:packed_mud", 3], ["minecraft:mud", 1], ["minecraft:pale_moss_block", 2],
    ["minecraft:moss_block", 2]];
  for (let x = -CAV_R - 1; x <= CAV_R + 1; x++) for (let z = -CAV_R - 1; z <= CAV_R + 1; z++) for (let y = F - 1; y <= F + CAV_H + 1; y++) {
    if (inCave(x, y, z)) {
      p.set(x, y, z, AIR);
      continue;
    }
    const near = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => inCave(x + a, y + b, z + c));
    if (!near && !(y === F && x * x + z * z <= CAV_R * CAV_R)) continue;
    if (y === F && x * x + z * z <= CAV_R * CAV_R) continue; // o piso vem de caveFloor
    const r = p.rnd();
    p.set(x, y, z, r < 0.035 ? "minecraft:shroomlight" : r < 0.1 ? B.log("minecraft:birch_wood") : p.pick(shellIds));
    if (y > F + 3 && inCave(x, y - 1, z) && p.rnd() < 0.12) p.set(x, y - 1, z, "minecraft:hanging_roots");
  }
  caveFloor(p, false);
  // pilares de raiz (cobertura)
  for (const [px, pz] of PILLARS) {
    for (let y = F + 1; y <= F + CAV_H; y++) for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) {
      if (!inCave(px + dx, y, pz + dz)) continue;
      p.set(px + dx, y, pz + dz, (y + dx + dz) % 4 === 0 ? B.log("minecraft:pale_oak_wood") : B.log("minecraft:birch_wood"));
    }
  }
  // poço do Coração: coluna 3 x 3 de madeira com escada de mão (do selo até o piso), saída ao sul
  for (let y = F + 1; y <= -1; y++) {
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, y, z, x === 0 && z === 0 ? B.ladder("south") : B.log("minecraft:birch_wood"));
  }
  p.set(0, F + 1, 1, AIR).set(0, F + 2, 1, AIR);
  p.set(0, F + 3, 2, "minecraft:verdant_froglight");
  p.mark("chefe", 0, F + 1, -7).mark("bau_coracao", 0, F + 1, -9).mark("poco", 0, F + 1, 0);
  p.box("arena", -CAV_R, F, -CAV_R, CAV_R, F + CAV_H, CAV_R);
}

// ---------------------------------------------------------------------- planta completa
/** Planta completa (sem o preparo do terreno): usada na construção e para reconstruir as marcações em tempo de execução. */
export function aeltharPlan(origin, rot, rnd) {
  const p = new Plan(origin, rot, rnd);
  heartCave(p);
  motherTree(p);
  platforms(p);
  councilHall(p);
  for (const s of SATS) satellite(p, s);
  grandStair(p);
  // sebe viva com passagens nos quatro pontos cardeais
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = hyp(x, z);
    if (d <= 26.5 || d > 27.5 || Math.abs(x) <= 2 || Math.abs(z) <= 2) continue;
    p.set(x, 1, z, LEAF("minecraft:azalea_leaves")).set(x, 2, z, LEAF(p.rnd() < 0.3 ? "minecraft:azalea_leaves_flowered" : "minecraft:azalea_leaves"));
  }
  // Portal das Folhas (sul)
  for (const x of [-3, 3]) for (let y = 1; y <= 5; y++) p.set(x, y, 27, B.log("minecraft:stripped_birch_log"));
  for (let x = -3; x <= 3; x++) p.set(x, 6, 27, LEAF(x % 2 ? "minecraft:azalea_leaves_flowered" : "minecraft:azalea_leaves"));
  p.set(0, 5, 27, "minecraft:pearlescent_froglight");
  // luzes élficas
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + 0.26;
    const x = Math.round(Math.cos(a) * 20), z = Math.round(Math.sin(a) * 20);
    if (hyp(x - 14, z - 15) < 8 || hyp(x + 14, z - 15) < 7 || SATS.some((s) => hyp(x - s.x, z - s.z) < 5)) continue;
    elvenLamp(p, x, z);
  }
  for (const z of [14, 19, 25]) for (const x of [-4, 4]) elvenLamp(p, x, z);
  druidGrove(p, -14, 15);
  moonPond(p, 14, 15);
  for (const [rx, rz] of ROOTS) {
    rootPatch(p, rx, rz, false);
    p.mark("raiz", rx, 1, rz);
  }
  // moradores e guardas
  p.mark("npc_elfo", 6, P + 1, 4).mark("npc_elfo", 4, 1, 19).mark("npc_elfo", -8, P + 1, -2);
  for (const [x, y, z] of [[-3, 1, 25], [3, 1, 25], [-3, P + 1, 9], [3, P + 1, 9], [-24, 1, 0], [24, 1, 0]]) p.mark("npc_arqueiro_elfico", x, y, z);
  p.box("area", -R - 2, F - 2, -R - 2, R + 2, 40, R + 2);
  return p;
}

export const AELTHAR = {
  id: "aelthar", nome: "Aelthar, o Reino Élfico", raio: R, alturaMax: 8, xp: 300, limpeza: false, distGen: 64,
  biomas: ["forest", "birch", "flower", "meadow", "cherry", "plains", "taiga", "jungle", "roofed", "dark_forest", "river"],
  nomes: ["Aelthar, o Reino Élfico"],
  descricao: "A cidade dos elfos entre as árvores: a Árvore-Mãe Ylthariel, o Salão do Conselho da Rainha Lyrael, pontes, a Biblioteca das " +
    "Folhas e o Bosque do Druida. Sob as raízes, o Coração de Ylthariel.",
  dica: "§aUma árvore colossal, de casca prateada, se ergue acima da floresta: Aelthar!",
  async plan(dim, origin, rot, rnd) {
    const p = aeltharPlan(origin, rot, rnd);
    const ground = (x, z) => {
      const d = hyp(x, z);
      if (Math.abs(x) <= 2 && z >= 10) return (x + z) % 6 === 0 ? "minecraft:pearlescent_froglight" : p.pick([["minecraft:mossy_stone_bricks", 3], ["minecraft:stone_bricks", 1]]);
      if (d >= 6 && d <= 7.5) return (Math.round(Math.atan2(z, x) * 8) % 5 === 0) ? "minecraft:verdant_froglight" : "minecraft:grass_path";
      if (d > 26.5) return "minecraft:grass_block";
      return p.pick([["minecraft:grass_block", 7], ["minecraft:moss_block", 3], ["minecraft:podzol", 1]]);
    };
    const prep = await prepareGround(dim, p, -R - 2, -R - 2, R + 2, R + 2, 42, "minecraft:dirt", ground);
    return { plans: [prep, p], plan: p };
  },
};
