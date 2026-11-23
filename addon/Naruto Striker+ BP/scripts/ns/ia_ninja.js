// IA ninja: Kawarimi no Jutsu (substituicao) para os ninjas do mundo e
// fase de furia para chefes (vida maxima >= 500) ao cair abaixo de 50% de vida.
import { world, system } from "@minecraft/server";
import { ehJogador, valido, particula, somArea, tremer, gravar, aleatorio, mundoCfg, ehCriatura } from "./util";
import { textoFlutuante } from "./combate";
import { luaVermelhaAtiva } from "./eventos";
import { CHEFES_DIRIGIDOS } from "./chefes";

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
    if (!mundoCfg("kawarimi")) return;
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
    somArea(dim, "ns.kawarimi", origem, 0.9, 1.1);
    textoFlutuante(dim, { x: origem.x, y: origem.y + 2.2, z: origem.z }, "§7§oKawarimi!");

    system.runTimeout(() => {
      try {
        if (!valido(ninja) || !valido(player)) return;
        if ((ninja.getComponent("health")?.currentValue ?? 0) <= 0) return; // morreu nesse meio tempo
        ninja.teleport(destino, { facingLocation: player.location });
        particula(dim, "tnt:ns_fumaca_ninja", destino);
        somArea(dim, "ns.kawarimi", destino, 0.9, 0.9);
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
    if (!valido(chefe) || chefe.typeId === "minecraft:player" || !ehCriatura(chefe)) return;
    if (!mundoCfg("furia")) return;
    if (CHEFES_DIRIGIDOS.has(chefe.typeId)) return; // chefes com fases proprias (ns/chefes.js)
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

    somArea(dim, "ns.chefe.fase", loc, 1.2, 1);
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

/* ------------------------------------------------------------------ */
/* Ninjas de elite                                                     */
/* ------------------------------------------------------------------ */
const CHANCE_ELITE = 0.08;
const elites = new Set();

function tornarElite(e) {
  try {
    e.addTag("ns_elite");
    const dur = 20 * 60 * 60 * 24; // 24h de jogo
    e.addEffect("health_boost", dur, { amplifier: 4, showParticles: false });
    e.addEffect("strength", dur, { amplifier: 0, showParticles: false });
    e.addEffect("resistance", dur, { amplifier: 0, showParticles: false });
    system.runTimeout(() => {
      try { if (valido(e)) e.getComponent("health")?.resetToMaxValue(); } catch {}
    }, 2);
    elites.add(e.id);
  } catch {}
}

world.afterEvents.entitySpawn.subscribe((ev) => {
  try {
    const e = ev.entity;
    if (!valido(e) || !NINJAS.has(e.typeId)) return;
    if (e.hasTag("ns_elite") || e.getDynamicProperty("ns:sorteado")) return;
    if (!mundoCfg("elite")) return;
    gravar(e, "ns:sorteado", true);
    if (Math.random() < CHANCE_ELITE * (luaVermelhaAtiva() ? 3 : 1)) system.run(() => { if (valido(e)) tornarElite(e); });
  } catch {}
});

// aura dourada dos elites
system.runInterval(() => {
  for (const id of elites) {
    try {
      const e = world.getEntity(id);
      if (!valido(e)) { elites.delete(id); continue; }
      const l = e.location;
      particula(e.dimension, "tnt:ns_aura", l, [1.0, 0.78, 0.2]);
    } catch {
      elites.delete(id);
    }
  }
}, 8);

// reconstroi a lista ao carregar o mundo / chunks
system.runInterval(() => {
  for (const d of ["overworld", "nether", "the_end"]) {
    try {
      for (const e of world.getDimension(d).getEntities({ tags: ["ns_elite"] })) elites.add(e.id);
    } catch {}
  }
}, 200);

/* ------------------------------------------------------------------ */
/* Shunshin: ninjas chegam numa nuvem de fumaca                         */
/* ------------------------------------------------------------------ */
world.afterEvents.entitySpawn.subscribe((ev) => {
  try {
    const e = ev.entity;
    if (!valido(e) || !NINJAS.has(e.typeId)) return;
    if (ev.cause !== undefined && ev.cause !== "Spawned" && ev.cause !== "Event") return;
    particula(e.dimension, "tnt:ns_fumaca_ninja", e.location);
  } catch {}
});

/* ------------------------------------------------------------------ */
/* Falas de combate: cada faccao tem gritos de batalha e ultimas palavras */
/* ------------------------------------------------------------------ */
const FALAS = {
  folha: { ids: ["tnt:ninja_folha_b", "tnt:ninja_folha_s"], cor: "§a",
    luta: ["Pela Vila da Folha!", "A Vontade do Fogo queima em mim!", "Você não vai passar daqui!"],
    morte: ["A Vontade do Fogo... continua...", "Hokage-sama... me perdoe..."] },
  areia: { ids: ["tnt:ninja_areia_b", "tnt:ninja_areia_s"], cor: "§6",
    luta: ["A areia não perdoa!", "Pela Vila da Areia!", "O deserto vai te engolir!"],
    morte: ["Kazekage-sama...", "A areia... me chama..."] },
  uchiha: { ids: ["tnt:uchiha_b", "tnt:uchiha_s"], cor: "§c",
    luta: ["Seus olhos não veem o que os meus veem.", "Sinta o poder do clã Uchiha!", "Patético."],
    morte: ["Meu Sharingan... apagou...", "O clã... Uchiha..."] },
  espada: { ids: ["tnt:espadachin_s", "tnt:espadachin_ss"], cor: "§b",
    luta: ["Minha lâmina tem sede!", "Os Sete Espadachins não recuam!", "Vou te cortar ao meio!"],
    morte: ["Minha espada... quebrou...", "Que corte... perfeito..."] },
  anbu: { ids: ["tnt:anbu"], cor: "§7",
    luta: ["Alvo confirmado.", "Eliminação autorizada.", "..."],
    morte: ["Missão... falhou...", "..."] },
  bandidos: { ids: ["tnt:bandidos_rank_a", "tnt:bandidos_rank_c"], cor: "§e",
    luta: ["Passa tudo, ninja!", "Pega ele, pessoal!", "Hehe, mais um otário!"],
    morte: ["Eu me rendo! Eu me rendo!", "Não era pra ser assim..."] },
  zetsu: { ids: ["tnt:zetsu_branco"], cor: "§f",
    luta: ["Hehehe... achei você!", "Que chakra delicioso...", "Somos muitos..."],
    morte: ["Hehe... ainda existem... milhares...", "Ai..."] },
};
const FACCAO = new Map();
for (const f of Object.values(FALAS)) for (const id of f.ids) FACCAO.set(id, f);
const ultimaFala = new Map(); // entityId -> tick
const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

function falar(ent, texto, cor) {
  try {
    const c = ent.getHeadLocation();
    textoFlutuante(ent.dimension, { x: c.x, y: c.y + 1.4, z: c.z }, `${cor}§o"${texto}"`, 55, 0.04);
  } catch {}
}

// grito de batalha quando a luta comeca (golpe de qualquer lado), com recarga de 20s
world.afterEvents.entityHitEntity.subscribe((ev) => {
  try {
    const a = ev.damagingEntity, b = ev.hitEntity;
    const ninja = a && FACCAO.has(a.typeId) && ehJogador(b) ? a : b && FACCAO.has(b.typeId) && ehJogador(a) ? b : null;
    if (!valido(ninja)) return;
    const agora = system.currentTick;
    if (agora - (ultimaFala.get(ninja.id) ?? -9999) < 400) return;
    if (Math.random() > 0.35) return;
    ultimaFala.set(ninja.id, agora);
    const f = FACCAO.get(ninja.typeId);
    falar(ninja, sortear(f.luta), f.cor);
  } catch {}
});

// ultimas palavras (40% das vezes)
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const e = ev.deadEntity;
    const f = e && FACCAO.get(e.typeId);
    if (!f || Math.random() > 0.4) return;
    falar(e, sortear(f.morte), "§7");
    ultimaFala.delete(e.id);
  } catch {}
});

