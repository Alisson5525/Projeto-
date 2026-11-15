// Passivas raciais contínuas: ciclos de dia/noite, afinidade regional, pulo duplo das fadas, auras visuais.
import { world, system, InputButton, ButtonState, MoonPhase, EquipmentSlot } from "@minecraft/server";
import { V, effect, heal, tick, equipment } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { getData } from "../core/store.js";
import { addBuff, hasBuff, stats } from "./stats.js";
import { RACAS } from "../data/races.js";
import { currentBiome } from "./progression.js";

function isNight() {
  const t = world.getTimeOfDay();
  return t >= 13000 && t <= 23000;
}

function underSky(player) {
  try {
    if (player.dimension.id !== "minecraft:overworld") return false;
    const top = player.dimension.getTopmostBlock({ x: player.location.x, z: player.location.z });
    return !top || top.location.y < player.getHeadLocation().y;
  } catch {
    return false;
  }
}

function keep(player, id, amp, min = 220, dur = 420) {
  const e = player.getEffect(id);
  if (!e || e.amplifier !== amp || e.duration < min) effect(player, id, dur, amp, false);
}

const affinityNotified = new Map();
const airJumps = new Map();

function passiveTick(player) {
  const d = getData(player);
  const race = d.raca;
  if (!race) return;
  const R = RACAS[race];
  const night = isNight();
  // afinidade regional
  const biome = currentBiome.get(player.id) || "";
  const inHome = R.biomas.some((k) => biome.includes(k)) || (race === "anao" && player.location.y < 40);
  if (inHome) {
    addBuff(player, "afinidade", 50, { melee: 0.05, spell: 0.05, regen: race === "elfo" ? 0.5 : 0.25 }, "Afinidade Regional");
    if (affinityNotified.get(player.id) !== biome) {
      affinityNotified.set(player.id, biome);
      player.onScreenDisplay.setActionBar(`${R.cor}Afinidade regional: ${R.regiao} §7(+5% dano, +regeneração)`);
    }
  } else affinityNotified.delete(player.id);

  switch (race) {
    case "elfo":
      keep(player, "night_vision", 0);
      break;
    case "anao":
      if (player.location.y < 40) keep(player, "haste", 0, 60, 100);
      if (player.getEffect("poison")) player.removeEffect("poison");
      break;
    case "orc": {
      const h = player.getComponent("minecraft:health");
      if (h && h.currentValue / h.effectiveMax < 0.4) particle(player.dimension, "cor_aura", V.up(player.location, 1), { color: "red" });
      break;
    }
    case "vampiro":
      if (night) {
        keep(player, "speed", 0, 60, 100);
        keep(player, "strength", 0, 60, 100);
        keep(player, "night_vision", 0);
      } else if (underSky(player) && !equipment(player, EquipmentSlot.Head)) {
        effect(player, "weakness", 60, 0);
        effect(player, "slowness", 60, 0);
        if (tick() % 60 < 20) {
          player.setOnFire(2, true);
          player.onScreenDisplay.setActionBar("§cO sol queima sua pele! Use um elmo ou busque sombra.");
        }
      }
      break;
    case "draconiano":
      try { player.extinguishFire(false); } catch { /* */ }
      break;
    case "demonio":
      if (player.dimension.id === "minecraft:nether" && tick() % 80 < 20) heal(player, 1);
      break;
    case "celestial":
      if (!night && underSky(player) && tick() % 80 < 20) heal(player, 1);
      break;
    case "licantropo": {
      if (night) {
        keep(player, "speed", 0, 60, 100);
        const full = world.getMoonPhase() === MoonPhase.FullMoon;
        addBuff(player, "lua", 50, { melee: full ? 0.2 : 0.1 }, full ? "Lua Cheia" : "Noite");
        if (full && tick() % 80 < 20) heal(player, 1);
      }
      break;
    }
  }
  // auras visuais
  if (R.aura && !hasBuff(player, "imune")) {
    const [name, color] = R.aura;
    const loc = name === "halo" ? V.up(player.getHeadLocation(), 0.55) : V.up(player.location, 1);
    particle(player.dimension, name, loc, color ? { color } : {});
  }
}

function fairyJump(player) {
  if (getData(player).raca !== "fada" || player.isOnGround) return;
  const n = airJumps.get(player.id) || 0;
  if (n >= 1) return;
  airJumps.set(player.id, n + 1);
  try {
    const v = player.getVelocity();
    player.applyKnockback({ x: v.x * 1.5, z: v.z * 1.5 }, 0.62);
  } catch { /* */ }
  particle(player.dimension, "fada_brilho", player.location);
  sound(player.dimension, "mob.allay.idle", player.location, 1.6, 0.5);
}

export function startPassives() {
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try { passiveTick(p); } catch (e) { console.warn(`[Valdoria] passiva: ${e}`); }
    }
  }, 20);
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      if (p.isOnGround) airJumps.delete(p.id);
      if (getData(p).raca === "fada" && p.isSneaking && p.isFalling) effect(p, "slow_falling", 10, 0, false);
    }
  }, 2);
  world.afterEvents.playerButtonInput.subscribe((ev) => {
    if (ev.button === InputButton.Jump && ev.newButtonState === ButtonState.Pressed && !ev.player.isSneaking) fairyJump(ev.player);
  });
}

export { stats };
