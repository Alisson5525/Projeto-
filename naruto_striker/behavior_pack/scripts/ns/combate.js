// Sistema de Combate+: golpes criticos, combos, numeros de dano flutuantes,
// faiscas de impacto, tremor de camera, "puf" de fumaca ninja e XP por abate.
import { world, system, ItemStack } from "@minecraft/server";
import { ehJogador, valido, lerNum, particula, som, somArea, tremer, config, aleatorio, ehCriatura, lerJSON, gravarJSON, somarScore, msg } from "./util";
import { darXP, somarStat, maxStat, nivelDe } from "./progressao";
import { luaVermelhaAtiva } from "./eventos";

const TEXTO_ID = "tnt:ns_texto";
const MAX_TEXTOS = 24;
const VIDA_TEXTO = 18; // ticks

const IGNORAR = new Set([
  TEXTO_ID, "minecraft:item", "minecraft:xp_orb", "minecraft:arrow", "minecraft:armor_stand",
  "tnt:despawn", "tnt:correr",
]);

/* ---------------- Numeros flutuantes ---------------- */
const textos = []; // { ent, vida, vy }

function removerTexto(ent) {
  try {
    if (!valido(ent)) return;
    if (typeof ent.remove === "function") ent.remove();
    else ent.triggerEvent("ns:sumir");
  } catch {
    try { ent.triggerEvent("ns:sumir"); } catch {}
  }
}

export function textoFlutuante(dim, loc, texto, vida = VIDA_TEXTO, subida = 0.11) {
  try {
    while (textos.length >= MAX_TEXTOS) removerTexto(textos.shift().ent);
    const pos = { x: loc.x + aleatorio(-0.35, 0.35), y: loc.y, z: loc.z + aleatorio(-0.35, 0.35) };
    const ent = dim.spawnEntity(TEXTO_ID, pos);
    ent.nameTag = texto;
    textos.push({ ent, vida, vy: subida });
  } catch {}
}

system.runInterval(() => {
  for (let i = textos.length - 1; i >= 0; i--) {
    const t = textos[i];
    t.vida--;
    if (t.vida <= 0 || !valido(t.ent)) {
      removerTexto(t.ent);
      textos.splice(i, 1);
      continue;
    }
    try {
      const l = t.ent.location;
      t.vy *= 0.84; // desacelera suavemente (ease-out)
      t.ent.teleport({ x: l.x, y: l.y + t.vy, z: l.z });
    } catch {}
  }
}, 1);

// limpa textos que sobraram de uma sessao anterior (mundo fechado no meio da animacao)
system.runTimeout(() => {
  for (const d of ["overworld", "nether", "the_end"]) {
    try {
      for (const e of world.getDimension(d).getEntities({ type: TEXTO_ID })) removerTexto(e);
    } catch {}
  }
}, 40);

/* ---------------- Combos ---------------- */
const combos = new Map(); // playerId -> { n, ultimo }
const JANELA_COMBO = 40; // 2s

function registrarCombo(player) {
  const agora = system.currentTick;
  const c = combos.get(player.id) ?? { n: 0, ultimo: 0 };
  c.n = agora - c.ultimo <= JANELA_COMBO ? c.n + 1 : 1;
  c.ultimo = agora;
  combos.set(player.id, c);
  return c.n;
}

system.runInterval(() => {
  const agora = system.currentTick;
  for (const [id, c] of combos) {
    if (agora - c.ultimo > JANELA_COMBO) combos.delete(id);
  }
  for (const [id, t] of finalizacoes) {
    if (agora - t > 20) finalizacoes.delete(id);
  }
  for (const [id, g] of golpes) {
    if (agora - g.tick > 20) golpes.delete(id);
  }
}, 100);

function corDano(d, crit) {
  if (crit) return "§6§l";
  if (d >= 40) return "§c§l";
  if (d >= 15) return "§c";
  if (d >= 6) return "§e";
  return "§f";
}

/* ---------------- Dano ---------------- */
// alvo.id -> tick do golpe critico que finalizou com dano "override" (nao reprocessar)
const finalizacoes = new Map();

