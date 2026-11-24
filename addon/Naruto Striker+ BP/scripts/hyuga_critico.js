// scripts/all.js
import { cmd } from "./lib/cmd.js";
import {
  world,
  EntityDamageCause,
  MolangVariableMap,
  TicksPerSecond,
} from "@minecraft/server";

const CHANCE_HYUGA = 0.60;
const CHANCE_LEOES = 0.80;
const CHANCE_LEOES_DESTUIDOR = 0.90;
const DURATION = 2 * TicksPerSecond;

// alguns alvos (suportes, entidades de efeito) nao aceitam efeitos: nao deixa o erro
// interromper as particulas e sons do golpe
function efeitoSeguro(alvo, tipo, duracao, opcoes) {
  try { alvo.addEffect(tipo, duracao, opcoes); } catch (e) {}
}

world.afterEvents.entityHurt.subscribe((ev) => {
  const src = ev.damageSource;
  if (!src) return;

  if (src.cause !== EntityDamageCause.entityAttack) return;

  const attacker = src.damagingEntity;
  if (!attacker || !attacker.isValid) return;

  const target = ev.hurtEntity;
  if (!target || !target.isValid) return;

  // ================= HYUGA =================
  if (attacker.hasTag("skill_hyuga")) {
    if (Math.random() < CHANCE_HYUGA) {

      // 🔥 SUMMON PORCO
      try {
        cmd(target, "scoreboard players remove @s chakra 10");
      } catch (e) {
        console.warn("Erro ao spawnar porco:", e);
      }

      try {
        efeitoSeguro(target, "minecraft:slowness", DURATION, {
        amplifier: 2,
        showParticles: false,
        });
      } catch {}

      try {
        const molang = new MolangVariableMap();
        target.dimension.spawnParticle("tnt:critical_hit_hyuga", target.location, molang);
      } catch {}

      try {
        target.dimension.playSound("mob.evocation_illager.cast_spell", target.location, {
          volume: 1,
          pitch: 1.6,
        });
      } catch {}
    }
  }

  // ================= LEÃO GÊMEOS =================
  if (attacker.hasTag("leao_gemeos")) {
    if (Math.random() < CHANCE_LEOES) {

      try {
        cmd(target, "scoreboard players remove @s chakra 7");
      } catch {}

      try {
        efeitoSeguro(target, "minecraft:slowness", DURATION, {
        amplifier: 2,
        showParticles: false,
        });
      } catch {}

      try {
        const molang = new MolangVariableMap();
        target.dimension.spawnParticle("tnt:critical_hit_hyuga", target.location, molang);
      } catch {}

      try {
        target.dimension.playSound("mob.evocation_illager.cast_spell", target.location, {
          volume: 1,
          pitch: 1.1,
        });
      } catch {}
    }
  }

  // ================= LEÃO GÊMEOS DESTRUIDOR =================
  if (attacker.hasTag("leao_gemeos_destruidor")) {
    if (Math.random() < CHANCE_LEOES_DESTUIDOR) {

      try {
        cmd(target, "scoreboard players remove @s chakra 15");
      } catch {}

      try {
        efeitoSeguro(target, "minecraft:slowness", DURATION, {
        amplifier: 3,
        showParticles: false,
        });
      } catch {}

      try {
        const molang = new MolangVariableMap();
        target.dimension.spawnParticle("tnt:critical_hit_hyuga_roxo", target.location, molang);
      } catch {}

      try {
        target.dimension.playSound("mob.evocation_illager.cast_spell", target.location, {
          volume: 1,
          pitch: 1.1,
        });
      } catch {}
    }
  }
});