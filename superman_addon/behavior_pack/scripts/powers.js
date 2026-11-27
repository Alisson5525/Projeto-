import { EntityDamageCause, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { AIR_STATES, FLY, ITEM, POWER_ITEMS, POW, getSettings, intensityMul } from './config.js';
import { blast, breakBlocks, debrisColor, debrisKind, groundColor, isBreakable, isFragile, spawnDebris, waveBreak, waveLine } from './destruction.js';
import { startDive, stopAll, toggleFlight } from './flight.js';
import { actionbar, flash, flashArea, later, particle, q, ringBurst, shake, shakeArea, sound } from './fx.js';
import { setFly, setOn, setPower, sync } from './state.js';
import { canHit, hurt, nearby, pushMobs } from './targets.js';
import { canGrab, grabTick, launchProjectile, markFrozen, shatter, startGrab, throwTick, updateProjectiles } from './combat.js';
import { openSettings } from './ui.js';
import { V } from './vec.js';

const UP = { x: 0, y: 1, z: 0 };

const EFFECTS = [
  ['strength', 5], ['regeneration', 2], ['fire_resistance', 0], ['water_breathing', 0],
  ['jump_boost', 2], ['saturation', 0], ['haste', 2],
];

export function maintainEffects(player, st, tick) {
  if (tick - st.effectTick < 40) return;
  st.effectTick = tick;
  const list = getSettings().invulnerable ? EFFECTS.concat([['resistance', 4]]) : EFFECTS;
  for (const [id, amp] of list) {
    try { player.addEffect(id, 90, { amplifier: amp, showParticles: false }); } catch (e) { /* */ }
  }
}

function clearEffects(player) {
  for (const [id] of EFFECTS.concat([['resistance', 4], ['slow_falling', 0], ['speed', 0]])) {
    try { player.removeEffect(id); } catch (e) { /* */ }
  }
}

function mainhand(player) {
  try {
    return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
  } catch (e) {
    return undefined;
  }
}

// Descricao de uso mostrada ao passar o dedo/mouse sobre cada item
const LORE = {
  [ITEM.EMBLEM]: ['§7Usar: transformar / destransformar', '§7Agachar + usar: configurações'],
  [ITEM.FLIGHT]: ['§7No chão: decolagem automática', '§7Voando: pousar', '§7Toque duplo para o lado: giro de esquiva',
    '§7Supersônico por 2,5 s: Mach 2', '§8Dica: pulo duplo também faz voar'],
  [ITEM.HEAT]: ['§7Toque: liga / desliga (até 15 s)', '§7Esquenta em 2 s: mais forte e mais largo', '§7Varra com o olhar para cortar',
    '§7Derrete pedra, ferve água, detona TNT', '§7O raio atravessa todos os inimigos'],
  [ITEM.FREEZE]: ['§7Toque: inspira e sopra (até 10 s)', '§7Congela água, lava e inimigos', '§7Prende inimigos em gelo'],
  [ITEM.PUNCH]: ['§7Toque: carregar  |  toque de novo: soltar', '§7Mais carga = mais alcance e força',
    '§7Abre um túnel de até 40 blocos', '§7Inimigos congelados se estilhaçam'],
  [ITEM.IMPACT]: ['§7No chão: palma trovão', '§7Agachado: pancada no chão', '§7Voando: mergulho meteoro',
    '§6Agachado voando: EXPLOSÃO SOLAR'],
};

function decorate(stack) {
  try {
    stack.setLore(LORE[stack.typeId] ?? []);
    stack.keepOnDeath = true;
  } catch (e) { /* */ }
  return stack;
}

/** Da os itens que estiverem faltando e atualiza a descricao dos que ja existem. */
export function giveItems(player, list) {
  try {
    const inv = player.getComponent('minecraft:inventory')?.container;
    if (!inv) return;
    const have = new Set();
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (!it) continue;
      have.add(it.typeId);
      if (LORE[it.typeId] && (!it.keepOnDeath || it.getLore().length === 0)) inv.setItem(i, decorate(it));
    }
    for (const id of list) if (!have.has(id)) inv.addItem(decorate(new ItemStack(id, 1)));
  } catch (e) { /* */ }
}

// ---------------------------------------------------------------- uso de itens

export function onItemUse(player, st, id, tick) {
  if (id === ITEM.EMBLEM) {
    if (player.isSneaking) { openSettings(player); return; }
    if (st.power === POW.TRANSFORM || st.power === POW.DETRANSFORM) return;
    if (!st.on) startTransform(player, st);
    else startDetransform(player, st);
    return;
  }
  if (!st.on) {
    actionbar(player, '§cTransforme-se primeiro: use o §eEmblema Solar§c.');
    return;
  }
  if (st.power === POW.TRANSFORM || st.power === POW.DETRANSFORM) return;
  if (st.power === POW.NOVA_CHARGE || st.power === POW.NOVA) return; // o supremo nao pode ser interrompido
  if (st.power === POW.GRAB || st.power === POW.THROW) return;      // maos ocupadas
  switch (id) {
    case ITEM.FLIGHT:
      toggleFlight(player, st);
      break;
    case ITEM.HEAT:
      if (st.power === POW.HEAT) stopPower(player, st);
      else beginPower(player, st, POW.HEAT, tick + 20 * 15);
      break;
    case ITEM.FREEZE:
      if (st.power === POW.FREEZE) stopPower(player, st);
      else beginPower(player, st, POW.FREEZE, tick + 20 * 10);
      break;
    case ITEM.PUNCH:
      if (st.power === POW.CHARGE) releasePunch(player, st);
      else beginPower(player, st, POW.CHARGE, tick + 40);
      break;
    case ITEM.IMPACT:
      if (AIR_STATES.has(st.fly) && st.fly !== FLY.DIVE && player.isSneaking) {
        if (tick < st.novaReadyAt) {
          actionbar(player, `§6Explosão Solar recarregando: §e${Math.ceil((st.novaReadyAt - tick) / 20)} s`);
        } else {
          beginPower(player, st, POW.NOVA_CHARGE, 0);
        }
      } else if (AIR_STATES.has(st.fly) && st.fly !== FLY.DIVE) {
        startDive(player, st);
      } else if (!AIR_STATES.has(st.fly)) {
        beginPower(player, st, player.isSneaking ? POW.SLAM : POW.CLAP, 0);
      }
      break;
    default:
  }
}

function beginPower(player, st, p, timeout) {
  st.charge = 0;
  st.powerTimeout = timeout;
  st.powerDur = Math.max(1, timeout - system.currentTick);
  st.heat.clear();
  st.focus = 0;
  setPower(player, st, p);
  if (st.fly === FLY.SPEED) {
    // poderes interrompem a super velocidade (e o cliente precisa saber)
    setFly(player, st, FLY.NONE);
    try { player.removeEffect('speed'); } catch (e) { /* */ }
  }
}

function stopPower(player, st) {
  setPower(player, st, POW.NONE);
  st.charge = 0;
  sync(player, st, 'charge', 0);
}

// ---------------------------------------------------------------- transformacao

function startTransform(player, st) {
  setPower(player, st, POW.TRANSFORM);
}

function startDetransform(player, st) {
  stopAll(player, st);
  setPower(player, st, POW.DETRANSFORM);
}

/** Restaura o estado transformado (ao reentrar no mundo / renascer) sem animacao. */
export function restore(player, st) {
  setOn(player, st, true);
  giveItems(player, POWER_ITEMS);
}

function transformTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  if (player.isOnGround) {
    try { player.applyKnockback({ x: 0, z: 0 }, 0); } catch (e) { /* */ }
  }
  if (t === 1) {
    sound(dim, 'beacon.power', c, 1, 1.2);
    sound(dim, 'mob.breeze.inhale', c, 0.8, 0.6);
  }
  if (t < 20 && t % 2 === 0) particle(dim, 'superman:transform_gather', c);
  if (t < 20 && t % 3 === 0) particle(dim, 'superman:aura', c, { radius: 1.2 });
  if (t === 10) sound(dim, 'respawn_anchor.charge', c, 1, 1.1);
  if (t > 8 && t < 20 && t % 4 === 0) shake(player, 0.05 + t * 0.006, 0.2);
  if (t === 20) {
    setOn(player, st, true);
    flash(player, 1, 1, 1, 0.05, 0.05, 0.5);
    particle(dim, 'superman:transform_burst', c);
    particle(dim, 'superman:sun_pillar', player.location, { height: 30 });
    particle(dim, 'superman:impact_flash', c, { radius: 4 });
    ringBurst(dim, V.add(player.location, { x: 0, y: 0.1, z: 0 }), [5, 9, 13], { r: 1, g: 0.85, b: 0.45 }, 3);
    particle(dim, 'superman:shockwave', c, { radius: 4, color: { r: 1, g: 0.55, b: 0.2 } });
    flashArea(dim, c, 16, 0.5);
    sound(dim, 'item.trident.thunder', c, 0.7, 1.3);
    sound(dim, 'beacon.activate', c, 1, 1);
    sound(dim, 'random.explode', c, 0.4, 1.6);
    shakeArea(dim, c, 12, 0.5, 0.5);
    st.effectTick = -1000;
    maintainEffects(player, st, system.currentTick);
    giveItems(player, POWER_ITEMS);
    try {
      player.onScreenDisplay.setTitle('§6§lSOLARIS', {
        subtitle: '§7Pulo duplo para voar  §8|  §7itens de poder na barra',
        fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 15,
      });
    } catch (e) { /* */ }
  }
  if (t === 32) tutorial(player);
  if (t >= 40) setPower(player, st, POW.NONE);
}

/** Guia rapido de controles, so na primeira transformacao de cada jogador. */
function tutorial(player) {
  try {
    if (player.getDynamicProperty('superman:tutorial') === true) return;
    player.setDynamicProperty('superman:tutorial', true);
  } catch (e) { return; }
  const lines = [
    '§6§lSOLARIS §r§7- guia rápido',
    '§e• Voar:§f pulo duplo  §8|  §eSupersônico:§f correr voando (Mach 2 depois de 2,5 s)',
    '§e• Giro de esquiva:§f toque duas vezes para o lado voando',
    '§e• Decolagem com cratera:§f segure agachar parado e pule',
    '§e• Pousar:§f desça até o chão  §8|  §eSuper velocidade:§f correr',
    '§e• Combate:§f 6 golpes no chão e 3 no ar; o golpe final arremessa',
    '§e• Agarrar:§f agachado, bata num inimigo; solte o agachar para arremessar',
    '§e• Looping:§f toque duas vezes no pulo voando',
    '§e• Poderes:§f itens da barra (cada um tem uma descrição)',
    '§6• Explosão Solar:§f voando, agache e use o Impacto',
    '§e• Configurações:§f agachar + usar o Emblema',
  ];
  for (const l of lines) player.sendMessage(l);
}

function detransformTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  if (t === 1) sound(dim, 'beacon.deactivate', c, 1, 1);
  if (t === 12) {
    setOn(player, st, false);
    flash(player, 0.7, 0.8, 1, 0.05, 0.05, 0.4);
    particle(dim, 'superman:transform_burst', c);
    clearEffects(player);
    if (!player.isOnGround) {
      try { player.addEffect('slow_falling', 160, { amplifier: 0, showParticles: false }); } catch (e) { /* */ }
    }
  }
  if (t >= 24) setPower(player, st, POW.NONE);
}

// ---------------------------------------------------------------- visao de calor

const FACE = {
  Up: { x: 0, y: 1, z: 0 }, Down: { x: 0, y: -1, z: 0 }, North: { x: 0, y: 0, z: -1 },
  South: { x: 0, y: 0, z: 1 }, East: { x: 1, y: 0, z: 0 }, West: { x: -1, y: 0, z: 0 },
};

const STONE_RE = /^minecraft:(stone|cobblestone|mossy_cobblestone|deepslate|cobbled_deepslate|granite|diorite|andesite|tuff|netherrack|blackstone|basalt|smooth_basalt|calcite|dripstone_block|end_stone|sandstone|red_sandstone|gravel|.*_bricks|polished_.*|.*_ore)$/;
const FLAMMABLE_RE = /(log|wood|planks|leaves|wool|hay|carpet|bookshelf|stem|hyphae|fence|door|stairs|slab|grass|fern|bush|vine|flower|sapling|crafting_table|scaffolding|target|bed)/;
const NEIGHBORS = [
  { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
];

// limiares de calor (ticks de exposicao) -> resultado
function heatRule(id) {
  if (id === 'minecraft:tnt') return [[3, 'detonate']];
  if (/leaves/.test(id)) return [[1.5, 'ignite'], [4, 'break']];
  if (STONE_RE.test(id)) return [[7, 'minecraft:magma'], [18, 'minecraft:lava']];
  if (id === 'minecraft:magma') return [[10, 'minecraft:lava']];
  if (id === 'minecraft:sand') return [[4, 'minecraft:glass']];
  if (id === 'minecraft:red_sand') return [[4, 'minecraft:orange_stained_glass']];
  if (/(ice|snow)/.test(id)) return [[3, id.includes('snow_layer') ? 'minecraft:air' : 'minecraft:water']];
  if (/(obsidian)/.test(id)) return [[32, 'minecraft:lava']];
  if (/glass/.test(id)) return [[9, 'break']];
  if (/(dirt|grass_block|podzol|mycelium|mud|clay|path|farmland)/.test(id)) return [[7, 'minecraft:coarse_dirt'], [20, 'minecraft:magma']];
  if (FLAMMABLE_RE.test(id)) return [[2, 'ignite'], [12, 'break']];
  return [[16, 'break']];
}

function heatBlockAt(player, st, b, face, amount) {
  const s = getSettings();
  const dim = player.dimension;
  let id;
  try { id = b.typeId; } catch (e) { return; }
  if (!id || b.isAir || !isBreakable(id)) return;
  const l = b.location;
  const key = `${l.x},${l.y},${l.z}`;
  const before = st.heat.get(key) || 0;
  const h = before + amount;
  st.heat.set(key, h);
  if (st.heat.size > 96) st.heat.delete(st.heat.keys().next().value);
  for (const [th, res] of heatRule(id)) {
    if (!(before < th && h >= th)) continue;
    const pc = V.center(l);
    if (res === 'detonate') {
      if (!s.destruction) continue;
      try { b.setType('minecraft:air'); } catch (e) { /* */ }
      particle(dim, 'superman:heat_impact', pc);
      sound(dim, 'random.fuse', pc, 1, 1.2);
      later(10, () => {
        blast(dim, pc, 4, player, { fire: true });
        particle(dim, 'superman:impact_flash', pc, { radius: 4 });
      });
    } else if (res === 'ignite') {
      if (!s.fire) continue;
      const off = FACE[face] || UP;
      try {
        const nb = dim.getBlock(V.add(l, off));
        if (nb && nb.isAir) nb.setType('minecraft:fire');
      } catch (e) { /* */ }
      sound(dim, 'fire.ignite', pc, 1, 1);
    } else if (res === 'break') {
      if (!s.destruction) continue;
      breakBlocks(dim, [b], { visible: 1 });
      particle(dim, 'superman:melt_burst', pc);
    } else {
      if (!s.fire) continue;
      const out = res === 'minecraft:lava' && underHero(player, l) ? 'minecraft:magma' : res;
      try { b.setType(out); } catch (e) { /* */ }
      particle(dim, 'superman:melt_burst', pc);
      if (Math.random() < 0.5) sound(dim, 'random.fizz', pc, 0.8, 0.8);
    }
    break;
  }
}

// planos das marcas de brasa/queimado conforme a face atingida
const FACE_PLANE = { Up: 'xz', Down: 'xz', North: 'xy', South: 'xy', East: 'yz', West: 'yz' };
// esfera de derretimento (vizinhos por distancia): cresce com a potencia do raio
const MELT_OFFSETS = (() => {
  const o = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
    const d = Math.hypot(x, y, z);
    if (d > 0 && d <= 2) o.push({ x, y, z, d });
  }
  return o.sort((a, b) => a.d - b.d);
})();
const burned = new Map(); // criaturas queimadas pelo raio -> tick (viram cinzas se morrerem)

