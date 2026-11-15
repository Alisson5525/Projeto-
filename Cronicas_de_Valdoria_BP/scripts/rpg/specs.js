// Mecânicas-assinatura das especializações. Os bônus de atributo de cada especialização continuam em data/classes.js;
// aqui cada uma ganha uma regra própria que muda a forma de lutar.
import { world, system } from "@minecraft/server";
import { V, ok, tick, isPlayer, effect, heal, hpPct, health } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { getData } from "../core/store.js";
import { onBeforeHurt, onMeleeHit, onElementHit, onKill, onDodge, dealDamage, enemiesNear, alliesNear, isUndead, isPlayerSide, isHostile } from "../core/damage.js";
import { onCast } from "../abilities/registry.js";
import { onHeal, summon, summonsOf, summonOwner, stun } from "../abilities/engine.js";
import { addEnergy, stats } from "./stats.js";

/** Texto exibido no Diário (Classe/Especialização). */
export const SPEC_MEC = {
  berserker: "Frenesi: cada golpe corpo a corpo soma uma carga (até 5, some após 4 s sem bater): +6% de dano por carga, mas você recebe +4% por carga.",
  senhor_guerra: "Comando: aliados a 10 blocos causam +10% de dano. Ao abater um inimigo, Brado de Vitória dá Força aos aliados (recarga 15 s).",
  guardiao_real: "Proteger: 30% do dano sofrido por aliados a 6 blocos de você é desviado para você.",
  cavaleiro_dragao: "Carga Dracônica: golpes correndo ou montado explodem em chamas ao redor do alvo (50% do golpe, recarga 3 s).",
  atirador: "Marcar Presa: flechas marcam o alvo por 8 s; você causa +15% de dano a alvos marcados.",
  patrulheiro: "Faro do Caçador: a cada 6 s, inimigos a 20 blocos são marcados no ar; +20% de dano em alvos a mais de 10 blocos.",
  arquimago: "Sobrecarga Arcana: a cada 4 feitiços, o 4º é gratuito e 30% mais forte.",
  elementalista: "Afinidade Elemental: alternar escolas soma até +24% de poder (repetir a escola zera); reações elementais causam +50%.",
  necromante: "Colheita de Almas: 35% de chance de um inimigo abatido se erguer como Guerreiro Esquelético aliado por 20 s.",
  feiticeiro_sangue: "Sangue Fervente: abaixo de 50% de vida, feitiços de sangue ficam 30% mais fortes; abates curam 10% da vida.",
  cruzado: "Fervor: golpes corpo a corpo contra mortos-vivos e demônios causam +20% em dano sagrado e curam 10% do dano.",
  templario: "Égide: um escudo sagrado absorve até 8 de dano de um golpe; recarrega 12 s depois de usado (halo visível quando pronto).",
  sombra: "Execução: golpes pelas costas ou invisível causam +50%; abater um inimigo deixa você invisível por 2 s (recarga 6 s).",
  duelista: "Aparar: depois de uma esquiva, o próximo golpe em até 2 s causa +60% e atordoa por 0,5 s.",
  guardiao_bosque: "Raízes Vivas: parado por 2 s, você e aliados a 6 blocos regeneram; suas curas ficam 20% mais fortes enquanto enraizado.",
  xama_tempestade: "Olho da Tempestade: feitiços de raio e vento somam cargas; com 5, seu próximo acerto chama um raio em área.",
  senhor_bestas: "Matilha: o alvo que você fere vira presa por 6 s; suas invocações causam +30% contra ela e avançam sobre ela.",
  mestre_espiritos: "Elo Espiritual: 20% do dano que você sofre vai para uma invocação próxima; quando uma invocação sua morre, você recupera 15 de energia.",
  sumo_sacerdote: "Graça: cura que passaria do máximo vira escudo de absorção no aliado.",
  inquisidor: "Sentença: dano sagrado acumula Condenação (até 3, 8 s); com 3, o alvo sofre +20% de todo o seu dano; abater um condenado devolve 15 de energia.",
};

