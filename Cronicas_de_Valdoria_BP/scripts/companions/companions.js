// Companheiros de viagem: Sylvara (arqueira élfica), Sir Gareth (cavaleiro; id interno "aldric") e Irmã Mirela (curandeira).
// Um companheiro ativo por jogador; ele segue o dono (follow_owner, como o lobo), luta ao lado dele, ganha níveis (1 a 20) com
// os abates, usa duas habilidades por papel, se recupera depois de cair e é chamado pelo Apito do Companheiro.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { NS, V, ok, tick, rand, isPlayer, isActivePlayer, health, heal, effect, say, giveItem, countItem, bar } from "../core/util.js";
import { particle, sound, psound } from "../core/fx.js";
import { onBeforeHurt, onKill, dealDamage, enemiesNear, isHostile } from "../core/damage.js";
import { launch, root, knockFrom, ground } from "../abilities/engine.js";
import { getData } from "../core/store.js";
import { markLoreRead } from "../ui/codex.js";
import { show, spendCoins, coins, npcData } from "../npc/economy.js";

export const COMP = `${NS}:companheiro`;
export const APITO = `${NS}:apito_companheiro`;
export const MAX_NIVEL = 20;
const REC_MIN = 5;
const PR = { dono: `${NS}:dono`, donoNome: `${NS}:dono_nome`, vinculo: `${NS}:vinculo`, comp: `${NS}:comp` };
const CTAG = (pid) => `vc_${pid}`;
const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

export const COMPANIONS = {
  sylvara: {
    nome: "Sylvara", titulo: "Arqueira de Aelthar", papel: "arqueira", oficio: 27, cor: "§a", lore: "companheira_sylvara",
    recruta: { role: "artesao_elfico", flag: "amigo_elfico", custo: 0, falta: "Sylvara só segue quem recebeu a Bênção de Aelthar." },
    convite: "\"O Mestre diz que eu devo uma flecha a quem salvou a Árvore-Mãe. Eu digo que quero ver o que existe além da sebe. Vamos?\"",
    habilidades: [["Chuva de Flechas", 1, "saraivada sobre o inimigo mais perto de você (a cada 16 s)"],
      ["Flecha Enraizante", 10, "prende o inimigo mais forte no chão por 2 s (a cada 20 s)"]],
    falas: { ocioso: ["As árvores daqui são baixinhas. Fofas, mas baixinhas.", "Ouviu isso? Não? Melhor assim.",
      "Se encontrarmos um arco melhor que o meu, eu finjo que não vi."], nivel: "Minha mira está melhorando. Não conte ao Mestre.",
    perigo: "Fique atrás de mim! Bem... ao lado, pelo menos.", queda: "Eu... volto já. Guarde minhas flechas." },
  },
  aldric: {
    nome: "Sir Gareth", titulo: "Cavaleiro Errante", papel: "cavaleiro", oficio: 28, cor: "§9", lore: "companheiro_gareth",
    recruta: { role: "cavaleiro_real", flag: "cavaleiro", custo: 400, falta: "Sir Gareth só oferece o escudo a um Cavaleiro de Valdoria." },
    convite: "\"Quatrocentas moedas pelo equipamento e pela estrada. O escudo, dou de graça. Onde você for, Valdoria vai.\"",
    habilidades: [["Muralha de Escudo", 1, "quando sua vida cai abaixo de 50%, dá resistência e absorção (a cada 30 s)"],
      ["Investida", 10, "avança contra um inimigo a até 10 blocos e o derruba (a cada 14 s)"]],
    falas: { ocioso: ["Na minha época, as estradas tinham menos goblins. E mais buracos.", "Já contei da ponte? Uma noite inteira. Sozinho.",
      "Mantenha o escudo alto e a conversa baixa."], nivel: "Ainda tenho muito a ensinar a estes velhos ossos.",
    perigo: "Atrás do escudo, rápido!", queda: "Um cavaleiro... não fica no chão por muito tempo." },
  },
  mirela: {
    nome: "Irmã Mirela", titulo: "Curandeira Peregrina", papel: "curandeira", oficio: 29, cor: "§e", lore: "companheira_mirela",
    recruta: { role: "curandeira", rep: 150, custo: 250, falta: "Mirela só deixa a vila com quem é Amigo do reino (reputação 150)." },
    convite: "\"Duzentas e cinquenta moedas para os remédios da vila enquanto eu estiver fora. As minhas preces vão com você.\"",
    habilidades: [["Prece de Cura", 1, "cura você quando sua vida cai abaixo de 60% e tira veneno e lentidão (a cada 12 s)"],
      ["Luz Sagrada", 10, "fere os inimigos perto de você e dá regeneração (a cada 18 s)"]],
    falas: { ocioso: ["Beba água. Sério, beba água.", "Cada cicatriz é uma história. Prefiro histórias curtas.",
      "Os goblins também têm mãe, sabia? Péssimas mães."], nivel: "Minhas preces estão ficando mais fortes.",
    perigo: "Respire! Estou aqui.", queda: "Não... se preocupe comigo. Volto logo." },
  },
};
export const BY_ROLE = Object.fromEntries(Object.entries(COMPANIONS).map(([k, c]) => [c.recruta.role, k]));