/** Brasa que esfria e queimado escuro colados na face atingida. */
function heatMark(dim, point, face, scorch) {
  const n = FACE[face] || UP;
  const plane = FACE_PLANE[face] || 'xz';
  const p = V.add(point, V.mul(n, 0.035));
  particle(dim, `superman:heat_mark_${plane}`, p);
  if (scorch) particle(dim, `superman:heat_scorch_${plane}`, V.add(point, V.mul(n, 0.025)));
}

/** Aquece o bloco atingido e os vizinhos numa esfera que cresce com a potencia. */
function meltAround(player, st, b, face, pw) {
  const dim = player.dimension;
  heatBlockAt(player, st, b, face, 2 + 3 * pw);
  const r = 1 + pw * 0.8;
  for (const o of MELT_OFFSETS) {
    if (o.d > r) break;
    try { heatBlockAt(player, st, dim.getBlock(V.add(b.location, o)), face, (0.8 + 1.2 * pw) / o.d); } catch (e) { /* */ }
  }
}

function heatTick(player, st, tick) {
  const t = st.powTicks;
  const dim = player.dimension;
  const head = player.getHeadLocation();
  const s = getSettings();
  if (t === 1) {
    st.heatPower = 0;
    st.heatPrev = undefined;
    sound(dim, 'beacon.ambient', head, 1, 1.8);
    sound(dim, 'mob.blaze.shoot', head, 0.8, 0.6);
  }
  if (t < 7) return; // olhos acendendo (animacao de inicio)
  // o raio esquenta em 2 s: mais grosso, mais claro, derrete mais rapido e mais largo, fere mais
  st.heatPower = Math.min(1, (st.heatPower || 0) + 1 / 40);
  const pw = st.heatPower;
  if (t % 4 === 0) sync(player, st, 'charge', Math.round(pw * 20) / 20);
  const dir = player.getViewDirection();
  const side = V.norm(V.cross(dir, UP));
  const range = 80;
  let dist = range;
  let blockHit;
  try {
    blockHit = dim.getBlockFromRay(head, dir, { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: true });
  } catch (e) { /* */ }
  if (blockHit) dist = V.dist(head, V.add(blockHit.block.location, blockHit.faceLocation));
  // agua no caminho ferve e evapora
  if (s.destruction && t % 2 === 0) {
    let wet;
    try { wet = dim.getBlockFromRay(head, dir, { maxDistance: dist, includeLiquidBlocks: true, includePassableBlocks: true }); } catch (e) { /* */ }
    if (wet && wet.block.typeId.includes('water')) {
      const wl = wet.block.location;
      for (const o of [{ x: 0, y: 0, z: 0 }, ...NEIGHBORS.slice(0, 4)]) {
        try {
          const wb = dim.getBlock(V.add(wl, o));
          if (wb && wb.typeId.includes('water') && !touchesSomeone(player, wb.location)) wb.setType('minecraft:air');
        } catch (e) { /* */ }
      }
      particle(dim, 'superman:steam', V.center(wl));
      if (t % 6 === 0) sound(dim, 'random.fizz', V.center(wl), 1, 0.7);
    }
  }
  // o raio atravessa todas as criaturas no caminho
  let ents = [];
  try {
    ents = dim.getEntitiesFromRay(head, dir, { maxDistance: dist }).filter((h) => canHit(player, h.entity));
  } catch (e) { /* */ }
  const hitPoint = V.add(head, V.mul(dir, dist));
  // um raio saindo de cada olho, os dois se encontrando no alvo
  for (const sgn of [1, -1]) {
    const eye = V.add(V.add(head, V.mul(side, 0.13 * sgn)), V.add(V.mul(dir, 0.3), { x: 0, y: -0.04, z: 0 }));
    const to = V.sub(hitPoint, eye);
    const len = Math.max(0.5, V.len(to) - 0.1);
    const bdir = V.norm(to);
    particle(dim, 'superman:heat_beam', eye, { dir: bdir, len, den: q(4), power: pw });
    particle(dim, 'superman:heat_core', eye, { dir: bdir, len, den: q(3), power: pw });
    if (t % 3 === 0) particle(dim, 'superman:heat_halo', eye, { dir: bdir, len, power: pw });
    if (t % 2 === 0) particle(dim, 'superman:eye_glow', eye);
  }
  const hp = V.sub(hitPoint, V.mul(dir, 0.15));
  if (t % 2 === 0) particle(dim, 'superman:lens_flare', V.sub(hitPoint, V.mul(dir, 0.4)));
  particle(dim, 'superman:heat_impact', hp);
  if (t % 2 === 0) particle(dim, 'superman:impact_flash', V.sub(hitPoint, V.mul(dir, 0.3)), { radius: 1.1 + pw * 1.1 });
  if (t % 2 === 0) particle(dim, 'superman:sparks', hp, { count: 3 + Math.round(pw * 7) });
  if (blockHit && t % 3 === 0) particle(dim, 'superman:molten_drop', V.sub(hitPoint, V.mul(dir, 0.2)));
  if (t % 3 === 0) particle(dim, 'superman:melt_burst', V.sub(hitPoint, V.mul(dir, 0.3)));
  if (t % 5 === 0) particle(dim, 'superman:heat_smoke', V.sub(hitPoint, V.mul(dir, 0.4)));
  if (t % 6 === 0) sound(dim, 'fire.fire', hitPoint, 1.2 + pw, 1.4 - pw * 0.4);
  if (t % 4 === 0) sound(dim, 'random.fizz', hitPoint, 0.3 + pw * 0.5, 1.6 - pw * 0.5);
  if (t % 12 === 0) sound(dim, 'mob.blaze.breathe', head, 0.7, 1.5 - pw * 0.4);
  if (t === 47) { sound(dim, 'beacon.power', head, 1, 1.6); shake(player, 0.25, 0.3); }
  if (t % 14 === 0) shake(player, 0.08 + pw * 0.12, 0.4);
  if (t % 3 === 0) {
    for (const h of ents) {
      try {
        h.entity.setOnFire(8, true);
        hurt(player, h.entity, 5 + 7 * pw, EntityDamageCause.fire);
        h.entity.applyKnockback({ x: dir.x * (0.2 + pw * 0.3), z: dir.z * (0.2 + pw * 0.3) }, 0.05);
        if (burned.size > 200) burned.clear();
        burned.set(h.entity.id, tick);
        particle(dim, 'superman:heat_impact', V.add(h.entity.location, { x: 0, y: 1, z: 0 }));
        particle(dim, 'superman:sparks', V.add(h.entity.location, { x: 0, y: 1, z: 0 }), { count: 4 });
      } catch (e) { /* */ }
    }
  }
  if (!blockHit) { st.focus = 0; st.heatPrev = undefined; return; }
  const b = blockHit.block;
  meltAround(player, st, b, blockHit.face, pw);
  heatMark(dim, hitPoint, blockHit.face, t % 4 === 0);
  // varrer com o olhar corta uma linha continua (sem pular blocos entre um tick e outro)
  if (st.heatPrev) {
    const gap = V.dist(st.heatPrev, hitPoint);
    if (gap > 0.6 && gap < 10) {
      const n = Math.min(8, Math.ceil(gap / 0.7));
      for (let k = 1; k < n; k++) {
        const sp = V.add(st.heatPrev, V.mul(V.sub(hitPoint, st.heatPrev), k / n));
        let sh;
        try {
          sh = dim.getBlockFromRay(head, V.norm(V.sub(sp, head)), { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: true });
        } catch (e) { /* */ }
        if (!sh) continue;
        heatBlockAt(player, st, sh.block, sh.face, 2 + 3 * pw);
        heatMark(dim, V.add(sh.block.location, sh.faceLocation), sh.face, k % 2 === 0);
      }
    }
  }
  st.heatPrev = hitPoint;
  // fogo espalhado em volta
  if (s.fire && Math.random() < 0.2 + pw * 0.2) {
    try {
      const r = { x: Math.floor(Math.random() * 3) - 1, y: 1, z: Math.floor(Math.random() * 3) - 1 };
      const above = dim.getBlock(V.add(b.location, r));
      const below = dim.getBlock(V.add(b.location, { x: r.x, y: 0, z: r.z }));
      if (above && above.isAir && below && !below.isAir && !below.isLiquid) above.setType('minecraft:fire');
    } catch (e) { /* */ }
  }
  // mirar no mesmo ponto acumula calor ate uma explosao derretida (maior com o raio no maximo)
  if (st.lastHit && V.dist(st.lastHit, hitPoint) < 1.6) st.focus++;
  else st.focus = 0;
  st.lastHit = hitPoint;
  if (st.focus > 0 && st.focus % 30 === 0) {
    const r = 2.5 + 1.8 * pw;
    blast(dim, hitPoint, r, player, { fire: true });
    particle(dim, 'superman:debris_burst', hitPoint, { color: { r: 0.9, g: 0.4, b: 0.1 } });
    particle(dim, 'superman:impact_flash', hitPoint, { radius: r });
    for (let i = 0; i < 3; i++) particle(dim, 'superman:molten_drop', hitPoint);
    ringBurst(dim, hitPoint, [r * 1.6, r * 2.6], { r: 1, g: 0.55, b: 0.2 }, 3);
    sound(dim, 'random.explode', hitPoint, 1, 0.9);
    shakeArea(dim, hitPoint, 20, 0.4 + pw * 0.3, 0.4);
  }
}

