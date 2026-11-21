import { world, system, MoonPhase } from "@minecraft/server";
import { WDP } from "../core/config.js";
import { getSettings, isVampire, isWerewolf } from "../core/data.js";
import { safe, every, players, isNight, title, sound, effect, chance, msg, runCmd, randInt } from "../core/util.js";

// ---------------------------------------------------------------------------
// Blood Moon: a rare full-moon night. Red sky fog, stronger monsters and
// vampire ambushes; vampires and werewolves are empowered.
// ---------------------------------------------------------------------------

const FOG_ID = "sunrise:blood_moon_fog";
const FOG_USER = "vc_blood_moon";

export const bloodMoon = { active: false };

function dayNumber() {
  return Math.floor(world.getAbsoluteTime() / 24000);
}

function startBloodMoon() {
  bloodMoon.active = true;
  safe(() => world.setDynamicProperty(WDP.BLOOD_MOON_DAY, dayNumber()));
  for (const p of players()) {
    title(p, "vc.bloodmoon.title", "vc.bloodmoon.sub");
    sound(p, "mob.elderguardian.curse", 0.6, 0.5);
    sound(p, "ambient.weather.thunder", 0.6, 0.5);
    runCmd(p, `fog @s push ${FOG_ID} ${FOG_USER}`);
  }
}

function endBloodMoon() {
  if (!bloodMoon.active) return;
  bloodMoon.active = false;
  for (const p of players()) {
    runCmd(p, `fog @s remove ${FOG_USER}`);
    msg(p, "vc.bloodmoon.end");
  }
}

export function forceBloodMoon(on) {
  if (on) startBloodMoon();
  else endBloodMoon();
}

let decidedFor = -1;

every(40, () => {
  const s = getSettings();
  const night = isNight();
  const full = safe(() => world.getMoonPhase() === MoonPhase.FullMoon) ?? false;
  const day = dayNumber();

  if (!night) {
    endBloodMoon();
    return;
  }
  // Decide once per night whether this full moon is a blood moon.
  if (decidedFor !== day) {
    decidedFor = day;
    const resumed = safe(() => world.getDynamicProperty(WDP.BLOOD_MOON_DAY)) === day;
    if (s.bloodMoon && full && (resumed || chance(s.bloodMoonChance))) startBloodMoon();
  }
  if (!bloodMoon.active) return;

  const ow = world.getDimension("overworld");
  // Empower monsters and creatures of the night.
  for (const e of safe(() => ow.getEntities({ families: ["monster"] })) ?? []) {
    effect(e, "strength", 3, 0, false);
    effect(e, "speed", 3, 0, false);
  }
  for (const p of players()) {
    if (isVampire(p) || isWerewolf(p)) effect(p, "strength", 3, 1);
    // Late joiners / respawned players need the fog again.
    if (system.currentTick % 400 < 40) runCmd(p, `fog @s push ${FOG_ID} ${FOG_USER}`);
  }
}, "bloodMoon");

// Vampire ambushes during the blood moon (and rarely on normal nights).
every(600, () => {
  const s = getSettings();
  if (!s.mobAmbush || !isNight()) return;
  const odds = bloodMoon.active ? 70 : 6;
  for (const p of players()) {
    if (p.dimension.id !== "minecraft:overworld" || !chance(odds) || isVampire(p)) continue;
    safe(() => {
      const ang = Math.random() * Math.PI * 2;
      const dist = randInt(14, 22);
      const x = p.location.x + Math.cos(ang) * dist;
      const z = p.location.z + Math.sin(ang) * dist;
      const top = p.dimension.getTopmostBlock({ x, z });
      if (!top || top.isLiquid) return;
      const loc = { x: x, y: top.location.y + 1, z: z };
      const type = chance(25) ? "sunrise:vampire" : "sunrise:weak_vampire";
      p.dimension.spawnEntity(type, loc);
      p.dimension.spawnParticle("sunrise:transform_smoke", loc);
      if (bloodMoon.active) msg(p, "vc.bloodmoon.ambush");
    }, "ambush");
  }
}, "ambush");

// Vampire NPCs turning into bats (event fired from their behaviour JSON).
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
  if (eventId !== "sunrise:to_bat" && eventId !== "sunrise:from_bat") return;
  safe(() => {
    const l = entity.location;
    entity.dimension.spawnParticle("sunrise:transform_smoke", { x: l.x, y: l.y + 1, z: l.z });
    entity.dimension.playSound("mob.bat.takeoff", l, { volume: 1, pitch: eventId === "sunrise:to_bat" ? 0.8 : 1.2 });
    if (eventId === "sunrise:to_bat") entity.addTag("vc_bat_used");
  }, "vampireBat");
});
