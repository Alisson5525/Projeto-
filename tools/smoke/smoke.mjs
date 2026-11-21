// End-to-end smoke test: loads the real add-on scripts against the mock engine
// and plays through every major feature. Run: node --import ./loader.mjs smoke.mjs
import { world, system, harness, log, ItemStack, GameMode, early } from "@minecraft/server";
import { answers, shown } from "@minecraft/server-ui";

const errors = [];
const origWarn = console.warn;
console.warn = (...a) => { errors.push(a.join(" ")); };
process.on("unhandledRejection", (e) => errors.push("unhandled: " + (e?.stack || e)));

const BP = "../../addon/behavior_pack/scripts";
const { DEBUG } = await import(`${BP}/core/util.js`);
DEBUG.on = true;
await import(`${BP}/main.js`);
// Startup + one tick in early execution must not touch the world.
system.beforeEvents.startup.fire({ blockComponentRegistry: { registerCustomComponent() {} }, itemComponentRegistry: { registerCustomComponent() {} } });
early.on = false;
const data = await import(`${BP}/core/data.js`);
const skills = await import(`${BP}/systems/skills.js`);
const factions = await import(`${BP}/systems/factions.js`);

let passed = 0;
function check(cond, label) {
  if (!cond) errors.push("CHECK FAILED: " + label);
  else passed++;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

// --- Startup: custom components registered ------------------------------------------------
const registered = {};
system.beforeEvents.startup.fire({ blockComponentRegistry: { registerCustomComponent: (n, c) => { registered[n] = c; } }, itemComponentRegistry: { registerCustomComponent() {} } });
check(Object.keys(registered).length === 10, "10 block components registered (" + Object.keys(registered).length + ")");

// --- Join: starter book ----------------------------------------------------------------------
const { overworld, Player, Entity, Block } = harness;
const p = new Player("Alex", overworld);
world.afterEvents.playerSpawn.fire({ player: p, initialSpawn: true });
harness.step(2);
check(p.hasTag("recebeuLivro"), "starter book given");
check(p._inv.slots.some((s) => s?.typeId === "sunrise:vampire_craft_book"), "book in inventory");

// --- Codex navigation ----------------------------------------------------------------------
answers.push({ canceled: false, selection: 1 }, { canceled: false, selection: 0 }, { canceled: false, selection: 0 });
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:vampire_craft_book"), source: p });
for (let i = 0; i < 5; i++) await flush();
check(shown.length >= 3, "codex → topic → page shown (" + shown.length + ")");

// --- Infection via vampire tooth, then milk cure ------------------------------------------------
p._inv.setItem(5, new ItemStack("sunrise:vampire_tooth", 2));
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:vampire_tooth"), source: p });
check(factions.infectionLeft(p)?.type === "vampire", "infected by tooth");
check(p._inv.getItem(5).amount === 1, "tooth consumed");
harness.step(40);
check(p.actionbar !== undefined, "HUD shows infection timer");
world.afterEvents.itemCompleteUse.fire({ itemStack: new ItemStack("minecraft:milk_bucket"), source: p });
check(!factions.infectionLeft(p), "milk cures infection");

// Infection completes into a vampire.
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:vampire_tooth"), source: p });
harness.step(6100);
check(data.isVampire(p), "became vampire after infection");
check(p._inv.slots.some((s) => s?.typeId === "sunrise:vampire_skill_item"), "vampire skill item given");
check(p._equip.Head?.typeId?.startsWith("sunrise:trans_vamp_player_eye"), "vampire eyes on head");

// Taking the eyes off keeps them off (so a helmet can be worn).
p._equip.Head = undefined;
harness.step(20);
check(!p._equip.Head, "removed eyes stay removed");
p._equip.Head = new ItemStack("minecraft:iron_helmet");
harness.step(20);
check(p._equip.Head.typeId === "minecraft:iron_helmet", "helmet kept");
p._equip.Head = undefined;
answers.push({ canceled: false, selection: 1 });
p._inv.setItem(9, new ItemStack("sunrise:change_stone", 1));
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:change_stone"), source: p });
for (let i = 0; i < 4; i++) await flush();
harness.step(20);
check(p._equip.Head?.typeId === "sunrise:trans_vamp_player_eye2", "change stone re-applies eyes");

// --- Sun burns (day, open sky) ---------------------------------------------------------------
log.calls.length = 0;
harness.setTime(6000);
harness.step(80);
check(log.calls.some((c) => c[0] === "fire" && c[1] === "minecraft:player"), "vampire burns in the sun");
overworld.roofY = 80; // under a roof
log.calls.length = 0;
harness.step(60);
check(!log.calls.some((c) => c[0] === "fire"), "no burning under a roof");

// --- Bite: sneak + hit a cow --------------------------------------------------------------------
data.setBlood(p, 5);
const cow = new Entity("minecraft:cow", overworld, { x: 0, y: 64, z: 2 }, ["cow", "mob"]);
p.isSneaking = true;
world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: cow });
check(data.getBlood(p) === 8, "bite gives blood (" + data.getBlood(p) + ")");
check(data.getXp(p) > 0, "bite gives xp");
// Bottle collection.
harness.step(30);
p._inv.setItem(0, new ItemStack("minecraft:glass_bottle", 3));
world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: cow });
check(p._inv.slots.some((s) => s?.typeId === "sunrise:blood_bottle_1"), "bite fills a bottle");
p._inv.setItem(0, undefined);
p.isSneaking = false;
// Drink a bottle.
const before = data.getBlood(p);
world.afterEvents.itemCompleteUse.fire({ itemStack: new ItemStack("sunrise:blood_bottle_4"), source: p });
check(data.getBlood(p) === Math.min(20, before + 12), "blood bottle restores blood");