// criaturas mortas pelo raio viram cinzas
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const e = ev.deadEntity;
    const when = burned.get(e.id);
    if (when === undefined) return;
    burned.delete(e.id);
    if (system.currentTick - when > 60) return;
    const c = V.add(e.location, { x: 0, y: 0.2, z: 0 });
    particle(e.dimension, 'superman:ash_burst', c);
    particle(e.dimension, 'superman:heat_smoke', V.add(c, { x: 0, y: 0.6, z: 0 }));
    particle(e.dimension, 'superman:heat_impact', V.add(c, { x: 0, y: 0.8, z: 0 }));
    sound(e.dimension, 'fire.ignite', c, 1, 0.6);
  } catch (err) { /* */ }
});
// ---------------------------------------------------------------- sopro congelante

/**
 * A celula de bloco encosta no heroi ou em alguma criatura? Gelo, neve e pilares nunca nascem ai:
 * o heroi ficaria com parte do corpo dentro do bloco (e sumiria na tela) e os mobs sufocariam.
 */
function touchesSomeone(player, cell, heroMargin = 1.2, skipId) {
  const cx = cell.x + 0.5, cz = cell.z + 0.5;
  const p = player.location;
  if (Math.abs(cx - p.x) < 0.5 + heroMargin && Math.abs(cz - p.z) < 0.5 + heroMargin && cell.y + 1 > p.y + 0.05 && cell.y < p.y + 2.3) {
    return true;
  }
  try {
    for (const e of player.dimension.getEntities({ location: { x: cx, y: cell.y + 0.5, z: cz }, maxDistance: 3 })) {
      if (e.id === player.id || e.id === skipId) continue;
      const l = e.location;
      if (Math.abs(cx - l.x) < 0.9 && Math.abs(cz - l.z) < 0.9 && cell.y + 1 > l.y + 0.05 && cell.y < l.y + 1.9) return true;
    }
  } catch (e) { /* */ }
  return false;
}

/** O bloco sustenta o heroi (esta logo abaixo dos pes)? */
function underHero(player, cell) {
  const p = player.location;
  return Math.abs(cell.x + 0.5 - p.x) < 1.3 && Math.abs(cell.z + 0.5 - p.z) < 1.3 && cell.y < p.y + 2.3 && cell.y + 1 > p.y - 1.6;
}

function encase(player, e) {
  const dim = player.dimension;
  const l = V.floor(e.location);
  const cells = [];
  for (const dy of [0, 1]) {
    for (const o of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) cells.push({ x: l.x + o.x, y: l.y + dy, z: l.z + o.z });
  }
  cells.push({ x: l.x, y: l.y + 2, z: l.z });
  let n = 0;
  for (const c of cells) {
    try {
      if (touchesSomeone(player, c, 0.35, e.id)) continue;
      const b = dim.getBlock(c);
      if (b && (b.isAir || isFragile(b.typeId))) { b.setType('minecraft:ice'); n++; }
    } catch (err) { /* */ }
  }
  particle(dim, 'superman:ice_burst', V.add(e.location, { x: 0, y: 1, z: 0 }));
  sound(dim, 'random.glass', e.location, 1, 0.6);
  sound(dim, 'place.powder_snow', e.location, 1, 0.8);
  return n;
}

/** Pilar de gelo que brota do chao onde o sopro bate (1 a 3 blocos). */
function iceSpike(player, st, base) {
  const dim = player.dimension;
  const p = player.location;
  if (Math.hypot(base.x + 0.5 - p.x, base.z + 0.5 - p.z) < 3.5) return; // nada de pilar colado no heroi
  const h = 1 + Math.floor(Math.random() * 3);
  let n = 0;
  for (let y = 1; y <= h; y++) {
    try {
      const cell = { x: base.x, y: base.y + y, z: base.z };
      if (touchesSomeone(player, cell)) break;
      const b = dim.getBlock(cell);
      if (!b || !(b.isAir || isFragile(b.typeId))) break;
      b.setType(y === h ? 'minecraft:blue_ice' : 'minecraft:packed_ice');
      n++;
    } catch (e) { break; }
  }
  if (n) {
    st.iceSpikes++;
    const top = { x: base.x + 0.5, y: base.y + 1 + n, z: base.z + 0.5 };
    particle(dim, 'superman:ice_burst', top);
    sound(dim, 'random.glass', top, 0.6, 1.4);
  }
}

