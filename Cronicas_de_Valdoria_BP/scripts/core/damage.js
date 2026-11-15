// Pipeline de dano: escala por atributos, críticos, esquiva, defesa, resistências elementais, fraquezas e efeitos ao acertar.
import { world, system, EntityDamageCause } from "@minecraft/server";
import { V, ok, isPlayer, health, heldItem, tick, chance, clamp, hpPct, heal, NS, isActivePlayer } from "./util.js";
import { particle, sound } from "./fx.js";
import { stats, itemData, hasBuff, spendEnergy } from "../rpg/stats.js";
import { getData, getWorldCfg } from "./store.js";

// ------------------------------------------------------------------ estado
const scripted = new Map(); // alvo -> {t, element, kind, src}
const lastHurt = new Map(); // alvo -> tick
const lastMelee = new Map(); // jogador -> tick do último golpe
const aggro = new Map(); // entidade -> tick de expiração
export const iframes = new Map(); // jogador -> tick até o qual é invulnerável
export const lastBlock = new Map(); // jogador -> tick do último bloqueio com arma (contra-ataques)
const debuffs = new Map(); // entidade -> {bleed?, vuln?, drainMark?, poison?}
const hurtHooks = []; // ganchos (ex.: chefe) executados no evento "antes"
const hitHooks = []; // ganchos pós-acerto corpo a corpo (armas, buffs)
const killHooks = [];

export function onBeforeHurt(fn) { hurtHooks.push(fn); }
export function onMeleeHit(fn) { hitHooks.push(fn); }
export function onKill(fn) { killHooks.push(fn); }
const elementHooks = []; // reações elementais e especializações: (src, alvo, dano, elemento, tipo, causa)
export function onElementHit(fn) { elementHooks.push(fn); }
const dodgeHooks = []; // esquivas bem-sucedidas (passiva ou ativa): (jogador)
export function onDodge(fn) { dodgeHooks.push(fn); }
export function notifyDodge(player) {
  for (const fn of dodgeHooks) {
    try { fn(player); } catch (e) { console.warn(`[Valdoria] esquiva: ${e}`); }
  }
}

// ------------------------------------------------------------------ resistências das criaturas (negativo = fraqueza)
const UNDEAD = new Set(["minecraft:zombie", "minecraft:skeleton", "minecraft:husk", "minecraft:stray", "minecraft:drowned",
  "minecraft:zombie_villager", "minecraft:wither_skeleton", "minecraft:phantom", "minecraft:zombie_pigman",
  "minecraft:wither", "minecraft:bogged", "minecraft:zoglin", "minecraft:skeleton_horse", "minecraft:zombie_horse",
  `${NS}:espectro`]);
export const CREATURE_RES = {
  [`${NS}:tita_pedra`]: { physical: 0.15, fire: 0.5, earth: 0.6, nature: -0.25, lightning: -0.15, ice: 0.1 },
  [`${NS}:fragmento_pedra`]: { physical: 0.1, fire: 0.4, earth: 0.5, nature: -0.25 },
  [`${NS}:espectro`]: { physical: 0.3, holy: -0.6, dark: 0.6, blood: 0.3 },
  [`${NS}:goblin`]: { fire: -0.2 },
  [`${NS}:dragao_ancestral`]: { fire: 0.8, physical: 0.1, lightning: 0.2, ice: -0.3, earth: 0.1 },
  [`${NS}:rainha_trevas`]: { dark: 0.6, blood: 0.2, holy: -0.4, arcane: 0.15 },
  [`${NS}:lobo_gigante`]: { ice: 0.3, fire: -0.1 },
  [`${NS}:urso_guerra`]: { physical: 0.1, ice: 0.2 },
  [`${NS}:alce`]: { ice: 0.3 },
  [`${NS}:unicornio`]: { holy: 0.6, dark: -0.2, arcane: 0.2 },
  [`${NS}:grifo`]: { wind: 0.4, lightning: -0.2 },
  [`${NS}:dragao_jovem`]: { fire: 1.0, ice: -0.25 },
  [`${NS}:fantasma_anao`]: { physical: 0.25, holy: -0.6, dark: 0.5, fire: 0.3 },
  [`${NS}:sentinela_runica`]: { physical: 0.35, fire: 0.5, earth: 0.3, lightning: -0.4, arcane: -0.2 },
  [`${NS}:rei_durgan`]: { physical: 0.15, earth: 0.4, holy: -0.3, dark: 0.3, lightning: -0.15 },
  [`${NS}:cavaleiro_corrompido`]: { physical: 0.15, dark: 0.4, holy: -0.4 },
  [`${NS}:gargula`]: { physical: 0.3, earth: 0.3, lightning: -0.3, holy: -0.1 },
  [`${NS}:azrakar`]: { physical: 0.1, dark: 0.6, fire: 0.6, holy: -0.35, ice: -0.1 },
  [`${NS}:sentinela_celeste`]: { physical: 0.2, holy: 0.5, lightning: 0.2, dark: -0.35, earth: -0.15 },
  [`${NS}:harpia`]: { wind: 0.5, holy: 0.2, lightning: -0.3, ice: -0.2 },
  [`${NS}:guardiao_celeste`]: { physical: 0.1, holy: 0.6, wind: 0.5, lightning: 0.3, dark: -0.35 },
  [`${NS}:goblin_xama`]: { fire: -0.1, arcane: 0.2 },
  "minecraft:blaze": { fire: 0.9, ice: -0.5 },
  "minecraft:magma_cube": { fire: 0.9, ice: -0.4 },
  "minecraft:stray": { ice: 0.6, fire: -0.2 },
  "minecraft:enderman": { arcane: 0.3 },
  "minecraft:witch": { arcane: 0.4 },
};
export function isUndead(e) {
  return UNDEAD.has(e.typeId);
}