// --- Leveling + altar unlock + every vampire skill -------------------------------------------------
factions.grantXp(p, 5000);
check(data.getLevel(p) === 10, "level 10 reached");
p._gm = GameMode.Creative; // pay nothing
for (const s of skills.SKILLS.vampire) {
  const out = skills.tryUnlock(p, "vampire", s.id);
  check(out === "vc.skill.unlocked", "unlock " + s.id + " → " + out);
}
p._gm = GameMode.Survival;
data.setBlood(p, 20);
const target = new Entity("minecraft:zombie", overworld, { x: 0, y: 64, z: 3 }, ["zombie", "monster", "undead"]);
for (const s of skills.SKILLS.vampire.filter((x) => x.kind === "active")) {
  data.setBlood(p, 20);
  p.location = { x: 0, y: 64, z: 0 };
  const ok = skills.castSkill(p, s.id);
  check(ok, "cast vampire:" + s.id);
  harness.step(5);
}
check(p.hasTag("vc_bat_form"), "bat form active");
p.isJumping = true; p.isOnGround = false;
log.calls.length = 0;
harness.step(3);
check(log.calls.some((c) => c[0] === "kb"), "bat flight applies knockback");
p.isJumping = false; p.isOnGround = true;
skills.castSkill(p, "fly"); // still on cooldown
harness.step(80);
check(skills.castSkill(p, "fly"), "leave bat form");
check(!p.hasTag("vc_bat_form"), "bat form ended");
harness.step(600); // servant bats despawn etc.

// Quick-cast: sneak + use item.
skills.setSelected(p, "regeneration");
harness.step(800);
p.isSneaking = true;
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:vampire_skill_item"), source: p });
p.isSneaking = false;
check(skills.cooldownLeft(p, "regeneration") > 0, "quick-cast works");

// Skill menu via item.
answers.push({ canceled: false, selection: 0 });
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:vampire_skill_item"), source: p });
await flush(); await flush();

// --- Blocks -----------------------------------------------------------------------------------------
const altar = new Block(overworld, { x: 5, y: 64, z: 5 }, "sunrise:blood_altar", { "sunrise:blood_altar_level": 0 });
p.selectedSlotIndex = 0;
p._inv.setItem(0, new ItemStack("sunrise:blood_bottle_4", 10));
for (let i = 0; i < 10; i++) registered["sunrise:blood_altar_component"].onPlayerInteract({ block: altar, player: p, dimension: overworld }, {});
check(altar._states["sunrise:blood_altar_level"] === 10, "altar filled to 10");
p._inv.setItem(0, new ItemStack("sunrise:vampire_tooth", 1));
registered["sunrise:blood_altar_component"].onPlayerInteract({ block: altar, player: p, dimension: overworld }, {});
harness.step(60);
await flush();
check(altar._states["sunrise:blood_altar_level"] === 0, "altar consumed and reset");

p._inv.setItem(0, new ItemStack("sunrise:vampire_sword_e", 1));
p._inv.setItem(1, new ItemStack("sunrise:liver", 4));
registered["sunrise:recharging_altar_component"].onPlayerInteract({ block: altar, player: p, dimension: overworld }, {});
check(p._inv.getItem(0)?.typeId === "sunrise:vampire_sword", "recharging altar restores sword");

