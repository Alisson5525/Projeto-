import { system, world } from '@minecraft/server';
import { getSettings, intensityMul } from './config.js';
import { particle, q, sound } from './fx.js';
import { isHeroId } from './state.js';
import { pushMobs, shieldProtected } from './targets.js';
import { V } from './vec.js';

// Blocos que nunca sao destruidos
const PROTECTED = new Set([
  'minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:structure_void',
  'minecraft:jigsaw', 'minecraft:end_portal_frame', 'minecraft:end_portal', 'minecraft:portal',
  'minecraft:end_gateway', 'minecraft:allow', 'minecraft:deny', 'minecraft:border_block',
  'minecraft:reinforced_deepslate', 'minecraft:trial_spawner', 'minecraft:vault', 'minecraft:respawn_anchor',
]);
const CONTAINER_RE = /(chest|shulker_box|barrel|furnace|smoker|hopper|dropper|dispenser|brewing_stand|lectern|chiseled_bookshelf|decorated_pot|crafter|beacon|beehive|bee_nest|jukebox|enchanting_table|anvil)/;
const FRAGILE_RE = /(glass|leaves|flower|tall_grass|short_grass|^minecraft:grass$|fern|bush|sapling|torch|snow_layer|vine|lantern|carpet|tulip|daisy|poppy|dandelion|orchid|allium|bluet|cornflower|lily|rose|peony|lilac|sunflower|mushroom|sugar_cane|bamboo|kelp|seagrass|cobweb|candle|pane|button|lever|rail|redstone_wire|wheat|carrots|potatoes|beetroot|melon_stem|pumpkin_stem|flower_pot|ice$)/;

const MAX_BLAST = 10;          // raio maximo de explosao (desempenho)
const READ_BUDGET = 1600;      // leituras de bloco por tick para as ondas de destruicao
const WRITE_BUDGET = 130;      // blocos destruidos por tick pelas ondas (o resto fica para os proximos ticks)

// contadores para os testes
export const stats = { blasts: 0, written: 0 };

let wTick = -1;
let writesLeft = 0;
/** Blocos que ainda podem ser destruidos neste tick (todas as fontes contam; as ondas esperam se acabar). */
function writes() {
  const t = system.currentTick;
  if (t !== wTick) { wTick = t; writesLeft = q(WRITE_BUDGET); }
  return writesLeft;
}

export function isBreakable(id) {
  if (!id || id === 'minecraft:air' || id === 'minecraft:cave_air' || id === 'minecraft:void_air') return false;
  if (id.includes('water') || id.includes('lava')) return false;
  if (PROTECTED.has(id) || id.startsWith('minecraft:light_block')) return false;
  if (getSettings().protectContainers && CONTAINER_RE.test(id)) return false;
  return true;
}

export function isFragile(id) {
  return FRAGILE_RE.test(id || '');
}

/** Tipo de material do bloco: decide quais particulas saem quando ele quebra. */
export function debrisKind(id) {
  id = id || '';
  if (/(glass|ice|pane|amethyst|sea_lantern|glowstone)/.test(id)) return 'glass';
  if (/(leaves|azalea|vine|moss_carpet|tall_grass|short_grass|^minecraft:grass$|fern|bush|sapling|flower|tulip|daisy|poppy|dandelion|orchid|allium|bluet|cornflower|lily|rose|peony|lilac|sunflower|wheat|carrots|potatoes|beetroot|kelp|seagrass|sugar_cane|bamboo)/.test(id)) return 'leaf';
  if (/snow/.test(id)) return 'snow';
  if (/(sand|gravel|concrete_powder|soul_soil)/.test(id)) return 'sand';
  if (/(log|wood|planks|stem|hyphae|fence|door|bookshelf|crafting|barrel|chest|ladder|sign|trapdoor|scaffolding)/.test(id)) return 'wood';
  if (/(grass_block|mycelium|podzol)/.test(id)) return 'turf';
  if (/(dirt|mud|farmland|path|clay|coarse|rooted|moss_block)/.test(id)) return 'soil';
  return 'stone';
}

/**
 * Particulas de quebra conforme o material: pedacos de pedra que quicam, poeira animada da cor do bloco,
 * graos de areia, lascas de madeira, cacos de vidro que brilham e folhas que caem balancando.
 */
