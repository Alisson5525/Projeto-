// Experiência, níveis, recompensas, fontes de XP (abates, exploração, descobertas) e HUD.
import { world, system } from "@minecraft/server";
import { V, ok, isPlayer, tick, bar, NS, say, clamp, health } from "../core/util.js";
import { particle, psound, sound } from "../core/fx.js";
import { getData, markDirty, saveNow, getWorldCfg } from "../core/store.js";
import { stats, addEnergy, invalidate, activeBuffs } from "./stats.js";
import { onKill } from "../core/damage.js";
import { summonOwner } from "../abilities/engine.js";
import { ABILITIES, cooldownLeft } from "../abilities/registry.js";
import { RACAS } from "../data/races.js";
import { CLASSES, CLASS_LEVEL, SPEC_LEVEL } from "../data/classes.js";

export const MAX_LEVEL = 60;
export const POINTS_PER_LEVEL = 3;

/** XP necessário para passar do nível L para L+1. */
export function xpToNext(level) {
  return Math.floor(30 * Math.pow(level, 1.5) + 70);
}

const listeners = [];
export function onLevelUp(fn) {
  listeners.push(fn);
}

const hudPause = new Map();
export const currentBiome = new Map(); // jogador -> id do bioma atual
export function pauseHud(player, ticks = 50) {
  hudPause.set(player.id, tick() + ticks);
}

export function addXP(player, amount, reason = "") {
  const d = getData(player);
  if (d.nivel >= MAX_LEVEL || amount <= 0) return;
  const s = stats(player);
  const gain = Math.max(1, Math.round(amount * s.xp * getWorldCfg().xpMult));
  d.xp += gain;
  let ups = 0;
  while (d.nivel < MAX_LEVEL && d.xp >= xpToNext(d.nivel)) {
    d.xp -= xpToNext(d.nivel);
    d.nivel++;
    ups++;
    let pts = POINTS_PER_LEVEL;
    if (d.raca === "humano" && d.nivel % 5 === 0) pts += 1;
    d.pontos += pts;
  }
  if (d.nivel >= MAX_LEVEL) d.xp = 0;
  markDirty(player);
  if (reason) {
    try {
      player.onScreenDisplay.setActionBar(`§e+${gain} XP §7(${reason})`);
      pauseHud(player, 30);
    } catch { /* */ }
  }
  if (ups) levelUp(player, d, ups);
}