system.runInterval(() => {
  const agora = system.currentTick;
  for (const [id, t] of ultimaFala) if (agora - t > 400) ultimaFala.delete(id);
}, 1200);

/* ------------------------------------------------------------------ */
/* NPCs da vila falam quando um jogador se aproxima                     */
/* ------------------------------------------------------------------ */
const FALAS_NPC = {
  "tnt:teuchi": ["Ramen fresquinho! Vai um Ichiraku?", "O segredo está no caldo!", "Ninja de barriga vazia não luta bem!"],
  "tnt:iruka": ["Estudou para o exame, hein?", "Venha falar comigo sobre as missões.", "Nunca desista do seu caminho ninja!"],
  "tnt:tsunade_hokage": ["Tenho uma missão para você.", "Não me faça perder a paciência.", "Cuide da vila, shinobi."],
  "tnt:guy_npc_ex": ["O FOGO DA JUVENTUDE ARDE EM VOCÊ!", "Mais 500 voltas na vila!", "Os Portões só se abrem para quem treina duro!"],
  "tnt:jiraiya_npc_ex": ["Shhh... estou fazendo pesquisa.", "O Sábio dos Sapos tem muito a ensinar!", "Já ouviu falar do Monte Myoboku?"],
  "tnt:orochimaru_npc": ["Kukuku... que corpo interessante.", "O poder tem um preço...", "Procura força? Eu posso te dar..."],
};
const TIPOS_NPC = Object.keys(FALAS_NPC);
const ultimaFalaNpc = new Map();

system.runInterval(() => {
  const agora = system.currentTick;
  for (const player of world.getPlayers()) {
    try {
      for (const npc of player.dimension.getEntities({ location: player.location, maxDistance: 7 })) {
        if (!FALAS_NPC[npc.typeId]) continue;
        if (agora - (ultimaFalaNpc.get(npc.id) ?? -99999) < 600) continue; // 30s por NPC
        ultimaFalaNpc.set(npc.id, agora);
        const c = npc.getHeadLocation();
        textoFlutuante(npc.dimension, { x: c.x, y: c.y + 1.3, z: c.z }, `§f§o"${sortear(FALAS_NPC[npc.typeId])}"`, 70, 0.03);
      }
    } catch {}
  }
  for (const [id, t] of ultimaFalaNpc) if (agora - t > 1200) ultimaFalaNpc.delete(id);
}, 40);