let fxTick = -1;
let fxCount = 0;

/** Limite de efeitos de quebra por tick (atravessar uma montanha nao pode travar o jogo). */
function debrisBudget() {
  const t = system.currentTick;
  if (t !== fxTick) { fxTick = t; fxCount = 0; }
  return fxCount++ < q(28);
}

export function spawnDebris(dim, loc, id, power = 1) {
  if (!debrisBudget()) return;
  const color = debrisColor(id);
  const scale = Math.min(1.8, 0.8 + power * 0.25);
  switch (debrisKind(id)) {
    case 'glass':
      particle(dim, 'superman:shards', loc, { color });
      break;
    case 'leaf':
      particle(dim, 'superman:leaf_bits', loc, { color, count: 6 });
      break;
    case 'snow':
      particle(dim, 'superman:debris_dust', loc, { color, count: 2, scale });
      particle(dim, 'superman:grains', loc, { color, scale });
      break;
    case 'sand':
      particle(dim, 'superman:grains', loc, { color, scale });
      particle(dim, 'superman:debris_dust', loc, { color, count: 2, scale });
      break;
    case 'wood':
      particle(dim, 'superman:splinters', loc, { color, scale });
      particle(dim, 'superman:debris_dust', loc, { color, count: 1, scale });
      break;
    case 'turf':
      particle(dim, 'superman:debris', loc, { color: SOIL, scale });
      particle(dim, 'superman:leaf_bits', loc, { color, count: 3 });
      particle(dim, 'superman:debris_dust', loc, { color: SOIL, count: 1, scale });
      break;
    default:
      particle(dim, 'superman:debris', loc, { color, scale });
      particle(dim, 'superman:debris_dust', loc, { color, count: power > 1.5 ? 2 : 1, scale });
  }
}

const SOIL = { r: 0.47, g: 0.33, b: 0.22 };

/** Cor do chao logo abaixo de um ponto (poeira de pouso, decolagem e pancada da cor certa). */
export function groundColor(dim, loc) {
  for (let dy = 0; dy <= 3; dy++) {
    const b = getBlock(dim, { x: loc.x, y: loc.y - 0.5 - dy, z: loc.z });
    if (!b || b.isAir) continue;
    const id = b.typeId;
    if (id.includes('water')) return { r: 0.75, g: 0.85, b: 0.95 };
    return debrisKind(id) === 'turf' ? SOIL : debrisColor(id);
  }
  return { r: 0.6, g: 0.55, b: 0.48 };
}

/** Cor aproximada dos detritos para cada tipo de bloco. */
export function debrisColor(id) {
  id = id || '';
  if (/(deepslate|blackstone|basalt|obsidian|coal|tuff|bedrock)/.test(id)) return { r: 0.27, g: 0.27, b: 0.3 };
  if (/(cherry)/.test(id)) return { r: 0.95, g: 0.7, b: 0.8 };
  if (/(azalea|leaves|moss|vine|cactus|melon|bamboo|kelp|grass|fern|seagrass|sapling)/.test(id)) return { r: 0.36, g: 0.56, b: 0.24 };
  if (/(mycelium)/.test(id)) return { r: 0.45, g: 0.38, b: 0.45 };
  if (/(red_sand|terracotta|mud_brick|copper)/.test(id)) return { r: 0.72, g: 0.42, b: 0.27 };
  if (/(gravel|andesite|cobble|stone_brick|furnace)/.test(id)) return { r: 0.5, g: 0.5, b: 0.5 };
  if (/(dirt|mud|podzol|farmland|path|clay|coarse)/.test(id)) return { r: 0.47, g: 0.33, b: 0.22 };
  if (/(sand|sandstone)/.test(id)) return { r: 0.86, g: 0.8, b: 0.58 };
  if (/(log|wood|planks|stem|hyphae|fence|door|bookshelf)/.test(id)) return { r: 0.55, g: 0.4, b: 0.24 };
  if (/(glass|ice)/.test(id)) return { r: 0.75, g: 0.9, b: 1.0 };
  if (/(snow|quartz|calcite|white|diorite|bone)/.test(id)) return { r: 0.93, g: 0.94, b: 0.96 };
  if (/(netherrack|crimson|nether_wart|red)/.test(id)) return { r: 0.55, g: 0.18, b: 0.16 };
  if (/(deepslate|blackstone|basalt|obsidian|coal|tuff)/.test(id)) return { r: 0.27, g: 0.27, b: 0.3 };
  if (/(gold)/.test(id)) return { r: 0.95, g: 0.8, b: 0.25 };
  if (/(iron)/.test(id)) return { r: 0.8, g: 0.75, b: 0.7 };
  return { r: 0.52, g: 0.52, b: 0.52 };
}