function levelUp(player, d, ups) {
  invalidate(player);
  const s = stats(player);
  addEnergy(player, s.energyMax);
  const h = health(player);
  if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + h.effectiveMax * 0.5));
  player.onScreenDisplay.setTitle(`§6§lNÍVEL ${d.nivel}`, {
    subtitle: `§e+${ups * POINTS_PER_LEVEL} pontos de atributo §7- abra o Diário`, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  particle(player.dimension, "nivel", V.up(player.location, 1));
  particle(player.dimension, "nivel_anel", V.up(player.location, 0.2));
  psound(player, "random.levelup", 0.9, 1);
  psound(player, "random.totem", 1.4, 0.4);
  const msgs = [];
  if (d.nivel >= CLASS_LEVEL && !d.classe) msgs.push("§bVocê pode escolher uma §lclasse§r§b no Diário do Aventureiro!");
  if (d.nivel >= SPEC_LEVEL && d.classe && !d.espec && d.chefes > 0) msgs.push("§dEspecializações de classe disponíveis no Diário!");
  if (d.classe) {
    for (const [id, lv] of CLASSES[d.classe].habilidades) {
      if (lv > d.nivel - ups && lv <= d.nivel) msgs.push(`§aNova habilidade de classe: §f${ABILITIES[id]?.nome || id}`);
    }
  }
  for (const m of msgs) say(player, m);
  saveNow(player);
  for (const fn of listeners) {
    try { fn(player, d); } catch { /* */ }
  }
}

// ------------------------------------------------------------------ XP por abate
const XP_TABLE = {
  "minecraft:zombie": 10, "minecraft:husk": 11, "minecraft:drowned": 11, "minecraft:skeleton": 10, "minecraft:stray": 12,
  "minecraft:bogged": 12, "minecraft:spider": 10, "minecraft:cave_spider": 11, "minecraft:creeper": 12, "minecraft:enderman": 20,
  "minecraft:witch": 22, "minecraft:slime": 4, "minecraft:magma_cube": 6, "minecraft:blaze": 22, "minecraft:ghast": 25,
  "minecraft:pillager": 14, "minecraft:vindicator": 22, "minecraft:evocation_illager": 40, "minecraft:ravager": 70,
  "minecraft:phantom": 12, "minecraft:guardian": 18, "minecraft:elder_guardian": 220, "minecraft:wither_skeleton": 28,
  "minecraft:piglin_brute": 35, "minecraft:hoglin": 18, "minecraft:zoglin": 20, "minecraft:breeze": 30, "minecraft:warden": 400,
  "minecraft:wither": 700, "minecraft:ender_dragon": 1500, "minecraft:silverfish": 3, "minecraft:endermite": 4, "minecraft:vex": 8,
  "minecraft:shulker": 18, "minecraft:creaking": 20,
  [`${NS}:goblin`]: 14, [`${NS}:goblin_xama`]: 24, [`${NS}:espectro`]: 28, [`${NS}:fragmento_pedra`]: 12, [`${NS}:cervo_magico`]: 4,
  [`${NS}:broto_corrompido`]: 10, [`${NS}:cavaleiro_corrompido`]: 34, [`${NS}:gargula`]: 26,
  [`${NS}:sentinela_celeste`]: 38, [`${NS}:harpia`]: 28,
};
const recentKills = new Map(); // jogador -> [ticks]

function killXP(ev) {
  const dead = ev.deadEntity;
  let killer = ev.damageSource.damagingEntity;
  if (killer && !isPlayer(killer)) killer = summonOwner(killer);
  if (!isPlayer(killer)) return;
  const tid = dead.typeId;
  if (tid === "minecraft:player" || tid === `${NS}:tita_pedra`) return;
  let base = XP_TABLE[tid];
  if (base === undefined) {
    let monster = false;
    try { monster = dead.matches({ families: ["monster"] }); } catch { /* */ }
    base = monster ? 8 : 1;
  }
  // anti-fazenda: abates muito frequentes rendem menos
  const now = tick();
  const arr = (recentKills.get(killer.id) || []).filter((t) => now - t < 1200);
  arr.push(now);
  recentKills.set(killer.id, arr);
  const mult = arr.length > 40 ? 0.35 : arr.length > 25 ? 0.6 : 1;
  const d = getData(killer);
  d.abates[tid] = (d.abates[tid] || 0) + 1;
  addXP(killer, base * mult, "abate");
}

// ------------------------------------------------------------------ exploração: biomas
const BIOME_NAMES = {
  plains: "Planícies", forest: "Floresta", birch_forest: "Floresta de Bétulas", dark_forest: "Floresta Sombria",
  flower_forest: "Floresta Florida", taiga: "Taiga", snowy_taiga: "Taiga Nevada", savanna: "Savana", desert: "Deserto",
  badlands: "Terras Áridas", jungle: "Selva", swamp: "Pântano", mangrove_swamp: "Manguezal", meadow: "Prado",
  cherry_grove: "Bosque de Cerejeiras", grove: "Arvoredo", snowy_slopes: "Encostas Nevadas", jagged_peaks: "Picos Irregulares",
  frozen_peaks: "Picos Congelados", stony_peaks: "Picos Rochosos", windswept_hills: "Colinas Ventosas", ice_plains: "Planícies Geladas",
  mushroom_island: "Ilha de Cogumelos", ocean: "Oceano", deep_ocean: "Oceano Profundo", river: "Rio", beach: "Praia",
  lush_caves: "Cavernas Exuberantes", dripstone_caves: "Cavernas de Espeleotemas", deep_dark: "Escuridão Profunda",
  crimson_forest: "Floresta Carmesim", warped_forest: "Floresta Distorcida", soulsand_valley: "Vale das Almas",
  basalt_deltas: "Deltas de Basalto", hell: "Ermos do Nether", the_end: "O Fim", pale_garden: "Jardim Pálido",
};
export function biomeName(id) {
  const k = id.replace("minecraft:", "");
  return BIOME_NAMES[k] || k.replace(/_/g, " ");
}

function exploreTick(player) {
  let biome;
  try {
    biome = player.dimension.getBiome(player.location)?.id;
  } catch {
    return;
  }
  if (!biome) return;
  currentBiome.set(player.id, biome);
  const d = getData(player);
  if (!d.desc.biomas.includes(biome)) {
    d.desc.biomas.push(biome);
    markDirty(player);
    player.onScreenDisplay.setTitle(" ", { subtitle: `§a» Região descoberta: §f${biomeName(biome)}`, fadeInDuration: 5,
      stayDuration: 40, fadeOutDuration: 10 });
    addXP(player, 40 + d.desc.biomas.length * 2, "nova região");
    psound(player, "random.orb", 0.7, 0.8);
  }
  return biome;
}

// ------------------------------------------------------------------ HUD
function hud(player) {
  const d = getData(player);
  if (!d.cfg.hud) return;
  if ((hudPause.get(player.id) || 0) > tick()) return;
  const s = stats(player);
  const need = xpToNext(d.nivel);
  const race = d.raca ? RACAS[d.raca] : null;
  let line = `§6Nv ${d.nivel}${race ? ` ${race.cor}${race.nome}` : ""} §7[${bar(d.xp / need, 10, "§e", "§8")}§7] ` +
    `§9Energia §b${Math.floor(d.energia)}/${s.energyMax}`;
  if (d.pontos > 0) line += ` §a+${d.pontos}pts`;
  if (d.cfg.semRecarga || d.cfg.energiaInfinita) line += " §6[TESTE]";
  const ab = currentAbilityLine(player, d);
  if (ab) line += `\n${ab}`;
  try {
    player.onScreenDisplay.setActionBar(line);
  } catch { /* */ }
}

let abilityLineFn = (/** @type {any} */ _p, /** @type {any} */ _d) => "";
export function setAbilityLine(fn) {
  abilityLineFn = fn;
}
function currentAbilityLine(player, d) {
  return abilityLineFn(player, d);
}

// ------------------------------------------------------------------ aplicação contínua de atributos
function applyAttributes(player, s) {
  const lv = s.hpLevels - 1;
  const cur = player.getEffect("health_boost");
  if (lv >= 0) {
    if (!cur || cur.amplifier !== lv || cur.duration < 1200) {
      player.addEffect("health_boost", 20000000, { amplifier: lv, showParticles: false });
    }
  } else if (cur && cur.duration > 100000) player.removeEffect("health_boost");
  const agi = s.attrs.agi;
  if (agi >= 30) {
    const sp = player.getEffect("speed");
    if (!sp || sp.duration < 60) player.addEffect("speed", 120, { amplifier: agi >= 60 ? 1 : 0, showParticles: false });
  }
}

export function startProgression() {
  onKill(killXP);
  // HUD e regeneração de energia
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      const d = getData(p);
      const s = stats(p);
      if (d.cfg.energiaInfinita) d.energia = s.energyMax;
      if (d.energia < s.energyMax) {
        d.energia = clamp(d.energia + s.energyRegen / 2, 0, s.energyMax);
      } else if (d.energia > s.energyMax) d.energia = s.energyMax;
      hud(p);
    }
  }, 10);
  // atributos permanentes e exploração
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try {
        const s = stats(p);
        applyAttributes(p, s);
        exploreTick(p);
      } catch (e) {
        console.warn(`[Valdoria] tick atributos: ${e}`);
      }
    }
  }, 40);
  world.afterEvents.playerSpawn.subscribe((ev) => {
    system.runTimeout(() => {
      if (!ok(ev.player)) return;
      invalidate(ev.player);
      applyAttributes(ev.player, stats(ev.player));
    }, 10);
  });
}

export { activeBuffs, cooldownLeft, sound };
