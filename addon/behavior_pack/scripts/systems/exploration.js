import { world, system, ItemStack } from "@minecraft/server";
import { getSettings, getFaction, Faction } from "../core/data.js";
import { safe, every, players, isNight, chance, randInt, msg, sound, isCreative } from "../core/util.js";
import { isFullMoon } from "./werewolf.js";
import { bloodMoon } from "./world_events.js";

// ---------------------------------------------------------------------------
// Wilderness encounters: the further you travel from spawn, the more the world
// reacts — wolf packs, vampire nests, hunter patrols and forgotten graves.
// ---------------------------------------------------------------------------

const MIN_DIST = 220; // blocks from world spawn
const COOLDOWN_TICKS = 20 * 60 * 4; // per player
/** playerId -> tick of the next allowed encounter (session memory). */
const nextAt = new Map();

function surfaceSpot(p, min, max) {
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * Math.PI * 2;
    const d = randInt(min, max);
    const x = Math.floor(p.location.x + Math.cos(a) * d);
    const z = Math.floor(p.location.z + Math.sin(a) * d);
    const top = safe(() => p.dimension.getTopmostBlock({ x, z }));
    if (!top || top.isLiquid || top.typeId.includes("leaves") || Math.abs(top.location.y - p.location.y) > 12) continue;
    return { x: x + 0.5, y: top.location.y + 1, z: z + 0.5, top };
  }
  return undefined;
}

function spawnGroup(p, type, count, spot) {
  for (let i = 0; i < count; i++) {
    safe(() => p.dimension.spawnEntity(type, { x: spot.x + Math.random() * 2 - 1, y: spot.y, z: spot.z + Math.random() * 2 - 1 }));
  }
  safe(() => p.dimension.spawnParticle("sunrise:transform_smoke", spot));
}

const GRAVE_LOOT = [
  ["minecraft:bone", 2, 5], ["minecraft:gold_nugget", 3, 9], ["sunrise:garlic", 1, 3], ["sunrise:weak_human_heart", 1, 2],
  ["sunrise:vampire_tooth", 1, 1], ["sunrise:blood_bottle_2", 1, 1], ["minecraft:emerald", 1, 3], ["sunrise:moon_stone_ore", 1, 3],
  ["sunrise:sun_stone_ore", 1, 3], ["minecraft:candle", 1, 3], ["sunrise:werewolf_fang", 1, 1], ["sunrise:human_heart", 1, 1],
];

function forgottenGrave(p) {
  const spot = surfaceSpot(p, 8, 16);
  if (!spot) return false;
  const base = spot.top.location;
  const chestLoc = { x: base.x, y: base.y + 1, z: base.z };
  const stoneLoc = { x: base.x + 1, y: base.y + 1, z: base.z };
  const dim = p.dimension;
  const chestBlock = dim.getBlock(chestLoc);
  const stoneBlock = dim.getBlock(stoneLoc);
  if (!chestBlock?.isAir || !stoneBlock?.isAir) return false;
  stoneBlock.setType("minecraft:mossy_cobblestone");
  chestBlock.setType("minecraft:chest");
  const inv = chestBlock.getComponent("minecraft:inventory")?.container;
  if (inv) {
    const n = randInt(3, 6);
    for (let i = 0; i < n; i++) {
      const [id, lo, hi] = GRAVE_LOOT[randInt(0, GRAVE_LOOT.length - 1)];
      inv.setItem(randInt(0, inv.size - 1), new ItemStack(String(id), randInt(Number(lo), Number(hi))));
    }
  }
  dim.spawnParticle("sunrise:magic_altar", { x: chestLoc.x + 0.5, y: chestLoc.y + 1, z: chestLoc.z + 0.5 });
  msg(p, "vc.explore.grave");
  return true;
}