// Entidades do add-on que podem ser finalizadas pelo critico. As demais (missoes,
// chefes, NPCs) ficam com no minimo 1 de vida para nao pular eventos roteirizados.
const FINALIZAVEIS = new Set([
  "tnt:ninja_folha_b", "tnt:ninja_folha_s", "tnt:ninja_areia_b", "tnt:ninja_areia_s",
  "tnt:uchiha_b", "tnt:uchiha_s", "tnt:espadachin_s", "tnt:espadachin_ss", "tnt:anbu",
  "tnt:bandidos_rank_a", "tnt:bandidos_rank_c", "tnt:zetsu_branco",
]);

function aplicarBonusCritico(alvo, player, dano, extra) {
  const vida = alvo.getComponent("health");
  if (!vida) return;
  const atual = vida.currentValue;
  const podeFinalizar = alvo.typeId.startsWith("minecraft:") || FINALIZAVEIS.has(alvo.typeId);
  if (!podeFinalizar) {
    if (atual > 1) vida.setCurrentValue(Math.max(1, atual - extra));
    return;
  }
  if (atual - extra > 0.5) {
    // tira a vida direto: ignora o tempo de invulnerabilidade apos o golpe
    vida.setCurrentValue(atual - extra);
  } else {
    // golpe final: dano maior que o anterior atravessa a invulnerabilidade e da credito do abate
    finalizacoes.set(alvo.id, system.currentTick);
    alvo.applyDamage(dano + extra + atual + 1, { cause: "override", damagingEntity: player });
  }
}

// alvo.id -> { playerId, tick } do ultimo golpe corpo a corpo REAL (entityHitEntity).
// Jutsus em area tambem causam dano "entityAttack", entao so isto separa um soco/espadada.
const golpes = new Map();

const ESPADAS = new Set([
  "tnt:katubowari", "tnt:kiba", "tnt:kubikiribocho", "tnt:kunai_asuma", "tnt:shibuki", "tnt:hiramekarei",
  "tnt:foice_hidan", "tnt:gunbai", "tnt:kunai_minato", "tnt:samehada", "tnt:bastao_gudoudama",
]);

/* Arco de corte brilhante na frente do jogador ao golpear com uma espada ninja. */
function arcoDeCorte(p) {
  const v = p.getViewDirection();
  const h = Math.hypot(v.x, v.z) || 1;
  const fx = v.x / h, fz = v.z / h;          // frente
  const lx = -fz, lz = fx;                   // lado
  const base = p.location;
  const lado = Math.random() < 0.5 ? 1 : -1; // corte da direita p/ esquerda ou o contrario
  const cor = [0.75, 0.9, 1.0];
  for (let i = 0; i <= 10; i++) {
    const ang = ((i / 10) * 140 - 70) * (Math.PI / 180) * lado;
    const r = 1.6;
    const px = base.x + (fx * Math.cos(ang) + lx * Math.sin(ang)) * r;
    const pz = base.z + (fz * Math.cos(ang) + lz * Math.sin(ang)) * r;
    const py = base.y + 1.15 + (i / 10 - 0.5) * 0.5 * lado; // leve diagonal
    particula(p.dimension, "tnt:ns_corte", { x: px, y: py, z: pz }, cor);
  }
}

world.afterEvents.entityHitEntity.subscribe((ev) => {
  try {
    const p = ev.damagingEntity;
    const alvo = ev.hitEntity;
    if (!ehJogador(p) || !alvo) return;
    golpes.set(alvo.id, { playerId: p.id, tick: system.currentTick });
    const item = p.getComponent("equippable")?.getEquipment("Mainhand");
    if (item && ESPADAS.has(item.typeId) && config(p).rastro) arcoDeCorte(p);
  } catch {}
});

