// Construtor de estruturas por script: planos em coordenadas locais (com rotação), execução em lotes,
// análise de terreno (plano, seco, sem construções de jogadores) e fundação/limpeza.
import { system, BlockPermutation, BlockVolume } from "@minecraft/server";

// ------------------------------------------------------------------ direções e rotação
const DIRS = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const DIR_NAMES = ["north", "east", "south", "west"];
const WEIRDO = ["east", "west", "south", "north"]; // stairs: weirdo_direction 0..3
const FACING = { 2: "north", 3: "south", 4: "west", 5: "east" }; // facing_direction
const FACING_INV = { north: 2, south: 3, west: 4, east: 5 };
const LEGACY_DIR = ["south", "west", "north", "east"]; // direction 0..3 (alçapões, portões)

/** Gira (x, z) local por rot (0..3 = 0°, 90°, 180°, 270° no sentido horário visto de cima). */
export function rotXZ(x, z, rot) {
  switch (rot & 3) {
    case 1: return [-z, x];
    case 2: return [-x, -z];
    case 3: return [z, -x];
    default: return [x, z];
  }
}
function rotDir(name, rot) {
  const [x, z] = DIRS[name];
  const [rx, rz] = rotXZ(x, z, rot);
  return Object.keys(DIRS).find((k) => DIRS[k][0] === rx && DIRS[k][1] === rz);
}
function rotStates(states, rot) {
  if (!states || !rot) return states;
  const s = { ...states };
  if (s["minecraft:cardinal_direction"]) s["minecraft:cardinal_direction"] = rotDir(s["minecraft:cardinal_direction"], rot);
  if (s.weirdo_direction !== undefined) s.weirdo_direction = WEIRDO.indexOf(rotDir(WEIRDO[s.weirdo_direction], rot));
  if (s.facing_direction !== undefined && FACING[s.facing_direction]) s.facing_direction = FACING_INV[rotDir(FACING[s.facing_direction], rot)];
  if (s.direction !== undefined) s.direction = LEGACY_DIR.indexOf(rotDir(LEGACY_DIR[s.direction], rot));
  if (s.pillar_axis && rot % 2 === 1 && s.pillar_axis !== "y") s.pillar_axis = s.pillar_axis === "x" ? "z" : "x";
  const conn = ["north", "east", "south", "west"].map((d) => s[`minecraft:connection_${d}`]);
  if (conn.some((c) => c !== undefined)) {
    for (let i = 0; i < 4; i++) s[`minecraft:connection_${DIR_NAMES[(i + rot) & 3]}`] = !!conn[i];
  }
  return s;
}

/** Atalhos de blocos com estados. */
export const B = {
  stairs: (id, dir, top = false) => [id, { weirdo_direction: WEIRDO.indexOf(dir), upside_down_bit: top }],
  slab: (id, top = false) => [id, { "minecraft:vertical_half": top ? "top" : "bottom" }],
  log: (id, axis = "y") => [id, { pillar_axis: axis }],
  facing: (id, dir) => [id, { "minecraft:cardinal_direction": dir }],
  ladder: (dir) => ["minecraft:ladder", { facing_direction: FACING_INV[dir] }],
  torch: () => ["minecraft:torch", { torch_facing_direction: "top" }],
  lantern: (id = "minecraft:lantern", hanging = false) => [id, { hanging }],
  candle: (n = 1, id = "minecraft:candle") => [id, { candles: Math.max(0, Math.min(3, n - 1)), lit: true }],
  fire: (id = "minecraft:campfire", dir = "south") => [id, { extinguished: false, "minecraft:cardinal_direction": dir }],
  bars: (ns, ew) => ["minecraft:iron_bars", { "minecraft:connection_north": ns, "minecraft:connection_south": ns,
    "minecraft:connection_east": ew, "minecraft:connection_west": ew }],
  fence: (id, ns = false, ew = false) => [id, { "minecraft:connection_north": ns, "minecraft:connection_south": ns,
    "minecraft:connection_east": ew, "minecraft:connection_west": ew }],
  skull: () => ["minecraft:skeleton_skull", { facing_direction: 1 }],
  barrel: () => ["minecraft:barrel", { facing_direction: 1, open_bit: false }],
  cluster: () => ["minecraft:amethyst_cluster", { "minecraft:block_face": "up" }],
};