const CAUSE_ELEMENT = {
  fire: "fire", fireTick: "fire", lava: "fire", campfire: "fire", soulCampfire: "fire", magma: "fire",
  freezing: "ice", lightning: "lightning", magic: "arcane", wither: "dark", sonicBoom: "arcane",
};
const PHYS_CAUSES = new Set(["entityAttack", "projectile", "entityExplosion", "blockExplosion", "contact",
  "maceSmash", "ramAttack", "thorns", "fallingBlock", "stalactite", "anvil", "piston", "flyIntoWall"]);

// ------------------------------------------------------------------ aggro e debuffs
export function setAggro(entity, ticks = 200) {
  aggro.set(entity.id, tick() + ticks);
}
export function hasAggro(entity) {
  const t = aggro.get(entity.id);
  return t !== undefined && t > tick();
}
export function debuff(entity) {
  let d = debuffs.get(entity.id);
  if (!d) debuffs.set(entity.id, (d = {}));
  return d;
}
export function addBleed(target, src, dps, seconds) {
  const d = debuff(target);
  d.bleed = { dps, until: tick() + seconds * 20, src };
}
/** Vulnerabilidade: várias fontes (postura quebrada, besta, machado, feitiços) não se anulam: vale a mais forte, e uma fonte
 * igual ou mais forte renova a duração. */
export function addVulnerable(target, pctBonus, seconds) {
  const d = debuff(target);
  const until = tick() + seconds * 20;
  const cur = d.vuln && d.vuln.until > tick() ? d.vuln : undefined;
  if (!cur || pctBonus >= cur.pct) d.vuln = { pct: pctBonus, until: Math.max(until, cur && pctBonus === cur.pct ? cur.until : 0) };
}
export function addDrainMark(target, src, ratio, seconds) {
  const d = debuff(target);
  d.drain = { src, ratio, until: tick() + seconds * 20 };
}

// ------------------------------------------------------------------ alvos válidos
const NEVER = new Set(["minecraft:item", "minecraft:xp_orb", "minecraft:armor_stand", "minecraft:painting",
  "minecraft:arrow", "minecraft:npc", "minecraft:leash_knot", "minecraft:boat", "minecraft:minecart", "minecraft:chest_boat",
  "minecraft:fireworks_rocket", "minecraft:snowball", "minecraft:egg", "minecraft:ender_pearl", "minecraft:thrown_trident",
  "minecraft:tnt", "minecraft:falling_block", "minecraft:area_effect_cloud", "minecraft:lightning_bolt", "minecraft:agent",
  "valdoria:ovo_dragao"]);
const FRIENDLY_FAMILIES = ["villager", "irongolem", "valdoria_ally", "wandering_trader", "snowgolem"];

function hasFamily(e, fam) {
  try {
    return e.matches({ families: [fam] });
  } catch {
    return false;
  }
}

export function isPlayerSide(e) {
  if (!ok(e)) return false;
  if (isPlayer(e)) return true;
  if (FRIENDLY_FAMILIES.some((f) => hasFamily(e, f))) return true;
  try {
    return e.hasComponent("minecraft:is_tamed");
  } catch {
    return false;
  }
}

export function isHostile(e) {
  return hasFamily(e, "monster") || hasFamily(e, "valdoria_hostile") || hasAggro(e);
}