world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    if (!valido(alvo) || IGNORAR.has(alvo.typeId)) return;
    if (!ehCriatura(alvo) && alvo.typeId !== "tnt:dummy") return; // jutsus/efeitos com vida
    const atacante = ev.damageSource?.damagingEntity;
    const dano = ev.damage;
    if (!(dano > 0)) return;

    // golpe final do critico chega aqui de novo: ja foi mostrado
    const fin = finalizacoes.get(alvo.id);
    if (fin !== undefined && ev.damageSource?.cause === "override" && system.currentTick - fin <= 3) {
      finalizacoes.delete(alvo.id);
      return;
    }

    const loc = alvo.location;
    let cabeca;
    try { cabeca = alvo.getHeadLocation(); } catch { cabeca = { x: loc.x, y: loc.y + 1.6, z: loc.z }; }
    const dados = {
      alvo, dano, dim: alvo.dimension,
      loc: { x: loc.x, y: loc.y, z: loc.z },
      cabeca: { x: cabeca.x, y: cabeca.y, z: cabeca.z },
      peito: { x: loc.x, y: (loc.y + cabeca.y) / 2 + 0.2, z: loc.z },
      tick: system.currentTick,
    };

    if (!ehJogador(atacante) || atacante.id === alvo.id) {
      // jogador ferido por mob: so a faisca
      if (alvo.typeId === "minecraft:player") {
        particula(dados.dim, "tnt:ns_impacto", dados.peito);
        if (dano >= 6) tremer(alvo, Math.min(0.45, 0.1 + dano * 0.012), 0.2);
      }
      return;
    }

    // processa no tick seguinte: ai o evento entityHitEntity do mesmo golpe ja chegou
    system.run(() => {
      try { processarGolpe(atacante, dados); } catch {}
    });
  } catch {}
});

/* ---------------- Medidor de DPS no boneco de treino ---------------- */
const DUMMY = "tnt:dummy";
const dps = new Map(); // dummyId -> { ent, golpes: [{ t, dano }] }

function registrarDps(alvo, dano) {
  const r = dps.get(alvo.id) ?? { ent: alvo, golpes: [] };
  r.ent = alvo;
  r.golpes.push({ t: system.currentTick, dano });
  dps.set(alvo.id, r);
}

system.runInterval(() => {
  const agora = system.currentTick;
  for (const [id, r] of dps) {
    r.golpes = r.golpes.filter((g) => agora - g.t <= 100);
    if (!r.golpes.length || !valido(r.ent)) {
      dps.delete(id);
      continue;
    }
    const total = r.golpes.reduce((a, g) => a + g.dano, 0);
    const janela = Math.max(20, Math.min(100, agora - r.golpes[0].t + 1)) / 20;
    try {
      const l = r.ent.location;
      textoFlutuante(r.ent.dimension, { x: l.x, y: l.y + 2.6, z: l.z }, `§bDPS: §f${(total / janela).toFixed(1)} §7(${Math.round(total)} em ${janela.toFixed(1)}s)`);
    } catch {}
  }
}, 20);

