// Dragão Jovem: o Ovo de Ignaroth (recompensa do Dragão Ancestral), a incubação pelo calor, a eclosão e o crescimento do
// filhote (com o tempo e comendo carne). O adulto é montaria voadora (definição em defs.js, sopro em skills.js).
import { world, system, ItemStack, GameMode } from "@minecraft/server";
import { NS, V, ok, takeItem, giveItem, countItem, heldItem, health, inventory } from "../core/util.js";
import { particle, sound, psound, anim } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { stats } from "../rpg/stats.js";
import { pauseHud } from "../rpg/progression.js";
import { setFlag } from "../quests/quests.js";
import { loreWith } from "../items/equipment.js";
import { onDragonDefeated } from "../bosses/dragao.js";
import { MOUNTS, getBond, setBond, bindEntity, findMount, ownerOf, setMountInfo } from "./mounts.js";

export const OVO_ITEM = `${NS}:ovo_ignaroth`;
export const OVO = `${NS}:ovo_dragao`;
export const CALOR_TOTAL = 300; // segundos aquecidos (com uma fonte de calor) para chocar
const RAIO = 3;
const HEAT = new Set(["minecraft:fire", "minecraft:soul_fire", "minecraft:lava", "minecraft:flowing_lava", "minecraft:magma",
  "minecraft:lit_furnace", "minecraft:lit_blast_furnace", "minecraft:lit_smoker"]);
const CAMPFIRES = new Set(["minecraft:campfire", "minecraft:soul_campfire"]);
const PR = { dono: `${NS}:dono`, donoNome: `${NS}:dono_nome`, calor: `${NS}:calor` };
/** Crescimento (%) por carne dada ao filhote. Assadas valem mais; o tempo também faz crescer (CRESC_TEMPO). */
export const FOOD = {
  "minecraft:cooked_beef": 5, "minecraft:cooked_porkchop": 5, "minecraft:cooked_mutton": 4, "minecraft:cooked_chicken": 3,
  "minecraft:cooked_rabbit": 3, "minecraft:cooked_salmon": 3, "minecraft:cooked_cod": 2,
  "minecraft:beef": 2, "minecraft:porkchop": 2, "minecraft:mutton": 2, "minecraft:chicken": 1, "minecraft:rabbit": 1,
  "minecraft:salmon": 1, "minecraft:cod": 1,
};
const CRESC_TEMPO = 1 / 90; // % por segundo com o filhote carregado (cerca de 2,5 h sem comer nada)
const feedCd = new Map();

// ------------------------------------------------------------------ utilidades
function prop(e, k) {
  try {
    return e.getDynamicProperty(k);
  } catch {
    return undefined;
  }
}
const isBaby = (e) => {
  try {
    return e.hasComponent("minecraft:is_baby");
  } catch {
    return false;
  }
};
const creative = (p) => {
  try {
    return p.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
};
const FACE = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

/** Fontes de calor a até 3 blocos (fogo, lava, magma, fornalhas acesas, fogueiras acesas). No Nether, +1. */
export function heatSources(dim, loc) {
  const c = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
  let n = dim.id === "minecraft:nether" ? 1 : 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -RAIO; dx <= RAIO; dx++) {
      for (let dz = -RAIO; dz <= RAIO; dz++) {
        let b;
        try {
          b = dim.getBlock({ x: c.x + dx, y: c.y + dy, z: c.z + dz });
        } catch {
          continue;
        }
        if (!b) continue;
        const id = b.typeId;
        if (HEAT.has(id)) n++;
        else if (CAMPFIRES.has(id)) {
          let off = false;
          try { off = b.permutation.getState("extinguished") === true; } catch { /* */ }
          if (!off) n++;
        }
        if (n >= 3) return n;
      }
    }
  }
  return n;
}
const rate = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 1.5 : 2);
const pct = (calor) => Math.min(100, Math.floor((calor / CALOR_TOTAL) * 100));

