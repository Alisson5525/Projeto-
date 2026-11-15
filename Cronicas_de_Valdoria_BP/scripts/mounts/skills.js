// Passivas (enquanto montada) e habilidades (item de vínculo usado montado) de cada montaria.
import { system } from "@minecraft/server";
import { V, ok, tick, health, effect } from "../core/util.js";
import { particle, sound, anim, shake } from "../core/fx.js";
import { dealDamage, enemiesNear, alliesNear, addBleed } from "../core/damage.js";
import { knockFrom, launch } from "../abilities/engine.js";
import { stats } from "../rpg/stats.js";

const chargeUntil = new Map(); // montaria -> tick (Investida)
const hitCd = new Map(); // montaria:alvo -> tick
const nextAt = new Map(); // montaria:chave -> tick
const NEGATIVE = ["poison", "wither", "slowness", "weakness", "blindness", "darkness", "nausea", "hunger", "mining_fatigue", "fatal_poison"];

function every(e, key, ticks) {
  const k = `${e.id}:${key}`;
  if ((nextAt.get(k) || 0) > tick()) return false;
  nextAt.set(k, tick() + ticks);
  return true;
}
const fwdOf = (e) => V.flat(e.getViewDirection());
const meleeMult = (rider) => Math.max(1, stats(rider).melee || 1);
const nearestFront = (rider, e, dist, r) => enemiesNear(rider, V.add(e.location, V.mul(fwdOf(e), dist)), r, true)
  .sort((a, b) => V.dist(a.location, e.location) - V.dist(b.location, e.location));

// ------------------------------------------------------------------ passivas
export const PASSIVES = {
  cavalo(e, rider) {
    let vel = { x: 0, y: 0, z: 0 };
    try { vel = e.getVelocity(); } catch { /* */ }
    const hs = Math.hypot(vel.x, vel.z);
    const now = tick();
    const charging = (chargeUntil.get(e.id) || 0) > now;
    if (hs < (charging ? 0.12 : 0.24)) return;
    if (charging && now % 4 === 0) particle(e.dimension, "poeira", e.location, { radius: 1 });
    for (const t of enemiesNear(rider, V.add(e.location, V.mul(fwdOf(e), 1.6)), 1.9, true)) {
      const k = `${e.id}:${t.id}`;
      if ((hitCd.get(k) || 0) > now) continue;
      hitCd.set(k, now + 20);
      dealDamage(rider, t, (charging ? 9 : 4) * meleeMult(rider), "physical", { kind: "weapon" });
      knockFrom(t, e.location, charging ? 1.6 : 0.9, 0.35);
      sound(e.dimension, "mob.horse.gallop", t.location, 0.8, 1);
    }
  },
  lobo(e, rider) {
    const t = nearestFront(rider, e, 2.4, 2.2)[0];
    if (!t || !every(e, "mordida", 30)) return;
    anim(e, "animation.valdoria.lobo_gigante.mordida", 0.1);
    system.runTimeout(() => {
      if (!ok(e) || !ok(t) || !ok(rider)) return;
      dealDamage(rider, t, 6 * meleeMult(rider), "physical", { kind: "weapon" });
      addBleed(t, rider, 1.5, 3);
      sound(e.dimension, "mob.wolf.bark", t.location, 0.6, 1);
    }, 6);
  },
  alce() { /* passiva por componentes (salto, degraus, imune a queda) */ },
  dragao(e, rider) {
    effect(rider, "fire_resistance", 30, 0, false);
    try { if (rider.getComponent("minecraft:onfire")) rider.extinguishFire(false); } catch { /* */ }
  },
  urso(e, rider) {
    const ts = enemiesNear(rider, V.add(e.location, V.mul(fwdOf(e), 1.4)), 2.9, true);
    if (!ts.length || !every(e, "patada", 30)) return;
    anim(e, "animation.valdoria.urso_guerra.patada", 0.1);
    system.runTimeout(() => {
      if (!ok(e) || !ok(rider)) return;
      for (const t of ts) {
        if (!ok(t)) continue;
        dealDamage(rider, t, 7 * meleeMult(rider), "physical", { kind: "weapon" });
        knockFrom(t, e.location, 1.1, 0.3);
      }
      sound(e.dimension, "mob.polarbear.warning", e.location, 0.8, 0.8);
    }, 7);
  },
  unicornio(e, rider) {
    if (!every(e, "regen", 50)) return;
    effect(rider, "regeneration", 70, 0, true);
    particle(e.dimension, "fada_brilho", V.up(e.location, 2.2), {});
  },
  grifo() { /* voo pelos componentes; a queda planada ao desmontar é tratada em mounts.js */ },
};