const specOf = (p) => (isPlayer(p) ? getData(p).espec : undefined);
const S = new Map(); // jogador -> estado da especialização
const st = (p) => {
  let s = S.get(p.id);
  if (!s) S.set(p.id, (s = {}));
  return s;
};
const tmarks = new Map(); // alvo -> {presa, presaAte, presaDe, cond, condAte, condDe, marca, marcaAte, marcaDe}
const tm = (e) => {
  let s = tmarks.get(e.id);
  if (!s) tmarks.set(e.id, (s = {}));
  return s;
};
// jogadores com especializações de aura, atualizados a cada 10 ticks (o caminho de dano não varre todos os jogadores)
let guardians = [];
let warlords = [];
const bar = (txt, p) => { try { p.onScreenDisplay.setActionBar(txt); } catch { /* */ } };

// ------------------------------------------------------------------ modificadores de dano (antes do golpe)
function beforeHurt(ev) {
  if (ev.cancel || !(ev.damage > 0)) return;
  const now = tick();
  const t = ev.hurtEntity;
  const src = ev.src;
  const ts = specOf(t);
  // --- alvo é um jogador especializado
  if (ts === "berserker") {
    const s = st(t);
    if (s.fren && s.frenAte > now) ev.damage *= 1 + 0.04 * s.fren;
  } else if (ts === "templario" && ok(src)) { // só ataques (não queda, fogo, fome)
    const s = st(t);
    if (!s.egideCd || s.egideCd <= now) {
      ev.damage = Math.max(0, ev.damage - 8);
      s.egideCd = now + 240;
      system.run(() => {
        if (!ok(t)) return;
        particle(t.dimension, "escudo", t.location, {});
        sound(t.dimension, "item.shield.block", t.location, 1.3, 1);
        bar("§eÉgide absorveu o golpe", t);
      });
    }
  } else if (ts === "mestre_espiritos" && ev.kind !== "elo" && ok(src)) {
    const spirit = summonsOf(t).find((e) => V.dist(e.location, t.location) < 12);
    if (spirit) {
      const part = ev.damage * 0.2;
      ev.damage -= part;
      system.run(() => {
        if (!ok(spirit) || !ok(t)) return;
        line(t.dimension, V.up(t.location, 1), V.up(spirit.location, 1), "cor_ponto", { color: "summon" }, 0.5);
        dealDamage(undefined, spirit, part, "arcane", { kind: "elo" });
      });
    }
  }
  // --- Proteger (Guardião Real): o aliado ferido perto de um guardião
  if (ev.kind !== "proteger" && ok(src) && guardians.length && isPlayerSide(t)) {
    for (const g of guardians) {
      if (!ok(g) || g.id === t.id || g.dimension.id !== t.dimension.id || V.dist(g.location, t.location) > 6) continue;
      if ((health(g)?.currentValue ?? 0) <= 0) continue;
      const part = ev.damage * 0.3;
      ev.damage -= part;
      system.run(() => {
        if (!ok(g) || !ok(t)) return;
        line(g.dimension, V.up(t.location, 1), V.up(g.location, 1), "cor_ponto", { color: "gold" }, 0.6);
        // sem atacante: o dano desviado não pode ser esquivado nem bloqueado (senão o desvio viraria dano nenhum)
        dealDamage(undefined, g, part, ev.element || "physical", { kind: "proteger" });
      });
      break;
    }
  }
  if (!ok(src)) return;
  // --- origem: invocação do Senhor das Bestas atacando a presa
  if (!isPlayer(src)) {
    const owner = summonOwner(src);
    if (owner && specOf(owner) === "senhor_bestas") {
      const m = tmarks.get(t.id);
      if (m?.presaDe === owner.id && m.presaAte > now) ev.damage *= 1.3;
    }
    // --- Comando: aliados não jogadores perto de um Senhor da Guerra
    if (isPlayerSide(src)) ev.damage *= commandBonus(src);
    return;
  }
  const sp = specOf(src);
  if (sp !== "senhor_guerra") ev.damage *= commandBonus(src);
  if (!sp) return;
  const m = tmarks.get(t.id);
  if (sp === "berserker") {
    const s = st(src);
    if (s.fren && s.frenAte > now && ev.element === "physical") ev.damage *= 1 + 0.06 * s.fren;
  } else if (sp === "atirador") {
    if (m?.marcaDe === src.id && m.marcaAte > now) ev.damage *= 1.15;
  } else if (sp === "patrulheiro") {
    if (V.dist(src.location, t.location) > 10) ev.damage *= 1.2;
  } else if (sp === "elementalista") {
    if (ev.kind === "reacao") ev.damage *= 1.5;
  } else if (sp === "inquisidor") {
    if (m?.condDe === src.id && m.condAte > now && m.cond >= 3) ev.damage *= 1.2;
  }
}
function commandBonus(src) {
  for (const g of warlords) {
    if (!ok(g) || g.id === src.id || g.dimension.id !== src.dimension.id) continue;
    if (V.dist(g.location, src.location) <= 10) return 1.1;
  }
  return 1;
}

