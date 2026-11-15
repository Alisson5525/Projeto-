// Táticas por papel de combate. Complementam o JSON das entidades (alvos, alert_same_type) e creatures/ai.js.
// A API de scripts não escolhe o alvo de uma criatura; por isso as táticas agem com impulsos, efeitos e sinais visuais,
// e a IA nativa (que enxerga o jogador) faz o resto.
//   apoio      - ferido, grita e atrai aliados da mesma família na direção do agressor (goblins, mortos da cripta anã)
//   distancia  - conjuradores recuam quando o alvo chega perto demais (xamã goblin)
//   guarda     - tanques protegem aliados feridos com um brado (cavaleiro corrompido, sentinela rúnica)
//   flanco     - assassinos aproveitam quando o alvo está de costas (fantasma anão)
import { world, system } from "@minecraft/server";
import { NS, V, ok, tick, hpPct, effect, isPlayer, isActivePlayer } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { setAggro } from "../core/damage.js";

const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PAPEIS = {
  [`${NS}:goblin`]: { apoio: { familia: "goblin", raio: 16 } },
  [`${NS}:goblin_xama`]: { apoio: { familia: "goblin", raio: 16 }, distancia: 5 },
  [`${NS}:chefe_goblin`]: { apoio: { familia: "goblin", raio: 20 } },
  [`${NS}:fantasma_anao`]: { apoio: { familia: "fantasma_anao", raio: 14 }, flanco: true },
  [`${NS}:cavaleiro_corrompido`]: { guarda: { familias: ["sombrio", "praga", "undead"], raio: 10 } },
  [`${NS}:sentinela_runica`]: { guarda: { familias: ["construct", "fantasma_anao"], raio: 10 } },
};
const cd = new Map(); // `${id}:${tática}` -> tick liberado
const ready = (e, k, ticks) => {
  const key = `${e.id}:${k}`;
  if ((cd.get(key) || 0) > tick()) return false;
  cd.set(key, tick() + ticks);
  return true;
};
function nearestPlayer(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r }).filter(isActivePlayer)
      .sort((a, b) => V.dist(a.location, e.location) - V.dist(b.location, e.location))[0];
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ apoio: chamar o bando
function callForHelp(mob, attacker, cfg) {
  if (hpPct(mob) > 0.75 || !ready(mob, "apoio", 200)) return;
  let allies = [];
  try {
    allies = mob.dimension.getEntities({ location: mob.location, maxDistance: cfg.raio, families: [cfg.familia] }).filter((a) => a.id !== mob.id);
  } catch { return; }
  if (!allies.length) return;
  sound(mob.dimension, mob.typeId.includes("fantasma") ? "mob.wither.ambient" : "mob.vindicator.celebrate", mob.location, 1.5, 1);
  particle(mob.dimension, "alerta_anel", mob.location, { radius: 1.5 });
  for (const a of allies) {
    const to = V.sub(attacker.location, a.location);
    const d = V.len(to);
    setAggro(a, 200);
    if (d < 5) continue;
    const dir = V.flat(to);
    try { a.applyImpulse({ x: dir.x * 0.55, y: 0.22, z: dir.z * 0.55 }); } catch { /* */ }
    effect(a, "speed", 60, 0, false);
    particle(a.dimension, "cor_ponto", V.up(a.location, 2.2), { color: "red" });
  }
}

// ------------------------------------------------------------------ distância: conjurador recua
function keepDistance(mob, min) {
  if (!mob.isOnGround) return;
  const p = nearestPlayer(mob, min);
  if (!p || !ready(mob, "recuo", 50)) return;
  const away = V.flat(V.sub(mob.location, p.location));
  try { mob.applyImpulse({ x: away.x * 0.75, y: 0.3, z: away.z * 0.75 }); } catch { /* */ }
  particle(mob.dimension, "poeira", mob.location, { radius: 0.6 });
  sound(mob.dimension, "mob.vindicator.idle", mob.location, 1.9, 0.6);
}

// ------------------------------------------------------------------ guarda: tanque protege aliados feridos
function guardAllies(mob, cfg) {
  if (!nearestPlayer(mob, 14)) return;
  let hurt = [];
  try {
    hurt = mob.dimension.getEntities({ location: mob.location, maxDistance: cfg.raio })
      .filter((a) => a.id !== mob.id && cfg.familias.some((f) => a.matches({ families: [f] })) && hpPct(a) < 0.4);
  } catch { return; }
  if (!hurt.length || !ready(mob, "guarda", 300)) return;
  sound(mob.dimension, "item.shield.block", mob.location, 0.6, 1);
  particle(mob.dimension, "escudo", mob.location, {});
  effect(mob, "absorption", 160, 1, false);
  for (const a of hurt) {
    effect(a, "resistance", 100, 1, false);
    line(mob.dimension, V.up(mob.location, 1.4), V.up(a.location, 1), "cor_ponto", { color: "dark" }, 0.6);
    particle(a.dimension, "escudo", a.location, {});
  }
}

// ------------------------------------------------------------------ flanco: assassino ataca pelas costas
function flank(mob) {
  const p = nearestPlayer(mob, 9);
  if (!p || V.dist(p.location, mob.location) < 3) return;
  const toMob = V.flat(V.sub(mob.location, p.location));
  const looking = V.dot(V.flat(p.getViewDirection()), toMob);
  if (looking > 0.2 || !ready(mob, "flanco", 120)) return; // só quando o alvo não está olhando
  const toP = V.flat(V.sub(p.location, mob.location));
  try { mob.applyImpulse({ x: toP.x * 1.1, y: 0.25, z: toP.z * 1.1 }); } catch { /* */ }
  particle(mob.dimension, "alma_rastro", V.up(mob.location, 1), {});
  sound(mob.dimension, "mob.vex.charge", mob.location, 0.8, 0.8);
}

const KEYED = Object.keys(PAPEIS);
export function startTactics() {
  world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    const cfg = PAPEIS[e?.typeId];
    if (!cfg?.apoio || !ok(e)) return;
    const atk = ev.damageSource?.damagingEntity;
    if (isPlayer(atk)) callForHelp(e, atk, cfg.apoio);
  });
  system.runInterval(() => {
    for (const id of DIMS) {
      let dim;
      try { dim = world.getDimension(id); } catch { continue; }
      for (const type of KEYED) {
        const cfg = PAPEIS[type];
        if (!cfg.distancia && !cfg.guarda && !cfg.flanco) continue;
        let list = [];
        try { list = dim.getEntities({ type }); } catch { continue; }
        for (const mob of list) {
          try {
            if (cfg.distancia) keepDistance(mob, cfg.distancia);
            if (cfg.guarda) guardAllies(mob, cfg.guarda);
            if (cfg.flanco) flank(mob);
          } catch (err) {
            console.warn(`[Valdoria] tática ${type}: ${err}`);
          }
        }
      }
    }
  }, 10);
  // limpeza: recargas antigas não ficam acumuladas na memória
  system.runInterval(() => {
    const now = tick();
    for (const [k, t] of cd) if (t < now - 600) cd.delete(k);
  }, 1200);
  world.afterEvents.entityDie.subscribe((ev) => {
    const id = ev.deadEntity.id;
    for (const k of ["apoio", "recuo", "guarda", "flanco"]) cd.delete(`${id}:${k}`);
  });
}