p._inv.setItem(2, new ItemStack("minecraft:beef", 4));
p._inv.setItem(3, new ItemStack("minecraft:glass_bottle", 1));
registered["sunrise:meat_grinder"].onPlayerInteract({ block: altar, player: p, dimension: overworld }, {});
check(p._inv.slots.some((s) => s?.typeId === "sunrise:blood_bottle_4" && s.amount >= 1), "meat grinder makes blood");

const crop = new Block(overworld, { x: 6, y: 64, z: 5 }, "thini:garlic_crop", { "thini:growth_stage": 0 });
for (let i = 0; i < 30; i++) registered["thini:crop"].onRandomTick({ block: crop, dimension: overworld }, {});
check(crop._states["thini:growth_stage"] === 3, "garlic grows");
const coffin = new Block(overworld, { x: 7, y: 64, z: 5 }, "sunrise:caixao_oak");
registered["sunrise:put_support_coffin_collision_up"].onPlace({ block: coffin, dimension: overworld }, {});
harness.setTime(6000);
registered["sunrise:sleep_coffin"].onPlayerInteract({ block: coffin, player: p, dimension: overworld }, {});
harness.step(45);
check(world.getTimeOfDay() === 13000, "coffin skips the day");
registered["sunrise:summon_hunters_component"].onRandomTick({ block: coffin, dimension: overworld }, {});

// Fallback: the engine doesn't fire the component → player events do the work, once.
const altar2 = new Block(overworld, { x: 9, y: 64, z: 9 }, "sunrise:blood_altar", { "sunrise:blood_altar_level": 0 });
p._inv.setItem(0, new ItemStack("sunrise:blood_bottle_4", 5));
world.beforeEvents.playerInteractWithBlock.fire({ player: p, block: altar2, isFirstEvent: true, itemStack: p._inv.getItem(0) });
harness.step(2);
check(altar2._states["sunrise:blood_altar_level"] === 1, "altar works through the event fallback");
world.beforeEvents.playerInteractWithBlock.fire({ player: p, block: altar2, isFirstEvent: true, itemStack: p._inv.getItem(0) });
registered["sunrise:blood_altar_component"].onPlayerInteract({ block: altar2, player: p, dimension: overworld }, {});
harness.step(2);
check(altar2._states["sunrise:blood_altar_level"] === 2, "no double handling when the component also fires (" + altar2._states["sunrise:blood_altar_level"] + ")");
const coffin2 = new Block(overworld, { x: 12, y: 64, z: 5 }, "sunrise:caixao_birch");
log.calls.length = 0;
world.afterEvents.playerPlaceBlock.fire({ block: coffin2, player: p, dimension: overworld });
world.afterEvents.playerBreakBlock.fire({ block: coffin2, player: p, dimension: overworld, brokenBlockPermutation: { type: { id: "sunrise:caixao_birch" } } });

// --- Cure ---------------------------------------------------------------------------------------------
world.afterEvents.itemCompleteUse.fire({ itemStack: new ItemStack("sunrise:vampire_cure"), source: p });
check(!data.isVampire(p), "vampire cure works");
check(!p._inv.slots.some((s) => s?.typeId === "sunrise:vampire_skill_item"), "skill item removed on cure");

// --- Werewolf --------------------------------------------------------------------------------------------
factions.become(p, "werewolf");
check(data.isWerewolf(p), "became werewolf");
harness.setTime(6000);
harness.step(20);
harness.setTime(14000); // dusk
harness.step(20);
check(p.hasTag("vc_wolf_form"), "transforms at dusk");
check(p._equip.Head?.typeId === "sunrise:trans_lob", "wolf body on head");
factions.grantXp(p, 5000);
check(data.getWolfTier(p) === 3, "tier III at level 10");
harness.step(20);
check(p._equip.Head?.typeId === "sunrise:trans_lob_black", "tier III body");
p._gm = GameMode.Creative;
for (const s of skills.SKILLS.werewolf) skills.tryUnlock(p, "werewolf", s.id);
p._gm = GameMode.Survival;
for (const s of skills.SKILLS.werewolf.filter((x) => x.kind === "active" && x.id !== "transform")) {
  check(skills.castSkill(p, s.id), "cast werewolf:" + s.id);
  harness.step(15);
}
world.afterEvents.entityHitEntity.fire({ damagingEntity: p, hitEntity: target });
const wolfMob = new Entity("sunrise:black_werewolf", overworld, { x: 1, y: 64, z: 1 }, ["lobisomem", "monster"]);
world.afterEvents.entityDie.fire({ deadEntity: wolfMob, damageSource: { damagingEntity: p, cause: "entityAttack" } });
harness.setTime(23500); // dawn
harness.step(20);
check(!p.hasTag("vc_wolf_form") || skills.hasSkill(p, "suntransform"), "dawn handling");
factions.cure(p);