// ------------------------------------------------------------------ plano
export class Plan {
  /** @param {{x:number,y:number,z:number}} origin @param {number} rot */
  constructor(origin, rot = 0, rnd = Math.random) {
    this.origin = { x: Math.floor(origin.x), y: Math.floor(origin.y), z: Math.floor(origin.z) };
    this.rot = rot & 3;
    this.rnd = rnd;
    this.ops = [];
    this.chests = []; // {pos, tier, extra}
    this.marks = {}; // nome -> [pos mundo]
  }
  world(x, y, z) {
    const [rx, rz] = rotXZ(x, z, this.rot);
    return { x: this.origin.x + rx, y: this.origin.y + y, z: this.origin.z + rz };
  }
  /** Bloco único. `b` = id ou [id, estados]. */
  set(x, y, z, b) {
    if (!b) return this;
    const [id, st] = Array.isArray(b) ? b : [b, undefined];
    this.ops.push({ k: "s", p: this.world(x, y, z), id, st: rotStates(st, this.rot) });
    return this;
  }
  /** Caixa cheia (rápida, via fillBlocks). */
  fill(x1, y1, z1, x2, y2, z2, id) {
    const a = this.world(x1, y1, z1);
    const b = this.world(x2, y2, z2);
    this.ops.push({ k: "f", a, b, id });
    return this;
  }
  /** Caixa oca: paredes/chão/teto de `wall`, interior de ar. */
  room(x1, y1, z1, x2, y2, z2, wall, floor) {
    this.fill(x1, y1, z1, x2, y2, z2, wall);
    this.fill(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, "minecraft:air");
    if (floor) this.fill(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, floor);
    return this;
  }
  /** Mistura de blocos por chance: lista [[bloco, peso], ...]. */
  pick(list) {
    const total = list.reduce((a, [, w]) => a + w, 0);
    let r = this.rnd() * total;
    for (const [b, w] of list) if ((r -= w) <= 0) return b;
    return list[0][0];
  }
  chest(x, y, z, dir, tier, extra = {}) {
    this.set(x, y, z, B.facing("minecraft:chest", dir));
    this.chests.push({ pos: this.world(x, y, z), tier, extra });
    return this;
  }
  mark(name, x, y, z) {
    (this.marks[name] = this.marks[name] || []).push(this.world(x, y, z));
    return this;
  }
  box(name, x1, y1, z1, x2, y2, z2) {
    const a = this.world(x1, y1, z1);
    const b = this.world(x2, y2, z2);
    this.marks[name] = [{ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) },
      { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) }];
    return this;
  }
}

// ------------------------------------------------------------------ execução em lotes
const permCache = new Map();
function perm(id, st) {
  const key = st ? `${id}|${JSON.stringify(st)}` : id;
  let p = permCache.get(key);
  if (!p) {
    p = BlockPermutation.resolve(id, st);
    permCache.set(key, p);
  }
  return p;
}

/** Divide uma caixa em partes de até `max` blocos (limite seguro para fillBlocks, como o comando /fill). */
export function splitBox(a, b, max = 32768) {
  const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
  const hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
  const size = (hi.x - lo.x + 1) * (hi.y - lo.y + 1) * (hi.z - lo.z + 1);
  if (size <= max) return [[lo, hi]];
  const ax = ["x", "y", "z"].reduce((m, k) => (hi[k] - lo[k] > hi[m] - lo[m] ? k : m), "x");
  const mid = Math.floor((lo[ax] + hi[ax]) / 2);
  return splitBox(lo, { ...hi, [ax]: mid }, max).concat(splitBox({ ...lo, [ax]: mid + 1 }, hi, max));
}

