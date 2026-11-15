// Aelthar em tempo de execução: moradores élficos, o Conselho da Rainha Lyrael, o Orvalho Lunar do druida, as Memórias da
// Biblioteca das Folhas, a purificação das três Raízes Corrompidas (cada uma desperta uma onda de brotos), o Selo de Raízes,
// a luta contra Morthil no Coração de Ylthariel, a Bênção de Aelthar e a reativação do chefe.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { NS, V, ok, isPlayer, isActivePlayer, say, countItem, takeItem, giveItem, rand } from "../core/util.js";
import { particle, sound, psound } from "../core/fx.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { markLoreRead, readLore } from "../ui/codex.js";
import { Plan, B, build, rng } from "../structures/builder.js";
import { allSites, getSite, saveSite, center, fillChests, registerType, inBox } from "../structures/registry.js";
import { AELTHAR, aeltharPlan, ROOTS, rootPatch, caveFloor } from "../structures/aelthar.js";
import { spawnMorthil, despawnMorthil, morthilOf, setMorthilArenaResolver, onMorthilDefeated, BROTO } from "../bosses/morthil.js";
import { residentsFromPlan, spawnResident } from "./residents.js";
import { show, addRep } from "./economy.js";

const I = (id) => `${NS}:${id}`;
export const ORVALHO = I("orvalho_lunar");
const REARM_MIN = 90;
const RTAG = (siteId, i) => `vr_${siteId}_${i}`; // brotos de uma onda de purificação
const layouts = new Map();
const mem = new Map(); // id -> estado temporário (arena)
const key = (p) => `${p.x},${p.y},${p.z}`;

function memOf(id) {
  let m = mem.get(id);
  if (!m) {
    m = { arenaEmpty: 0, bossMissing: 0, waveEmpty: [0, 0, 0] };
    mem.set(id, m);
  }
  return m;
}
/** Marcações da planta em coordenadas do mundo (a planta é determinística pela semente do local). */
export function layout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const p = aeltharPlan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed));
    L = { marks: p.marks };
    L.rootAt = new Map(L.marks.raiz.map((pos, i) => [key(pos), i]));
    L.sealAt = new Set(L.marks.selo.map(key));
    layouts.set(rec.id, L);
  }
  return L;
}
function localSet(dim, rec, fn) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed + 7));
  fn(p);
  return build(dim, p, 300).then(() => p);
}
function state(rec) {
  rec.m = rec.m || {};
  const m = rec.m;
  if (!Array.isArray(m.raizes)) m.raizes = [0, 0, 0];
  if (m.selo === undefined) m.selo = false;
  if (!m.chefe) m.chefe = "pronto";
  return m;
}
const purified = (rec) => state(rec).raizes.filter((v) => v === 2).length;

AELTHAR.afterBuild = (rec, plan) => {
  rec.m = { moradores: residentsFromPlan(rec, plan), raizes: [0, 0, 0], selo: false, chefe: "pronto", vitorias: 0, derrotadoEm: 0, ataque: [],
    ultimoAtaque: -99 };
  const dim = world.getDimension(rec.dim);
  for (const m of rec.m.moradores) spawnResident(dim, rec, m);
};
registerType(AELTHAR);