function freezeTick(player, st, tick) {
  const t = st.powTicks;
  const dim = player.dimension;
  const head = player.getHeadLocation();
  if (t === 1) { sound(dim, 'mob.breeze.inhale', head, 1, 0.7); st.exposure.clear(); st.iceSpikes = 0; }
  if (t < 12) {
    if (t % 2 === 0) particle(dim, 'superman:inhale', head);
    return;
  }
  const dir = player.getViewDirection();
  let pv = { x: 0, y: 0, z: 0 };
  try { pv = player.getVelocity(); } catch (e) { /* */ }
  // a nuvem sai na frente do rosto e herda o movimento do heroi: ele nunca fica escondido dentro dela
  const mouth = V.add(V.add(head, V.mul(dir, 0.6)), V.add(V.mul(pv, 2), { x: 0, y: -0.18, z: 0 }));
  const boost = Math.max(0, V.dot(pv, dir) * 20);
  particle(dim, 'superman:frost_breath', mouth, { dir, boost });
  if (t % 2 === 0) particle(dim, 'superman:frost_flakes', mouth, { dir, boost });
  if (t % 8 === 0) sound(dim, 'mob.breeze.idle_air', mouth, 1.2, 0.5);
  if (t % 5 === 0) sound(dim, 'mob.player.hurt_freeze', mouth, 0.35, 1.5);
  if (t % 16 === 0) shake(player, 0.08, 0.4);
  const range = 26;
  const s = getSettings();
  // entidades no cone: congelam, sofrem dano e sao empurradas pelo vendaval
  try {
    for (const e of nearby(player, mouth, range)) {
      const rel = V.sub(V.add(e.location, { x: 0, y: 0.8, z: 0 }), mouth);
      const d = V.len(rel);
      if (d < 0.1 || V.dot(V.norm(rel), dir) < Math.cos((32 * Math.PI) / 180)) continue;
      const ex = (st.exposure.get(e.id) || 0) + 1;
      st.exposure.set(e.id, ex);
      if (ex >= 12) markFrozen(e, tick + 140);
      try {
        e.addEffect('slowness', 100, { amplifier: 6, showParticles: false });
        e.addEffect('mining_fatigue', 100, { amplifier: 2, showParticles: false });
        e.addEffect('weakness', 100, { amplifier: 1, showParticles: false });
        e.extinguishFire(true);
        if (t % 4 === 0) hurt(player, e, 3, EntityDamageCause.freezing);
        const push = 0.55 * (1 - Math.min(1, d / range) * 0.5);
        e.applyKnockback({ x: dir.x * push, z: dir.z * push }, 0.06);
      } catch (err) { /* */ }
      if (t % 3 === 0) particle(dim, 'superman:frost_hit', V.add(e.location, { x: 0, y: 1, z: 0 }));
      if (ex === 25 && s.destruction) {
        encase(player, e);
        markFrozen(e, tick + 220);
        try {
          e.addEffect('slowness', 120, { amplifier: 10, showParticles: false });
          hurt(player, e, 8, EntityDamageCause.freezing);
        } catch (err) { /* */ }
      }
    }
  } catch (e) { /* */ }
  // pilares de gelo brotam do chao ao longo do sopro, sempre a uma distancia segura do heroi
  if (s.destruction && t % 5 === 0 && st.iceSpikes < 24 && Math.random() < 0.7) {
    const pt = V.add(mouth, V.mul(V.cone(dir, 16), 4.5 + Math.random() * 12));
    let g;
    try {
      g = dim.getBlockFromRay({ x: pt.x, y: pt.y + 1.5, z: pt.z }, { x: 0, y: -1, z: 0 }, {
        maxDistance: 9, includeLiquidBlocks: true, includePassableBlocks: false,
      });
    } catch (e) { /* */ }
    if (g && !/water|lava/.test(g.block.typeId)) iceSpike(player, st, g.block.location);
  }
  // blocos: raios aleatorios dentro do cone
  for (let i = 0; i < q(14); i++) {
    const rd = V.cone(dir, 26);
    let hit;
    try {
      hit = dim.getBlockFromRay(mouth, rd, { maxDistance: range, includeLiquidBlocks: true, includePassableBlocks: true });
    } catch (e) { /* */ }
    if (!hit) continue;
    const b = hit.block;
    const id = b.typeId;
    const pc = V.add(b.location, hit.faceLocation);
    const liquid = /water|lava/.test(id);
    if ((liquid || isFragile(id)) && touchesSomeone(player, b.location)) continue;
    try {
      if (id === 'minecraft:water' || id === 'minecraft:flowing_water') {
        b.setType('minecraft:ice');
        if (i % 3 === 0) particle(dim, 'superman:frost_hit', pc);
      } else if (id === 'minecraft:ice' && Math.random() < 0.15) {
        b.setType('minecraft:packed_ice');
      } else if (id === 'minecraft:lava' || id === 'minecraft:flowing_lava') {
        b.setType('minecraft:obsidian');
        particle(dim, 'superman:melt_burst', pc);
        sound(dim, 'random.fizz', pc, 1, 1);
      } else if (id === 'minecraft:fire' || id === 'minecraft:soul_fire') {
        b.setType('minecraft:air');
        sound(dim, 'random.fizz', pc, 0.6, 1.4);
      } else if (id === 'minecraft:magma') {
        b.setType('minecraft:stone');
        sound(dim, 'random.fizz', pc, 0.6, 1.2);
      } else if (s.destruction && isFragile(id) && !/(glass|ice|snow_layer)/.test(id) && !/leaves/.test(id)) {
        b.setType('minecraft:snow_layer');   // plantas congeladas viram neve
      } else if (id === 'minecraft:snow_layer') {
        // chao ja nevado: nao empilha neve flutuando
        if (i % 4 === 0) particle(dim, 'superman:frost_patch', { x: pc.x, y: pc.y + 0.04, z: pc.z });
      } else if (s.destruction && hit.face === 'Up' && !b.isAir && Math.random() < 0.6) {
        const cell = V.add(b.location, UP);
        const above = touchesSomeone(player, cell) ? undefined : dim.getBlock(cell);
        if (above && above.isAir) above.setType('minecraft:snow_layer');
        if (i % 4 === 0) particle(dim, 'superman:frost_patch', { x: pc.x, y: pc.y + 0.04, z: pc.z });
      }
    } catch (e) { /* */ }
  }
}

// ---------------------------------------------------------------- explosao solar (supremo)

function groundBelow(player, max) {
  try {
    const l = player.location;
    const hit = player.dimension.getBlockFromRay({ x: l.x, y: l.y, z: l.z }, { x: 0, y: -1, z: 0 }, {
      maxDistance: max, includeLiquidBlocks: true, includePassableBlocks: false,
    });
    return hit ? { x: l.x, y: hit.block.location.y + 1.02, z: l.z } : undefined;
  } catch (e) {
    return undefined;
  }
}

function novaChargeTick(player, st, tick) {
  const t = st.powTicks;
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  const g = groundBelow(player, 16);
  if (t === 1) {
    sound(dim, 'beacon.activate', c, 1.2, 0.6);
    sound(dim, 'mob.breeze.inhale', c, 1, 0.5);
  }
  if (t === 14) sound(dim, 'mob.warden.sonic_charge', c, 1.4, 0.7);
  if (t === 28) sound(dim, 'ambient.weather.thunder', c, 0.7, 1.6);
  if (t % 2 === 0) particle(dim, 'superman:aura', c, { radius: 1.2 + t * 0.03 });
  if (t % 3 === 0) particle(dim, 'superman:transform_gather', c);
  if (g && t % 3 === 0) particle(dim, 'superman:rising_debris', g, { radius: 3 + t * 0.12, color: groundColor(dim, g) });
  if (g && (t === 12 || t === 26)) particle(dim, 'superman:ground_crack', { x: g.x, y: Math.floor(g.y) + 0.06, z: g.z }, { radius: 2 + t * 0.12 });
  if (t % 5 === 0) shakeArea(dim, c, 24, 0.05 + t * 0.012, 0.3);
  if (t >= 40) setPower(player, st, POW.NOVA);
}

