// Missões dos moradores: linha de missões da vila com objetivos variados (conversar, entregar, caçar, resgatar,
// recuperar artefato e investigar com acusação), resgate do prisioneiro e confronto com o espião do Véu Negro.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { NS, V, ok, isPlayer, chance, say, countItem, takeItem, giveItem } from "../core/util.js";
import { particle, psound, sound } from "../core/fx.js";
import { markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { onKill } from "../core/damage.js";
import { summonOwner } from "../abilities/engine.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { refreshLore } from "../items/equipment.js";
import { allSites, getSite, nearestSite, TAG, inBox, onSite } from "../structures/registry.js";
import { Plan } from "../structures/builder.js";
import { scrollItem } from "../structures/scrolls.js";
import { show, npcData, addCoins, addRep, isNight } from "./economy.js";
import { ROLES, OFICIO } from "./roles.js";

const I = (id) => `${NS}:${id}`;
const GOBLINS = [I("goblin"), I("goblin_xama"), I("chefe_goblin")];

export const NPC_QUESTS = {
  boas_vindas: {
    de: "anciao", nome: "Boas-vindas a Valdoria",
    texto: "Apresente-se ao Ferreiro, à Mercadora e ao Mestre da Guilda. Quem defende esta vila precisa ser conhecido por ela.",
    obj: { tipo: "falar", papeis: ["ferreiro", "mercador", "mestre_guilda"] }, alvo: "Converse com o Ferreiro, a Mercadora e o Mestre da Guilda",
    recompensa: { moedas: 40, xp: 80, rep: 15 }, fim: "Muito bem. Agora a vila conhece você. Volte sempre que precisar.",
  },
  ferro_forja: {
    de: "ferreiro", req: ["boas_vindas"], nome: "Ferro para a Forja",
    texto: "Preciso de 12 lingotes de ferro para as lanças da guarda. Pago em moedas, e você escolhe uma arma da minha bancada.",
    obj: { tipo: "entregar", item: "minecraft:iron_ingot", n: 12 }, alvo: "Entregue 12 lingotes de ferro",
    recompensa: { moedas: 50, xp: 120, rep: 10, escolha: [I("espada_longa_aco"), I("machado_guerra_aco"), I("lanca_aco"), I("maca_aco"), I("katana_aco")] },
    fim: "Ferro de boa qualidade! Escolha sua arma, você mereceu.",
  },
  ameaca_estrada: {
    de: "capitao", nome: "Ameaça na Estrada", texto: "Goblins emboscam quem vem para a feira. Derrote 8 deles e a estrada voltará a ser segura.",
    obj: { tipo: "abate", alvos: GOBLINS, n: 8 }, alvo: "Derrote 8 goblins", recompensa: { moedas: 80, xp: 150, rep: 15 },
    fim: "Bom trabalho. Os mercadores já voltaram a passar pelo portão sul.",
  },
  ingredientes: {
    de: "alquimista", req: ["boas_vindas"], nome: "Ingredientes Raros",
    texto: "Ectoplasma de espectro estabiliza minhas poções de energia. Traga 4 e divido a produção com você.",
    obj: { tipo: "entregar", item: I("ectoplasma"), n: 4 }, alvo: "Entregue 4 Ectoplasmas",
    recompensa: { moedas: 50, xp: 120, rep: 10, itens: [[I("pocao_energia"), 4]] }, fim: "Perfeito! Aqui está sua parte.",
  },
  filho_desaparecido: {
    de: "fazendeiro", req: ["boas_vindas"], nome: "O Filho Desaparecido",
    texto: "Meu filho Tomé foi levado pelos goblins! Dizem que o prenderam numa barraca de acampamento. Por favor, traga-o de volta.",
    obj: { tipo: "resgate" }, alvo: "Liberte Tomé no acampamento goblin", recompensa: { moedas: 100, xp: 250, rep: 25, itens: [["minecraft:golden_apple", 1]] },
    fim: "Tomé está em casa! Não tenho como agradecer... aceite isto, por favor.",
  },
  calice_roubado: {
    de: "curandeira", req: ["boas_vindas"], nome: "O Cálice Roubado",
    texto: "Um espectro levou o Cálice Sagrado do templo numa noite sem lua. Os espectros vagam à noite e assombram as torres antigas.",
    obj: { tipo: "artefato", item: I("calice_sagrado"), fonte: I("espectro"), chance: 0.35 }, alvo: "Recupere o Cálice Sagrado (espectros)",
    recompensa: { moedas: 120, xp: 300, rep: 25, itens: [[I("runa_luz"), 2]] }, fim: "O Cálice voltou ao altar. A Luz agradece, e eu também.",
  },
  sombras_vila: {
    de: "anciao", req: ["filho_desaparecido"], nome: "Sombras na Vila",
    texto: "Tomé disse que os goblins tinham um mapa da vila desenhado por alguém daqui. Pergunte ao Taverneiro, ao Capitão e à Mercadora, " +
      "depois volte e me diga quem é o espião.",
    obj: { tipo: "investigacao", pistas: ["taverneiro", "capitao", "mercador"] }, alvo: "Investigue e desmascare o espião",
    recompensa: { moedas: 200, xp: 500, rep: 40, itens: [[I("mapa_explorador"), 1]] },
    fim: "Uma carta da Dama de Véu Negro... então ela já está de olho em Valdoria. Leve isto; vamos precisar de você.",
  },
};

const PISTAS = {
  taverneiro: "Tem um forasteiro encapuzado que aparece toda noite. Senta no canto, paga com moedas escuras e nunca tira o capuz.",
  capitao: "Vi alguém sair pelo portão norte de madrugada, com um rolo de pergaminho debaixo de um manto escuro.",
  mercador: "Alguém comprou tinta e pergaminho e perguntou onde mora o Ancião e quantos guardas temos. Usava um anel de pedra roxa.",
};
const SUSPEITOS = [
  ["Doran, o bardo da taverna", false, "Doran? Ele mal consegue guardar uma canção na cabeça, quanto mais um segredo."],
  ["O forasteiro encapuzado da taverna", true, ""],
  ["Merrin, o tecelão", false, "Merrin passou a semana no tear, eu mesmo vi. Pense melhor."],
];

// ------------------------------------------------------------------ estado
export function qState(player, id) {
  return npcData(player).npc.q[id];
}
function available(player, id) {
  const Q = NPC_QUESTS[id];
  const d = npcData(player);
  if (d.npc.q[id]) return false;
  return (Q.req || []).every((r) => d.npc.q[r]?.e === "feita");
}
export function progress(player, id) {
  const Q = NPC_QUESTS[id];
  const st = qState(player, id);
  if (!st) return { p: 0, n: 1, done: false };
  const o = Q.obj;
  switch (o.tipo) {
    case "falar": return { p: st.lista.length, n: o.papeis.length, done: st.lista.length >= o.papeis.length };
    case "entregar": { const p = Math.min(countItem(player, o.item), o.n); return { p, n: o.n, done: p >= o.n }; }
    case "abate": return { p: Math.min(st.p, o.n), n: o.n, done: st.p >= o.n };
    case "artefato": { const p = countItem(player, o.item) > 0 ? 1 : 0; return { p, n: 1, done: p >= 1 }; }
    case "resgate": return { p: st.livre ? 1 : 0, n: 1, done: !!st.livre };
    case "investigacao": return { p: st.pistas.length + (st.acusou ? 1 : 0) + (st.carta ? 1 : 0), n: o.pistas.length + 2, done: !!st.carta };
    default: return { p: 0, n: 1, done: false };
  }
}

export function questLines(player) {
  const out = [];
  for (const [id, Q] of Object.entries(NPC_QUESTS)) {
    const st = qState(player, id);
    if (!st || st.e === "feita") continue;
    const pr = progress(player, id);
    let alvo = Q.alvo;
    if (Q.obj.tipo === "investigacao") {
      alvo = st.carta ? "Leve a carta ao Ancião" : st.acusou ? "Confronte o forasteiro na taverna, à noite" :
        st.pistas.length >= Q.obj.pistas.length ? "Volte ao Ancião e aponte o espião" : `Colete pistas (${st.pistas.length}/${Q.obj.pistas.length})`;
    }
    out.push(`§e${Q.nome} §8(${ROLES[Q.de].titulo})\n§7${alvo}${pr.done ? " §a- pronto para entregar" : ` §f(${pr.p}/${pr.n})`}`);
  }
  return out;
}

function give(player, Q) {
  const r = Q.recompensa;
  if (r.moedas) addCoins(player, r.moedas, "missão");
  if (r.xp) addXP(player, r.xp, "missão");
  if (r.rep) addRep(player, r.rep, "missão");
  for (const [id, n] of r.itens || []) {
    const st = new ItemStack(id, n);
    if (ITEM_DATA[id]) refreshLore(st);
    giveItem(player, st);
  }
  particle(player.dimension, "nivel_anel", player.location);
  psound(player, "random.levelup", 1.1, 0.8);
}

async function choose(player, ids) {
  const f = new ActionFormData().title("Escolha sua recompensa").body("§7Uma arma da bancada do ferreiro.");
  for (const id of ids) f.button(ITEM_DATA[id]?.n || id, `textures/items/valdoria/${id.split(":")[1]}`);
  const r = await show(player, f);
  const id = ids[r.canceled || r.selection === undefined ? 0 : r.selection];
  const st = new ItemStack(id, 1);
  refreshLore(st);
  giveItem(player, st);
}

async function turnIn(player, id) {
  const Q = NPC_QUESTS[id];
  const st = qState(player, id);
  if (!progress(player, id).done) return false;
  if (Q.obj.tipo === "entregar" && !takeItem(player, Q.obj.item, Q.obj.n)) return false;
  if (Q.obj.tipo === "artefato" && !takeItem(player, Q.obj.item, 1)) return false;
  st.e = "feita";
  markDirty(player);
  give(player, Q);
  if (Q.recompensa.escolha) await choose(player, Q.recompensa.escolha);
  saveNow(player);
  say(player, `§6[Missão] §fConcluída: §e${Q.nome}`);
  await show(player, new MessageFormData().title(Q.nome).body(`§f${Q.fim}`).button1("OK").button2("Fechar"));
  return true;
}

function accept(player, id) {
  const Q = NPC_QUESTS[id];
  const d = npcData(player);
  const st = { e: "ativa", p: 0, lista: [], pistas: [] };
  if (Q.obj.tipo === "resgate") {
    const hit = nearestSite(player.location, player.dimension.id, (r) => r.tipo === "acampamento");
    st.camp = hit && hit.dist < 2500 ? hit.rec.id : null;
  }
  d.npc.q[id] = st;
  markDirty(player);
  say(player, `§6[Missão] §fNova missão: §e${Q.nome} §7- ${Q.alvo}`);
  psound(player, "random.toast", 1, 1);
  if (Q.obj.tipo === "resgate") {
    const rec = st.camp ? getSite(st.camp) : null;
    say(player, rec ? `§7O fazendeiro aponta para ${rec.nome}, em ${rec.x} ${rec.y} ${rec.z}.`
      : "§7Ninguém sabe onde fica o acampamento. Explore as florestas; o Mapa do Explorador ajuda.");
  }
}

// ------------------------------------------------------------------ menus (abertos pelo diálogo)
/** Opções de missão para um papel: [rótulo, ação]. */
export function questOptions(player, role, npc) {
  const out = [];
  for (const [id, Q] of Object.entries(NPC_QUESTS)) {
    const st = qState(player, id);
    if (Q.de === role) {
      if (available(player, id)) out.push([`§2Nova missão: §f${Q.nome}`, () => offer(player, id)]);
      else if (st?.e === "ativa") {
        if (Q.obj.tipo === "investigacao" && st.pistas.length >= Q.obj.pistas.length && !st.acusou) out.push(["§6Apontar o espião", () => accuse(player, id)]);
        else if (progress(player, id).done) out.push([`§a§lEntregar: §r§f${Q.nome}`, () => turnIn(player, id)]);
        else out.push([`§7Missão: ${Q.nome}`, () => status(player, id)]);
      }
    }
    if (Q.obj.tipo === "investigacao" && st?.e === "ativa" && Q.obj.pistas.includes(role) && !st.pistas.includes(role)) {
      out.push(["§6Perguntar sobre forasteiros", () => clue(player, id, role)]);
    }
    if (role === "forasteiro" && Q.obj.tipo === "investigacao" && st?.acusou && !st.carta && npc) {
      out.push(["§c\"Eu sei quem você é.\"", () => confront(player, npc)]);
    }
  }
  return out;
}

async function offer(player, id) {
  const Q = NPC_QUESTS[id];
  const r = Q.recompensa;
  const rw = [r.moedas && `${r.moedas} moedas`, r.xp && `${r.xp} XP`, r.rep && `+${r.rep} reputação`,
    ...(r.itens || []).map(([it, n]) => `${n}× ${ITEM_DATA[it]?.n || it.replace("minecraft:", "").replace(/_/g, " ")}`),
    r.escolha && "uma arma à escolha"].filter(Boolean).join(", ");
  const f = new MessageFormData().title(Q.nome).body(`§f${Q.texto}\n\n§6Objetivo: §f${Q.alvo}\n§6Recompensa: §f${rw}`)
    .button1("§lAceitar").button2("Agora não");
  const k = await show(player, f);
  if (!k.canceled && k.selection === 0) accept(player, id);
}

async function status(player, id) {
  const Q = NPC_QUESTS[id];
  const pr = progress(player, id);
  await show(player, new MessageFormData().title(Q.nome).body(`§f${Q.texto}\n\n§6Objetivo: §f${Q.alvo} §7(${pr.p}/${pr.n})`).button1("OK").button2("Fechar"));
}

async function clue(player, id, role) {
  const st = qState(player, id);
  st.pistas.push(role);
  markDirty(player);
  psound(player, "item.book.page_turn", 1, 1);
  await show(player, new MessageFormData().title("Pista").body(`§f"${PISTAS[role]}"\n\n§7Pistas: ${st.pistas.length}/${NPC_QUESTS[id].obj.pistas.length}`)
    .button1("OK").button2("Fechar"));
}

async function accuse(player, id) {
  const st = qState(player, id);
  const f = new ActionFormData().title("Quem é o espião?").body("§7Pistas reunidas:\n" + st.pistas.map((r) => `§f- ${PISTAS[r]}`).join("\n"));
  for (const [nome] of SUSPEITOS) f.button(String(nome));
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  const [, right, why] = SUSPEITOS[r.selection];
  if (!right) {
    addRep(player, -5, "acusação injusta");
    await show(player, new MessageFormData().title("Ancião").body(`§f${String(why)}`).button1("OK").button2("Fechar"));
    return;
  }
  st.acusou = true;
  markDirty(player);
  await show(player, new MessageFormData().title("Ancião")
    .body("§fO forasteiro... faz sentido. Ele só aparece à noite, no canto da taverna. Confronte-o, mas vá armado.").button1("OK").button2("Fechar"));
}

/** O forasteiro revela-se: some e surge o Espião do Véu Negro, hostil. */
async function confront(player, npc) {
  await show(player, new MessageFormData().title("Forasteiro").body("§f\"Você não devia ter se metido nos assuntos da Dama...\"").button1("Lutar").button2("Lutar"));
  if (!ok(npc)) return;
  const loc = npc.location;
  const dim = npc.dimension;
  particle(dim, "sombra_explosao", V.up(loc, 1), { radius: 1.5 });
  sound(dim, "mob.evocation_illager.cast_spell", loc, 0.8, 1);
  npc.remove();
  try {
    const spy = dim.spawnEntity(`${NS}:espiao_veu`, loc, { initialPersistence: true });
    spy.setProperty(`${NS}:oficio`, OFICIO.espiao);
    spy.setDynamicProperty(`${NS}:alvo`, player.id);
    spy.nameTag = "§5Espião do Véu Negro";
  } catch (e) {
    console.warn(`[Valdoria] espião: ${e}`);
  }
}

// ------------------------------------------------------------------ eventos do mundo
/** Conversas contam para missões "falar". */
export function onTalk(player, role) {
  const d = npcData(player);
  for (const [id, Q] of Object.entries(NPC_QUESTS)) {
    const st = d.npc.q[id];
    if (st?.e !== "ativa" || Q.obj.tipo !== "falar" || !Q.obj.papeis.includes(role) || st.lista.includes(role)) continue;
    st.lista.push(role);
    markDirty(player);
    player.onScreenDisplay.setActionBar(`§6${Q.nome}: §f${st.lista.length}/${Q.obj.papeis.length}`);
  }
}

function onKillQuest(ev) {
  let killer = ev.damageSource.damagingEntity;
  if (killer && !isPlayer(killer)) killer = summonOwner(killer);
  if (!isPlayer(killer)) return;
  const dead = ev.deadEntity;
  let tid;
  try { tid = dead.typeId; } catch { return; }
  const d = npcData(killer);
  for (const [id, Q] of Object.entries(NPC_QUESTS)) {
    const st = d.npc.q[id];
    if (st?.e !== "ativa") continue;
    if (Q.obj.tipo === "abate" && Q.obj.alvos.includes(tid)) {
      st.p++;
      markDirty(killer);
      killer.onScreenDisplay.setActionBar(`§6${Q.nome}: §f${Math.min(st.p, Q.obj.n)}/${Q.obj.n}`);
    }
    if (Q.obj.tipo === "artefato" && tid === Q.obj.fonte && countItem(killer, Q.obj.item) === 0) {
      let loc;
      try { loc = dead.location; } catch { continue; }
      const inTower = allSites().some((r) => r.tipo === "torre" && r.area && inBox(r.area, loc, 2));
      if (chance(inTower ? 1 : Q.obj.chance)) {
        dead.dimension.spawnItem(new ItemStack(Q.obj.item, 1), V.up(loc, 0.5));
        particle(dead.dimension, "sagrado_explosao", V.up(loc, 1), { radius: 1 });
        killer.onScreenDisplay.setActionBar("§6O espectro deixa cair algo dourado... o Cálice Sagrado!");
      }
    }
    if (Q.obj.tipo === "investigacao" && tid === `${NS}:espiao_veu`) {
      st.carta = true;
      markDirty(killer);
      dead.dimension.spawnItem(scrollItem("carta_veu"), V.up(dead.location, 0.5));
      killer.onScreenDisplay.setActionBar("§5O espião deixou cair uma carta selada com cera negra.");
    }
  }
}

// ------------------------------------------------------------------ resgate do prisioneiro
const PTAG = (pid) => `vp_${pid.slice(-8)}`;
function prisonerSpot(rec) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot);
  return p.world(-7, 1, -1);
}
function rescueTick() {
  for (const player of world.getAllPlayers()) {
    if (!ok(player)) continue;
    const st = qState(player, "filho_desaparecido");
    if (st?.e !== "ativa" || st.livre) continue;
    if (!st.camp) continue;
    const rec = getSite(st.camp);
    if (!rec) {
      st.camp = null;
      continue;
    }
    if (rec.dim !== player.dimension.id || V.dist2d(player.location, { x: rec.x, z: rec.z }) > 48) continue;
    const dim = player.dimension;
    if (dim.getEntities({ type: `${NS}:prisioneiro`, tags: [PTAG(player.id)] }).length) continue;
    const pos = prisonerSpot(rec);
    try {
      if (!dim.isChunkLoaded(pos)) continue;
      const e = dim.spawnEntity(`${NS}:prisioneiro`, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
      e.setProperty(`${NS}:oficio`, OFICIO.prisioneiro);
      e.addTag(PTAG(player.id));
      e.setDynamicProperty(`${NS}:dono`, player.id);
      e.setDynamicProperty(`${NS}:local`, rec.id);
      e.nameTag = "§fTomé\n§7Prisioneiro";
      player.onScreenDisplay.setActionBar("§eVocê ouve alguém gritando por socorro dentro de uma barraca!");
    } catch { /* */ }
  }
}
/** Interação com o prisioneiro. */
export async function freePrisoner(player, e) {
  const owner = e.getDynamicProperty(`${NS}:dono`);
  if (owner !== player.id) {
    player.onScreenDisplay.setActionBar("§7\"Socorro! Chame quem veio me buscar!\"");
    return;
  }
  const siteId = e.getDynamicProperty(`${NS}:local`);
  const guards = typeof siteId === "string" ? e.dimension.getEntities({ tags: [TAG(siteId)], location: e.location, maxDistance: 12 }) : [];
  if (guards.length) {
    player.onScreenDisplay.setActionBar(`§c"Cuidado! Ainda há ${guards.length} goblin(s) por perto!"`);
    psound(player, "mob.villager.no", 1.3, 1);
    return;
  }
  const st = qState(player, "filho_desaparecido");
  if (st) {
    st.livre = true;
    markDirty(player);
  }
  particle(e.dimension, "nivel_anel", e.location, {});
  psound(player, "mob.villager.yes", 1.3, 1);
  await show(player, new MessageFormData().title("Tomé").body("§f\"Obrigado! Vou correr para casa!\"\n\n§7\"Eles tinham um mapa da vila... " +
    "desenhado por alguém de lá de dentro. Conte isso ao Ancião!\"").button1("OK").button2("Fechar"));
  if (ok(e)) e.remove();
  say(player, "§6[Missão] §fTomé está livre. Volte ao fazendeiro.");
}

// ------------------------------------------------------------------ forasteiro na taverna (à noite)
const FTAG = (pid) => `vf_${pid.slice(-8)}`;
function strangerTick() {
  const night = isNight();
  for (const player of world.getAllPlayers()) {
    if (!ok(player)) continue;
    const st = qState(player, "sombras_vila");
    const dim = player.dimension;
    const existing = dim.getEntities({ type: `${NS}:aldeao`, tags: [FTAG(player.id)] });
    if (st?.e !== "ativa" || !st.acusou || st.carta || !night) {
      for (const e of existing) e.remove();
      continue;
    }
    if (existing.length) continue;
    const vila = allSites().filter((r) => r.tipo === "vila" && r.dim === dim.id && r.m?.forasteiro)
      .find((r) => V.dist2d(player.location, { x: r.x, z: r.z }) < 60);
    if (!vila) continue;
    const pos = vila.m.forasteiro;
    try {
      if (!dim.isChunkLoaded(pos)) continue;
      const e = dim.spawnEntity(`${NS}:aldeao`, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
      e.setProperty(`${NS}:oficio`, OFICIO.forasteiro);
      e.setDynamicProperty(`${NS}:papel`, "forasteiro");
      e.addTag(FTAG(player.id));
      e.nameTag = "§8Forasteiro encapuzado";
      e.triggerEvent("valdoria:noite");
    } catch { /* */ }
  }
}

// ------------------------------------------------------------------ Espião do Véu Negro: some em fumaça e reaparece às costas do alvo
const spyCd = new Map();
function spyTick() {
  for (const dimId of ["minecraft:overworld"]) {
    for (const spy of world.getDimension(dimId).getEntities({ type: `${NS}:espiao_veu` })) {
      if ((spyCd.get(spy.id) || 0) > system.currentTick) continue;
      const target = spy.dimension.getPlayers({ location: spy.location, maxDistance: 14 })[0];
      if (!target) continue;
      spyCd.set(spy.id, system.currentTick + 140);
      const back = V.add(target.location, V.mul(V.flat(target.getViewDirection()), -2));
      particle(spy.dimension, "sombra_explosao", V.up(spy.location, 1), { radius: 1.2 });
      sound(spy.dimension, "mob.endermen.portal", spy.location, 1.4, 1);
      try { spy.teleport(back, { facingLocation: target.location, checkForBlocks: true }); } catch { /* */ }
      particle(spy.dimension, "sombra_explosao", V.up(back, 1), { radius: 1.2 });
    }
  }
}

export function startMissions() {
  onKill(onKillQuest);
  system.runInterval(() => { try { spyTick(); } catch { /* */ } }, 20);
  system.runInterval(() => {
    try { rescueTick(); } catch (e) { console.warn(`[Valdoria] resgate: ${e}`); }
    try { strangerTick(); } catch (e) { console.warn(`[Valdoria] forasteiro: ${e}`); }
  }, 40);
  onSite("descoberto", (player, rec) => {
    const st = qState(player, "filho_desaparecido");
    if (st?.e === "ativa" && !st.camp && rec.tipo === "acampamento") {
      st.camp = rec.id;
      markDirty(player);
      player.onScreenDisplay.setActionBar("§eSerá que Tomé está preso neste acampamento?");
    }
  });
}