/** Local de Aelthar mais próximo que contém a posição (área da planta). */
export function aeltharAt(dimId, loc) {
  for (const r of allSites()) {
    if (r.tipo !== "aelthar" || r.dim !== dimId || r.estado === "construindo") continue;
    if (r.area && inBox(r.area, loc, 4)) return r;
  }
  return undefined;
}
function nearestAelthar(player) {
  let best;
  let bd = Infinity;
  for (const r of allSites()) {
    if (r.tipo !== "aelthar" || r.dim !== player.dimension.id) continue;
    const d = V.dist(center(r), player.location);
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return best;
}

// ------------------------------------------------------------------ Raízes Corrompidas
/** Começa a purificação de uma raiz (gasta 1 Orvalho Lunar e desperta uma onda de brotos). */
export function startPurify(player, rec, i) {
  const m = state(rec);
  if (m.raizes[i] === 2) return "§aEsta raiz já foi purificada: as flores voltaram a crescer em volta dela.";
  if (m.raizes[i] === 1) return "§eA purificação já começou! §fDerrote os brotos corrompidos que defendem a raiz.";
  if (countItem(player, ORVALHO) < 1) return "§7A raiz pulsa, cinzenta e fria. §fSó o §bOrvalho Lunar§f dos druidas pode purificá-la.";
  if (!takeItem(player, ORVALHO, 1)) return "§cVocê precisa de Orvalho Lunar.";
  const dim = player.dimension;
  const L = layout(rec);
  const pos = L.marks.raiz[i];
  const c = { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 };
  const players = dim.getPlayers({ location: c, maxDistance: 24 }).filter(isActivePlayer);
  const n = Math.min(5, 3 + Math.max(0, players.length - 1));
  let spawned = 0;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand(-0.3, 0.3);
    const at = { x: c.x + Math.cos(a) * 4.5, y: c.y + 0.1, z: c.z + Math.sin(a) * 4.5 };
    try {
      const e = dim.spawnEntity(BROTO, at, { initialPersistence: true });
      e.addTag(RTAG(rec.id, i));
      particle(dim, "praga", V.up(at, 0.5), {});
      spawned++;
    } catch { /* */ }
  }
  if (!spawned) {
    giveItem(player, new ItemStack(ORVALHO, 1));
    return "§cA raiz não reagiu (área não carregada). Tente de novo.";
  }
  m.raizes[i] = 1;
  saveSite(rec);
  memOf(rec.id).waveEmpty[i] = 0;
  particle(dim, "natureza_explosao", V.up(c, 0.8), { radius: 1.5 });
  particle(dim, "esporos", c, { radius: 2 });
  sound(dim, "mob.zombie.unfect", c, 0.6, 1);
  for (const p of players) {
    p.onScreenDisplay.setTitle("§2A Praga reage!", { subtitle: "§7Derrote os brotos corrompidos para purificar a raiz", fadeInDuration: 5,
      stayDuration: 45, fadeOutDuration: 10 });
  }
  return `§bO Orvalho Lunar escorre pela raiz... §7(${spawned} brotos despertaram)`;
}

/** Raiz purificada: a planta volta a florescer; com as três, o Selo de Raízes se abre. */
function finishRoot(dim, rec, i) {
  const m = state(rec);
  m.raizes[i] = 2;
  saveSite(rec);
  const [rx, rz] = ROOTS[i];
  localSet(dim, rec, (p) => rootPatch(p, rx, rz, true));
  const pos = layout(rec).marks.raiz[i];
  const c = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
  particle(dim, "natureza_explosao", c, { radius: 3 });
  particle(dim, "fada_brilho", V.up(c, 1), {});
  sound(dim, "random.levelup", c, 1.4, 0.7);
  const done = purified(rec);
  for (const p of dim.getPlayers({ location: c, maxDistance: 40 })) {
    if (!isActivePlayer(p)) continue;
    addXP(p, 150, "purificação");
    questEvent(p, "purificar", "raiz");
    p.onScreenDisplay.setTitle("§aRaiz purificada", { subtitle: `§7${done}/3 raízes da Árvore-Mãe voltaram a respirar`, fadeInDuration: 5,
      stayDuration: 45, fadeOutDuration: 10 });
    if (done >= 3) setFlag(p, "raizes_aelthar");
  }
  if (done >= 3) openSeal(dim, rec);
}