/** Executa o plano em lotes (sem travar o jogo). Retorna uma Promise resolvida com o número de erros. */
export function build(dim, plan, perTick = 350) {
  return new Promise((resolve) => {
    let errors = 0;
    const job = function* () {
      let n = 0;
      for (const op of plan.ops) {
        try {
          if (op.k === "f") {
            for (const [lo, hi] of splitBox(op.a, op.b)) {
              dim.fillBlocks(new BlockVolume(lo, hi), op.id === "minecraft:air" ? "minecraft:air" : perm(op.id),
                { ignoreChunkBoundErrors: true });
              n += 40;
            }
          } else {
            dim.setBlockPermutation(op.p, perm(op.id, op.st));
            n++;
          }
        } catch (e) {
          if (errors++ < 5) console.warn(`[Valdoria] estrutura: ${op.id} ${JSON.stringify(op.st || {})}: ${e}`);
        }
        if (n >= perTick) {
          n = 0;
          yield;
        }
      }
      resolve(errors);
    };
    system.runJob(job());
  });
}

// ------------------------------------------------------------------ terreno
const PASSABLE = ["leaves", "_log", "_wood", "short_grass", "tall_grass", "fern", "flower", "tulip", "bush", "vine", "petals",
  "moss_carpet", "mushroom", "snow_layer", "dandelion", "poppy", "orchid", "allium", "bluet", "daisy", "cornflower", "lily",
  "rose", "sunflower", "lilac", "peony", "azalea", "bamboo", "reeds", "sugar_cane", "litter", "cactus", "pumpkin", "melon",
  "sapling", "propagule", "hanging_roots", "pitcher", "torchflower", "eyeblossom", "dry_grass", "deadbush", "dead_bush",
  "seagrass", "sweet_berry", "cocoa", "pale_moss", "firefly", "cactus_flower", "wildflowers", "bee_nest", "web", "lichen",
  "dripleaf", "spore_blossom", "mangrove_roots", "air"];
const NATURAL = ["grass_block", "dirt", "coarse_dirt", "podzol", "dirt_with_roots", "mud", "sand", "red_sand", "sandstone",
  "gravel", "stone", "andesite", "diorite", "granite", "tuff", "deepslate", "snow", "clay", "terracotta", "moss_block", "mycelium",
  "calcite", "mossy_cobblestone", "packed_ice", "blue_ice", "dripstone_block", "suspicious_sand", "suspicious_gravel", "pale_moss_block",
  "powder_snow", "magma", "obsidian", "basalt", "blackstone", "amethyst", "copper_ore", "iron_ore", "coal_ore", "gold_ore", "emerald_ore",
  "redstone_ore", "lapis_ore", "diamond_ore"];
const LIQUID = ["water", "lava", "ice", "bubble_column"];

export function isPassable(id) {
  const n = id.replace("minecraft:", "");
  return PASSABLE.some((k) => n.includes(k));
}
function isNatural(id) {
  const n = id.replace("minecraft:", "");
  return NATURAL.some((k) => n.includes(k));
}

/** Altura do chão natural na coluna (x, z), ou {err}. */
export function groundAt(dim, x, z) {
  let top;
  try {
    top = dim.getTopmostBlock({ x, z });
  } catch {
    return { err: "descarregado" };
  }
  if (!top) return { err: "descarregado" };
  let y = top.location.y;
  let veg = 0;
  for (let i = 0; i < 40; i++) {
    let b;
    try {
      b = dim.getBlock({ x, y, z });
    } catch {
      return { err: "descarregado" };
    }
    if (!b) return { err: "descarregado" };
    const id = b.typeId;
    if (LIQUID.some((k) => id.includes(k))) return { err: "água" };
    if (isPassable(id)) {
      if (id.includes("_log") || id.includes("leaves") || id.includes("_wood")) veg++;
      y--;
      continue;
    }
    if (!isNatural(id)) return { err: "construção" };
    return { y, id, veg };
  }
  return { err: "sem chão" };
}

