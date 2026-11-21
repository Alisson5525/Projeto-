import { world, system } from "@minecraft/server";
import { DP, HUNTER, LOOP_TICKS, SUPERNATURAL_TYPES } from "../core/config.js";
import { isHunter, isVampire, isWerewolf, getJSON, setJSON, getNum, setNum, getLevel, setLevel } from "../core/data.js";
import { safe, msg, title, sound, particleAt, particle, effect, every, players, isValid, hasFamily, countItem, takeItem, giveItem, isCreative, v3 } from "../core/util.js";
import { bonusDamage, isGuarded, isSupernaturalEntity, state, enemiesAround } from "./skills.js";

// ---------------------------------------------------------------------------
// Missions — each completed mission = +1 rank and +1 skill point
// ---------------------------------------------------------------------------

const VAMPS = ["sunrise:weak_vampire", "sunrise:vampire", "@vampire_player"];
const WOLVES = ["sunrise:weak_werewolf", "sunrise:werewolf", "sunrise:black_werewolf", "@werewolf_player"];

export const MISSIONS = [
  { kind: "kill", targets: VAMPS, count: 3, reward: [["minecraft:arrow", 16]] },
  { kind: "deliver", item: "sunrise:vampire_tooth", count: 5, reward: [["sunrise:garlic", 4]] },
  { kind: "kill", targets: WOLVES, count: 3, reward: [["minecraft:golden_apple", 1]] },
  { kind: "deliver", item: "sunrise:vampire_blood", count: 5, reward: [["minecraft:arrow", 32]] },
  { kind: "kill", targets: ["sunrise:vampire", "@vampire_player"], count: 5, reward: [["minecraft:emerald", 8]] },
  { kind: "deliver", item: "sunrise:pure_vampire_blood", count: 1, reward: [["sunrise:sun_stone_ingot", 2]] },
  { kind: "kill", targets: ["sunrise:black_werewolf", "@werewolf_player"], count: 1, reward: [["minecraft:golden_apple", 2]] },
  { kind: "deliver", item: "sunrise:philosopher_stone", count: 1, reward: [["sunrise:eclipse_ingot", 1]] },
  { kind: "kill", targets: ["sunrise:vampire_witch"], count: 1, reward: [["minecraft:enchanted_golden_apple", 1]] },
  { kind: "kill", targets: [...VAMPS, ...WOLVES, "sunrise:vampire_witch"], count: 10, reward: [["sunrise:eclipse_ingot", 2]] },
];

export function currentMission(p) {
  const idx = getNum(p, DP.HUNTER_MISSION, 0);
  return idx < MISSIONS.length ? { idx, def: MISSIONS[idx], progress: getNum(p, DP.HUNTER_PROGRESS, 0) } : undefined;
}

export function missionProgress(p) {
  const m = currentMission(p);
  if (!m) return undefined;
  const have = m.def.kind === "deliver" ? Math.min(m.def.count, countItem(p, m.def.item)) : m.progress;
  return { ...m, have };
}

function completeMission(p) {
  const m = currentMission(p);
  if (!m) return;
  setNum(p, DP.HUNTER_MISSION, m.idx + 1);
  setNum(p, DP.HUNTER_PROGRESS, 0);
  setNum(p, DP.HUNTER_POINTS, getNum(p, DP.HUNTER_POINTS, 0) + 1);
  setLevel(p, getLevel(p) + 1);
  for (const [item, n] of m.def.reward) giveItem(p, String(item), Number(n));
  title(p, "vc.hunter.mission_done.title", "vc.hunter.mission_done.sub", getLevel(p));
  sound(p, "random.levelup", 1, 1);
}

/** Turn in a delivery mission. Returns lang key of the outcome. */
export function deliverMission(p) {
  const m = currentMission(p);
  if (!m) return "vc.hunter.all_done";
  if (m.def.kind !== "deliver") return "vc.hunter.is_kill_mission";
  if (countItem(p, m.def.item) < m.def.count && !isCreative(p)) return "vc.hunter.missing_items";
  takeItem(p, m.def.item, m.def.count);
  completeMission(p);
  return "vc.hunter.delivered";
}