function novaRelease(player, st, tick) {
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  st.novaReadyAt = tick + 20 * 12;
  particle(dim, 'superman:nova_burst', c);
  particle(dim, 'superman:impact_flash', c, { radius: 9 });
  particle(dim, 'superman:sun_pillar', player.location, { height: 40 });
  ringBurst(dim, c, [10, 18, 26, 34], { r: 1, g: 0.85, b: 0.45 }, 3);
  later(2, () => particle(dim, 'superman:nova_burst', c));
  sound(dim, 'mob.warden.sonic_boom', c, 2, 0.7);
  sound(dim, 'random.explode', c, 1.6, 0.6);
  sound(dim, 'ambient.weather.lightning.impact', c, 1.2, 0.9);
  sound(dim, 'item.trident.thunder', c, 1, 0.8);
  flashArea(dim, c, 40, 1);
  shakeArea(dim, c, 48, 1.6, 1.2);
  // onda que arremessa e queima tudo em volta
  for (const e of nearby(player, c, 26)) {
    const rel = V.sub(e.location, c);
    const h = V.norm({ x: rel.x, y: 0, z: rel.z });
    const f = 1 - Math.min(1, V.len(rel) / 26) * 0.7;
    try {
      e.applyKnockback({ x: h.x * 6 * f, z: h.z * 6 * f }, 1.2 * f);
      e.setOnFire(Math.round(6 * f) + 1, true);
    } catch (err) { /* */ }
    hurt(player, e, 30 * f);
  }
  // cratera embaixo (se estiver perto do chao) e vidros/folhas/plantas estilhacando em onda
  const g = groundBelow(player, 8);
  if (g) {
    blast(dim, { x: g.x, y: g.y - 1, z: g.z }, 4.5, player, { fire: true });
    particle(dim, 'superman:dust_wall', g, { radius: 7, color: groundColor(dim, g) });
    particle(dim, 'superman:ground_crack', { x: g.x, y: Math.floor(g.y) + 0.06, z: g.z }, { radius: 6 });
  }
  waveBreak(dim, c, 12, { filter: isFragile, speed: 2.5, visible: 5, max: 400 });
}

// ---------------------------------------------------------------- super soco

function chargeTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  st.charge = Math.min(1, t / 30);
  sync(player, st, 'charge', Math.round(st.charge * 20) / 20);
  const look = player.getViewDirection();
  const { fwd, right } = V.basis(look);
  const fist = V.add(player.location, V.add(V.add(V.mul(right, 0.45), V.mul(fwd, -0.35)), { x: 0, y: 1.05, z: 0 }));
  if (t % 2 === 0) particle(dim, 'superman:charge_energy', fist, { power: st.charge });
  if (t % 4 === 0 && st.charge > 0.5) particle(dim, 'superman:aura', V.add(player.location, { x: 0, y: 1, z: 0 }), { radius: 0.9 });
  if (t === 1) sound(dim, 'crossbow.quick_charge.start', fist, 1, 0.8);
  if (t === 12) sound(dim, 'crossbow.quick_charge.middle', fist, 1, 0.8);
  if (t === 26) sound(dim, 'crossbow.quick_charge.end', fist, 1, 0.8);
  if (t === 30) { sound(dim, 'respawn_anchor.charge', fist, 1, 1.4); shake(player, 0.15, 0.3); }
  if (t > 30 && t % 6 === 0) shake(player, 0.06, 0.2);
  if (t >= 40) releasePunch(player, st);
}

function releasePunch(player, st) {
  st.punchCharge = Math.max(0.15, st.charge);
  setPower(player, st, POW.PUNCH);
  st.charge = 0;
}

function punchImpact(player, st) {
  const c = st.punchCharge || 0.3;
  sync(player, st, 'charge', 0);
  const dim = player.dimension;
  const origin = player.getHeadLocation();
  const dir = player.getViewDirection();
  // alcance e largura do soco: ate 40 blocos de tunel e cratera de ate 8 blocos de raio
  const range = 8 + 32 * c;
  const width = 2.5 + 2.5 * c;
  const fistPos = V.add(V.add(origin, V.mul(dir, 1.3)), { x: 0, y: -0.3, z: 0 });
  // entidades no caminho do soco
  try {
    const mid = V.add(origin, V.mul(dir, range / 2));
    for (const e of nearby(player, mid, range / 2 + 2.5)) {
      const rel = V.sub(V.add(e.location, { x: 0, y: 0.9, z: 0 }), origin);
      const along = V.dot(rel, dir);
      if (along < 0 || along > range + 2) continue;
      if (V.len(V.sub(rel, V.mul(dir, along))) > width) continue;
      try {
        shatter(player, e, system.currentTick);
        hurt(player, e, 14 + 46 * c);
        if (c > 0.45) launchProjectile(player, e, V.norm(V.add(dir, { x: 0, y: 0.15, z: 0 })), 1.5 + 2.5 * c, system.currentTick);
        else e.applyKnockback({ x: dir.x * (2.5 + 6 * c), z: dir.z * (2.5 + 6 * c) }, 0.45 + 1.1 * c + Math.max(0, dir.y) * 2.5);
      } catch (err) { /* */ }
      particle(dim, 'superman:punch_impact', V.add(e.location, { x: 0, y: 1, z: 0 }));
    }
  } catch (e) { /* */ }
  // cenario
  let hit;
  try { hit = dim.getBlockFromRay(origin, dir, { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: false }); } catch (e) { /* */ }
  if (hit) {
    const hp = V.add(hit.block.location, hit.faceLocation);
    const hd = V.dist(origin, hp);
    blast(dim, hp, 3 + 5 * c, player);
    const hid = hit.block.typeId;
    particle(dim, 'superman:debris_burst', hp, { color: debrisColor(hid), scale: 1 + c * 0.6 });
    spawnDebris(dim, hp, hid, 2 + c);
    particle(dim, 'superman:dust_wall', hp, { radius: 3 + 4 * c, color: debrisColor(hid) });
    particle(dim, 'superman:ground_crack', V.sub(hp, V.mul(dir, 0.05)), { radius: 3 + 4 * c });
    // estilhaca vidros, folhas e plantas em volta do impacto
    waveBreak(dim, hp, 5 + 6 * c, { filter: isFragile, speed: 2.5, visible: 4, max: 220 });
    if (debrisKind(hid) === 'stone') particle(dim, 'superman:sparks', hp, { count: 10 + Math.round(c * 14) });
    // o tunel avanca em onda a partir do ponto de impacto e explode no fim
    if (c > 0.2) {
      const tr = Math.min(6, (1.8 + 3.2 * c) * Math.sqrt(intensityMul()));
      const end = range + 8 * c;
      waveLine(dim, origin, dir, hd + 1, end, tr, {
        speed: 4, visible: 3, max: 220, power: 1 + c, debrisEvery: 4,
        onStep: (p, d) => {
          if (Math.round(d / 1.4) % 4 === 0) {
            particle(dim, 'superman:sonic_boom', p, { dir, radius: tr + 1 });
            particle(dim, 'superman:dust_wall', p, { radius: tr, color: debrisColor(hid) });
          }
        },
        onEnd: (p) => {
          if (c < 0.5) return;
          blast(dim, p, 3 + 4 * c, player);
          particle(dim, 'superman:impact_flash', p, { radius: 3 + 3 * c });
          particle(dim, 'superman:debris_burst', p, { color: debrisColor(hid), scale: 1.5 });
          ringBurst(dim, p, [4 + 3 * c, 7 + 5 * c], { r: 1, g: 0.9, b: 0.75 }, 3);
          sound(dim, 'random.explode', p, 1.4, 0.8);
          shakeArea(dim, p, 30, 0.6 * c, 0.5);
        },
      });
    }
  }
  particle(dim, 'superman:impact_flash', fistPos, { radius: 1.5 + 2 * c });
  particle(dim, 'superman:punch_wave', fistPos, { dir, power: c });
  for (let i = 0; i < 3 + Math.round(5 * c); i++) {
    later(i * 2 + 1, () => particle(dim, 'superman:sonic_boom', V.add(fistPos, V.mul(dir, 1 + i * 3)), { dir, radius: 1.5 + 3 * c + i * 0.7 }));
  }
  // onda de ar do soco empurra quem estiver perto da linha, mesmo fora do alvo
  pushMobs(player, V.add(fistPos, V.mul(dir, 3)), 4 + 4 * c, 1 + 2 * c, 0.4 + 0.4 * c, 0);
  if (c > 0.7) flashArea(dim, fistPos, 10, 0.4);
  sound(dim, 'game.player.attack.strong', fistPos, 1, 0.8);
  sound(dim, 'random.explode', fistPos, 0.5 + 0.6 * c, 1.3 - 0.4 * c);
  if (c > 0.5) sound(dim, 'mob.warden.sonic_boom', fistPos, 0.6 + 0.6 * c, 1.2);
  shake(player, 0.2 + 0.9 * c, 0.4 + 0.3 * c);
  shakeArea(dim, fistPos, 24, 0.5 * c, 0.5);
}