// --- Hunter ------------------------------------------------------------------------------------------------
p._inv.setItem(4, new ItemStack("sunrise:garlic_syringe", 1));
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:garlic_syringe"), source: p });
harness.step(6100);
check(data.isHunter(p), "became hunter via syringe");
const vamp = new Entity("sunrise:weak_vampire", overworld, { x: 0, y: 64, z: 2 }, ["vampiro", "undead", "monster"]);
for (let i = 0; i < 3; i++) world.afterEvents.entityDie.fire({ deadEntity: vamp, damageSource: { damagingEntity: p, cause: "entityAttack" } });
check(data.getLevel(p) === 2, "kill mission completed → rank 2 (" + data.getLevel(p) + ")");
world.afterEvents.entityHurt.fire({ hurtEntity: vamp, damageSource: { damagingEntity: p, cause: "entityAttack" }, damage: 4 });
check(log.calls.some((c) => c[0] === "damage" && c[1] === "sunrise:weak_vampire"), "hunter bonus damage");
// Train a stat, deliver mission.
answers.push({ canceled: false, selection: 1 }, { canceled: false, selection: 0 }, { canceled: false, selection: 3 }, { canceled: true });
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:hunter_skill_item"), source: p });
for (let i = 0; i < 10; i++) await flush();
p._inv.setItem(6, new ItemStack("sunrise:vampire_tooth", 5));
const hunter = await import(`${BP}/systems/hunter.js`);
check(hunter.deliverMission(p) === "vc.hunter.delivered", "deliver mission");
p._inv.setItem(7, new ItemStack("minecraft:arrow", 5));
world.afterEvents.itemUse.fire({ itemStack: new ItemStack("sunrise:hunter_bow"), source: p });
check(log.calls.some((c) => c[0] === "shoot"), "hunter bow shoots");
factions.grantXp(p, 0);
data.setLevel(p, 10);
for (const s of skills.SKILLS.hunter) { check(skills.castSkill(p, s.id), "cast hunter:" + s.id); harness.step(10); }
harness.step(400);

// --- Blood moon + admin + migration -----------------------------------------------------------------------
system.afterEvents.scriptEventReceive.fire({ id: "vc:bloodmoon", message: "on", sourceEntity: p });
harness.setTime(15000);
harness.step(50);
system.afterEvents.scriptEventReceive.fire({ id: "vc:become", message: "vampire", sourceEntity: p });
check(data.isVampire(p), "scriptevent become");
system.afterEvents.scriptEventReceive.fire({ id: "vc:level", message: "7", sourceEntity: p });
check(data.getLevel(p) === 7, "scriptevent level");
harness.setTime(3000);
harness.step(50);

const old = new Player("Legacy", overworld);
["vampiro", "fly", "rage", "teleport", "emuso_rage", "eye2"].forEach((t) => old.addTag(t));
world.afterEvents.playerSpawn.fire({ player: old, initialSpawn: true });
harness.step(3);
check(skills.hasSkill(old, "fly") && skills.hasSkill(old, "teleport"), "v4 skills migrated");
check(!old.hasTag("emuso_rage"), "v4 runtime tags cleaned");

// --- 5.1: diagnostics, drops, exploration --------------------------------------------------
check(old.messages.some((m) => JSON.stringify(m).includes("vc.diag.ok")), "load diagnostic says OK");
const { registry } = await import("@minecraft/server");
registry.items.delete("sunrise:blood_altar");
const p3 = new Player("Diag", overworld);
world.afterEvents.playerSpawn.fire({ player: p3, initialSpawn: true });
harness.step(3);
check(p3.messages.some((m) => JSON.stringify(m).includes("vc.diag.missing")), "diagnostic reports missing altar");
registry.items.add("sunrise:blood_altar");