// ---------------------------------------------------------------- sem drops
const noDropZones = [];

export function markNoDrops(dim, center, radius) {
  noDropZones.push({ dim: dim.id, c: center, r2: (radius + 1.5) ** 2, until: system.currentTick + 4 });
}

world.afterEvents.entitySpawn.subscribe((ev) => {
  if (!noDropZones.length) return;
  const e = ev.entity;
  try {
    if (e.typeId !== 'minecraft:item') return;
    const now = system.currentTick;
    for (let i = noDropZones.length - 1; i >= 0; i--) {
      const z = noDropZones[i];
      if (z.until < now) { noDropZones.splice(i, 1); continue; }
      if (z.dim !== e.dimension.id) continue;
      const l = e.location;
      if ((l.x - z.c.x) ** 2 + (l.y - z.c.y) ** 2 + (l.z - z.c.z) ** 2 <= z.r2) {
        e.remove();
        return;
      }
    }
  } catch (err) { /* entidade ja removida */ }
});

// ---------------------------------------------------------------- quebra de blocos
function getBlock(dim, loc) {
  try {
    return dim.getBlock(loc);
  } catch (e) {
    return undefined;
  }
}

/**
 * Blocos solidos dentro de uma esfera (ordenados do centro para fora).
 * `seen` (opcional) evita reler posicoes ja verificadas em esferas sobrepostas.
 */