/** Pode `src` causar dano em `e`? area=true restringe a inimigos hostis (para não atingir animais de fazenda). */
export function canHit(src, e, area = false) {
  if (!ok(e) || (src && e.id === src.id) || NEVER.has(e.typeId)) return false;
  if (!health(e)) return false;
  if (isPlayer(e) && !isActiveMortal(e)) return false;
  const srcPlayerSide = src ? isPlayerSide(src) : false;
  if (srcPlayerSide) {
    if (isPlayer(e)) return getWorldCfg().pvp && isPlayer(src);
    if (isPlayerSide(e)) return false;
    return area ? isHostile(e) : true;
  }
  return isPlayerSide(e);
}

function isActiveMortal(p) {
  return isActivePlayer(p);
}

export function enemiesNear(src, loc, radius, area = true) {
  const dim = src?.dimension;
  if (!dim) return [];
  try {
    return dim.getEntities({ location: loc, maxDistance: radius }).filter((e) => canHit(src, e, area));
  } catch {
    return [];
  }
}

export function alliesNear(src, loc, radius) {
  const dim = src?.dimension;
  if (!dim) return [];
  try {
    return dim.getEntities({ location: loc, maxDistance: radius }).filter((e) => ok(e) && isPlayerSide(e) && health(e));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ modificadores do alvo (compartilhados pelos dois caminhos)
function targetSide(target, dmg, element, kind, causeStr, attacker) {
  // fraquezas/resistências de criaturas
  const res = CREATURE_RES[target.typeId];
  if (res && res[element] !== undefined) dmg *= 1 - res[element];
  if (element === "holy" && isUndead(target)) dmg *= 1.5;
  const db = debuffs.get(target.id);
  if (db?.vuln && db.vuln.until > tick()) dmg *= 1 + db.vuln.pct;
  if (isPlayer(target)) {
    const s = stats(target);
    const physical = element === "physical" || PHYS_CAUSES.has(causeStr);
    dmg *= 1 - (physical ? s.dr : s.mdr);
    dmg *= 1 - (s.res[element] || 0);
    dmg *= 1 + s.dmgTaken;
    if (causeStr === "fall") dmg *= 1 - clamp(s.attrs.agi * 0.006, 0, 0.5);
  }
  return Math.max(0, dmg);
}

/** Dano causado pelos sistemas do add-on (feitiços, habilidades, chefes). Já deve vir escalado pelo poder do atacante. */
export function dealDamage(src, target, amount, element = "arcane", opts = {}) {
  if (!ok(target) || amount <= 0) return 0;
  const kind = opts.kind || "spell";
  const now = tick();
  const physical = element === "physical" || kind === "weapon";
  const cause = physical ? EntityDamageCause.entityAttack : EntityDamageCause.magic;
  const srcOk = ok(src) ? src : undefined;
  if (srcOk && isPlayerSide(srcOk)) setAggro(target);
  const lh = lastHurt.get(target.id);
  if (lh !== undefined && now - lh < 10) {
    // Dentro do tempo de invulnerabilidade: aplica direto na vida para não perder acertos múltiplos.
    const h = health(target);
    if (!h) return 0;
    const ev = { cancel: false, damage: targetSide(target, amount, element, kind, physical ? "entityAttack" : "magic", srcOk),
      hurtEntity: target, scripted: true, element, src: srcOk, kind };
    for (const hk of hurtHooks) hk(ev);
    if (ev.cancel) return 0;
    const fin = ev.damage;
    if (fin <= 0) return 0;
    if (h.currentValue - fin <= 0) {
      lastHurt.delete(target.id);
      scripted.set(target.id, { t: now, element, kind, src: srcOk, direct: true });
      try {
        target.applyDamage(h.currentValue + 1000, { cause, damagingEntity: srcOk });
      } catch {
        h.setCurrentValue(0);
      }
    } else {
      h.setCurrentValue(h.currentValue - fin);
      particle(target.dimension, "critico", V.up(target.location, 1), {});
    }
    afterHit(srcOk, target, fin, element, kind);
    return fin;
  }
  scripted.set(target.id, { t: now, element, kind, src: srcOk });
  try {
    target.applyDamage(amount, { cause, damagingEntity: srcOk });
  } catch {
    /* alvo imune */
  }
  lastHurt.set(target.id, now);
  return amount;
}

function afterHit(src, target, dmg, element, kind, cause) {
  if (!ok(src)) return;
  for (const fn of elementHooks) {
    try { fn(src, target, dmg, element, kind, cause); } catch (e) { console.warn(`[Valdoria] reação elemental: ${e}`); }
  }
  if (isPlayer(src)) {
    const s = stats(src);
    if (s.lifesteal > 0 && kind !== "dot") heal(src, dmg * s.lifesteal);
  }
  const db = debuffs.get(target.id);
  if (db?.drain && db.drain.until > tick() && ok(db.drain.src) && db.drain.src.id === src.id) {
    heal(src, dmg * db.drain.ratio);
  }
}

// ------------------------------------------------------------------ eventos
function attackerSide(attacker, target, dmg, causeStr, ev) {
  const s = stats(attacker);
  const now = tick();
  const out = { crit: false, back: false };
  if (causeStr === "entityAttack") {
    const held = heldItem(attacker);
    const wd = itemData(held);
    let mult = s.melee;
    if (wd && wd.k === "weapon") {
      mult *= 1 + (s.weap[wd.type] || 0) + s.upgrade * 0.06;
      // velocidade de ataque por tipo de arma (agilidade reduz o intervalo)
      const spd = wd.spd * (1 - s.atkSpeed);
      const last = lastMelee.get(attacker.id) ?? -999;
      const since = now - last;
      if (since < spd) mult *= 0.25 + 0.75 * Math.pow(since / spd, 2);
      lastMelee.set(attacker.id, now);
    }
    if (s.fury > 0) mult *= 1 + s.fury * (1 - hpPct(attacker));
    // ataque pelas costas
    try {
      const tv = target.getViewDirection();
      const toA = V.norm(V.sub(attacker.location, target.location));
      if (V.dot(V.flat(tv), V.flat(toA)) < -0.35) {
        out.back = true;
        const d = getData(attacker);
        mult *= d.classe === "assassino" ? 1.6 : wd?.type === "adaga" ? 1.4 : 1.15;
      }
    } catch {
      /* alvo sem direção */
    }
    dmg *= mult;
  } else if (causeStr === "projectile") {
    dmg *= s.ranged;
  }
  if (isUndead(target)) dmg *= 1 + s.vsUndead;
  if (chance(s.crit)) {
    out.crit = true;
    dmg *= s.critDmg;
  }
  out.dmg = dmg;
  return out;
}

export function startDamage() {
  world.beforeEvents.entityHurt.subscribe((ev) => {
    const target = ev.hurtEntity;
    const src = ev.damageSource;
    const causeStr = String(src.cause);
    const now = tick();
    let dmg = ev.damage;
    const mark = scripted.get(target.id);
    const isScripted = mark && mark.t === now;
    if (isScripted) scripted.delete(target.id);
    // golpe de execução do caminho direto (dano letal dentro da invulnerabilidade): ganchos, defesas e efeitos pós-acerto
    // já rodaram em dealDamage com o dano real; aqui só se deixa o golpe matar, sem repetir nada com o dano inflado
    if (isScripted && mark.direct) return;
    // flechas e virotes dos arcos e bestas do add-on carregam o próprio dano e elemento (scripts/combat/archery.js)
    let projDmg;
    let projEl;
    if (!isScripted && causeStr === "projectile") {
      try {
        const pr = src.damagingProjectile;
        const v = pr?.getDynamicProperty(`${NS}:dano`);
        if (typeof v === "number") {
          projDmg = v;
          projEl = String(pr.getDynamicProperty(`${NS}:el`) || "physical");
        }
      } catch { /* projétil já removido */ }
    }
    if (projDmg !== undefined) dmg = projDmg;
    const element = isScripted ? mark.element : projEl || CAUSE_ELEMENT[causeStr] || "physical";
    const attacker = src.damagingEntity;

    // ---- defesa do jogador alvo
    if (isPlayer(target)) {
      const inv = iframes.get(target.id);
      if (inv !== undefined && inv > now) {
        ev.cancel = true;
        return;
      }
      if (hasBuff(target, "imune")) {
        ev.cancel = true;
        return;
      }
      const s = stats(target);
      if (s.kbImmune && attacker) system.run(() => { try { if (ok(target)) target.clearVelocity(); } catch { /* */ } });
      if (hasBuff(target, "espinhos") && attacker && causeStr === "entityAttack") {
        const reflect = dmg * 0.4;
        system.run(() => ok(attacker) && ok(target) && dealDamage(target, attacker, reflect, "nature", { kind: "dot" }));
      }
      const attackLike = causeStr === "entityAttack" || causeStr === "projectile" || (isScripted && attacker);
      if (attackLike && attacker && Math.random() < s.dodge) {
        ev.cancel = true;
        system.run(() => {
          if (!ok(target)) return;
          notifyDodge(target);
          particle(target.dimension, "esquiva", V.up(target.location, 1));
          sound(target.dimension, "mob.phantom.swoop", target.location, 1.6, 0.6);
          try { /** @type {any} */ (target).onScreenDisplay.setActionBar("§b» Esquiva! «"); } catch { /* */ }
        });
        return;
      }
      // postura de defesa: agachado com arma corpo a corpo, golpe frontal
      if (attackLike && attacker && target.isSneaking) {
        const wd = itemData(heldItem(target));
        if (wd && wd.k === "weapon") {
          const toA = V.flat(V.sub(attacker.location, target.location));
          if (V.dot(V.flat(target.getViewDirection()), toA) > 0.3 && getData(target).energia >= 4) {
            const red = getData(target).classe === "cavaleiro" ? 0.6 : 0.45;
            dmg *= 1 - red;
            lastBlock.set(target.id, now);
            system.run(() => {
              if (!ok(target)) return;
              spendEnergy(target, 4);
              particle(target.dimension, "bloqueio", V.add(V.up(target.location, 1.2), V.mul(target.getViewDirection(), 0.6)));
              sound(target.dimension, "item.shield.block", target.location, 1.0, 0.8);
            });
          }
        }
      }
    }

    // ---- escala do atacante (somente golpes comuns de jogadores; dano de script já vem escalado)
    let procs;
    if (!isScripted && isPlayer(attacker) && (causeStr === "entityAttack" || causeStr === "projectile")) {
      procs = attackerSide(attacker, target, dmg, causeStr, ev);
      dmg = procs.dmg;
    }

    dmg = targetSide(target, dmg, element, isScripted ? mark.kind : "vanilla", causeStr, attacker);
    const hookEv = { cancel: false, damage: dmg, hurtEntity: target, scripted: !!isScripted, element, src: attacker, cause: causeStr,
      kind: isScripted ? mark.kind : causeStr === "projectile" ? "projectile" : "vanilla", procs: undefined };
    for (const hk of hurtHooks) hk(hookEv);
    if (hookEv.cancel) {
      ev.cancel = true;
      return;
    }
    ev.damage = Math.max(0, hookEv.damage);

    if (attacker && isPlayerSide(attacker)) aggro.set(target.id, now + 200);
    const final = ev.damage;
    if (procs && isPlayer(attacker)) {
      system.run(() => {
        if (!ok(attacker) || !ok(target)) return;
        if (procs.crit) {
          particle(target.dimension, "critico", V.up(target.location, 1.2));
          sound(target.dimension, "game.player.attack.critical", target.location, 1.1, 0.8);
        }
        if (causeStr === "entityAttack") {
          for (const hk of hitHooks) {
            try { hk(attacker, target, final, procs); } catch (e) { console.warn(`[Valdoria] hit hook: ${e}`); }
          }
        }
        afterHit(attacker, target, final, element, "vanilla", causeStr);
      });
    } else if (isScripted && mark.src) {
      const s0 = mark.src;
      system.run(() => afterHit(s0, target, final, element, mark.kind));
    }
  });

  world.afterEvents.entityHurt.subscribe((ev) => {
    lastHurt.set(ev.hurtEntity.id, tick());
  });

  world.afterEvents.entityDie.subscribe((ev) => {
    const id = ev.deadEntity.id;
    lastHurt.delete(id);
    debuffs.delete(id);
    aggro.delete(id);
    for (const hk of killHooks) {
      try { hk(ev); } catch (e) { console.warn(`[Valdoria] kill hook: ${e}`); }
    }
  });

  // danos contínuos (sangramento) a cada segundo
  system.runInterval(() => {
    const now = tick();
    for (const [id, d] of debuffs) {
      if (d.bleed && d.bleed.until > now) {
        const e = world.getEntity(id);
        if (!ok(e)) { debuffs.delete(id); continue; }
        dealDamage(d.bleed.src, e, d.bleed.dps, "blood", { kind: "dot" });
        particle(e.dimension, "sangramento", V.up(e.location, 1));
      } else if (d.bleed) delete d.bleed;
      if (!d.bleed && !(d.vuln && d.vuln.until > now) && !(d.drain && d.drain.until > now)) debuffs.delete(id);
    }
    if (lastHurt.size > 2000) {
      for (const [id, t] of lastHurt) if (now - t > 200) lastHurt.delete(id);
    }
    for (const [id, t] of aggro) if (t < now) aggro.delete(id);
  }, 20);
}

export function grantIframes(player, ticks) {
  iframes.set(player.id, tick() + ticks);
}