// ------------------------------------------------------------------ vínculo (salvo no mundo)
const bondKey = (pid, cid) => `${NS}:comp_${pid}_${cid}`;
const activeKey = (pid) => `${NS}:compativo_${pid}`;
export function getBond(pid, cid) {
  try {
    const v = world.getDynamicProperty(bondKey(pid, cid));
    return typeof v === "string" ? JSON.parse(v) : undefined;
  } catch {
    return undefined;
  }
}
export function setBond(pid, cid, b) {
  try { world.setDynamicProperty(bondKey(pid, cid), b ? JSON.stringify(b) : undefined); } catch { /* */ }
}
export function activeOf(pid) {
  try {
    const v = world.getDynamicProperty(activeKey(pid));
    return typeof v === "string" && COMPANIONS[v] ? v : undefined;
  } catch {
    return undefined;
  }
}
function setActive(pid, cid) {
  try { world.setDynamicProperty(activeKey(pid), cid || undefined); } catch { /* */ }
}
function prop(e, k) {
  try {
    const v = e.getDynamicProperty(k);
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}
export function ownerOf(e) {
  return prop(e, PR.dono);
}
export function compOf(e) {
  return ok(e) && e.typeId === COMP ? prop(e, PR.comp) : undefined;
}
const owner = (pid) => world.getAllPlayers().find((p) => p.id === pid);

/** Entidade viva e carregada do companheiro (ou undefined). */
export function findCompanion(pid, cid, bond = getBond(pid, cid)) {
  if (!bond) return undefined;
  for (const dimId of DIMS) {
    try {
      const e = world.getDimension(dimId).getEntities({ type: COMP, tags: [CTAG(pid)] }).find((x) => prop(x, PR.vinculo) === bond.tok);
      if (e) return e;
    } catch { /* */ }
  }
  return undefined;
}

// ------------------------------------------------------------------ níveis
export const xpNeed = (l) => 40 + 30 * l;
export const tierOf = (l) => (l >= 15 ? 3 : l >= 10 ? 2 : l >= 5 ? 1 : 0);
function label(cid, b) {
  const C = COMPANIONS[cid];
  return `${C.cor}${b?.nome || C.nome} §7Nv ${b?.nivel || 1}`;
}
function applyLevel(e, cid, b) {
  const C = COMPANIONS[cid];
  try {
    e.triggerEvent(`valdoria:vida_${C.papel}_${tierOf(b.nivel)}`);
    e.nameTag = label(cid, b);
  } catch { /* */ }
}
/** Dá XP ao companheiro ativo do jogador (sobe de nível até 20). */
export function addCompanionXP(pid, amount) {
  const cid = activeOf(pid);
  if (!cid || amount <= 0) return;
  const b = getBond(pid, cid);
  if (!b || b.morto || b.nivel >= MAX_NIVEL) return;
  b.xp = (b.xp || 0) + Math.round(amount);
  let up = 0;
  while (b.nivel < MAX_NIVEL && b.xp >= xpNeed(b.nivel)) {
    b.xp -= xpNeed(b.nivel);
    b.nivel++;
    up++;
  }
  if (b.nivel >= MAX_NIVEL) b.xp = 0;
  setBond(pid, cid, b);
  if (!up) return;
  const e = findCompanion(pid, cid, b);
  if (e) {
    const oldTier = tierOf(b.nivel - up);
    if (tierOf(b.nivel) !== oldTier) applyLevel(e, cid, b);
    else {
      try { e.nameTag = label(cid, b); } catch { /* */ }
    }
    particle(e.dimension, "nivel_anel", e.location, {});
    sound(e.dimension, "random.levelup", e.location, 1.3, 0.6);
  }
  const p = owner(pid);
  if (p) {
    const C = COMPANIONS[cid];
    p.onScreenDisplay.setActionBar(`${C.cor}${b.nome || C.nome} §falcançou o nível §e${b.nivel}§f!`);
    if (b.nivel === 10) say(p, `${C.cor}${b.nome || C.nome}: §fAprendi ${C.habilidades[1][0]}! §7(${C.habilidades[1][2]})`);
    else say(p, `${C.cor}${b.nome || C.nome}: §f"${C.falas.nivel}"`);
  }
}

// ------------------------------------------------------------------ chamar, recrutar, dispensar
const SOFT = /short_grass|tall_grass|fern|flower|tulip|dandelion|poppy|snow_layer|deadbush|vine|carpet|petals|bush/;
function free(dim, loc) {
  try {
    const b = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    return [0, 1].every((dy) => {
      const k = dim.getBlock({ x: b.x, y: b.y + dy, z: b.z });
      return k && (k.isAir || SOFT.test(k.typeId));
    });
  } catch {
    return false;
  }
}
function spotNear(player) {
  const dir = V.flat(player.getViewDirection());
  for (const [back, side] of [[-2, 0], [-2, 1.5], [-2, -1.5], [2, 0], [0, 2], [0, -2]]) {
    const loc = V.add(player.location, { x: dir.x * back - dir.z * side, y: 0, z: dir.z * back + dir.x * side });
    if (free(player.dimension, loc)) return loc;
  }
  return { ...player.location };
}
function setup(player, cid, e, b) {
  const C = COMPANIONS[cid];
  try { e.getComponent("minecraft:tameable")?.tame(player); } catch { /* */ }
  try {
    e.setProperty(`${NS}:oficio`, C.oficio);
    e.setProperty(`${NS}:variante`, b.variante || 0);
    e.triggerEvent("valdoria:recrutar");
    e.triggerEvent(`valdoria:papel_${C.papel}`);
    e.triggerEvent(b.postura === "defensivo" ? "valdoria:defensivo" : "valdoria:agressivo");
    if (b.modo === "ficar") e.triggerEvent("valdoria:ficar");
    e.setDynamicProperty(PR.dono, player.id);
    e.setDynamicProperty(PR.donoNome, player.name);
    e.setDynamicProperty(PR.vinculo, b.tok);
    e.setDynamicProperty(PR.comp, cid);
    e.addTag(CTAG(player.id));
  } catch { /* */ }
  applyLevel(e, cid, b);
}
function summon(player, cid, b) {
  const spot = spotNear(player);
  const e = player.dimension.spawnEntity(COMP, spot, { initialPersistence: true });
  setup(player, cid, e, b);
  particle(player.dimension, "invocacao", V.up(spot, 0.5), {});
  sound(player.dimension, "random.orb", spot, 0.8, 1);
  return e;
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}min ${s}s` : `${s}s`;
}
/** Requisito que falta para recrutar (texto) ou undefined. */
export function recruitBlock(player, cid) {
  const R = COMPANIONS[cid].recruta;
  const f = getData(player).flags || {};
  if (R.flag && !f[R.flag]) return R.falta;
  if (R.rep && npcData(player).rep < R.rep) return R.falta;
  if (!getBond(player.id, cid) && R.custo && coins(player) < R.custo) return `Você precisa de ${R.custo} moedas (tem ${coins(player)}).`;
  return undefined;
}
/** Recruta (ou reconvoca) um companheiro. Só um fica ativo: o anterior volta para casa, com o progresso guardado. */
export function recruit(player, cid, free = false) {
  const C = COMPANIONS[cid];
  if (!free) {
    const blk = recruitBlock(player, cid);
    if (blk) return { ok: false, msg: `§c${blk}` };
  }
  const prev = getBond(player.id, cid);
  if (prev?.morto && Date.now() - prev.morto < REC_MIN * 60000) {
    return { ok: false, msg: `§c${C.nome} ainda se recupera: §f${fmtTime(Math.ceil((REC_MIN * 60000 - (Date.now() - prev.morto)) / 1000))}` };
  }
  if (!prev && !free && C.recruta.custo && !spendCoins(player, C.recruta.custo)) return { ok: false, msg: "§cMoedas insuficientes." };
  const cur = activeOf(player.id);
  if (cur && cur !== cid) dismiss(player, true);
  const old = findCompanion(player.id, cid);
  if (old) old.remove();
  const b = { nivel: 1, xp: 0, modo: "seguir", postura: "agressivo", nome: "", ...(prev || {}), tok: Math.random().toString(36).slice(2, 10), morto: 0 };
  setBond(player.id, cid, b);
  setActive(player.id, cid);
  summon(player, cid, b);
  if (countItem(player, APITO) < 1) giveItem(player, new ItemStack(APITO, 1));
  markLoreRead(player, C.lore, true);
  if (!prev) {
    player.onScreenDisplay.setTitle(`${C.cor}${C.nome}`, { subtitle: `§7${C.titulo} agora viaja com você`, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    psound(player, "random.levelup", 1.2, 0.8);
  }
  return { ok: true, msg: `${C.cor}${C.nome}§f se junta a você. §7(Use o Apito do Companheiro para chamá-l${C.papel === "cavaleiro" ? "o" : "a"}.)` };
}
/** Manda o companheiro ativo para casa (o nível e o nome ficam guardados). */
export function dismiss(player, quiet = false) {
  const cid = activeOf(player.id);
  if (!cid) return false;
  const e = findCompanion(player.id, cid);
  if (e) {
    particle(e.dimension, "fumaca", V.up(e.location, 1), {});
    e.remove();
  }
  setActive(player.id, undefined);
  if (!quiet) player.onScreenDisplay.setActionBar(`§7${COMPANIONS[cid].nome} volta para casa. Você pode chamá-l${COMPANIONS[cid].papel === "cavaleiro" ? "o" : "a"} de novo quando quiser.`);
  return true;
}
/** Apito: traz o companheiro ativo para perto (ou de volta, depois da recuperação). */
export function callCompanion(player) {
  const cid = activeOf(player.id);
  if (!cid) {
    player.onScreenDisplay.setActionBar("§7Nenhum companheiro viaja com você. Recrute um com o Mestre Arqueiro de Aelthar, um Cavaleiro Real ou a Curandeira da vila.");
    return undefined;
  }
  const C = COMPANIONS[cid];
  const b = getBond(player.id, cid);
  const cur = findCompanion(player.id, cid, b);
  if (cur) {
    try {
      cur.teleport(spotNear(player), { dimension: player.dimension, facingLocation: player.location });
      cur.triggerEvent("valdoria:seguir");
    } catch { /* */ }
    b.modo = "seguir";
    setBond(player.id, cid, b);
    particle(player.dimension, "vento_explosao", V.up(cur.location, 0.5), { radius: 1 });
    player.onScreenDisplay.setActionBar(`${C.cor}${b.nome || C.nome}§f atende ao apito.`);
    return cur;
  }
  if (b?.morto) {
    const left = REC_MIN * 60000 - (Date.now() - b.morto);
    if (left > 0) {
      player.onScreenDisplay.setActionBar(`§c${b.nome || C.nome} ainda se recupera dos ferimentos: §f${fmtTime(Math.ceil(left / 1000))}`);
      psound(player, "note.bass", 0.8, 0.6);
      return undefined;
    }
    b.morto = 0;
  }
  b.tok = Math.random().toString(36).slice(2, 10);
  setBond(player.id, cid, b);
  const e = summon(player, cid, b);
  player.onScreenDisplay.setActionBar(`${C.cor}${b.nome || C.nome}§f volta para o seu lado.`);
  return e;
}

// ------------------------------------------------------------------ menus
function status(player, cid) {
  const C = COMPANIONS[cid];
  const b = getBond(player.id, cid) || { nivel: 1, xp: 0 };
  const e = findCompanion(player.id, cid, b);
  const h = e ? health(e) : undefined;
  const lines = [`${C.cor}§l${b.nome || C.nome}§r §7· ${C.titulo}`, `§6Nível ${b.nivel}${b.nivel >= MAX_NIVEL ? " (máx.)" : ` §7XP ${b.xp}/${xpNeed(b.nivel)}`}`];
  if (b.nivel < MAX_NIVEL) lines.push(bar(b.xp / xpNeed(b.nivel), 20, "§e", "§8"));
  if (h) lines.push(`§cVida ${Math.ceil(h.currentValue)}/${Math.round(h.effectiveMax)}`);
  else if (b.morto) lines.push("§cSe recuperando dos ferimentos");
  else lines.push("§7Longe daqui (use o apito)");
  lines.push(`§7Ordens: §f${b.modo === "ficar" ? "esperar aqui" : "seguir você"} §7· §f${b.postura === "defensivo" ? "só defender" : "atacar inimigos"}`);
  lines.push("", "§l§6Habilidades§r");
  for (const [n, lv, desc] of C.habilidades) lines.push(`${b.nivel >= lv ? "§a" : "§8"}${n} §7(nível ${lv}): ${desc}`);
  return { b, e, text: lines.join("\n") };
}
export async function companionMenu(player, back) {
  const cid = activeOf(player.id);
  if (!cid) return companionsMenu(player, back);
  const C = COMPANIONS[cid];
  const { b, e, text } = status(player, cid);
  const f = new ActionFormData().title(b.nome || C.nome).body(text);
  const opts = [];
  const add = (l, fn) => { f.button(l); opts.push(fn); };
  if (e) {
    add(b.modo === "ficar" ? "Seguir-me" : "Esperar aqui", () => {
      b.modo = b.modo === "ficar" ? "seguir" : "ficar";
      try { e.triggerEvent(b.modo === "ficar" ? "valdoria:ficar" : "valdoria:seguir"); } catch { /* */ }
      setBond(player.id, cid, b);
      player.onScreenDisplay.setActionBar(b.modo === "ficar" ? `§7${b.nome || C.nome} espera aqui.` : `§a${b.nome || C.nome} segue você.`);
    });
    add(b.postura === "defensivo" ? "Atacar inimigos por conta própria" : "Só defender (lutar quando você lutar)", () => {
      b.postura = b.postura === "defensivo" ? "agressivo" : "defensivo";
      try { e.triggerEvent(`valdoria:${b.postura}`); } catch { /* */ }
      setBond(player.id, cid, b);
    });
  } else {
    add("Chamar com o apito", () => callCompanion(player));
  }
  add("Dar um nome", async () => {
    const m = new ModalFormData().title("Nome do companheiro").textField("Nome (vazio = original)", C.nome, { defaultValue: b.nome || "" });
    const r = await show(player, m);
    if (r.canceled || !r.formValues) return;
    b.nome = String(r.formValues[0] || "").replace(/§./g, "").slice(0, 24).trim();
    setBond(player.id, cid, b);
    if (e) e.nameTag = label(cid, b);
  });
  add("§cMandar para casa", () => dismiss(player));
  add("Outros companheiros", () => companionsMenu(player, back));
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= opts.length) return back && back(player);
  await opts[r.selection]();
}
/** Lista dos companheiros já recrutados: chamar outro (o atual volta para casa). */
export async function companionsMenu(player, back) {
  const known = Object.keys(COMPANIONS).filter((cid) => getBond(player.id, cid));
  const act = activeOf(player.id);
  const f = new ActionFormData().title("Companheiros").body(known.length ? "§7Escolha quem viaja com você. Só um companheiro de cada vez; " +
    "quem fica em casa guarda o nível." : "§7Você ainda não recrutou companheiros.\n\n§fSylvara§7: Mestre Arqueiro de Aelthar (Bênção de Aelthar)\n" +
    "§fSir Gareth§7: um Cavaleiro Real em Aurendel (título de Cavaleiro, 400 moedas)\n§fIrmã Mirela§7: a Curandeira da vila (reputação 150, 250 moedas)");
  for (const cid of known) {
    const b = getBond(player.id, cid);
    f.button(`${COMPANIONS[cid].cor}${b.nome || COMPANIONS[cid].nome}§r §8Nv ${b.nivel}${cid === act ? " · com você" : ""}`);
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= known.length) return back && back(player);
  const cid = known[r.selection];
  if (cid === act) return companionMenu(player, back);
  const res = recruit(player, cid, true);
  player.onScreenDisplay.setActionBar(res.msg);
}
/** Serviço do NPC que apresenta o companheiro (Mestre Arqueiro, Cavaleiro Real ou Curandeira). */
export async function recruitMenu(player, cid, npcName, back) {
  const C = COMPANIONS[cid];
  const have = getBond(player.id, cid);
  const blk = have ? undefined : recruitBlock(player, cid);
  const body = [`${C.cor}§l${C.nome}§r §7· ${C.titulo}`, "", have ? "§7Já viajou com você e espera um chamado." : `§f${C.convite}`, "",
    "§l§6Habilidades§r", ...C.habilidades.map(([n, lv, d]) => `§f${n} §7(nível ${lv}): ${d}`), "",
    blk ? `§c${blk}` : have ? "" : C.recruta.custo ? `§6Custo: ${C.recruta.custo} moedas` : "§aSem custo."].join("\n");
  const f = new ActionFormData().title(npcName || C.nome).body(body);
  const canGo = !blk && activeOf(player.id) !== cid;
  if (canGo) f.button(have ? `Chamar ${C.nome} de volta` : `Recrutar ${C.nome}`);
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (canGo && r.selection === 0) {
    const res = recruit(player, cid, !!have);
    say(player, res.ok && !have ? `${C.cor}${C.nome}: §f${C.convite}` : res.msg);
    if (res.ok && !have) player.onScreenDisplay.setActionBar(res.msg);
    return;
  }
  return back && back(player);
}

// ------------------------------------------------------------------ habilidades (laço)
const cds = new Map();
const ready = (e, k) => (cds.get(`${e.id}:${k}`) || 0) <= tick();
const setCd = (e, k, sec) => cds.set(`${e.id}:${k}`, tick() + sec * 20);
function nearestTo(list, loc) {
  return list.sort((a, b) => V.dist(a.location, loc) - V.dist(b.location, loc))[0];
}
function skills(e, p, cid, b) {
  const C = COMPANIONS[cid];
  const L = b.nivel;
  const foes = enemiesNear(e, e.location, 16, true);
  const hp = health(p);
  const pct = hp ? hp.currentValue / hp.effectiveMax : 1;
  if (C.papel === "arqueira") {
    if (foes.length && ready(e, "chuva")) {
      const t = nearestTo(foes, p.location);
      const pt = ground(e.dimension, t.location);
      setCd(e, "chuva", 16);
      particle(e.dimension, "alerta_anel", pt, { radius: 3 });
      sound(e.dimension, "random.bow", e.location, 1, 0.8);
      for (let i = 0; i < 8; i++) {
        system.runTimeout(() => {
          if (!ok(e)) return;
          const o = V.add(pt, { x: rand(-2.5, 2.5), y: 0, z: rand(-2.5, 2.5) });
          launch(e, { from: V.up(o, 9), dir: { x: 0, y: -1, z: 0 }, speed: 1.8, radius: 0.5, element: "physical", damage: 3 + L * 0.25,
            aoe: 1.0, trail: "vento_rastro", impact: "critico", range: 12, kind: "weapon" });
        }, i * 3);
      }
      return;
    }
    if (L >= 10 && foes.length && ready(e, "raiz")) {
      const t = foes.sort((a, b2) => (health(b2)?.effectiveMax || 0) - (health(a)?.effectiveMax || 0))[0];
      setCd(e, "raiz", 20);
      root(t, 40);
      dealDamage(e, t, 6 + L * 0.5, "nature");
      particle(e.dimension, "natureza_espinhos", t.location, { radius: 1.2 });
    }
  } else if (C.papel === "cavaleiro") {
    if (pct < 0.5 && foes.length && ready(e, "muralha")) {
      setCd(e, "muralha", 30);
      effect(p, "resistance", 120, 1);
      effect(p, "absorption", 200, 1);
      particle(p.dimension, "escudo", V.up(p.location, 1), {});
      sound(p.dimension, "item.shield.block", p.location, 0.9, 1);
      say(p, `${C.cor}${b.nome || C.nome}: §f"${C.falas.perigo}"`);
      return;
    }
    if (L >= 10 && ready(e, "investida")) {
      const t = foes.filter((x) => V.dist(x.location, e.location) >= 3 && V.dist(x.location, e.location) <= 10)[0];
      if (!t) return;
      setCd(e, "investida", 14);
      const dir = V.norm(V.flat(V.sub(t.location, e.location)));
      try { e.teleport(V.sub(t.location, V.mul(dir, 1.2)), { facingLocation: t.location }); } catch { /* */ }
      particle(e.dimension, "poeira", e.location, { radius: 1.5 });
      dealDamage(e, t, 8 + L * 0.6, "physical", { kind: "weapon" });
      knockFrom(t, e.location, 1.2, 0.4);
    }
  } else if (C.papel === "curandeira") {
    if (pct < 0.6 && ready(e, "prece")) {
      setCd(e, "prece", 12);
      heal(p, hp.effectiveMax * (0.12 + L * 0.006));
      for (const id of ["poison", "wither", "slowness", "weakness"]) {
        try { p.removeEffect(id); } catch { /* */ }
      }
      particle(p.dimension, "cura", V.up(p.location, 1), {});
      sound(p.dimension, "random.orb", p.location, 1.4, 0.8);
      if (pct < 0.35) say(p, `${C.cor}${b.nome || C.nome}: §f"${C.falas.perigo}"`);
      return;
    }
    const me = health(e);
    if (me && me.currentValue / me.effectiveMax < 0.5 && ready(e, "autocura")) {
      setCd(e, "autocura", 20);
      heal(e, me.effectiveMax * 0.2);
      particle(e.dimension, "cura", V.up(e.location, 1), {});
      return;
    }
    if (L >= 10 && ready(e, "luz")) {
      const near = enemiesNear(e, p.location, 5, true);
      if (!near.length) return;
      setCd(e, "luz", 18);
      particle(p.dimension, "sagrado_explosao", V.up(p.location, 0.5), { radius: 5 });
      for (const t of near) dealDamage(e, t, 5 + L * 0.5, "holy");
      effect(p, "regeneration", 100, 0);
    }
  }
}
function tickCompanion(p, cid) {
  const b = getBond(p.id, cid);
  if (!b || b.morto) return;
  const e = findCompanion(p.id, cid, b);
  if (!e) return;
  const fighting = enemiesNear(e, e.location, 12, true).length > 0;
  if (!fighting && tick() % 40 < 10) {
    const h = health(e);
    if (h && h.currentValue < h.effectiveMax) heal(e, 1);
    // conversa à toa, de vez em quando
    if (V.dist(e.location, p.location) < 10 && Math.random() < 0.006) {
      const C = COMPANIONS[cid];
      say(p, `${C.cor}${b.nome || C.nome}: §7"${C.falas.ocioso[Math.floor(Math.random() * C.falas.ocioso.length)]}"`);
    }
  }
  if (isActivePlayer(p) && V.dist(e.location, p.location) < 24) skills(e, p, cid, b);
}

// ------------------------------------------------------------------ início
function validate(e) {
  const pid = ownerOf(e);
  const cid = prop(e, PR.comp);
  const b = pid && cid ? getBond(pid, cid) : undefined;
  if (!b || b.tok !== prop(e, PR.vinculo) || activeOf(pid) !== cid) {
    try { e.remove(); } catch { /* */ }
  }
}
export function startCompanions() {
  onBeforeHurt((ev) => {
    const src = ev.src;
    if (ok(src) && src.typeId === COMP) {
      const pid = ownerOf(src);
      const cid = prop(src, PR.comp);
      const b = pid && cid ? getBond(pid, cid) : undefined;
      if (b) {
        const papel = COMPANIONS[cid].papel;
        const L = b.nivel;
        ev.damage *= papel === "arqueira" ? 1.5 + (L - 1) * 0.06 : papel === "cavaleiro" ? 1 + (L - 1) * 0.05 : 1 + (L - 1) * 0.03;
      }
    }
    const t = ev.hurtEntity;
    if (t.typeId === COMP && COMPANIONS[prop(t, PR.comp)]?.papel === "cavaleiro") ev.damage *= 0.8;
  });
  onKill((ev) => {
    const dead = ev.deadEntity;
    let hostile = false;
    let boss = false;
    try {
      hostile = isHostile(dead);
      boss = dead.matches({ families: ["boss"] });
    } catch { /* */ }
    if (!hostile && !boss) return;
    const k = ev.damageSource?.damagingEntity;
    if (!ok(k)) return;
    const amount = boss ? 120 : 8;
    if (k.typeId === COMP) {
      const pid = ownerOf(k);
      if (pid) addCompanionXP(pid, amount);
    } else if (isPlayer(k)) {
      const cid = activeOf(k.id);
      const e = cid ? findCompanion(k.id, cid) : undefined;
      if (e && e.dimension.id === k.dimension.id && V.dist(e.location, k.location) < 24) addCompanionXP(k.id, amount / 2);
    }
  });
  world.afterEvents.entityDie.subscribe((ev) => {
    const e = ev.deadEntity;
    let pid;
    let cid;
    let tok;
    try {
      if (e.typeId !== COMP) return;
      pid = ownerOf(e);
      cid = prop(e, PR.comp);
      tok = prop(e, PR.vinculo);
    } catch {
      return;
    }
    if (!pid || !cid) return;
    const b = getBond(pid, cid);
    if (!b || b.tok !== tok) return;
    b.morto = Date.now();
    setBond(pid, cid, b);
    const p = owner(pid);
    if (p) {
      const C = COMPANIONS[cid];
      p.onScreenDisplay.setTitle(" ", { subtitle: `§c${b.nome || C.nome} caiu! §7Volta em ${REC_MIN} min (use o apito).`, fadeInDuration: 5,
        stayDuration: 50, fadeOutDuration: 15 });
      say(p, `${C.cor}${b.nome || C.nome}: §7"${C.falas.queda}"`);
      psound(p, "note.bass", 0.6, 1);
    }
  });
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === COMP) validate(ev.entity);
  });
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    if (ev.target.typeId !== COMP) return;
    ev.cancel = true;
    const p = ev.player;
    const t = ev.target;
    system.run(() => {
      if (!ok(p) || !ok(t)) return;
      if (ownerOf(t) === p.id) companionMenu(p);
      else p.onScreenDisplay.setActionBar(`§7${t.nameTag || "Este companheiro"}§7 viaja com ${prop(t, PR.donoNome) || "outro aventureiro"}.`);
    });
  });
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      const cid = activeOf(p.id);
      if (!cid) continue;
      try { tickCompanion(p, cid); } catch (err) { console.warn(`[Valdoria] companheiro: ${err}`); }
    }
  }, 10);
}
