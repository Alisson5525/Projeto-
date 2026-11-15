// Economia: bolsa de moedas, reputação com o Reino de Valdoria, preços, limites diários e telas de compra e venda.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, countItem, takeItem, giveItem, inventory, say } from "../core/util.js";
import { psound } from "../core/fx.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { refreshLore } from "../items/equipment.js";
import { onKill } from "../core/damage.js";
import { SHOPS, REP_RANKS, GUILD_RANKS } from "./roles.js";

export const COIN = `${NS}:moeda_ouro`;

export async function show(player, form, tries = 0) {
  try {
    const r = await form.show(player);
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && tries < 20) {
      await new Promise((res) => system.runTimeout(() => res(undefined), 10));
      return show(player, form, tries + 1);
    }
    return r;
  } catch {
    return { canceled: true };
  }
}

// ------------------------------------------------------------------ dados do jogador
export function npcData(player) {
  const d = getData(player);
  d.moedas = d.moedas ?? 0;
  d.rep = d.rep ?? 0;
  d.npc = d.npc || {};
  d.npc.q = d.npc.q || {};
  d.npc.falou = d.npc.falou || {};
  d.npc.compras = d.npc.compras || { dia: -1, n: {} };
  d.npc.guilda = d.npc.guilda || { membro: false, pontos: 0, dia: -1, ofertas: [], ativas: [], feitos: 0 };
  return d;
}
export function today() {
  return Math.floor(world.getAbsoluteTime() / 24000);
}
export function isNight() {
  const t = world.getTimeOfDay();
  return t >= 13000 && t < 23000;
}

// ------------------------------------------------------------------ moedas
export function coins(player) {
  return npcData(player).moedas;
}
export function addCoins(player, n, motivo = "") {
  const d = npcData(player);
  d.moedas = Math.max(0, Math.floor(d.moedas + n));
  markDirty(player);
  if (n > 0) player.onScreenDisplay.setActionBar(`§6+${n} moedas${motivo ? ` §7(${motivo})` : ""} §8· bolsa: §e${d.moedas}`);
  return d.moedas;
}
export function spendCoins(player, n) {
  const d = npcData(player);
  if (d.moedas < n) return false;
  d.moedas -= n;
  markDirty(player);
  return true;
}
/** Moedas apanhadas (baús, criaturas) vão direto para a bolsa. */
function depositCoinItems(player) {
  const inv = inventory(player);
  if (!inv) return;
  let total = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it?.typeId !== COIN) continue;
    total += it.amount;
    inv.setItem(i, undefined);
  }
  if (total) {
    addCoins(player, total, "guardadas na bolsa");
    psound(player, "random.orb", 1.6, 0.6);
  }
}