// ------------------------------------------------------------------ colocar e recolher o ovo
/** Usar o Ovo de Ignaroth: coloca-o no bloco para onde o jogador olha. */
export function placeEgg(player) {
  if (getBond(player.id, "dragao")) {
    player.onScreenDisplay.setActionBar("§cUm dragão já está ligado a você. §7Dê este ovo a outro aventureiro.");
    psound(player, "note.bass", 0.8, 0.7);
    return false;
  }
  let hit;
  try {
    hit = player.getBlockFromViewDirection({ maxDistance: 6 });
  } catch { /* */ }
  if (!hit) {
    player.onScreenDisplay.setActionBar("§7Olhe para o chão, a até 6 blocos, para colocar o ovo.");
    return false;
  }
  const f = FACE[hit.face] || FACE.Up;
  const b = hit.block.location;
  const spot = { x: b.x + f[0], y: b.y + f[1], z: b.z + f[2] };
  const dim = player.dimension;
  try {
    const here = dim.getBlock(spot);
    const below = dim.getBlock({ x: spot.x, y: spot.y - 1, z: spot.z });
    if (!here || !(here.isAir || HEAT.has(here.typeId)) || !below || below.isAir) {
      player.onScreenDisplay.setActionBar("§7O ovo precisa de um espaço livre sobre um bloco firme.");
      return false;
    }
  } catch {
    return false;
  }
  const it = heldItem(player);
  if (!it || it.typeId !== OVO_ITEM) return false;
  let calor = 0;
  try { calor = Number(it.getDynamicProperty(PR.calor)) || 0; } catch { /* */ }
  if (!creative(player)) {
    try { inventory(player).setItem(player.selectedSlotIndex, undefined); } catch { return false; } // o ovo da mão (cada um guarda o seu calor)
  }
  const e = dim.spawnEntity(OVO, { x: spot.x + 0.5, y: spot.y, z: spot.z + 0.5 });
  e.setDynamicProperty(PR.dono, player.id);
  e.setDynamicProperty(PR.donoNome, player.name);
  e.setDynamicProperty(PR.calor, calor);
  try { e.setProperty(PR.calor, Math.min(10, Math.floor((calor / CALOR_TOTAL) * 10))); } catch { /* */ }
  e.nameTag = `Ovo de Ignaroth (${player.name})`;
  sound(dim, "random.pop", e.location, 0.6, 1);
  particle(dim, "fogo_explosao", V.up(e.location, 0.5), { radius: 0.6 });
  const n = heatSources(dim, e.location);
  player.onScreenDisplay.setActionBar(n ? `§6O ovo absorve o calor... §7(${n} fonte${n > 1 ? "s" : ""} de calor; agache e bata para recolher)`
    : "§bO ovo está frio. §7Acenda fogo, lava, magma ou uma fogueira a até 3 blocos dele.");
  return true;
}

/** O dono agachado bate no ovo: recolhe-o (o calor acumulado fica guardado no item). */
function pickUp(player, egg) {
  const calor = Number(prop(egg, PR.calor)) || 0;
  const it = new ItemStack(OVO_ITEM, 1);
  try {
    it.setDynamicProperty(PR.calor, calor);
    if (calor > 0) loreWith(it, [`§7Calor acumulado: §6${pct(calor)}%`]);
  } catch { /* */ }
  egg.remove();
  giveItem(player, it);
  player.onScreenDisplay.setActionBar(`§7Você recolhe o ovo. §8(calor guardado: ${pct(calor)}%)`);
  psound(player, "random.pop", 0.8, 0.8);
}

// ------------------------------------------------------------------ incubação e eclosão
function owner(e) {
  const pid = prop(e, PR.dono);
  return typeof pid === "string" ? world.getAllPlayers().find((p) => p.id === pid) : undefined;
}

export function hatch(egg, player) {
  const dim = egg.dimension;
  const loc = { ...egg.location };
  anim(egg, "animation.valdoria.ovo_dragao.eclodir", 0.1);
  sound(dim, "block.sniffer_egg.crack", loc, 0.8, 1);
  system.runTimeout(() => ok(egg) && sound(dim, "block.sniffer_egg.crack", loc, 0.7, 1), 12);
  system.runTimeout(() => {
    if (!ok(egg) || !ok(player)) return;
    egg.remove();
    sound(dim, "block.sniffer_egg.hatch", loc, 0.8, 1);
    sound(dim, "mob.enderdragon.growl", loc, 2, 0.6);
    particle(dim, "fogo_explosao", V.up(loc, 0.6), { radius: 1.2 });
    particle(dim, "nivel_anel", loc, {});
    const baby = dim.spawnEntity(MOUNTS.dragao.id, loc);
    setBond(player.id, "dragao", { tok: "", morto: 0, nome: "", cresc: 0, adulto: false });
    bindEntity(player, "dragao", baby);
    if (!countItem(player, MOUNTS.dragao.item)) giveItem(player, new ItemStack(MOUNTS.dragao.item, 1));
    player.onScreenDisplay.setTitle("§6Um dragão nasceu!", { subtitle: "§7Alimente-o com carne assada para que cresça e possa ser montado",
      fadeInDuration: 5, stayDuration: 70, fadeOutDuration: 20 });
    setFlag(player, "dragao_nasceu");
  }, 32);
}

function incubateInfo(p, egg) {
  const calor = Number(prop(egg, PR.calor)) || 0;
  const n = heatSources(egg.dimension, egg.location);
  pauseHud(p, 40);
  p.onScreenDisplay.setActionBar(`§6Ovo de Ignaroth §f${pct(calor)}% §7· ${n ? `§a${n} fonte(s) de calor` : "§bfrio"} §8(agache + interagir: recolher)`);
}