export function sphereBlocks(dim, center, r, filter, seen) {
  const out = [];
  const c = V.floor(center);
  const R = Math.ceil(r);
  const min = dim.heightRange.min, max = dim.heightRange.max - 1;
  for (let x = -R; x <= R; x++) {
    for (let y = -R; y <= R; y++) {
      const yy = c.y + y;
      if (yy < min || yy > max) continue;
      for (let z = -R; z <= R; z++) {
        const d2 = x * x + y * y + z * z;
        if (d2 > r * r) continue;
        if (seen) {
          const k = `${c.x + x},${yy},${c.z + z}`;
          if (seen.has(k)) continue;
          seen.add(k);
        }
        const b = getBlock(dim, { x: c.x + x, y: yy, z: c.z + z });
        if (!b || b.isAir || b.isLiquid) continue;
        if (filter && !filter(b.typeId)) continue;
        out.push({ b, d2 });
      }
    }
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out.map((o) => o.b);
}

/**
 * Destroi uma lista de blocos. Os primeiros `visible` usam o modo "destroy"
 * (som + particulas de quebra do proprio jogo); o resto e removido direto
 * para nao pesar. Retorna quantos blocos foram destruidos.
 */
export function breakBlocks(dim, blocks, opts = {}) {
  const s = getSettings();
  if (!s.destruction && !opts.force) return 0;
  const visible = q(opts.visible ?? 8);
  let n = 0;
  let cx = 0, cy = 0, cz = 0;
  for (const b of blocks) {
    try {
      const id = b.typeId;
      if (!isBreakable(id)) continue;
      const l = b.location;
      if (n < visible) dim.runCommand(`setblock ${l.x} ${l.y} ${l.z} air destroy`);
      else b.setType('minecraft:air');
      writes();
      writesLeft--;
      stats.written++;
      if (n % (opts.debrisEvery ?? 3) === 0) spawnDebris(dim, V.center(l), id, opts.power ?? 1);
      cx += l.x; cy += l.y; cz += l.z;
      n++;
      if (opts.max && n >= opts.max) break;
    } catch (e) { /* bloco invalido */ }
  }
  if (n && !s.drops && !opts.keepDrops) {
    const c = { x: cx / n + 0.5, y: cy / n + 0.5, z: cz / n + 0.5 };
    let r = 2;
    for (const b of blocks) {
      try { r = Math.max(r, V.dist(c, b.location) + 1); } catch (e) { /* */ }
    }
    markNoDrops(dim, c, Math.min(r, 16));
  }
  return n;
}

export function breakSphere(dim, center, r, opts = {}) {
  if (!getSettings().destruction && !opts.force) return 0;
  return breakBlocks(dim, sphereBlocks(dim, center, r, opts.filter, opts.seen), opts);
}

// ---------------------------------------------------------------- ondas de destruicao
// A destruicao grande e feita em camadas, do centro para fora, ao longo de varios
// ticks: parece uma onda de choque e evita travadas (orcamento de leituras por tick).

const MAXR = 12;
const OFFSETS = (() => {
  const o = [];
  for (let x = -MAXR; x <= MAXR; x++) {
    for (let y = -MAXR; y <= MAXR; y++) {
      for (let z = -MAXR; z <= MAXR; z++) {
        const d2 = x * x + y * y + z * z;
        if (d2 <= MAXR * MAXR) o.push({ x, y, z, d2 });
      }
    }
  }
  return o.sort((a, b) => a.d2 - b.d2);
})();

const jobs = [];

/** Onda esferica: quebra blocos (opcionalmente filtrados) ate `radius`, `speed` blocos por tick. */
export function waveBreak(dim, center, radius, opts = {}) {
  if (!getSettings().destruction && !opts.force) return;
  const c = V.floor(center);
  const r2 = Math.min(radius, MAXR) ** 2;
  let idx = 0;
  let rad = 0;
  let broken = 0;
  const max = opts.max ?? 600;
  const shell = opts.rough ? (Math.sqrt(r2) - 1.2) ** 2 : Infinity;
  jobs.push({
    run(budget) {
      const room = writes();
      if (room <= 0) return 0;          // ja destruiu o bastante neste tick: continua no proximo
      rad += opts.speed ?? 1.6;
      const lim = Math.min(r2, rad * rad);
      const batch = [];
      let used = 0;
      while (idx < OFFSETS.length && used < budget && batch.length < room) {
        const o = OFFSETS[idx];
        if (o.d2 > lim) break;
        idx++;
        used++;
        // borda irregular, como uma cratera de verdade
        if (o.d2 > shell && Math.random() < 0.45) continue;
        const b = getBlock(dim, { x: c.x + o.x, y: c.y + o.y, z: c.z + o.z });
        if (!b || b.isAir || b.isLiquid) continue;
        if (opts.filter && !opts.filter(b.typeId)) continue;
        batch.push(b);
      }
      if (idx < OFFSETS.length && OFFSETS[idx].d2 <= lim) rad -= opts.speed ?? 1.6; // nao avanca o raio sem terminar a camada
      if (batch.length) broken += breakBlocks(dim, batch, { visible: opts.visible ?? 5, debrisEvery: opts.debrisEvery ?? 4, max: max - broken, power: opts.power });
      this.done = idx >= OFFSETS.length || OFFSETS[idx].d2 > r2 || broken >= max;
      return used;
    },
  });
}

/** Tunel que avanca ao longo de uma reta (soco carregado), `speed` blocos por tick. */
export function waveLine(dim, origin, dir, from, to, radius, opts = {}) {
  if (!getSettings().destruction && !opts.force) return;
  let d = from;
  const seen = new Set();
  const step = opts.step ?? 1.4;
  const perTick = Math.max(1, Math.round((opts.speed ?? 3) / step));
  let pending = [];   // blocos ja lidos que ficaram para o proximo tick (orcamento de escrita)
  let ended = false;
  const brk = (list) => breakBlocks(dim, list, { visible: opts.visible ?? 3, power: opts.power, debrisEvery: opts.debrisEvery });
  jobs.push({
    run(budget) {
      let used = 0;
      if (pending.length) {
        const room = writes();
        if (room <= 0) return 0;
        brk(pending.splice(0, room));
        if (pending.length) return 0;
      }
      for (let i = 0; i < perTick && d <= to && used < budget; i++) {
        const room = writes();
        if (room <= 0) break;           // continua no proximo tick
        const p = V.add(origin, V.mul(dir, d));
        const blocks = sphereBlocks(dim, p, radius, opts.filter, seen);
        used += Math.ceil((2 * radius + 1) ** 3 / 2);
        if (blocks.length > room) pending = blocks.slice(room);
        brk(blocks.slice(0, room));
        if (opts.onStep) opts.onStep(p, d);
        d += step;
        if (pending.length) break;
      }
      this.done = d > to && !pending.length;
      // a onda chegou ao fim do tunel
      if (this.done && !ended && opts.onEnd) { ended = true; opts.onEnd(V.add(origin, V.mul(dir, to))); }
      return used;
    },
  });
}

/** Processa as ondas pendentes (chamado uma vez por tick). */
export function processDestruction() {
  let budget = READ_BUDGET;
  for (let i = 0; i < jobs.length && budget > 0; i++) {
    const job = jobs[i];
    try {
      budget -= job.run(budget);
    } catch (e) {
      job.done = true;
    }
    if (job.done) {
      jobs.splice(i, 1);
      i--;
    }
  }
}

export function pendingDestruction() {
  return jobs.length;
}

// ---------------------------------------------------------------- explosoes
let blastDepth = 0;

/** Explosao do heroi: respeita configuracoes, nunca fere o proprio jogador nem os protegidos. */
export function blast(dim, loc, radius, source, opts = {}) {
  const s = getSettings();
  const r = Math.min(MAX_BLAST, radius * intensityMul());
  stats.blasts++;
  if (source) {
    if (!s.invulnerable) {
      try { source.addEffect('resistance', 3, { amplifier: 4, showParticles: false }); } catch (e) { /* */ }
    }
    shieldProtected(source, loc, r * 2 + 2);
  }
  // A explosao do proprio jogo fica pequena e NAO quebra blocos: so o estrondo, a fumaca e o fogo.
  // (Explosoes grandes quebrando blocos soltavam milhares de itens de uma vez e travavam o jogo.)
  // Se o heroi estiver dentro dela, ela nem acontece: o empurrao brigava com o voo.
  const vr = Math.min(r, 3.5);
  let heroNear = false;
  try { heroNear = !!source && V.dist(source.location, loc) < vr + 2; } catch (e) { /* */ }
  if (!heroNear || opts.vanilla) {
    blastDepth++;
    try {
      dim.createExplosion(loc, opts.vanilla ? r : vr, {
        breaksBlocks: !!opts.vanilla && s.destruction,
        causesFire: !!opts.fire && s.fire,
        source,
        allowUnderwater: true,
      });
    } catch (e) { /* fora do mundo */ }
    blastDepth--;
  } else {
    particle(dim, 'superman:impact_flash', loc, { radius: 2 + r * 0.4 });
    sound(dim, 'random.explode', loc, 1, 0.9);
  }
  // dano e empurrao em toda a area (poupa o heroi e os aliados)
  if (source && !opts.vanilla) pushMobs(source, loc, r * 1.3, 0.8 + r * 0.12, 0.45, 3 + r * 2);
  // cratera cavada em onda, com orcamento por tick: grande, mas sem travar
  if (s.destruction && !opts.noBlocks && !opts.vanilla) {
    waveBreak(dim, loc, r, { speed: Math.max(1.2, r / 5), visible: 4, max: 3000, rough: true, power: 2, debrisEvery: 5 });
  }
  if (!s.drops) markNoDrops(dim, loc, r + 2);
}

// Filtra blocos protegidos das explosoes do heroi
world.beforeEvents.explosion.subscribe((ev) => {
  let ours = blastDepth > 0;
  try { ours = ours || (!!ev.source && isHeroId(ev.source.id)); } catch (e) { /* */ }
  if (!ours) return;
  try {
    const blocks = ev.getImpactedBlocks();
    const keep = blocks.filter((b) => isBreakable(b.typeId));
    if (keep.length !== blocks.length) ev.setImpactedBlocks(keep);
    // amostra dos blocos atingidos: os detritos saem com a cor e o tipo de cada material
    const dim = ev.dimension;
    const step = Math.max(1, Math.floor(keep.length / 14));
    const sample = [];
    for (let i = 0; i < keep.length && sample.length < 14; i += step) {
      const b = keep[i];
      sample.push({ loc: V.center(b.location), id: b.typeId });
    }
    if (sample.length) system.run(() => { for (const o of sample) spawnDebris(dim, o.loc, o.id, 2); });
  } catch (e) { /* */ }
});
