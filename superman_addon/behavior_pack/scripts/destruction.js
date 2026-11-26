import { system, world } from '@minecraft/server';
import { getSettings, intensityMul } from './config.js';
import { particle, q } from './fx.js';
import { isHeroId } from './state.js';
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

/** Cor aproximada dos detritos para cada tipo de bloco. */
export function debrisColor(id) {
  if (/(grass_block|leaves|moss|vine|cactus|melon|bamboo|kelp)/.test(id)) return { r: 0.36, g: 0.56, b: 0.24 };
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

/** Blocos solidos dentro de uma esfera (ordenados do centro para fora). */
export function sphereBlocks(dim, center, r, filter) {
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
      if (n % (opts.debrisEvery ?? 3) === 0) {
        particle(dim, 'superman:debris', V.center(l), { color: debrisColor(id) });
      }
      cx += l.x; cy += l.y; cz += l.z;
      n++;
      if (opts.max && n >= opts.max) break;
    } catch (e) { /* bloco invalido */ }
  }
  if (n && !s.drops) {
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
  return breakBlocks(dim, sphereBlocks(dim, center, r, opts.filter), opts);
}

// ---------------------------------------------------------------- explosoes
let blastDepth = 0;

/** Explosao do heroi: respeita configuracoes e nunca fere o proprio jogador. */
export function blast(dim, loc, radius, source, opts = {}) {
  const s = getSettings();
  const r = radius * intensityMul();
  if (source && !s.invulnerable) {
    try { source.addEffect('resistance', 3, { amplifier: 4, showParticles: false }); } catch (e) { /* */ }
  }
  blastDepth++;
  try {
    dim.createExplosion(loc, r, {
      breaksBlocks: s.destruction && !opts.noBlocks,
      causesFire: !!opts.fire && s.fire,
      source,
      allowUnderwater: true,
    });
  } catch (e) { /* fora do mundo */ }
  blastDepth--;
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
  } catch (e) { /* */ }
});