/** Abre o poço do Coração: o selo vira madeira e uma escada de mão desce no centro. */
export function openSeal(dim, rec) {
  const m = state(rec);
  if (m.selo) return;
  m.selo = true;
  saveSite(rec);
  localSet(dim, rec, (p) => {
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) p.set(x, 0, z, x === 0 && z === 0 ? B.ladder("south") : B.log("minecraft:birch_wood"));
  });
  const c = V.up(center(rec), 1);
  particle(dim, "natureza_espinhos", c, { radius: 2 });
  sound(dim, "mob.warden.dig", c, 0.8, 1);
  for (const p of dim.getPlayers({ location: c, maxDistance: 90 })) {
    p.onScreenDisplay.setTitle("§aO Selo de Raízes se abre", { subtitle: "§7No salão das raízes da Árvore-Mãe, um poço desce até o Coração de Ylthariel",
      fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 15 });
  }
}

function waves(dim, rec) {
  const m = state(rec);
  const mm = memOf(rec.id);
  const L = layout(rec);
  for (let i = 0; i < 3; i++) {
    if (m.raizes[i] !== 1) continue;
    const pos = L.marks.raiz[i];
    let alive = 0;
    try { alive = dim.getEntities({ type: BROTO, tags: [RTAG(rec.id, i)] }).length; } catch { continue; }
    const near = dim.getPlayers({ location: pos, maxDistance: 48 }).some(isActivePlayer);
    if (!near) {
      // todos foram embora: a onda se desfaz e a raiz volta a esperar outro orvalho
      if (++mm.waveEmpty[i] < 60) continue;
      for (const e of dim.getEntities({ tags: [RTAG(rec.id, i)] })) e.remove();
      m.raizes[i] = 0;
      saveSite(rec);
      continue;
    }
    mm.waveEmpty[i] = 0;
    if (alive === 0) finishRoot(dim, rec, i);
  }
}

/** Modo de Teste: purifica na hora as raízes que faltam (abre o selo). */
export function purifyAllForTest(rec) {
  const dim = world.getDimension(rec.dim);
  for (let i = 0; i < 3; i++) {
    if (state(rec).raizes[i] === 2) continue;
    for (const e of dim.getEntities({ tags: [RTAG(rec.id, i)] })) e.remove();
    finishRoot(dim, rec, i);
  }
  openSeal(dim, rec);
}
/** Modo de Teste: abre o selo e desperta Morthil no Coração. */
export function wakeMorthilForTest(rec) {
  const dim = world.getDimension(rec.dim);
  openSeal(dim, rec);
  if (morthilOf(dim, rec.id)) return false;
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  spawnMorthil(dim, layout(rec).marks.chefe[0], rec.id);
  return true;
}

// ------------------------------------------------------------------ o Coração de Ylthariel (luta)
function startFight(dim, rec, players) {
  const L = layout(rec);
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  for (const p of players) p.onScreenDisplay.setActionBar("§2As raízes do Coração estremecem...");
  sound(dim, "mob.warden.dig", L.marks.chefe[0], 0.6, 1);
  system.runTimeout(() => {
    try {
      spawnMorthil(dim, L.marks.chefe[0], rec.id);
    } catch (e) {
      console.warn(`[Valdoria] Morthil: ${e}`);
      resetFight(dim, rec);
    }
  }, 30);
}
function resetFight(dim, rec) {
  despawnMorthil(dim, rec.id);
  state(rec).chefe = "pronto";
  saveSite(rec);
  for (const p of dim.getPlayers({ location: center(rec), maxDistance: 110 })) {
    p.onScreenDisplay.setActionBar("§7Morthil volta a dormir sob as raízes... a luta foi reiniciada.");
  }
}
function arena(dim, rec, players) {
  const L = layout(rec);
  const box = L.marks.arena;
  const inside = players.filter((p) => isActivePlayer(p) && inBox(box, p.location, 0.2));
  const m = state(rec);
  const mm = memOf(rec.id);
  if (m.chefe === "pronto") {
    if (inside.length) startFight(dim, rec, inside);
    return;
  }
  if (m.chefe !== "luta") return;
  mm.arenaEmpty = inside.length ? 0 : mm.arenaEmpty + 1;
  mm.bossMissing = morthilOf(dim, rec.id) ? 0 : mm.bossMissing + 1;
  if (mm.arenaEmpty > 50 || mm.bossMissing > 20) resetFight(dim, rec);
}