function processarGolpe(player, d) {
  if (!ehJogador(player)) return;
  const cfg = config(player);
  const g = golpes.get(d.alvo.id);
  const corpoACorpo = !!g && g.playerId === player.id && Math.abs(g.tick - d.tick) <= 1;

  let critico = false;
  let total = d.dano;
  let n = 0;
  if (corpoACorpo) {
    golpes.delete(d.alvo.id);
    // ----- critico -----
    const chance = 0.08 + Math.min(0.14, nivelDe(player) * 0.0014);
    let vivo = false;
    try { vivo = valido(d.alvo) && (d.alvo.getComponent("health")?.currentValue ?? 0) > 0; } catch {}
    if (vivo && Math.random() < chance) {
      critico = true;
      const extra = Math.max(1, Math.round(d.dano * 0.6));
      total += extra;
      try { aplicarBonusCritico(d.alvo, player, d.dano, extra); } catch {}
      somarStat(player, "ns:criticos", 1);
    }
    // ----- combo -----
    n = registrarCombo(player);
    maxStat(player, "ns:combo_max", n);
    // tom ascendente a cada golpe do combo
    if (n >= 3) som(player, "random.orb", 0.25, Math.min(2.0, 0.7 + n * 0.06));
  }

  // ----- ataque furtivo: golpe corpo a corpo enquanto invisivel (ex.: Bomba de Fumaca) -----
  let furtivo = false;
  if (corpoACorpo) {
    let invisivel = false;
    try { invisivel = !!player.getEffect?.("invisibility"); } catch {}
    let vivo2 = false;
    try { vivo2 = valido(d.alvo) && (d.alvo.getComponent("health")?.currentValue ?? 0) > 0; } catch {}
    if (invisivel && vivo2) {
      furtivo = true;
      const extra = Math.max(1, Math.round(d.dano));
      try { aplicarBonusCritico(d.alvo, player, d.dano, extra); } catch {}
      total += extra;
      try { player.removeEffect("invisibility"); } catch {}
      particula(d.dim, "tnt:ns_fumaca_ninja", d.peito);
      som(player, "mob.shulker.close", 0.8, 0.6);
    }
  }

  // ----- jutsus escalam com o nivel ninja: +0,5% por nivel (ate +50%) -----
  let jutsu = false;
  if (!corpoACorpo) {
    jutsu = true;
    const extra = Math.round(d.dano * Math.min(0.5, nivelDe(player) * 0.005));
    let vivo = false;
    try { vivo = valido(d.alvo) && (d.alvo.getComponent("health")?.currentValue ?? 0) > 0; } catch {}
    if (extra >= 1 && vivo) {
      try { aplicarBonusCritico(d.alvo, player, d.dano, extra); } catch {}
      total += extra;
    }
  }

  if (d.alvo.typeId === DUMMY) {
    registrarDps(d.alvo, total);
    // boneco de treino se regenera: da para medir DPS sem parar (e nao vira fazenda de XP)
    try {
      const vida = d.alvo.getComponent("health");
      if (vida && vida.currentValue > 0 && vida.currentValue < vida.effectiveMax * 0.3) {
        vida.resetToMaxValue();
        particula(d.dim, "tnt:ns_level_up_anel", d.loc);
      }
    } catch {}
  }

  // ----- impacto fisico: critico e cada 5o golpe do combo empurram o alvo -----
  const finalizador = corpoACorpo && n >= 5 && n % 5 === 0;
  if ((critico || finalizador) && valido(d.alvo)) {
    const empurravel = d.alvo.typeId.startsWith("minecraft:") || FINALIZAVEIS.has(d.alvo.typeId);
    // "hit-stop": o alvo congela por um instante antes de ser arremessado
    if (empurravel && d.alvo.typeId !== "minecraft:player") {
      try { d.alvo.addEffect("slowness", finalizador ? 6 : 4, { amplifier: 6, showParticles: false }); } catch {}
    }
    if (empurravel) {
      const v = player.getViewDirection();
      const h = Math.hypot(v.x, v.z) || 1;
      const alvo = d.alvo;
      // o empurrao vem depois da pausa, para o hit-stop ser sentido
      system.runTimeout(() => {
        try {
          if (valido(alvo)) alvo.applyKnockback(v.x / h, v.z / h, finalizador ? 1.4 : 0.9, finalizador ? 0.42 : 0.28);
        } catch {}
      }, finalizador ? 5 : 3);
    }
    if (finalizador) {
      particula(d.dim, "tnt:ns_onda", { x: d.loc.x, y: d.loc.y + 0.1, z: d.loc.z });
      som(player, "random.explode", 0.25, 1.8);
      tremer(player, 0.2, 0.2);
    }
  }

  // ----- visual -----
  particula(d.dim, critico ? "tnt:ns_critico" : "tnt:ns_impacto", d.peito);
  if (critico) {
    particula(d.dim, "tnt:ns_faisca_raio", d.peito);
    som(player, "random.anvil_land", 0.25, 1.9);
    tremer(player, 0.18, 0.18);
  } else if (total >= 20 && corpoACorpo) {
    tremer(player, 0.12, 0.15);
  }
  if (total >= 25) particula(d.dim, "tnt:ns_onda", { x: d.loc.x, y: d.loc.y + 0.1, z: d.loc.z });

  if (cfg.numeros) {
    const num = Math.round(total * 10) / 10;
    const txt = furtivo ? `§8§lASSASSINATO! §f§l${num}` : critico ? `§6§lCRÍTICO! §e§l${num}` : jutsu ? `§b${num}` : corDano(total, false) + num;
    textoFlutuante(d.dim, { x: d.cabeca.x, y: d.cabeca.y + 0.55, z: d.cabeca.z }, txt);
    if (n >= 3 && (n <= 5 || n % 5 === 0)) {
      const corCombo = n >= 25 ? "§c§l" : n >= 10 ? "§6§l" : "§e§l";
      textoFlutuante(d.dim, { x: d.cabeca.x, y: d.cabeca.y + 1.05, z: d.cabeca.z }, `${corCombo}${n} HITS!`);
    }
  }
}