// ---------------------------------------------------------------- palma trovao e pancada no chao

function clapImpact(player, st) {
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd } = V.basis(look);
  const center = V.add(player.location, V.add(V.mul(fwd, 1.1), { x: 0, y: 1.3, z: 0 }));
  particle(dim, 'superman:clap_wave', center, { dir: fwd });
  particle(dim, 'superman:sonic_boom', center, { dir: fwd, radius: 5 });
  particle(dim, 'superman:shockwave', V.add(player.location, { x: 0, y: 0.1, z: 0 }), { radius: 14, color: { r: 0.95, g: 0.97, b: 1 } });
  particle(dim, 'superman:clap_wave', V.add(center, V.mul(fwd, 3)), { dir: fwd, radius: 6 });
  particle(dim, 'superman:impact_flash', center, { radius: 3 });
  for (let i = 1; i <= 3; i++) later(i * 3, () => particle(dim, 'superman:clap_wave', V.add(center, V.mul(fwd, 3 + i * 4)), { dir: fwd, radius: 6 + i * 2 }));
  particle(dim, 'superman:dust_wall', V.add(player.location, V.add(V.mul(fwd, 3), { x: 0, y: 0.1, z: 0 })), { radius: 4, color: groundColor(dim, player.location) });
  sound(dim, 'mob.warden.sonic_boom', center, 1.4, 1.1);
  sound(dim, 'ambient.weather.thunder', center, 0.6, 1.4);
  sound(dim, 'random.explode', center, 0.7, 1.3);
  shakeArea(dim, center, 28, 0.9, 0.7);
  try {
    for (const e of nearby(player, center, 24)) {
      const rel = V.sub(e.location, player.location);
      const h = V.norm({ x: rel.x, y: 0, z: rel.z });
      if (V.dot(h, fwd) < 0.15) continue;
      const f = 1 - Math.min(1, V.len(rel) / 24) * 0.7;
      try {
        e.applyKnockback({ x: h.x * 5 * f, z: h.z * 5 * f }, 0.75 * f);
        hurt(player, e, 12 * f);
      } catch (err) { /* */ }
    }
  } catch (e) { /* */ }
  // vidros, folhas e plantas estilhacam numa onda que avanca a frente
  waveBreak(dim, V.add(center, V.mul(fwd, 4)), 10, { filter: isFragile, speed: 1.8, visible: 5, max: 300 });
}

function slamImpact(player, st) {
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd } = V.basis(look);
  const p = V.add(player.location, V.add(V.mul(fwd, 1.3), { x: 0, y: -0.4, z: 0 }));
  blast(dim, p, 5, player);
  ringBurst(dim, V.add(p, { x: 0, y: 0.5, z: 0 }), [9, 15, 21], { r: 1, g: 0.9, b: 0.7 }, 3);
  particle(dim, 'superman:impact_flash', V.add(p, { x: 0, y: 1, z: 0 }), { radius: 4 });
  const gc = groundColor(dim, V.add(p, { x: 0, y: 0.5, z: 0 }));
  particle(dim, 'superman:dust_wall', V.add(p, { x: 0, y: 0.5, z: 0 }), { radius: 6, color: gc });
  later(5, () => particle(dim, 'superman:rising_debris', p, { radius: 5, color: gc }));
  particle(dim, 'superman:sparks', V.add(p, { x: 0, y: 0.4, z: 0 }), { count: 16 });
  flashArea(dim, p, 12, 0.35);
  particle(dim, 'superman:ground_crack', { x: p.x, y: Math.floor(player.location.y) + 0.06, z: p.z }, { radius: 3.5 });
  for (let i = 0; i < q(4); i++) particle(dim, 'superman:debris_burst', V.add(p, { x: 0, y: 0.6, z: 0 }), { color: gc, scale: 1.3 });
  sound(dim, 'mace.heavy_smash_ground', p, 2, 0.6);
  sound(dim, 'mob.warden.sonic_boom', p, 1, 0.8);
  shakeArea(dim, p, 32, 1.4, 0.9);
  try {
    for (const e of nearby(player, p, 14)) {
      const rel = V.sub(e.location, p);
      const h = V.norm({ x: rel.x, y: 0, z: rel.z });
      const f = 1 - Math.min(1, V.len(rel) / 14) * 0.6;
      try {
        e.applyKnockback({ x: h.x * 1.8 * f, z: h.z * 1.8 * f }, 1.6 * f);
        hurt(player, e, 16 * f);
      } catch (err) { /* */ }
    }
  } catch (e) { /* */ }
}

// ---------------------------------------------------------------- combos corpo a corpo

// Sequencias de golpes: no chao (6) e no ar (3). k = empurrao, up = vertical, t = duracao (ticks)
const GROUND_COMBO = [
  { pow: POW.COMBO1, k: 2.2, up: 0.35, t: 7, name: 'Jab' },
  { pow: POW.COMBO2, k: 2.8, up: 0.45, t: 7, name: 'Direto' },
  { pow: POW.COMBO4, k: 2.6, up: 0.5, t: 8, side: true, name: 'Gancho' },
  { pow: POW.COMBO3, k: 1.0, up: 2.0, t: 10, name: 'Uppercut' },
  { pow: POW.COMBO5, k: 4.0, up: 0.7, t: 12, side: true, wave: true, name: 'Chute giratório' },
  { pow: POW.COMBO6, k: 6.0, up: 1.2, t: 17, finisher: true, name: 'GOLPE FINAL' },
];
const AIR_COMBO = [
  { pow: POW.AIR1, k: 3.2, up: 0.5, t: 8, dash: true, name: 'Soco aéreo' },
  { pow: POW.AIR2, k: 3.8, up: 0.6, t: 11, side: true, wave: true, name: 'Chute tornado' },
  { pow: POW.AIR3, k: 0.6, up: -3.2, t: 12, spike: true, name: 'MARTELO' },
];

const spikes = [];