function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec || rec.tipo !== "aelthar") return;
  const L = layout(rec);
  const m = state(rec);
  const first = !m.vitorias;
  m.chefe = "derrotado";
  m.derrotadoEm = Date.now();
  m.vitorias = (m.vitorias || 0) + 1;
  saveSite(rec);
  // o Coração volta a florescer e a mancha cinzenta some do tronco; depois, o baú surge no fundo da caverna
  for (const pos of L.marks.praga_tronco || []) {
    try { dim.setBlockType(pos, "minecraft:birch_wood"); } catch { /* */ }
  }
  const bau = L.marks.bau_coracao[0];
  const extra = {};
  if (first || Math.random() < 0.3) extra.item = I("arco_ylthariel");
  if (first) extra.lore = "morthil_ultimas";
  localSet(dim, rec, (p) => caveFloor(p, true)).then(() => {
    try { dim.setBlockType(bau, "minecraft:chest"); } catch { /* */ }
    fillChests(dim, [{ pos: bau, tier: "aelthar_tesouro", extra }]);
    particle(dim, "natureza_explosao", { x: bau.x + 0.5, y: bau.y + 0.5, z: bau.z + 0.5 }, { radius: 1.5 });
    for (const p of dim.getPlayers({ location: bau, maxDistance: 40 })) {
      p.onScreenDisplay.setActionBar("§aRaízes se afastam e revelam um baú no fundo do Coração.");
    }
  });
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, "morthil");
    questEvent(p, "limpar", "aelthar");
  }
}

/** Reativa o Coração: a praga volta ao chão da caverna e Morthil pode ser enfrentado de novo. */
export function rearm(dim, rec) {
  despawnMorthil(dim, rec.id);
  const L = layout(rec);
  localSet(dim, rec, (p) => caveFloor(p, false));
  try { dim.setBlockType(L.marks.bau_coracao[0], "minecraft:air"); } catch { /* */ }
  state(rec).chefe = "pronto";
  saveSite(rec);
  mem.delete(rec.id);
}