function incubate(egg) {
  const dim = egg.dimension;
  const n = heatSources(dim, egg.location);
  let calor = Number(prop(egg, PR.calor)) || 0;
  const p = owner(egg);
  if (calor < CALOR_TOTAL && n > 0) {
    calor = Math.min(CALOR_TOTAL, calor + rate(n));
    egg.setDynamicProperty(PR.calor, calor);
    try { egg.setProperty(PR.calor, Math.min(10, Math.floor((calor / CALOR_TOTAL) * 10))); } catch { /* */ }
    if (Math.random() < 0.5) particle(dim, "fogo_rastro", V.up(egg.location, 0.9), {});
  }
  const near = ok(p) && p.dimension.id === dim.id && V.dist(p.location, egg.location) < 7;
  if (calor >= CALOR_TOTAL) {
    particle(dim, "nivel_anel", egg.location, {});
    if (ok(p) && p.dimension.id === dim.id && V.dist(p.location, egg.location) < 16) {
      if (!egg.hasTag("vo_chocando")) {
        egg.addTag("vo_chocando");
        hatch(egg, p);
      }
    } else if (near) p.onScreenDisplay.setActionBar("§6O ovo está pronto e só espera por você.");
    return;
  }
  if (near) {
    pauseHud(p, 25);
    p.onScreenDisplay.setActionBar(n ? `§6Ovo de Ignaroth §f${pct(calor)}% §a(aquecido: ${n} fonte${n > 1 ? "s" : ""} de calor)`
      : `§6Ovo de Ignaroth §f${pct(calor)}% §b(frio: precisa de fogo, lava, magma ou fogueira acesa a até 3 blocos)`);
  }
}

// ------------------------------------------------------------------ crescimento do filhote
function grow(e, pid, add, b = getBond(pid, "dragao")) {
  if (!b || b.adulto) return b;
  b.cresc = Math.min(100, (Number(b.cresc) || 0) + add);
  if (b.cresc >= 100) {
    b.adulto = true;
    try { e.triggerEvent("valdoria:crescer"); } catch { /* */ }
    sound(e.dimension, "mob.enderdragon.growl", e.location, 1.3, 1.2);
    particle(e.dimension, "fogo_explosao", V.up(e.location, 1), { radius: 2 });
    particle(e.dimension, "nivel_anel", e.location, {});
    const p = world.getAllPlayers().find((q) => q.id === pid);
    if (p) {
      p.onScreenDisplay.setTitle("§6Seu dragão cresceu!", { subtitle: "§7Agora ele pode ser montado. Use o Talismã montado para o Sopro de Fogo",
        fadeInDuration: 5, stayDuration: 70, fadeOutDuration: 20 });
      setFlag(p, "dragao_adulto");
    }
  }
  setBond(pid, "dragao", b);
  return b;
}

function feed(player, e, itemId) {
  const now = system.currentTick;
  if ((feedCd.get(player.id) || 0) > now) return;
  feedCd.set(player.id, now + 10);
  if (!creative(player) && !takeItem(player, itemId, 1)) return;
  const h = health(e);
  if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + 4));
  anim(e, "animation.valdoria.dragao_ancestral.mordida", 0.1);
  sound(e.dimension, "random.burp", e.location, 1.5, 0.8);
  particle(e.dimension, "cura", V.up(e.location, 0.8), {});
  const b = grow(e, player.id, FOOD[itemId] * (1 + (stats(player).luck || 0)));
  if (b && !b.adulto) {
    pauseHud(player, 40);
    player.onScreenDisplay.setActionBar(`§6${e.nameTag || "Filhote"} §7comeu. Crescimento: §f${Math.floor(b.cresc)}%`);
  }
}

// ------------------------------------------------------------------ recompensa do Ignaroth
function eggReward(players, dim) {
  for (const p of players) {
    if (!ok(p)) continue;
    const d = getData(p);
    d.flags = d.flags || {};
    const first = !d.flags.ovo_ignaroth;
    const already = getBond(p.id, "dragao") || countItem(p, OVO_ITEM);
    if (first && !already) {
      d.flags.ovo_ignaroth = true;
      markDirty(p);
      giveItem(p, new ItemStack(OVO_ITEM, 1));
      p.sendMessage("§6Entre as cinzas de Ignaroth, um ovo ainda quente pulsa. §7(Ovo de Ignaroth: choque-o perto de fogo ou lava.)");
    } else if (Math.random() < 0.2 + (stats(p).luck || 0)) {
      dim.spawnItem(new ItemStack(OVO_ITEM, 1), V.up(p.location, 0.5));
      p.sendMessage("§6Outro ovo de Ignaroth rola das cinzas... §7(pode ser dado a um aliado)");
    }
  }
}