export function onMeleeHit(player, st, target, tick) {
  if (!st.on) return;
  // agachado + bater = agarrar (soltar o agachar arremessa)
  const free = st.power === POW.NONE || (st.power >= POW.COMBO1 && st.power <= POW.AIR3);
  if (player.isSneaking && free && canGrab(player, target)) {
    startGrab(player, st, target, tick);
    return;
  }
  if (st.power === POW.GRAB || st.power === POW.THROW) return;
  const shattered = shatter(player, target, tick);
  const inAir = AIR_STATES.has(st.fly);
  const list = inAir ? AIR_COMBO : GROUND_COMBO;
  const isCombo = st.power >= POW.COMBO1 && st.power <= POW.AIR3;
  const busy = st.power !== POW.NONE && !isCombo;
  st.combo = tick - st.lastHitTick < 26 && st.comboAir === inAir ? (st.combo % list.length) + 1 : 1;
  st.comboAir = inAir;
  st.lastHitTick = tick;
  st.combatUntil = tick + 90;
  const mv = list[st.combo - 1];
  st.lastMove = mv.name;
  if (!busy) {
    setPower(player, st, mv.pow);
    st.powerTimeout = tick + mv.t;
  }
  const dim = player.dimension;
  // outros jogadores so recebem os efeitos extras se a opcao estiver ligada
  if (target.typeId === 'minecraft:player' && !getSettings().hurtPlayers) return;
  try {
    const rel = V.sub(target.location, player.location);
    const h = V.norm({ x: rel.x, y: 0, z: rel.z });
    const d = mv.side ? V.norm(V.add(V.mul(h, 0.5), V.mul({ x: -h.z, y: 0, z: h.x }, 0.9))) : h;
    target.applyKnockback({ x: d.x * mv.k, z: d.z * mv.k }, mv.up);
    const hp = V.add(target.location, { x: 0, y: 1, z: 0 });
    particle(dim, 'superman:punch_impact', hp);
    particle(dim, 'superman:impact_flash', hp, { radius: 0.8 + st.combo * 0.25 });
    particle(dim, 'superman:sparks', hp, { count: 4 + st.combo * 2 });
    if (shattered) st.lastMove = 'ESTILHAÇAR';
    sound(dim, 'game.player.attack.strong', hp, 1, 0.65 + st.combo * 0.08);
    shake(player, 0.08 + st.combo * 0.05, 0.2);
    if (mv.wave) {
      particle(dim, 'superman:shockwave', hp, { radius: 4, color: { r: 1, g: 0.9, b: 0.7 } });
      sound(dim, 'mace.smash_air', hp, 1, 1.1);
    }
    if (mv.pow === POW.COMBO3) {
      sound(dim, 'mace.smash_air', hp, 1, 1);
      particle(dim, 'superman:sonic_boom', hp, { dir: { x: h.x * 0.3, y: 0.95, z: h.z * 0.3 }, radius: 1.6 });
    }
    if (mv.finisher) {
      hurt(player, target, 30);
      particle(dim, 'superman:sonic_boom', hp, { dir: h, radius: 3 });
      particle(dim, 'superman:impact_flash', hp, { radius: 3 });
      ringBurst(dim, V.add(target.location, { x: 0, y: 0.1, z: 0 }), [5, 8, 11], { r: 1, g: 0.95, b: 0.85 }, 2);
      particle(dim, 'superman:debris_burst', target.location, { color: groundColor(dim, V.add(target.location, { x: 0, y: 0.6, z: 0 })) });
      sound(dim, 'mob.warden.sonic_boom', hp, 1, 1.2);
      sound(dim, 'random.explode', hp, 0.6, 1.3);
      shakeArea(dim, hp, 16, 0.6, 0.4);
      pushMobs(player, hp, 5, 2.5, 0.6, 8, target.id);
      // o golpe final transforma o inimigo num projetil que se espatifa no que encontrar
      launchProjectile(player, target, V.norm({ x: h.x, y: 0.35, z: h.z }), 3, tick);
    }
    if (mv.dash) st.vel = V.add(st.vel, V.mul(V.norm(rel), 0.9));
    if (mv.spike) {
      hurt(player, target, 18);
      spikes.push({ e: target, from: tick + 2, until: tick + 40, player });
      sound(dim, 'mace.heavy_smash_ground', hp, 0.8, 1.4);
    }
  } catch (e) { /* alvo invalido */ }
}

/** Inimigos cravados pelo martelo aereo abrem cratera ao bater no chao. */
function updateSpikes(tick) {
  for (let i = spikes.length - 1; i >= 0; i--) {
    const sp = spikes[i];
    let done = tick > sp.until;
    try {
      if (!done && tick >= sp.from && sp.e.isOnGround) {
        const dim = sp.e.dimension;
        const l = sp.e.location;
        blast(dim, { x: l.x, y: l.y - 0.4, z: l.z }, 2.4, sp.player);
        particle(dim, 'superman:shockwave', V.add(l, { x: 0, y: 0.1, z: 0 }), { radius: 7, color: { r: 1, g: 1, b: 1 } });
        particle(dim, 'superman:dust_ring', V.add(l, { x: 0, y: 0.1, z: 0 }), { radius: 3, color: groundColor(dim, V.add(l, { x: 0, y: 0.6, z: 0 })) });
        particle(dim, 'superman:ground_crack', { x: l.x, y: Math.floor(l.y) + 0.06, z: l.z }, { radius: 3 });
        sound(dim, 'mace.heavy_smash_ground', l, 1.6, 0.8);
        shakeArea(dim, l, 20, 0.6, 0.5);
        hurt(sp.player, sp.e, 12);
        done = true;
      }
    } catch (e) {
      done = true;
    }
    if (done) spikes.splice(i, 1);
  }
}

/** Super forca: socos quebram blocos instantaneamente. */
export function onBlockPunch(player, st, block) {
  if (!st.on || !getSettings().punchBreak) return;
  const hand = mainhand(player);
  if (hand && !hand.startsWith('superman:')) return;
  try {
    const mode = player.getGameMode();
    if (mode === GameMode.Creative || mode === GameMode.Adventure) return;
  } catch (e) { /* */ }
  const dim = player.dimension;
  const id = block.typeId;
  if (!isBreakable(id)) return;
  breakBlocks(dim, [block], { visible: 1, force: true });
  particle(dim, 'superman:debris_burst', V.center(block.location), { color: debrisColor(id) });
  spawnDebris(dim, V.center(block.location), id, 2);
}

// ---------------------------------------------------------------- tick dos poderes

let lastSpikeTick = -1;

export function updatePowers(player, st, inp, tick) {
  if (lastSpikeTick !== tick) {
    lastSpikeTick = tick;
    updateSpikes(tick);
    updateProjectiles(tick);
  }
  if (st.power === POW.NONE) return;
  st.powTicks++;
  const hand = mainhand(player);
  switch (st.power) {
    case POW.TRANSFORM:
      transformTick(player, st);
      break;
    case POW.DETRANSFORM:
      detransformTick(player, st);
      break;
    case POW.HEAT:
      if (hand !== ITEM.HEAT || tick > st.powerTimeout) stopPower(player, st);
      else heatTick(player, st, tick);
      break;
    case POW.FREEZE:
      if (hand !== ITEM.FREEZE || tick > st.powerTimeout) stopPower(player, st);
      else freezeTick(player, st, tick);
      break;
    case POW.CHARGE:
      if (hand !== ITEM.PUNCH) stopPower(player, st);
      else chargeTick(player, st);
      break;
    case POW.PUNCH:
      if (st.powTicks === 3) punchImpact(player, st);
      if (st.powTicks >= 14) setPower(player, st, POW.NONE);
      break;
    case POW.CLAP:
      if (st.powTicks === 9) clapImpact(player, st);
      if (st.powTicks >= 20) setPower(player, st, POW.NONE);
      break;
    case POW.SLAM:
      if (st.powTicks === 11) slamImpact(player, st);
      if (st.powTicks >= 24) setPower(player, st, POW.NONE);
      break;
    case POW.NOVA_CHARGE:
      novaChargeTick(player, st, tick);
      break;
    case POW.GRAB:
      grabTick(player, st, tick);
      break;
    case POW.THROW:
      throwTick(player, st, tick);
      break;
    case POW.NOVA:
      if (st.powTicks === 2) novaRelease(player, st, tick);
      if (st.powTicks >= 26) setPower(player, st, POW.NONE);
      break;
    default:
      if (tick >= st.powerTimeout) setPower(player, st, POW.NONE);
  }
}

export const POWER_NAMES = {
  [POW.HEAT]: '§cVisão de calor', [POW.FREEZE]: '§bSopro congelante', [POW.CHARGE]: '§6Carregando soco',
  [POW.PUNCH]: '§6Super soco', [POW.CLAP]: '§fPalma trovão', [POW.SLAM]: '§fPancada no chão',
  [POW.NOVA_CHARGE]: '§6Concentrando energia solar', [POW.NOVA]: '§e§lEXPLOSÃO SOLAR',
  [POW.GRAB]: '§6Agarrando §7(solte o agachar)', [POW.THROW]: '§6§lARREMESSO',
};