// ------------------------------------------------------------------ a Rainha, o druida e o sábio
const COUNCIL = [
  "§aRainha Lyrael: §f\"Então Valdoria mandou seu cavaleiro. As árvores sussurraram seu nome antes de você chegar à sebe.\"",
  "§aRainha Lyrael: §f\"Uma praga cinzenta bebe a seiva de Ylthariel. Três raízes da Árvore-Mãe afloraram fora da sebe, frias como pedra.\"",
  "§aRainha Lyrael: §f\"Procure a druida no Bosque, a sudoeste. O Orvalho Lunar dela desperta o que a praga adormeceu.\"",
  "§aRainha Lyrael: §f\"Quando as três raízes respirarem, o selo no salão das raízes vai se abrir. E então... cuidado com Morthil.\"",
];
export function council(player) {
  for (const [i, l] of COUNCIL.entries()) system.runTimeout(() => ok(player) && say(player, l), i * 50);
  markLoreRead(player, "cronica_aelthar", true);
  const f = getData(player).flags || {};
  if (!f.conselho_elfico) {
    setFlag(player, "conselho_elfico");
    addRep(player, 20, "conselho da Rainha de Aelthar");
  }
}
export function canBless(player) {
  const f = getData(player).flags || {};
  return !!f.morthil && !f.amigo_elfico;
}
/** A Bênção de Aelthar: a armadura da Guarda, reputação e o título de Amigo dos Elfos. */
export function bless(player, npc) {
  if (!canBless(player)) return false;
  setFlag(player, "amigo_elfico");
  addRep(player, 100, "Bênção de Aelthar");
  for (const piece of ["capacete", "peitoral", "calcas", "botas"]) giveItem(player, new ItemStack(I(`aelthar_${piece}`), 1));
  giveItem(player, new ItemStack(ORVALHO, 2));
  addXP(player, 1500, "Bênção de Aelthar");
  if (npc && ok(npc)) {
    try {
      npc.setProperty(`${NS}:anim`, 1);
      system.runTimeout(() => { try { if (ok(npc)) npc.setProperty(`${NS}:anim`, 0); } catch { /* */ } }, 60);
    } catch { /* */ }
  }
  const dim = player.dimension;
  particle(dim, "natureza_explosao", V.up(player.location, 1), { radius: 2.5 });
  particle(dim, "fada_brilho", V.up(player.location, 2), {});
  particle(dim, "nivel_anel", player.location);
  sound(dim, "random.levelup", player.location, 1.2, 0.8);
  player.onScreenDisplay.setTitle("§aAmigo dos Elfos", { subtitle: "§7\"Ylthariel lembra o seu nome. E vai lembrar por mil anos.\"",
    fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 });
  world.sendMessage(`§a[Valdoria] §f${player.name} recebeu a Bênção de Aelthar da Rainha Lyrael!`);
  saveNow(player);
  return true;
}
export async function queenMenu(player, npc, back) {
  const f = getData(player).flags || {};
  const rec = nearestAelthar(player);
  const n = rec ? purified(rec) : 0;
  /** @type {[string, () => any][]} */
  const opts = [["Pedir conselho", () => council(player)]];
  if (canBless(player)) opts.push(["§aReceber a Bênção de Aelthar", () => bless(player, npc)]);
  const body = f.amigo_elfico ? "§aVocê é Amigo dos Elfos. §7Aelthar é sua casa também." :
    f.morthil ? "§fMorthil descansa e a seiva volta a correr. Aproxime-se: Aelthar tem um presente para você." :
      f.conselho_elfico ? `§7Raízes purificadas: §f${n}/3§7. ${n >= 3 ? "O selo se abriu: desça ao Coração." : "Fale com a druida no Bosque."}` :
        "§7A Rainha o observa, as mãos pousadas nos braços do trono vivo.";
  const form = new ActionFormData().title("Rainha Lyrael").body(body);
  for (const [l] of opts) form.button(l);
  form.button("Voltar");
  const r = await show(player, form);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= opts.length) return back && back(player);
  await opts[r.selection][1]();
  return back && back(player);
}

/** O druida entrega o Orvalho Lunar: 3 na primeira vez; depois, 1 de cortesia se faltar orvalho e houver raízes cinzentas. */
export function askDew(player, info) {
  const d = getData(player);
  const f = d.flags || {};
  const nome = info?.nome || "Druida";
  if (!f.conselho_elfico) return `§a${nome}: §f"A Rainha ainda não falou de você. Suba ao Salão do Conselho primeiro."`;
  if (!f.orvalho) {
    giveItem(player, new ItemStack(ORVALHO, 3));
    setFlag(player, "orvalho");
    markLoreRead(player, "diario_druida", true);
    return `§a${nome}: §f"Três frascos, colhidos na última lua cheia. Derrame um em cada raiz cinzenta... e esteja pronto para o que sair da terra."`;
  }
  const rec = nearestAelthar(player);
  const left = rec ? 3 - purified(rec) : 0;
  if (left > 0 && countItem(player, ORVALHO) < 1) {
    giveItem(player, new ItemStack(ORVALHO, 1));
    return `§a${nome}: §f"Perdeu o frasco? Tome outro. Ainda ${left === 1 ? "falta uma raiz" : `faltam ${left} raízes`}."`;
  }
  return `§a${nome}: §f"Você já tem orvalho suficiente. Se precisar de mais, posso vender."`;
}

