// Comportamentos especiais das criaturas (complementam os componentes de IA do JSON).
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, chance, hpPct, NS, isActivePlayer, effect, heldItem, inventory } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { dealDamage, onBeforeHurt } from "../core/damage.js";
import { castAs } from "../abilities/registry.js";
import { healTarget } from "../abilities/engine.js";

const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const nextAct = new Map(); // entidade -> tick da próxima ação
const fleeing = new Map();
const cervoCd = new Map();

function difficultyMult() {
  try {
    const d = String(world.getDifficulty());
    return d === "Easy" || d === "easy" ? 0.7 : d === "Hard" || d === "hard" ? 1.3 : 1;
  } catch {
    return 1;
  }
}

function visibleTarget(mob, range) {
  let best;
  let bestD = range;
  for (const p of mob.dimension.getPlayers({ location: mob.location, maxDistance: range })) {
    if (!isActivePlayer(p)) continue;
    const d = V.dist(p.location, mob.location);
    if (d >= bestD) continue;
    const from = mob.getHeadLocation();
    const to = p.getHeadLocation();
    const dir = V.norm(V.sub(to, from));
    try {
      const b = mob.dimension.getBlockFromRay(from, dir, { maxDistance: d, includePassableBlocks: false, includeLiquidBlocks: false });
      if (b) continue;
    } catch { /* */ }
    best = p;
    bestD = d;
  }
  return best;
}

function setAnim(e, v) {
  try { e.setProperty(`${NS}:anim`, v); } catch { /* */ }
}

// ------------------------------------------------------------------ Goblin Xamã: bola de fogo e cura dos aliados
function shamanTick(mob) {
  if ((nextAct.get(mob.id) || 0) > tick()) return;
  const target = visibleTarget(mob, 18);
  if (!target) return;
  const dist = V.dist(target.location, mob.location);
  if (dist < 3) return;
  nextAct.set(mob.id, tick() + 50 + Math.floor(Math.random() * 30));
  const hurtAlly = mob.dimension.getEntities({ location: mob.location, maxDistance: 8, families: ["goblin"] })
    .find((g) => g.id !== mob.id && hpPct(g) < 0.6);
  setAnim(mob, 1);
  particle(mob.dimension, "cor_circulo_magico", mob.location, { color: hurtAlly ? "nature" : "fire", radius: 1 });
  sound(mob.dimension, "mob.evocation_illager.prepare_attack", mob.location, 1.5, 0.8);
  system.runTimeout(() => {
    if (!ok(mob)) return;
    if (hurtAlly && ok(hurtAlly)) castAs(mob, "goblin_cura", 1);
    else if (ok(target)) castAs(mob, "goblin_fogo", difficultyMult(), { target });
    system.runTimeout(() => ok(mob) && setAnim(mob, 0), 10);
  }, 14);
}

// ------------------------------------------------------------------ Espectro: dreno de vida canalizado e piscar
function wraithTick(mob) {
  if ((nextAct.get(mob.id) || 0) > tick()) return;
  const target = visibleTarget(mob, 10);
  if (!target || !chance(0.45)) return;
  nextAct.set(mob.id, tick() + 120);
  setAnim(mob, 1);
  sound(mob.dimension, "mob.vex.charge", mob.location, 0.6, 1);
  let n = 0;
  const run = system.runInterval(() => {
    if (!ok(mob) || !ok(target) || ++n > 6 || V.dist(mob.location, target.location) > 12) {
      system.clearRun(run);
      if (ok(mob)) setAnim(mob, 0);
      return;
    }
    line(mob.dimension, V.up(target.location, 1), mob.getHeadLocation(), "cor_ponto", { color: { red: 0.6, green: 0.95, blue: 1 } }, 0.5);
    const dmg = dealDamage(mob, target, 1.5 * difficultyMult(), "dark", { kind: "dot" });
    healTarget(mob, mob, dmg);
  }, 6);
}

function wraithBlink(mob) {
  const target = visibleTarget(mob, 16);
  if (!target) return;
  const behind = V.add(target.location, V.mul(V.flat(target.getViewDirection()), -2.2));
  particle(mob.dimension, "sombra_explosao", V.up(mob.location, 1), { radius: 0.6 });
  try { mob.teleport(V.up(behind, 1), { checkForBlocks: true }); } catch { /* */ }
  particle(mob.dimension, "sombra_explosao", V.up(behind, 1), { radius: 0.6 });
  sound(mob.dimension, "mob.endermen.portal", behind, 0.6, 0.7);
}

// ------------------------------------------------------------------ Goblin: foge quando ferido e volta depois
function goblinHurt(mob) {
  if (fleeing.has(mob.id) || hpPct(mob) > 0.3) return;
  fleeing.set(mob.id, tick());
  try { mob.triggerEvent("valdoria:flee"); } catch { /* */ }
  sound(mob.dimension, "mob.vindicator.hurt", mob.location, 1.9, 1);
  system.runTimeout(() => {
    fleeing.delete(mob.id);
    if (ok(mob)) try { mob.triggerEvent("valdoria:fight"); } catch { /* */ }
  }, 100);
}