function matchesTarget(entity, targets) {
  if (entity.typeId === "minecraft:player") {
    return (targets.includes("@vampire_player") && isVampire(entity)) || (targets.includes("@werewolf_player") && isWerewolf(entity));
  }
  return targets.includes(entity.typeId);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getStats(p) {
  return getJSON(p, DP.HUNTER_STATS, { vital: 0, agility: 0, combat: 0 });
}

export function spendPoint(p, stat) {
  const pts = getNum(p, DP.HUNTER_POINTS, 0);
  const s = getStats(p);
  if (pts <= 0) return "vc.hunter.no_points";
  if ((s[stat] ?? 0) >= HUNTER.MAX_STAT) return "vc.hunter.stat_max";
  s[stat] = (s[stat] ?? 0) + 1;
  setJSON(p, DP.HUNTER_STATS, s);
  setNum(p, DP.HUNTER_POINTS, pts - 1);
  sound(p, "random.anvil_use", 0.6, 1.4);
  return "vc.hunter.stat_up";
}

function tickHunter(p) {
  const s = getStats(p);
  if (s.vital > 0) effect(p, "health_boost", 30, s.vital - 1);
  if (s.agility > 0) effect(p, "speed", 4, s.agility >= 6 ? 2 : s.agility >= 3 ? 1 : 0);
  if (s.agility >= 4) effect(p, "jump_boost", 4, s.agility >= 7 ? 1 : 0);

  // Hunter's Sense: reveal supernatural creatures nearby.
  if ((state.sense.get(p.id) ?? 0) > system.currentTick) {
    const found = safe(() => p.dimension.getEntities({ location: p.location, maxDistance: 40 })) ?? [];
    for (const e of found) {
      if (e.id === p.id) continue;
      const mark = e.typeId === "minecraft:player" ? isVampire(e) || isWerewolf(e) : SUPERNATURAL_TYPES.includes(e.typeId) || hasFamily(e, "vampiro") || hasFamily(e, "lobisomem");
      if (mark) {
        const l = e.location;
        particle(e.dimension, "sunrise:hunter_mark", { x: l.x, y: l.y + 2.4, z: l.z });
      }
    }
  }
}

every(LOOP_TICKS, () => {
  for (const p of players()) if (isHunter(p)) safe(() => tickHunter(p), "tickHunter");
}, "hunterLoop");

// Divine protection aura (legacy tag Skill_protecao_divina still works).
every(7, () => {
  for (const p of world.getPlayers({ tags: ["Skill_protecao_divina"] })) {
    safe(() => {
      for (const e of enemiesAround(p, 4)) {
        if (!hasFamily(e, "monster") && !isSupernaturalEntity(e)) continue;
        bonusDamage(e, 2, p, "magic");
        particleAt(e, "sunrise:holy_a", 1);
      }
    }, "divine");
  }
}, "divineLoop");

// ---------------------------------------------------------------------------
// Combat bonus against supernatural creatures
// ---------------------------------------------------------------------------

export function hunterBonus(p) {
  return 1 + getStats(p).combat;
}

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource }) => {
  const p = damageSource?.damagingEntity;
  if (p?.typeId !== "minecraft:player" || !isValid(hurtEntity) || isGuarded(hurtEntity.id)) return;
  if (damageSource.cause !== "entityAttack") return;
  safe(() => {
    if (!isHunter(p) || !isSupernaturalEntity(hurtEntity)) return;
    bonusDamage(hurtEntity, hunterBonus(p), p, "magic");
    particleAt(hurtEntity, "sunrise:holy_a", 1);
  }, "hunterBonus");
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  const killer = damageSource?.damagingEntity;
  if (killer?.typeId !== "minecraft:player") return;
  safe(() => {
    if (!isHunter(killer)) return;
    const m = currentMission(killer);
    if (!m || m.def.kind !== "kill" || !matchesTarget(deadEntity, m.def.targets)) return;
    const prog = m.progress + 1;
    setNum(killer, DP.HUNTER_PROGRESS, prog);
    if (prog >= m.def.count) completeMission(killer);
    else msg(killer, "vc.hunter.progress", prog, m.def.count);
  }, "hunterKill");
});

// ---------------------------------------------------------------------------
// Hunter bow — blessed arrows
// ---------------------------------------------------------------------------

const lastShot = new Map();

export function shootHunterBow(p) {
  if (!isHunter(p)) {
    msg(p, "vc.hunter.only_hunters");
    return;
  }
  const now = system.currentTick;
  if (now - (lastShot.get(p.id) ?? -100) < 16) return;
  if (!isCreative(p) && !takeItem(p, "minecraft:arrow", 1)) {
    msg(p, "vc.hunter.no_arrows");
    return;
  }
  lastShot.set(p.id, now);
  const dir = p.getViewDirection();
  const head = p.getHeadLocation();
  const spawn = v3.add(head, v3.scale(dir, 1.2));
  const arrow = p.dimension.spawnEntity("minecraft:arrow", spawn);
  arrow.addTag("vc_holy_arrow");
  const proj = arrow.getComponent("minecraft:projectile");
  if (proj) {
    proj.owner = p;
    proj.shoot(v3.scale(dir, 3.4), { uncertainty: 0 });
  }
  sound(p, "random.bow", 1, 1.3);
}

world.afterEvents.projectileHitEntity.subscribe((e) => {
  safe(() => {
    if (!e.projectile?.hasTag?.("vc_holy_arrow")) return;
    const target = e.getEntityHit()?.entity;
    const shooter = e.source;
    if (!target || !isValid(target)) return;
    particleAt(target, "sunrise:holy_a", 1);
    if (isSupernaturalEntity(target)) {
      bonusDamage(target, 4 + (shooter && isHunter(shooter) ? hunterBonus(shooter) : 0), shooter, "magic");
      safe(() => target.setOnFire(2, true));
    }
  }, "holyArrow");
});

export { SUPERNATURAL_TYPES };
