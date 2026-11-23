// IA ninja: Kawarimi no Jutsu (substituicao) para os ninjas do mundo e
// fase de furia para chefes (vida maxima >= 500) ao cair abaixo de 50% de vida.
import { world, system } from "@minecraft/server";
import { ehJogador, valido, particula, somArea, tremer, gravar, aleatorio } from "./util";
import { textoFlutuante } from "./combate";

/* ------------------------------------------------------------------ */
/* Kawarimi no Jutsu                                                   */
/* ------------------------------------------------------------------ */
const NINJAS = new Set([
  "tnt:ninja_folha_b", "tnt:ninja_folha_s", "tnt:ninja_areia_b", "tnt:ninja_areia_s",
  "tnt:uchiha_b", "tnt:uchiha_s", "tnt:espadachin_s", "tnt:espadachin_ss", "tnt:anbu",
]);
const CHANCE_KAWARIMI = 0.12;
const RECARGA_KAWARIMI = 200; // 10s por ninja
const ultimoKawarimi = new Map(); // entityId -> tick

function livre(dim, x, y, z) {
  try {
    const b = dim.getBlock({ x, y, z });
    return !!b && b.isAir;
  } catch {
    return false;
  }
}

function chao(dim, x, y, z) {
  try {
    const b = dim.getBlock({ x, y, z });
    return !!b && !b.isAir && !b.isLiquid;
  } catch {
    return false;
  }
}

/* Procura um ponto seguro atras do jogador (2 blocos de ar com chao embaixo). */
function pontoAtras(player) {
  const dim = player.dimension;
  const v = player.getViewDirection();
  const h = Math.hypot(v.x, v.z) || 1;
  const dx = -v.x / h, dz = -v.z / h;
  const base = player.location;
  for (const dist of [2.2, 1.6, 3]) {
    const x = Math.floor(base.x + dx * dist);
    const z = Math.floor(base.z + dz * dist);
    for (const oy of [0, 1, -1]) {
      const y = Math.floor(base.y) + oy;
      if (livre(dim, x, y, z) && livre(dim, x, y + 1, z) && chao(dim, x, y - 1, z)) {
        return { x: x + 0.5, y, z: z + 0.5 };
      }
    }
  }
  return undefined;
}

world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const ninja = ev.hurtEntity;
    if (!valido(ninja) || !NINJAS.has(ninja.typeId)) return;
    const player = ev.damageSource?.damagingEntity;
    if (!ehJogador(player)) return;
    if (player.dimension.id !== ninja.dimension.id) return;

    const agora = system.currentTick;
    if (agora - (ultimoKawarimi.get(ninja.id) ?? -9999) < RECARGA_KAWARIMI) return;

    const vida = ninja.getComponent("health");
    if (!vida || vida.currentValue <= 0) return;
    if (Math.random() >= CHANCE_KAWARIMI) return;

    const destino = pontoAtras(player);
    if (!destino) return;
    ultimoKawarimi.set(ninja.id, agora);

    const dim = ninja.dimension;
    const origem = ninja.location;
    // fumaca onde estava + tronco "substituto" (folhas/detritos)
    particula(dim, "tnt:ns_fumaca_ninja", origem);
    particula(dim, "tnt:ns_detritos", origem);
    somArea(dim, "mob.endermen.portal", origem, 0.7, 1.6);
    textoFlutuante(dim, { x: origem.x, y: origem.y + 2.2, z: origem.z }, "§7§oKawarimi!");

    system.runTimeout(() => {
      try {
        if (!valido(ninja) || !valido(player)) return;
        ninja.teleport(destino, { facingLocation: player.location });
        particula(dim, "tnt:ns_fumaca_ninja", destino);
        somArea(dim, "mob.endermen.portal", destino, 0.7, 1.3);
        tremer(player, 0.1, 0.2);
      } catch {}
    }, 3);
  } catch {}
});

/* ------------------------------------------------------------------ */
/* Furia dos chefes                                                    */
/* ------------------------------------------------------------------ */
const enfurecidos = new Set(); // ids com aura ativa

function nomeChefe(ent) {
  try {
    const n = ent.nameTag;
    if (n) return n.split("\n")[0];
  } catch {}
  return ent.typeId.replace("tnt:", "").replace(/_/g, " ");
}

world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const chefe = ev.hurtEntity;
    if (!valido(chefe) || chefe.typeId === "minecraft:player") return;
    const vida = chefe.getComponent("health");
    if (!vida || vida.effectiveMax < 500) return;
    if (vida.currentValue <= 0 || vida.currentValue > vida.effectiveMax * 0.5) return;
    if (chefe.getDynamicProperty("ns:furia")) return;

    gravar(chefe, "ns:furia", true);
    enfurecidos.add(chefe.id);

    const dim = chefe.dimension;
    const loc = chefe.location;
    try { chefe.addEffect("strength", 20 * 40, { amplifier: 1, showParticles: false }); } catch {}
    try { chefe.addEffect("speed", 20 * 40, { amplifier: 0, showParticles: false }); } catch {}
    try { chefe.addEffect("resistance", 20 * 10, { amplifier: 1, showParticles: false }); } catch {}

    somArea(dim, "mob.enderdragon.growl", loc, 1.5, 0.8);
    particula(dim, "tnt:ns_onda", { x: loc.x, y: loc.y + 0.1, z: loc.z });
    particula(dim, "tnt:ns_detritos", loc);
    particula(dim, "tnt:ns_aura", loc, [1.0, 0.1, 0.05]);

    const nome = nomeChefe(chefe);
    for (const p of dim.getPlayers({ location: loc, maxDistance: 64 })) {
      try {
        p.sendMessage(`§4§l[!] ${nome}§r§4 ficou §lENFURECIDO§r§4! Mais forte e mais rápido!`);
        tremer(p, 0.7, 1.2);
      } catch {}
    }
  } catch {}
});

// aura vermelha pulsante enquanto o chefe enfurecido vive
system.runInterval(() => {
  for (const id of enfurecidos) {
    try {
      const e = world.getEntity(id);
      if (!valido(e)) {
        enfurecidos.delete(id);
        continue;
      }
      const l = e.location;
      particula(e.dimension, "tnt:ns_aura", { x: l.x + aleatorio(-0.6, 0.6), y: l.y, z: l.z + aleatorio(-0.6, 0.6) }, [1.0, 0.12, 0.05]);
    } catch {
      enfurecidos.delete(id);
    }
  }
}, 6);

// limpeza do mapa de recarga
system.runInterval(() => {
  const agora = system.currentTick;
  for (const [id, t] of ultimoKawarimi) if (agora - t > RECARGA_KAWARIMI) ultimoKawarimi.delete(id);
}, 600);