// ------------------------------------------------------------------ início
export function startDragonEggs() {
  onDragonDefeated((siteId, players, dim) => eggReward(players, dim));
  setMountInfo("dragao", (player, e) => {
    if (!isBaby(e)) return "§6Adulto: pode ser montado e voar.";
    const b = getBond(player.id, "dragao");
    return `§dFilhote: §f${Math.floor(Number(b?.cresc) || 0)}%§d crescido. §7Dê carne (assada vale mais) para crescer; só o adulto pode ser montado.`;
  });

  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    const t = ev.target;
    if (t.typeId === OVO) {
      ev.cancel = true;
      const p = ev.player;
      const mine = prop(t, PR.dono) === p.id;
      const sneak = p.isSneaking;
      system.run(() => {
        if (!ok(p) || !ok(t)) return;
        if (!mine) p.onScreenDisplay.setActionBar(`§cEste ovo pertence a ${prop(t, PR.donoNome) || "outro aventureiro"}.`);
        else if (sneak) pickUp(p, t);
        else incubateInfo(p, t);
      });
      return;
    }
    if (t.typeId !== MOUNTS.dragao.id) return;
    const p = ev.player;
    if (p.isSneaking || !isBaby(t) || ownerOf(t) !== p.id) return;
    const id = ev.itemStack?.typeId;
    ev.cancel = true;
    if (id && FOOD[id]) {
      system.run(() => ok(p) && ok(t) && feed(p, t, id));
      return;
    }
    system.run(() => {
      if (!ok(p)) return;
      const b = getBond(p.id, "dragao");
      p.onScreenDisplay.setActionBar(`§7O filhote ainda é pequeno demais para montar (§f${Math.floor(Number(b?.cresc) || 0)}%§7). Dê carne a ele.`);
    });
  });

  world.afterEvents.entityHitEntity.subscribe((ev) => {
    const egg = ev.hitEntity;
    if (egg?.typeId !== OVO || ev.damagingEntity?.typeId !== "minecraft:player") return;
    const p = /** @type {import("@minecraft/server").Player} */ (ev.damagingEntity);
    if (prop(egg, PR.dono) !== p.id) {
      p.onScreenDisplay.setActionBar(`§cEste ovo pertence a ${prop(egg, PR.donoNome) || "outro aventureiro"}.`);
      return;
    }
    if (p.isSneaking) pickUp(p, egg);
    else incubateInfo(p, egg);
  });

  let n = 0;
  system.runInterval(() => {
    n++;
    for (const dimId of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
      let dim;
      try {
        dim = world.getDimension(dimId);
      } catch {
        continue;
      }
      for (const egg of dim.getEntities({ type: OVO })) {
        try { incubate(egg); } catch (err) { console.warn(`[Valdoria] ovo: ${err}`); }
      }
      for (const e of dim.getEntities({ type: MOUNTS.dragao.id })) {
        const pid = ownerOf(e);
        if (!pid || !isBaby(e)) continue;
        const b = getBond(pid, "dragao");
        if (!b || b.adulto) continue;
        // escrita do vínculo a cada 30 s (o crescimento por tempo é pequeno)
        if (n % 30 === 0) grow(e, pid, CRESC_TEMPO * 30, b);
      }
    }
  }, 20);
}

// ------------------------------------------------------------------ Modo de Teste
/** Dá um Ovo de Ignaroth e uma fogueira acesa. */
export function testEgg(player) {
  giveItem(player, new ItemStack(OVO_ITEM, 1));
  giveItem(player, new ItemStack("minecraft:campfire", 1));
}
/** Leva ovos próximos a 100% de calor e filhotes do jogador a 99% de crescimento. */
export function testRush(player) {
  let k = 0;
  for (const egg of player.dimension.getEntities({ type: OVO, location: player.location, maxDistance: 32 })) {
    egg.setDynamicProperty(PR.calor, CALOR_TOTAL);
    try { egg.setProperty(PR.calor, 10); } catch { /* */ }
    k++;
  }
  const b = getBond(player.id, "dragao");
  if (b && !b.adulto) {
    b.cresc = 99;
    setBond(player.id, "dragao", b);
    k++;
  }
  return k;
}
/** Gera um dragão já vinculado (filhote ou adulto). */
export function testDragon(player, adulto) {
  const M = MOUNTS.dragao;
  const loc = V.add(player.location, V.mul(V.flat(player.getViewDirection()), 3));
  const e = player.dimension.spawnEntity(M.id, loc, adulto ? { spawnEvent: M.adultoEvento } : undefined);
  setBond(player.id, "dragao", { ...(getBond(player.id, "dragao") || { nome: "" }), cresc: adulto ? 100 : 0, adulto: !!adulto });
  bindEntity(player, "dragao", e);
  if (!countItem(player, M.item)) giveItem(player, new ItemStack(M.item, 1));
  return e;
}
export { findMount };