// ------------------------------------------------------------------ golpes corpo a corpo (depois do golpe)
function meleeHit(player, target, dmg, procs) {
  const sp = specOf(player);
  if (!sp) return;
  const now = tick();
  const s = st(player);
  if (sp === "berserker") {
    s.fren = s.frenAte > now ? Math.min(5, (s.fren || 0) + 1) : 1;
    s.frenAte = now + 80;
    if (s.fren === 5) {
      particle(player.dimension, "cor_aura", V.up(player.location, 1), { color: "red" });
      bar("§4Frenesi máximo! §7+30% de dano, +20% recebido", player);
    }
  } else if (sp === "cavaleiro_dragao") {
    let mounted = false;
    try { mounted = !!player.getComponent("minecraft:riding")?.entityRidingOn; } catch { /* */ }
    if ((player.isSprinting || mounted) && (!s.cargaCd || s.cargaCd <= now)) {
      s.cargaCd = now + 60;
      particle(player.dimension, "fogo_explosao", V.up(target.location, 1), { radius: 2 });
      sound(player.dimension, "mob.blaze.shoot", target.location, 0.8, 1);
      try { target.setOnFire(3, true); } catch { /* */ }
      for (const e of enemiesNear(player, target.location, 2.5, true)) dealDamage(player, e, dmg * 0.5, "fire", { kind: "weapon" });
    }
  } else if (sp === "cruzado") {
    if (isUndead(target) || ["sombrio", "demonio"].some((f) => { try { return target.matches({ families: [f] }); } catch { return false; } })) {
      dealDamage(player, target, dmg * 0.2, "holy", { kind: "dot" });
      heal(player, dmg * 0.1);
      particle(player.dimension, "sagrado_rastro", V.up(target.location, 1), {});
    }
  } else if (sp === "sombra") {
    let invis = false;
    try { invis = !!player.getEffect("invisibility"); } catch { /* */ }
    if (procs?.back || invis) {
      dealDamage(player, target, dmg * 0.5, "physical", { kind: "weapon" });
      particle(player.dimension, "critico", V.up(target.location, 1.2), {});
      sound(player.dimension, "game.player.attack.critical", target.location, 1.4, 0.8);
    }
  } else if (sp === "duelista") {
    if (s.aparar && s.apararAte > now) {
      s.aparar = false;
      dealDamage(player, target, dmg * 0.6, "physical", { kind: "weapon" });
      stun(target, 10);
      bar("§eAparar! §7+60% e atordoamento", player);
      sound(player.dimension, "item.trident.hit", target.location, 1.6, 1);
    }
  }
}

// ------------------------------------------------------------------ qualquer acerto (feitiços, flechas, golpes)
function anyHit(src, target, dmg, el, kind, cause) {
  if (!isPlayer(src) || kind === "reacao" || kind === "dot" || kind === "proteger" || kind === "elo") return;
  const sp = specOf(src);
  if (!sp) return;
  const now = tick();
  const m = tm(target);
  if (sp === "atirador" && (cause === "projectile" || kind === "projectile")) {
    if (!(m.marcaDe === src.id && m.marcaAte > now)) particle(target.dimension, "alerta_anel", target.location, { radius: 0.8 });
    m.marca = 1;
    m.marcaDe = src.id;
    m.marcaAte = now + 160;
  } else if (sp === "senhor_bestas") {
    m.presaDe = src.id;
    m.presaAte = now + 120;
    for (const b of summonsOf(src)) {
      if (V.dist(b.location, target.location) > 16) continue;
      const dir = V.flat(V.sub(target.location, b.location));
      try { b.applyImpulse({ x: dir.x * 0.5, y: 0.15, z: dir.z * 0.5 }); } catch { /* */ }
    }
  } else if (sp === "inquisidor" && el === "holy") {
    m.cond = m.condDe === src.id && m.condAte > now ? Math.min(3, (m.cond || 0) + 1) : 1;
    m.condDe = src.id;
    m.condAte = now + 160;
    if (m.cond === 3) {
      particle(target.dimension, "sagrado_pilar", target.location, {});
      bar("§6Sentenciado! §7+20% de dano contra o alvo", src);
    }
  } else if (sp === "xama_tempestade") {
    const s = st(src);
    if ((s.tempestade || 0) >= 5) {
      s.tempestade = 0;
      particle(target.dimension, "raio_queda", target.location, {});
      particle(target.dimension, "raio_explosao", V.up(target.location, 0.5), { radius: 2 });
      sound(target.dimension, "ambient.weather.thunder", target.location, 1.2, 0.8);
      const power = stats(src).spell;
      for (const e of enemiesNear(src, target.location, 2.5, true)) dealDamage(src, e, 6 * power, "lightning", { kind: "reacao" });
      bar("§eOlho da Tempestade!", src);
    }
  }
}