const ENCOUNTERS = [
  {
    id: "pack", weight: 4, when: () => isNight(),
    run: (p) => {
      const spot = surfaceSpot(p, 18, 26);
      if (!spot) return false;
      spawnGroup(p, "sunrise:weak_werewolf", randInt(2, 3), spot);
      if (isFullMoon() || chance(25)) spawnGroup(p, "sunrise:werewolf", 1, spot);
      sound(p, "vc.wolf.howl", 1, 1);
      msg(p, "vc.explore.pack");
      return true;
    },
  },
  {
    id: "nest", weight: 3, when: () => isNight(),
    run: (p) => {
      const spot = surfaceSpot(p, 16, 24);
      if (!spot) return false;
      spawnGroup(p, "sunrise:weak_vampire", randInt(2, 3), spot);
      if (chance(bloodMoon.active ? 60 : 20)) spawnGroup(p, "sunrise:vampire", 1, spot);
      sound(p, "mob.bat.idle", 1, 0.6);
      msg(p, "vc.explore.nest");
      return true;
    },
  },
  {
    id: "coven", weight: 1, when: () => isNight(),
    run: (p) => {
      const spot = surfaceSpot(p, 20, 28);
      if (!spot) return false;
      spawnGroup(p, "sunrise:vampire_witch", 1, spot);
      spawnGroup(p, "sunrise:weak_vampire", 2, spot);
      msg(p, "vc.explore.coven");
      return true;
    },
  },
  {
    id: "patrol", weight: 3, when: () => !isNight(),
    run: (p) => {
      const spot = surfaceSpot(p, 16, 24);
      if (!spot) return false;
      spawnGroup(p, "sunrise:hunter", randInt(2, 3), spot);
      msg(p, getFaction(p) === Faction.HUMAN || getFaction(p) === Faction.HUNTER ? "vc.explore.patrol_friendly" : "vc.explore.patrol_hostile");
      return true;
    },
  },
  { id: "grave", weight: 3, when: () => true, run: forgottenGrave },
];

function pick() {
  const list = ENCOUNTERS.filter((e) => e.when());
  const total = list.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * total;
  for (const e of list) if ((r -= e.weight) <= 0) return e;
  return list[0];
}

every(20 * 30, () => {
  const s = getSettings();
  if (s.encounters === false) return;
  const spawn = safe(() => world.getDefaultSpawnLocation()) ?? { x: 0, y: 0, z: 0 };
  for (const p of players()) {
    safe(() => {
      if (p.dimension.id !== "minecraft:overworld" || isCreative(p)) return;
      if (Math.hypot(p.location.x - spawn.x, p.location.z - spawn.z) < MIN_DIST) return;
      if (system.currentTick < (nextAt.get(p.id) ?? 20 * 60 * 2)) return;
      if (!chance(25)) return;
      const enc = pick();
      if (enc && enc.run(p)) nextAt.set(p.id, system.currentTick + COOLDOWN_TICKS);
    }, "encounter");
  }
}, "exploration");

world.afterEvents.playerLeave.subscribe(({ playerId }) => nextAt.delete(playerId));

// ---------------------------------------------------------------------------
// Spawn balancer: the vanilla monster cap is shared with zombies, skeletons...
// so add-on mobs could be rare and uneven. This tops up the area around each
// player with add-on creatures in strict rotation, so every type appears the
// same number of times.
// ---------------------------------------------------------------------------

export const NIGHT_ROTATION = ["sunrise:weak_vampire", "sunrise:weak_werewolf", "sunrise:vampire", "sunrise:werewolf",
  "sunrise:chicken_vampiro", "sunrise:bat_minion", "sunrise:vampire_witch", "sunrise:black_werewolf"];
const ADDON_FAMILIES = ["vampiro", "lobisomem", "supernatural"];
let rotation = 0;
let dayRotation = 0;

export function nextNightMob() {
  const id = NIGHT_ROTATION[rotation % NIGHT_ROTATION.length];
  rotation++;
  return id;
}

function nearbyAddonMobs(p, radius) {
  return (safe(() => p.dimension.getEntities({ location: p.location, maxDistance: radius })) ?? [])
    .filter((e) => e.typeId.startsWith("sunrise:") && e.typeId !== "minecraft:player").length;
}

every(20 * 25, () => {
  const s = getSettings();
  if (s.spawnBoost === false) return;
  const night = isNight();
  for (const p of players()) {
    safe(() => {
      if (p.dimension.id !== "minecraft:overworld" || isCreative(p)) return;
      const near = nearbyAddonMobs(p, 64);
      if (night) {
        if (near >= 6 || !chance(70)) return;
        const spot = surfaceSpot(p, 24, 40);
        if (!spot) return;
        spawnGroup(p, nextNightMob(), 1, spot);
      } else {
        // Daytime: hunters patrol (they are the only day-walking add-on mob).
        if (near >= 3 || !chance(35)) return;
        const spot = surfaceSpot(p, 24, 40);
        if (!spot) return;
        dayRotation++;
        spawnGroup(p, "sunrise:hunter", 1 + (dayRotation % 2), spot);
      }
    }, "spawnBalancer");
  }
}, "spawnBalancer");

export { ADDON_FAMILIES };