// ------------------------------------------------------------------ Cervo Mágico: bênção com cenoura dourada
function feedCervo(player, cervo) {
  const it = heldItem(player);
  if (!it || it.typeId !== "minecraft:golden_carrot") return false;
  const last = cervoCd.get(cervo.id) || -1e9;
  if (tick() - last < 6000) {
    player.onScreenDisplay.setActionBar("§7O cervo ainda está recuperando sua magia...");
    return true;
  }
  cervoCd.set(cervo.id, tick());
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  if (it.amount > 1) {
    it.amount -= 1;
    inv.setItem(slot, it);
  } else inv.setItem(slot, undefined);
  effect(player, "regeneration", 600, 0, true);
  effect(player, "speed", 600, 0, true);
  player.dimension.spawnItem(new ItemStack(`${NS}:essencia_natural`, 1), cervo.location);
  particle(cervo.dimension, "natureza_explosao", V.up(cervo.location, 1.5), { radius: 1.5 });
  particle(cervo.dimension, "fada_brilho", V.up(cervo.location, 2));
  sound(cervo.dimension, "random.orb", cervo.location, 1.3, 1);
  player.onScreenDisplay.setActionBar("§aO Cervo Mágico abençoa você com a força da floresta.");
  return true;
}

// ------------------------------------------------------------------ Chefe Goblin: grito de guerra e salto esmagador
function chiefTick(mob) {
  if (!ok(mob)) return;
  const now = tick();
  if ((nextAct.get(mob.id) || 0) > now) return;
  const target = visibleTarget(mob, 14);
  if (!target) return;
  const d = V.dist(target.location, mob.location);
  const allies = mob.dimension.getEntities({ location: mob.location, maxDistance: 12, families: ["goblin"] }).filter((e) => e.id !== mob.id);
  if (allies.length && (chance(0.35) || hpPct(mob) < 0.5)) {
    try { mob.setProperty(`${NS}:anim`, 1); } catch { /* */ }
    sound(mob.dimension, "mob.ravager.roar", mob.location, 1.6, 1);
    particle(mob.dimension, "cor_anel", mob.location, { color: "fire", radius: 4 });
    for (const g of allies.concat([mob])) {
      effect(g, "strength", 200, 0, true);
      effect(g, "speed", 200, 0, true);
      particle(g.dimension, "brasas", V.up(g.location, 1));
    }
    system.runTimeout(() => { try { mob.setProperty(`${NS}:anim`, 0); } catch { /* */ } }, 30);
    nextAct.set(mob.id, now + 360);
    return;
  }
  if (d >= 4 && d <= 11 && mob.isOnGround) {
    try { mob.setProperty(`${NS}:anim`, 2); } catch { /* */ }
    const aim = { ...target.location };
    particle(mob.dimension, "alerta_area", aim, { radius: 2.2 });
    const dir = V.flat(V.sub(aim, mob.location));
    try { mob.applyImpulse({ x: dir.x * Math.min(1.4, d * 0.13), y: 0.62, z: dir.z * Math.min(1.4, d * 0.13) }); } catch { /* */ }
    let n = 0;
    const run = system.runInterval(() => {
      n++;
      if (!ok(mob) || n > 40) return system.clearRun(run);
      if (n < 5 || !mob.isOnGround) return;
      system.clearRun(run);
      particle(mob.dimension, "onda_choque", mob.location, { radius: 1.4 });
      particle(mob.dimension, "poeira", mob.location, { radius: 2 });
      sound(mob.dimension, "mace.heavy_smash_ground", mob.location, 1.2, 1);
      for (const p of mob.dimension.getPlayers({ location: mob.location, maxDistance: 2.8 })) {
        if (!isActivePlayer(p)) continue;
        dealDamage(mob, p, 7 * difficultyMult(), "physical", { kind: "weapon" });
        effect(p, "slowness", 40, 1);
      }
      try { mob.setProperty(`${NS}:anim`, 0); } catch { /* */ }
    }, 1);
    nextAct.set(mob.id, now + 140);
    return;
  }
  nextAct.set(mob.id, now + 40);
}

export function startCreatures() {
  system.runInterval(() => {
    for (const id of DIMS) {
      let dim;
      try { dim = world.getDimension(id); } catch { continue; }
      for (const mob of dim.getEntities({ type: `${NS}:goblin_xama` })) shamanTick(mob);
      for (const mob of dim.getEntities({ type: `${NS}:espectro` })) wraithTick(mob);
      for (const mob of dim.getEntities({ type: `${NS}:chefe_goblin` })) chiefTick(mob);
    }
  }, 20);
  world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    if (!ok(e)) return;
    if (e.typeId === `${NS}:goblin`) goblinHurt(e);
    else if (e.typeId === `${NS}:espectro` && chance(0.22)) wraithBlink(e);
    else if (e.typeId === `${NS}:cervo_magico`) particle(e.dimension, "fada_brilho", V.up(e.location, 1.5));
  });
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    if (ev.target.typeId !== `${NS}:cervo_magico`) return;
    if (ev.itemStack?.typeId !== "minecraft:golden_carrot") return;
    ev.cancel = true;
    const p = ev.player;
    const t = ev.target;
    system.run(() => ok(p) && ok(t) && feedCervo(p, t));
  });
  world.afterEvents.entityDie.subscribe((ev) => {
    nextAct.delete(ev.deadEntity.id);
    fleeing.delete(ev.deadEntity.id);
  });
  // entidades que descarregam sem morrer deixavam entradas para sempre nestes mapas
  system.runInterval(() => {
    const now = tick();
    for (const [id, t] of nextAct) if (t < now - 2400) nextAct.delete(id);
    for (const [id, t] of fleeing) if (t < now - 2400) fleeing.delete(id);
    for (const [id, t] of cervoCd) if (t < now - 12000) cervoCd.delete(id);
  }, 2400);
}

export { onBeforeHurt };