/**
 * Avalia um terreno quadrado de raio r ao redor de (cx, cz).
 * @returns {{ok:boolean, y?:number, reason?:string, spread?:number}}
 */
export function survey(dim, cx, cz, r, maxSpread = 5, step = 3) {
  // Lê o chão em uma grade. O terreno de verdade quase nunca é perfeito, e o preparo do terreno já nivela o local (preenche
  // buracos e poças pequenas e corta o que fica acima do piso), então algumas falhas são toleradas:
  // - até 6% dos pontos com água (poças, riachos) e até 50% sob árvores;
  // - a diferença de altura entre os 10% mais baixos e os 10% mais altos até `maxSpread`, e a total até 2 × `maxSpread` + 4.
  const hs = [];
  let trees = 0;
  let water = 0;
  const pts = [];
  for (let dx = -r; dx <= r; dx += step) for (let dz = -r; dz <= r; dz += step) pts.push([dx, dz]);
  for (const [dx, dz] of [[r, r], [r, -r], [-r, r], [-r, -r]]) pts.push([dx, dz]);
  for (const [dx, dz] of pts) {
    const g = groundAt(dim, Math.floor(cx + dx), Math.floor(cz + dz));
    if (g.err === "água") {
      water++;
      continue;
    }
    if (g.err) return { ok: false, reason: g.err };
    hs.push(g.y);
    if (g.veg) trees++;
  }
  if (water > pts.length * 0.06 || !hs.length) return { ok: false, reason: "água" };
  hs.sort((a, b) => a - b);
  const lo = hs[Math.floor(hs.length * 0.1)];
  const hi = hs[Math.min(hs.length - 1, Math.floor(hs.length * 0.9))];
  const spread = hi - lo;
  if (spread > maxSpread || hs[hs.length - 1] - hs[0] > maxSpread * 2 + 4) return { ok: false, reason: "irregular", spread };
  if (trees > pts.length * 0.5) return { ok: false, reason: "mata fechada" };
  return { ok: true, y: hs[Math.floor(hs.length / 2)], spread };
}

/**
 * Prepara o terreno: limpa o volume acima do piso (árvores, plantas) e preenche a fundação até o chão.
 * A leitura do terreno roda em lotes; devolve uma Promise com o plano de preparo.
 */
export function prepareGround(dim, plan, x1, z1, x2, z2, clearHeight, fillId = "minecraft:dirt", topId) {
  return new Promise((resolve) => {
    const prep = new Plan(plan.origin, plan.rot, plan.rnd);
    prep.fill(x1, 1, z1, x2, clearHeight, z2, "minecraft:air");
    const job = function* () {
      let n = 0;
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
          const w = prep.world(x, 0, z);
          const g = groundAt(dim, w.x, w.z);
          const gy = g.err ? plan.origin.y - 6 : Math.max(plan.origin.y - 12, g.y);
          if (gy < plan.origin.y - 1) prep.fill(x, gy - plan.origin.y + 1, z, x, -1, z, fillId);
          prep.set(x, 0, z, topId ? (typeof topId === "function" ? topId(x, z) : topId) : fillId);
          if (++n % 24 === 0) yield;
        }
      }
      resolve(prep);
    };
    system.runJob(job());
  });
}

export function chunksLoaded(dim, plan, x1, z1, x2, z2, y = 0) {
  for (const [x, z] of [[x1, z1], [x1, z2], [x2, z1], [x2, z2], [(x1 + x2) / 2, (z1 + z2) / 2]]) {
    try {
      if (!dim.isChunkLoaded(plan.world(Math.round(x), y, Math.round(z)))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Gerador pseudoaleatório determinístico (para variações reproduzíveis por local). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
