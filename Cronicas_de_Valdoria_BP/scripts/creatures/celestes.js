// Criaturas do Santuário Celestial com comportamento por script:
// - Sentinela Celestial: quando o alvo chega perto, crava a lança (círculo marcado de 3 blocos em volta dela) e, depois de 1 s,
//   solta um Pulso de Luz que fere e empurra quem ficou no círculo.
// - Harpia: de tempos em tempos marca o chão sob o alvo e, 1 s depois, mergulha (teleporta) até o ponto marcado, ferindo quem
//   ainda estiver ali. Fugir do círculo evita o golpe.
import { world, system } from "@minecraft/server";
import { NS, V, ok, tick, isActivePlayer } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { dealDamage, canHit } from "../core/damage.js";
import { ground, knockFrom } from "../abilities/engine.js";

export const SENTINEL = `${NS}:sentinela_celeste`;
export const HARPY = `${NS}:harpia`;
export const PULSE_R = 3;
export const DIVE_R = 2;
const st = new Map(); // id -> { next, busy }

function anim(e, a) {
  try { e.setProperty(`${NS}:anim`, a); } catch { /* */ }
}
function nearestTarget(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r }).filter(isActivePlayer)
      .sort((a, b) => V.dist(a.location, e.location) - V.dist(b.location, e.location))[0];
  } catch {
    return undefined;
  }
}
function stateOf(e, first) {
  let s = st.get(e.id);
  if (!s) {
    s = { next: tick() + first, busy: 0 };
    st.set(e.id, s);
  }
  return s;
}

function sentinelTick(e) {
  const s = stateOf(e, 60);
  if (s.busy > tick() || tick() < s.next) return;
  const t = nearestTarget(e, 10);
  if (!t || V.dist(e.location, t.location) > 4.5) return;
  s.next = tick() + 200;
  s.busy = tick() + 30;
  anim(e, 1);
  const c = ground(e.dimension, e.location);
  particle(e.dimension, "alerta_area", c, { radius: PULSE_R });
  sound(e.dimension, "block.bell.hit", e.location, 0.7, 1.4);
  system.runTimeout(() => {
    if (!ok(e)) return;
    anim(e, 0);
    particle(e.dimension, "sagrado_explosao", V.up(c, 0.5), { radius: PULSE_R });
    sound(e.dimension, "beacon.deactivate", c, 0.6, 1.6);
    for (const v of e.dimension.getEntities({ location: c, maxDistance: PULSE_R + 0.4 })) {
      if (!canHit(e, v, false)) continue;
      dealDamage(e, v, 7, "holy");
      knockFrom(v, c, 1.0, 0.4);
    }
  }, 20);
}

function harpyTick(e) {
  const s = stateOf(e, 40);
  if (s.busy > tick() || tick() < s.next) return;
  const t = nearestTarget(e, 16);
  if (!t) return;
  const d = V.dist(e.location, t.location);
  if (d < 3 || d > 14) return;
  s.next = tick() + 140;
  s.busy = tick() + 30;
  const pt = ground(t.dimension, t.location);
  anim(e, 1);
  particle(e.dimension, "alerta_area", pt, { radius: DIVE_R });
  sound(e.dimension, "mob.phantom.swoop", e.location, 0.8, 1.2);
  system.runTimeout(() => {
    if (!ok(e)) return;
    try { e.teleport(V.up(pt, 0.2), { facingLocation: t.location, keepVelocity: false }); } catch { /* */ }
    particle(e.dimension, "vento_explosao", V.up(pt, 0.5), { radius: 1.5 });
    for (const v of e.dimension.getEntities({ location: pt, maxDistance: DIVE_R + 0.4 })) {
      if (!canHit(e, v, false)) continue;
      dealDamage(e, v, 6, "physical", { kind: "weapon" });
    }
    system.runTimeout(() => ok(e) && anim(e, 0), 10);
  }, 20);
}

export function startCelestialCreatures() {
  system.runInterval(() => {
    let dim;
    try { dim = world.getDimension("minecraft:overworld"); } catch { return; }
    /** @type {[string, (e: any) => void][]} */
    const kinds = [[SENTINEL, sentinelTick], [HARPY, harpyTick]];
    for (const [type, fn] of kinds) {
      let list = [];
      try { list = dim.getEntities({ type }); } catch { continue; }
      for (const e of list) {
        try { fn(e); } catch (err) { console.warn(`[Valdoria] ${type}: ${err}`); }
      }
    }
    if (tick() % 600 < 10) for (const id of st.keys()) if (!world.getEntity(id)) st.delete(id);
  }, 10);
  world.afterEvents.entityDie.subscribe((ev) => {
    try { st.delete(ev.deadEntity.id); } catch { /* */ }
  });
}