export async function memoriesMenu(player, back) {
  const f = getData(player).flags || {};
  const entries = [["cronica_aelthar", true], ["diario_druida", !!f.orvalho], ["morthil_ultimas", !!f.morthil]];
  const avail = entries.filter(([, ok2]) => ok2).map(([id]) => id);
  const form = new ActionFormData().title("Memórias de Aelthar")
    .body("§7Folhas caídas da Árvore-Mãe, copiadas pelos sábios. §8(Mais memórias se abrem conforme a Crônica V avança.)");
  const titles = { cronica_aelthar: "Crônica de Aelthar", diario_druida: "Diário da Druida Faelwen", morthil_ultimas: "Últimas Palavras de Morthil" };
  for (const id of avail) form.button(titles[id], "textures/items/valdoria/pergaminho_antigo");
  form.button("Voltar");
  const r = await show(player, form);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= avail.length) return back && back(player);
  await readLore(player, avail[r.selection]);
  return memoriesMenu(player, back);
}

// ------------------------------------------------------------------ laço principal
function loop() {
  for (const rec of allSites()) {
    if (rec.tipo !== "aelthar" || rec.estado === "construindo") continue;
    let dim;
    try {
      dim = world.getDimension(rec.dim);
    } catch {
      continue;
    }
    const m = state(rec);
    const c = center(rec);
    const players = dim.getPlayers({ location: c, maxDistance: 120 });
    if (m.chefe === "derrotado" && Date.now() - (m.derrotadoEm || 0) > REARM_MIN * 60000 && !players.some((p) => V.dist(p.location, c) < 100)) {
      try {
        if (dim.isChunkLoaded(c)) rearm(dim, rec);
      } catch { /* */ }
      continue;
    }
    if (!players.length) continue;
    const L = layout(rec);
    waves(dim, rec);
    if (system.currentTick % 40 < 10) {
      for (let i = 0; i < 3; i++) {
        if (m.raizes[i] === 2) continue;
        const pos = L.marks.raiz[i];
        if (players.some((p) => V.dist(p.location, pos) < 40)) particle(dim, "praga", { x: pos.x + 0.5, y: pos.y + 1.2, z: pos.z + 0.5 }, {});
      }
    }
    if (purified(rec) >= 3) {
      if (!m.selo) openSeal(dim, rec);
      for (const p of players) if (isActivePlayer(p) && inBox(rec.area, p.location, 2)) setFlag(p, "raizes_aelthar");
    }
    if (m.selo) arena(dim, rec, players);
  }
}

export function startAelthar() {
  setMorthilArenaResolver((siteId) => {
    const rec = getSite(siteId);
    if (!rec) return undefined;
    const L = layout(rec);
    const pos = L.marks.chefe[0];
    return { arena: L.marks.arena, center: { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 } };
  });
  onMorthilDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] Aelthar: ${e}`); }
  }, 10);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const id = ev.block.typeId;
    const isRoot = id === I("raiz_corrompida");
    const isSeal = id === I("selo_raizes");
    const isLectern = id === "minecraft:lectern";
    if (!isRoot && !isSeal && !isLectern) return;
    const pos = { ...ev.block.location };
    const rec = aeltharAt(ev.block.dimension.id, pos);
    if (!rec) return;
    const L = layout(rec);
    if (isLectern && !(L.marks.memorias || []).some((q) => key(q) === key(pos))) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    system.run(() => {
      if (!ok(p)) return;
      if (isRoot) {
        const i = L.rootAt.get(key(pos));
        if (i !== undefined) say(p, startPurify(p, rec, i));
      } else if (isSeal) {
        say(p, `§7Raízes vivas, trançadas sobre um poço. §fElas só se abrem quando as três Raízes Corrompidas forem purificadas §7(${purified(rec)}/3).`);
        psound(p, "dig.wood", 1, 0.8);
      } else {
        readLore(p, "cronica_aelthar").catch(() => { /* */ });
      }
    });
  });
}