// ------------------------------------------------------------------ reputação
export function repRank(rep) {
  /** @type {any} */
  let r = REP_RANKS[0];
  for (const x of REP_RANKS) if (rep >= x[1]) r = x;
  return { nome: r[0], min: r[1], cor: r[2], desconto: r[3], idx: REP_RANKS.indexOf(r) };
}
export function addRep(player, n, motivo = "") {
  const d = npcData(player);
  const before = repRank(d.rep);
  d.rep = Math.max(-200, Math.min(2000, d.rep + n));
  markDirty(player);
  const after = repRank(d.rep);
  if (after.idx !== before.idx) {
    player.onScreenDisplay.setTitle(`${after.cor}${after.nome}`, { subtitle: "§7Reputação com o Reino de Valdoria", fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    psound(player, n > 0 ? "random.levelup" : "mob.villager.no", 1, 0.8);
  } else if (motivo) {
    player.onScreenDisplay.setActionBar(`${n >= 0 ? "§a+" : "§c"}${n} reputação §7(${motivo})`);
  }
}
export function guildRank(points) {
  let r = 0;
  GUILD_RANKS.forEach(([, min], i) => { if (points >= min) r = i; });
  /** @type {any} */
  const prox = GUILD_RANKS[r + 1];
  return { idx: r, nome: String(GUILD_RANKS[r][0]), cor: String(GUILD_RANKS[r][2]), prox };
}

// ------------------------------------------------------------------ preços
const VANILLA_VALUE = { "minecraft:diamond": 60, "minecraft:emerald": 25, "minecraft:gold_ingot": 12, "minecraft:iron_ingot": 6 };
const EQUIP_VALUE = { comum: 30, incomum: 70, raro: 200, epico: 500, lendario: 1200, mitico: 3000 };
const MAT_VALUE = { comum: 4, incomum: 10, raro: 40, epico: 90, lendario: 200, mitico: 500 };

/** Valor base de um item (para vender equipamentos ao ferreiro). */
export function itemValue(id) {
  const d = ITEM_DATA[id];
  if (!d) return VANILLA_VALUE[id] || 2;
  if (["weapon", "armor", "caster", "accessory"].includes(d.k)) return EQUIP_VALUE[d.r] || 50;
  return MAT_VALUE[d.r] || 5;
}
export function buyPrice(player, base) {
  const rr = repRank(npcData(player).rep);
  return Math.max(1, Math.round(base * (1 - rr.desconto)));
}
export function sellPrice(player, base) {
  const rr = repRank(npcData(player).rep);
  return Math.max(1, Math.round(base * (1 + Math.max(0, rr.desconto) * 0.5)));
}
function itemName(id) {
  return ITEM_DATA[id]?.n || id.replace("minecraft:", "").replace(/_/g, " ");
}
function icon(id) {
  return ITEM_DATA[id] ? `textures/items/valdoria/${id.split(":")[1]}` : undefined;
}
function boughtToday(player, key) {
  const d = npcData(player);
  if (d.npc.compras.dia !== today()) d.npc.compras = { dia: today(), n: {} };
  return d.npc.compras.n[key] || 0;
}

// ------------------------------------------------------------------ telas de compra e venda
function locked(player, opt = {}) {
  const d = npcData(player);
  if (opt.rep && d.rep < opt.rep) return `exige reputação ${repRank(opt.rep).nome}`;
  if (opt.rank && guildRank(d.npc.guilda.pontos).idx < opt.rank) return `exige patente ${GUILD_RANKS[opt.rank][0]}`;
  if (opt.flag && !d.flags?.[opt.flag]) {
    return { cavaleiro: "exige o título de Cavaleiro de Valdoria", amigo_elfico: "exige a Bênção de Aelthar" }[opt.flag] || "bloqueado";
  }
  return null;
}

export async function buyMenu(player, shopId, back) {
  const shop = SHOPS[shopId];
  const list = shop.vende;
  const f = new ActionFormData().title(`${shop.nome} - comprar`).body(`§7Bolsa: §e${coins(player)} moedas  §8|  ${descontoTxt(player)}`);
  for (const [id, qty, base, opt = {}] of list) {
    const lk = locked(player, opt);
    const left = opt.dia ? opt.dia - boughtToday(player, `${shopId}:${id}`) : Infinity;
    const status = lk ? `§c${lk}` : left <= 0 ? "§8esgotado hoje" : `§e${buyPrice(player, base)} moedas${opt.dia ? ` §8(${left} hoje)` : ""}`;
    f.button(`${qty > 1 ? `${qty}× ` : ""}${itemName(id)}\n${status}`, icon(id));
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= list.length) return back && back(player);
  const [id, qty, base, opt = {}] = list[r.selection];
  const lk = locked(player, opt);
  if (lk) {
    say(player, `§c${itemName(id)}: ${lk}.`);
    return buyMenu(player, shopId, back);
  }
  const key = `${shopId}:${id}`;
  const maxDay = opt.dia ? opt.dia - boughtToday(player, key) : 64;
  const price = buyPrice(player, base);
  const maxAfford = Math.floor(coins(player) / price);
  const max = Math.min(maxDay, maxAfford, qty > 1 ? 16 : 10);
  if (max <= 0) {
    say(player, maxDay <= 0 ? "§cEsgotado por hoje. Volte amanhã." : `§cVocê precisa de ${price} moedas.`);
    psound(player, "mob.villager.no", 1, 0.8);
    return buyMenu(player, shopId, back);
  }
  let n = 1;
  if (max > 1) {
    const m = new ModalFormData().title(itemName(id)).slider(`Lotes de ${qty} (${price} moedas cada)`, 1, max, { valueStep: 1, defaultValue: 1 });
    const k = await show(player, m);
    if (k.canceled || !k.formValues) return buyMenu(player, shopId, back);
    n = Number(k.formValues[0]) || 1;
  }
  const total = price * n;
  if (!spendCoins(player, total)) return buyMenu(player, shopId, back);
  const d = npcData(player);
  if (opt.dia) d.npc.compras.n[key] = boughtToday(player, key) + n;
  for (let i = 0; i < n; i++) {
    const st = new ItemStack(id, qty);
    if (ITEM_DATA[id]) refreshLore(st);
    giveItem(player, st);
  }
  psound(player, "random.orb", 1.2, 1);
  say(player, `§aComprado: ${n * qty}× ${itemName(id)} por ${total} moedas. §7(bolsa: ${d.moedas})`);
  saveNow(player);
  return buyMenu(player, shopId, back);
}

/** Itens do inventário que este NPC compra: [id, lote, preço por lote, quantidade no inventário] */
function sellables(player, shopId) {
  const shop = SHOPS[shopId];
  const out = [];
  for (const [id, lot, base] of shop.compra) {
    const have = countItem(player, id);
    if (have >= lot) out.push({ id, lot, price: sellPrice(player, base), have });
  }
  if (shop.equipamento) {
    const inv = inventory(player);
    const seen = new Set();
    for (let i = 0; i < (inv?.size || 0); i++) {
      const it = inv.getItem(i);
      const d = it && ITEM_DATA[it.typeId];
      if (!d || !["weapon", "armor", "caster", "accessory"].includes(d.k) || seen.has(it.typeId) || d.r === "mitico") continue;
      seen.add(it.typeId);
      out.push({ id: it.typeId, lot: 1, price: sellPrice(player, Math.round(itemValue(it.typeId) * 0.3)), have: countItem(player, it.typeId), equip: true });
    }
  }
  return out;
}

export async function sellMenu(player, shopId, back) {
  const list = sellables(player, shopId);
  const shop = SHOPS[shopId];
  const wanted = shop.compra.map(([id, lot]) => `${lot > 1 ? `${lot} ` : ""}${itemName(id)}`).join(", ");
  const f = new ActionFormData().title(`${shop.nome} - vender`)
    .body(list.length ? `§7Bolsa: §e${coins(player)} moedas` : `§7Você não tem nada que interesse aqui.\n§8Compro: ${wanted}${shop.equipamento ? ", armas e armaduras" : ""}.`);
  for (const s of list) f.button(`${s.lot > 1 ? `${s.lot}× ` : ""}${itemName(s.id)} §8(tem ${s.have})\n§a${s.price} moedas`, icon(s.id));
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= list.length) return back && back(player);
  const s = list[r.selection];
  const maxLots = Math.floor(s.have / s.lot);
  let n = 1;
  if (maxLots > 1) {
    const m = new ModalFormData().title(`Vender ${itemName(s.id)}`)
      .slider(`Lotes de ${s.lot} (${s.price} moedas cada)`, 1, Math.min(maxLots, 64), { valueStep: 1, defaultValue: Math.min(maxLots, 64) });
    const k = await show(player, m);
    if (k.canceled || !k.formValues) return sellMenu(player, shopId, back);
    n = Number(k.formValues[0]) || 1;
  }
  if (s.equip) {
    const conf = await show(player, new MessageFormData().title("Vender equipamento")
      .body(`Vender ${n}× ${itemName(s.id)} por ${s.price * n} moedas?\n§7Aprimoramentos e runas serão perdidos.`).button1("Vender").button2("Cancelar"));
    if (conf.canceled || conf.selection !== 0) return sellMenu(player, shopId, back);
  }
  if (!takeItem(player, s.id, s.lot * n)) return sellMenu(player, shopId, back);
  addCoins(player, s.price * n, "venda");
  psound(player, "random.orb", 1.4, 1);
  saveNow(player);
  return sellMenu(player, shopId, back);
}

export function descontoTxt(player) {
  const rr = repRank(npcData(player).rep);
  return rr.desconto > 0 ? `§adesconto de ${Math.round(rr.desconto * 100)}% (${rr.nome})` : rr.desconto < 0 ? `§cpreços +${Math.round(-rr.desconto * 100)}% (${rr.nome})` : `§8${rr.nome}`;
}

/** Transferir moedas a um jogador próximo (multijogador). */
export async function transferMenu(player, back) {
  const others = player.dimension.getPlayers({ location: player.location, maxDistance: 8 }).filter((p) => p.id !== player.id);
  if (!others.length) {
    say(player, "§7Nenhum jogador a até 8 blocos.");
    return back && back(player);
  }
  const m = new ModalFormData().title("Transferir moedas").dropdown("Para", others.map((p) => p.name), { defaultValueIndex: 0 })
    .slider("Quantia", 1, Math.max(1, coins(player)), { valueStep: 1, defaultValue: 1 });
  const r = await show(player, m);
  if (r.canceled || !r.formValues) return back && back(player);
  const to = others[Number(r.formValues[0])];
  const n = Number(r.formValues[1]);
  if (!to || !spendCoins(player, n)) return back && back(player);
  addCoins(to, n, `de ${player.name}`);
  say(player, `§aVocê enviou ${n} moedas para ${to.name}.`);
  return back && back(player);
}

/** Monstros comuns às vezes deixam moedas (as criaturas do add-on têm moedas nas tabelas de saque). */
function coinDrop(ev) {
  const killer = ev.damageSource.damagingEntity;
  if (!killer || killer.typeId !== "minecraft:player") return;
  const e = ev.deadEntity;
  try {
    if (e.typeId.startsWith(`${NS}:`) || !e.matches({ families: ["monster"] })) return;
    if (Math.random() > 0.2) return;
    e.dimension.spawnItem(new ItemStack(COIN, 1 + Math.floor(Math.random() * 2)), e.location);
  } catch { /* */ }
}

export function startEconomy() {
  onKill(coinDrop);
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try {
        if (countItem(p, COIN) > 0) depositCoinItems(p);
      } catch { /* */ }
    }
  }, 20);
}