// ------------------------------------------------------------------ habilidades
export const SKILLS = {
  cavalo(player, e) {
    effect(e, "speed", 80, 3);
    effect(player, "resistance", 80, 0);
    chargeUntil.set(e.id, tick() + 80);
    sound(e.dimension, "mob.horse.angry", e.location, 0.8, 1.4);
    sound(e.dimension, "horn.call.0", e.location, 1.1, 0.8);
    particle(e.dimension, "poeira", e.location, { radius: 2 });
    return "§6Investida! §fAtropele os inimigos à sua frente.";
  },
  lobo(player, e) {
    sound(e.dimension, "mob.hoglin.howl", e.location, 0.55, 1.6);
    sound(e.dimension, "mob.wolf.growl", e.location, 0.5, 1.4);
    particle(e.dimension, "onda_choque", e.location, { radius: 3 });
    let n = 0;
    for (const t of enemiesNear(player, e.location, 12, true)) {
      effect(t, "slowness", 120, 1);
      effect(t, "weakness", 120, 0);
      n++;
    }
    for (const a of alliesNear(player, e.location, 10)) if (a.typeId === "minecraft:player") effect(a, "strength", 160, 0, true);
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 14 })) shake(p, 0.15, 0.6);
    return `§bUivo do Alfa! §f${n} inimigo(s) acuado(s); aliados fortalecidos.`;
  },
  alce(player, e) {
    effect(e, "speed", 160, 1);
    effect(e, "jump_boost", 160, 1);
    effect(player, "speed", 160, 0, true);
    sound(e.dimension, "mob.goat.ambient", e.location, 0.5, 1.5);
    sound(e.dimension, "horn.call.4", e.location, 1, 0.8);
    particle(e.dimension, "vento_explosao", e.location, { radius: 2 });
    return "§aGalope do Norte! §fMais velocidade e saltos maiores por 8 s.";
  },
  urso(player, e) {
    sound(e.dimension, "mob.polarbear.warning", e.location, 0.5, 2);
    sound(e.dimension, "mob.ravager.roar", e.location, 1.2, 1);
    particle(e.dimension, "onda_choque", e.location, { radius: 4 });
    const mult = meleeMult(player);
    let n = 0;
    for (const t of enemiesNear(player, e.location, 8, true)) {
      dealDamage(player, t, 6 * mult, "physical", { kind: "skill" });
      effect(t, "slowness", 80, 1);
      knockFrom(t, e.location, 1.3, 0.35);
      n++;
    }
    effect(player, "resistance", 120, 0, true);
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 12 })) shake(p, 0.25, 0.8);
    return `§6Rugido de Guerra! §f${n} inimigo(s) atordoado(s); você fica mais resistente.`;
  },
  unicornio(player, e) {
    sound(e.dimension, "beacon.power", e.location, 1.5, 1.2);
    sound(e.dimension, "note.chime", e.location, 1.2, 1);
    particle(e.dimension, "sagrado_explosao", V.up(e.location, 1.5), { radius: 3 });
    particle(e.dimension, "sagrado_pilar", e.location, {});
    let n = 0;
    for (const a of alliesNear(player, e.location, 8).concat([player, e])) {
      const h = health(a);
      if (!h) continue;
      h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + h.effectiveMax * 0.3));
      for (const id of NEGATIVE) {
        try { a.removeEffect(id); } catch { /* */ }
      }
      n++;
    }
    for (const t of enemiesNear(player, e.location, 8, true)) {
      if (t.matches?.({ families: ["undead"] })) dealDamage(player, t, 8, "holy", { kind: "skill" });
    }
    return `§eBênção do Chifre! §f${n} aliado(s) curado(s) e purificado(s).`;
  },
  dragao(player, e) {
    sound(e.dimension, "mob.enderdragon.growl", e.location, 1.6, 1.2);
    sound(e.dimension, "mob.ghast.fireball", e.location, 0.7, 1.5);
    const st = stats(player);
    const mult = Math.max(1, st.melee || 1, st.spell || 1);
    const hit = new Map();
    let t = 0;
    const h = system.runInterval(() => {
      t++;
      if (t > 40 || !ok(e) || !ok(player)) {
        system.clearRun(h);
        return;
      }
      const dir = player.getViewDirection();
      const mouth = V.add(V.up(e.location, 1.3), V.mul(V.flat(dir), 2.4));
      if (t % 2 === 0) {
        for (let d = 1.5; d <= 11; d += 2.4) {
          const sp = V.rotY(dir, (Math.random() - 0.5) * 36);
          particle(e.dimension, "fogo_explosao", V.add(mouth, V.mul(sp, d)), { radius: 0.4 + d * 0.06 });
        }
      }
      if (t % 8 === 0) sound(e.dimension, "fire.fire", mouth, 0.8, 1.2);
      for (const tg of enemiesNear(player, V.add(mouth, V.mul(dir, 6)), 7, true)) {
        if (tg.id === e.id) continue;
        const to = V.sub(V.up(tg.location, 0.8), mouth);
        const dist = V.len(to);
        if (dist > 12 || V.dot(to, dir) < Math.cos((28 * Math.PI) / 180) * dist) continue;
        if ((hit.get(tg.id) || 0) > t) continue;
        hit.set(tg.id, t + 6);
        dealDamage(player, tg, 4 * mult, "fire", { kind: "skill" });
        try { tg.setOnFire(4, true); } catch { /* */ }
      }
    }, 1);
    return "§6Sopro de Fogo! §fMire com o olhar: as chamas seguem a sua visão por 2 segundos.";
  },
  grifo(player, e) {
    const fwd = player.getViewDirection();
    sound(e.dimension, "mob.phantom.swoop", e.location, 1.3, 1.2);
    sound(e.dimension, "mob.breeze.shoot", e.location, 1, 1);
    const from = V.add(V.up(e.location, 1.6), V.mul(V.flat(fwd), 1.5));
    for (const ang of [-12, 0, 12]) {
      launch(player, { from, dir: V.rotY(fwd, ang), speed: 1.0, radius: 0.7, element: "wind", damage: 8 * Math.max(1, stats(player).melee || 1),
        trail: "vento_rastro", impact: "vento_explosao", range: 30, area: true,
        onHit: (t) => ok(t) && knockFrom(t, e.location, 1.2, 0.3) });
    }
    return "§bRajada das Asas! §fTrês lâminas de vento à frente.";
  },
};

export function cleanupSkills() {
  const now = tick();
  for (const [k, t] of hitCd) if (t < now) hitCd.delete(k);
  for (const [k, t] of nextAt) if (t < now - 200) nextAt.delete(k);
}