log.calls.length = 0;
factions.become(p3, "vampire");
const villager = new Entity("minecraft:villager_v2", overworld, { x: 3, y: 64, z: 3 }, ["villager", "mob"]);
for (let i = 0; i < 20; i++) world.afterEvents.entityDie.fire({ deadEntity: villager, damageSource: { damagingEntity: p3, cause: "entityAttack" } });
check(log.calls.some((c) => c[0] === "drop" && c[1].includes("heart")), "villager drops hearts for vampires");

overworld.roofY = undefined;
p3.location = { x: 900, y: 63, z: 900 };
const before3 = overworld._entities.length;
harness.setTime(15000);
harness.step(20 * 60 * 6);
check(overworld._entities.length > before3 || [...(overworld._blocks?.values() ?? [])].some((b) => b.typeId === "minecraft:chest"), "an exploration encounter happened");

// --- 5.2: equal spawn rotation, gear, garlic, helmet restore ---------------------------------
const expl = await import(`${BP}/systems/exploration.js`);
const counts = {};
for (let i = 0; i < expl.NIGHT_ROTATION.length * 5; i++) { const id = expl.nextNightMob(); counts[id] = (counts[id] ?? 0) + 1; }
check(Object.values(counts).every((c) => c === 5) && Object.keys(counts).length === 8, "spawn rotation is perfectly equal " + JSON.stringify(counts));
const p4 = new Player("Gear", overworld);
world.afterEvents.playerSpawn.fire({ player: p4, initialSpawn: true });
harness.step(2);
p4._equip.Head = new ItemStack("sunrise:eclipse_armor_helmet"); p4._equip.Feet = new ItemStack("sunrise:eclipse_armor_boots");
p4._equip.Chest = new ItemStack("sunrise:sun_eclipse_armor_chestplate"); p4._equip.Legs = new ItemStack("sunrise:sun_eclipse_armor_leggings");
const gear = await import(`${BP}/systems/gear.js`);
check(gear.armorSet(p4) === "sun", "solar set detected");
harness.step(25);
check(!!p4.getEffect("fire_resistance"), "solar set gives fire resistance");
p4._health.currentValue = 10;
p4.selectedSlotIndex = 0;
p4._inv.setItem(0, new ItemStack("sunrise:vampire_sword"));
const z2 = new Entity("minecraft:zombie", overworld, { x: 0, y: 64, z: 1 }, ["zombie", "monster", "undead"]);
world.afterEvents.entityHitEntity.fire({ damagingEntity: p4, hitEntity: z2 });
check(p4._health.currentValue === 12, "vampiric sword steals life");
p4._inv.setItem(0, new ItemStack("sunrise:garlic"));
const v3m = new Entity("sunrise:weak_vampire", overworld, { x: 1, y: 64, z: 1 }, ["vampiro", "monster"]);
v3m.location = { ...p4.location, x: p4.location.x + 2 };
harness.step(25);
check(!!v3m.getEffect("weakness"), "garlic weakens nearby vampires");
// Helmet goes back on after bat form.
factions.become(p4, "vampire");
p4._inv.setItem(0, undefined);
p4._equip.Head = new ItemStack("minecraft:iron_helmet");
skills.grantSkill(p4, "fly", "vampire");
data.setLevel(p4, 5); data.setBlood(p4, 20);
check(skills.castSkill(p4, "fly"), "enter bat form with a helmet");
check(p4._equip.Head?.typeId === "sunrise:trans_bat", "bat head replaced helmet");
harness.step(80);
skills.castSkill(p4, "fly");
check(p4._equip.Head?.typeId === "minecraft:iron_helmet", "helmet restored after bat form (" + p4._equip.Head?.typeId + ")");

// Run a long stretch of world time with everything active.
p._inv.setItem(8, new ItemStack("sunrise:vampire_skill_item", 1));
harness.step(2400);
world.afterEvents.weatherChange.fire({ dimension: "minecraft:overworld", newWeather: "Rain", previousWeather: "Clear" });
harness.step(200);
world.afterEvents.playerLeave.fire({ playerId: old.id });

for (let i = 0; i < 10; i++) await flush();
const runtimeErrors = [...errors, ...log.errors.map((e) => "interval: " + (e.stack || e))];
console.warn = origWarn;
if (runtimeErrors.length) {
  console.log(runtimeErrors.join("\n"));
  console.log(`\n${passed} checks passed, ${runtimeErrors.length} problems`);
  process.exit(1);
}
console.log(`SMOKE OK — ${passed} checks passed, 0 runtime errors`);