/* ---------------- Abates ---------------- */
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const morto = ev.deadEntity;
    if (!morto || IGNORAR.has(morto.typeId)) return;
    const killer = ev.damageSource?.damagingEntity;

    let loc;
    try { loc = morto.location; } catch { return; }
    const dim = morto.dimension;

    let vidaMax = 0;
    try { vidaMax = morto.getComponent("health")?.effectiveMax ?? 0; } catch {}
    if (vidaMax < 2) return; // projeteis / entidades de efeito

    // "puf" de fumaca ninja ao derrotar os ninjas do add-on
    if (morto.typeId.startsWith("tnt:") && ehCriatura(morto)) particula(dim, "tnt:ns_fumaca_ninja", loc);

    if (!ehJogador(killer) || morto.typeId === "minecraft:player") return;
    if (!ehCriatura(morto)) return; // sem XP por destruir jutsus/efeitos

    const combo = combos.get(killer.id)?.n ?? 1;
    const bonusCombo = 1 + Math.min(1, (combo - 1) * 0.05);
    const ehNinja = morto.typeId.startsWith("tnt:");
    let elite = false;
    try { elite = morto.hasTag("ns_elite"); } catch {}
    let xp = Math.max(3, Math.round(vidaMax / 3)) * (ehNinja ? 1.5 : 1) * bonusCombo * (elite ? 3 : 1) * (luaVermelhaAtiva() ? 2 : 1);
    xp = Math.min(1500, Math.round(xp));

    somarStat(killer, "ns:kills", 1);
    if (luaVermelhaAtiva()) somarStat(killer, "ns:kills_lua", 1);
    if (vidaMax >= 400 && morto.typeId.startsWith("tnt:")) primeiraVitoria(killer, morto, vidaMax);

    // saque de ferramentas ninja: elites 60%, demais ninjas 6%
    if (morto.typeId.startsWith("tnt:") && Math.random() < (elite ? 0.6 : 0.06)) {
      try {
        const pilula = Math.random() < 0.5;
        dim.spawnItem(new ItemStack(pilula ? "tnt:ns_pilula_soldado" : "tnt:ns_bomba_fumaca", pilula ? 1 : 2), { x: loc.x, y: loc.y + 0.5, z: loc.z });
      } catch {}
    }
    if (vidaMax >= 500) {
      somarStat(killer, "ns:chefes", 1);
      tremer(killer, 0.6, 1.0);
      particula(dim, "tnt:ns_level_up", loc);
      somArea(dim, "random.totem", loc, 0.6, 1.2);
    }

    if (config(killer).numeros) {
      textoFlutuante(dim, { x: loc.x, y: loc.y + 1.2, z: loc.z }, elite ? `§6§lELITE! §b+${xp} XP` : `§b+${xp} XP`);
    }
    darXP(killer, xp, "abate");
  } catch {}
});

/* Jogador morreu: zera o combo dele */
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    if (ev.deadEntity?.typeId === "minecraft:player") combos.delete(ev.deadEntity.id);
  } catch {}
});

/* Primeira vitoria contra cada chefe/ninja forte: bonus unico de TP anunciado ao servidor. */
function primeiraVitoria(player, morto, vidaMax) {
  try {
    const lista = lerJSON(player, "ns:primeiras", []);
    if (!Array.isArray(lista) || lista.includes(morto.typeId)) return;
    lista.push(morto.typeId);
    gravarJSON(player, "ns:primeiras", lista);
    const tp = Math.min(1500, Math.round(vidaMax / 4 / 50) * 50 + 100);
    somarScore(player, "tp", tp);
    const NOMES = { "tnt:kurama_biju": "Kurama, a Raposa de Nove Caudas", "tnt:shukaku_biju": "Shukaku, o Uma Cauda", "tnt:shukaku_biju_miss": "Shukaku, o Uma Cauda" };
    let nome = NOMES[morto.typeId] ?? morto.typeId.replace("tnt:", "").replace(/_/g, " ");
    try { const n = morto.nameTag; if (n) nome = n.split("\n")[0]; } catch {}
    for (const p of world.getAllPlayers()) {
      msg(p, `§6§l[PRIMEIRA VITÓRIA]§r §f${player.name} §7derrotou §f${nome}§7 pela primeira vez! §e+${tp} TP`);
    }
  } catch {}
}