// ------------------------------------------------------------------ conjuração
// Prévia (commit=false) é pura: só calcula. Confirmação (commit=true) acontece depois que o custo foi pago.
function cast(player, ab, id, commit) {
  const sp = specOf(player);
  if (!sp) return undefined;
  const spell = ab.tipo === "magia" || ab.tipo === "combo";
  const s = st(player);
  if (sp === "arquimago" && spell) {
    const n = (s.arc || 0) + 1;
    if (commit) {
      s.arc = n >= 4 ? 0 : n;
      if (n >= 4) {
        bar("§dSobrecarga Arcana! §7Feitiço gratuito e 30% mais forte", player);
        particle(player.dimension, "arcano_runas", V.up(player.location, 1), {});
      } else if (n === 3) system.run(() => ok(player) && bar("§dO próximo feitiço será Sobrecarregado", player));
    }
    return n >= 4 ? { cost: 0, power: 1.3 } : undefined;
  }
  if (sp === "elementalista" && spell) {
    const el = ab.element || "arcane";
    const afin = s.ultEl && s.ultEl !== el ? Math.min(3, (s.afin || 0) + 1) : 0;
    if (commit) {
      s.afin = afin;
      s.ultEl = el;
      if (afin) bar(`§bAfinidade Elemental ×${afin} §7(+${afin * 8}% de poder)`, player);
    }
    return { power: 1 + 0.08 * afin };
  }
  if (sp === "feiticeiro_sangue" && spell && ab.element === "blood") return hpPct(player) < 0.5 ? { power: 1.3 } : undefined;
  if (sp === "xama_tempestade" && spell && (ab.element === "lightning" || ab.element === "wind")) {
    if (commit) {
      s.tempestade = Math.min(5, (s.tempestade || 0) + 1);
      bar(`§eCargas da Tempestade: ${s.tempestade}/5`, player);
    }
    return undefined;
  }
  if (sp === "guardiao_bosque" && ab.scale === "heal" && s.enraizado) return { power: 1.2 };
  return undefined;
}

// ------------------------------------------------------------------ abates
function kill(ev) {
  const dead = ev.deadEntity;
  let killer = ev.damageSource?.damagingEntity;
  if (!isPlayer(dead) && tmarks.has(dead.id)) {
    const m = tmarks.get(dead.id);
    tmarks.delete(dead.id);
    if (m.cond >= 3 && m.condAte > tick()) {
      const inq = world.getAllPlayers().find((p) => p.id === m.condDe);
      if (inq) addEnergy(inq, 15);
    }
  }
  if (killer && !isPlayer(killer)) {
    const owner = summonOwner(killer);
    if (owner) killer = owner;
  }
  // invocação do Mestre dos Espíritos que morre devolve energia
  const owner = summonOwner(dead);
  if (owner && specOf(owner) === "mestre_espiritos") {
    addEnergy(owner, 15);
    bar("§3O espírito retorna a você: §9+15 energia", owner);
  }
  if (!isPlayer(killer)) return;
  const sp = specOf(killer);
  if (!sp) return;
  const now = tick();
  const s = st(killer);
  if (sp === "senhor_guerra" && (!s.bradoCd || s.bradoCd <= now)) {
    s.bradoCd = now + 300;
    for (const a of alliesNear(killer, killer.location, 10)) effect(a, "strength", 100, 0, true);
    sound(killer.dimension, "mob.ravager.roar", killer.location, 1.4, 0.8);
    particle(killer.dimension, "cor_anel", killer.location, { color: "gold", radius: 5 });
  } else if (sp === "necromante" && Math.random() < 0.35 && (!s.colheitaCd || s.colheitaCd <= now)) {
    s.colheitaCd = now + 80;
    let loc;
    try { loc = { ...dead.location }; } catch { return; }
    system.runTimeout(() => {
      if (!ok(killer)) return;
      particle(killer.dimension, "alma_pilar", loc, {});
      const [e] = summon(killer, "valdoria:guerreiro_esqueletico", 1, 20, stats(killer).elem?.summon ?? 1);
      if (e) try { e.teleport(loc); } catch { /* */ }
    }, 10);
  } else if (sp === "feiticeiro_sangue") {
    const h = health(killer);
    if (h) heal(killer, h.effectiveMax * 0.1);
  } else if (sp === "sombra" && (!s.sombraCd || s.sombraCd <= now)) {
    s.sombraCd = now + 120;
    effect(killer, "invisibility", 40, 0, false);
    particle(killer.dimension, "sombra_explosao", V.up(killer.location, 1), { radius: 0.8 });
  }
}

// ------------------------------------------------------------------ curas, esquivas e laços
function healed(src, target, amount, got) {
  if (!isPlayer(src) || specOf(src) !== "sumo_sacerdote" || !ok(target)) return;
  const over = amount - got;
  if (over < 1) return;
  effect(target, "absorption", 200, over >= 6 ? 1 : 0, false);
  particle(target.dimension, "halo", target.location, {});
}
function dodged(player) {
  if (specOf(player) !== "duelista") return;
  const s = st(player);
  s.aparar = true;
  s.apararAte = tick() + 40;
  bar("§ePronto para aparar!", player);
}
function loop() {
  const now = tick();
  if (now % 10 === 0) {
    const all = world.getAllPlayers();
    guardians = all.filter((p) => specOf(p) === "guardiao_real");
    warlords = all.filter((p) => specOf(p) === "senhor_guerra");
  }
  for (const p of world.getAllPlayers()) {
    const sp = specOf(p);
    if (!sp) continue;
    const s = st(p);
    if (sp === "templario" && (!s.egideCd || s.egideCd <= now) && now % 40 === 0) {
      particle(p.dimension, "halo", V.up(p.getHeadLocation(), 0.5), {});
    } else if (sp === "patrulheiro" && now % 120 === 0) {
      let list = [];
      try { list = p.dimension.getEntities({ location: p.location, maxDistance: 20 }).filter((e) => e.id !== p.id && isHostile(e)); } catch { /* */ }
      for (const e of list.slice(0, 12)) particle(p.dimension, "cor_ponto", V.up(e.location, 2.6), { color: "red" });
    } else if (sp === "guardiao_bosque" && now % 10 === 0) {
      const pos = p.location;
      const still = s.pos && Math.hypot(pos.x - s.pos.x, pos.z - s.pos.z) < 0.15 && p.isOnGround;
      s.parado = still ? (s.parado || 0) + 10 : 0;
      s.pos = { ...pos };
      s.enraizado = s.parado >= 40;
      if (s.enraizado && now % 40 === 0) {
        for (const a of alliesNear(p, p.location, 6)) effect(a, "regeneration", 60, 0, false);
        particle(p.dimension, "natureza_espinhos", p.location, { radius: 1.2 });
      }
    } else if (sp === "berserker" && s.fren && s.frenAte <= now) {
      s.fren = 0;
    }
  }
  if (now % 600 === 0) {
    for (const [id, m] of tmarks) if (!(m.marcaAte > now) && !(m.presaAte > now) && !(m.condAte > now)) tmarks.delete(id);
  }
}

export function startSpecs() {
  onBeforeHurt(beforeHurt);
  onMeleeHit(meleeHit);
  onElementHit(anyHit);
  onCast(cast);
  onKill(kill);
  onHeal(healed);
  onDodge(dodged);
  system.runInterval(loop, 1);
  world.afterEvents.playerLeave.subscribe((ev) => S.delete(ev.playerId));
}
