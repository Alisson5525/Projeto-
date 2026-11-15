// Santuário Celestial em tempo de execução: a Pedra dos Ventos (subir e descer), os Três Juramentos (Valor, Sabedoria e
// Sacrifício), o Portão Celestial, a luta contra Auriel na Plataforma do Guardião, a vitória e a reativação do chefe,
// os ventos que amparam quem cai da ilha e o uso do Coração de Aetherita (fim da Crônica VII).
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, V, ok, isActivePlayer, say, effect, health, takeItem, countItem, giveItem } from "../core/util.js";
import { particle, sound, psound } from "../core/fx.js";
import { addXP } from "../rpg/progression.js";
import { getData } from "../core/store.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { readLore } from "../ui/codex.js";
import { rng } from "./builder.js";
import { allSites, getSite, saveSite, fillChests, registerType, inBox, spawnGuard } from "./registry.js";
import { CELESTE, celestePlan, skyOffset, OATHS } from "./celeste.js";
import { spawnAuriel, despawnAuriel, aurielOf, setAurielArenaResolver, onAurielDefeated } from "../bosses/auriel.js";

export const SENTINEL = `${NS}:sentinela_celeste`;
export const HARPY = `${NS}:harpia`;
export const HEART = `${NS}:coracao_aetherita`;
const WTAG = (siteId) => `vw_${siteId}`; // a onda do Juramento do Valor
const REARM_MIN = 90;
const WRONG_CD = 400; // ticks de espera depois de errar a pergunta da Sabedoria
const layouts = new Map();
const mem = new Map();
const key = (p) => `${p.x},${p.y},${p.z}`;
const OATH_NAME = ["Valor", "Sabedoria", "Sacrifício"];

function memOf(id) {
  let m = mem.get(id);
  if (!m) {
    m = { arenaEmpty: 0, bossMissing: 0, waveAt: 0, wrong: new Map(), fall: new Map(), fx: 0 };
    mem.set(id, m);
  }
  return m;
}
export function layout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const p = celestePlan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed));
    L = { marks: p.marks, sky: rec.y + skyOffset(rec.y) };
    L.altarAt = new Map(OATHS.map((_, i) => [key(L.marks[`altar_${i}`][0]), i]));
    layouts.set(rec.id, L);
  }
  return L;
}
function state(rec) {
  rec.m = rec.m || {};
  const m = rec.m;
  if (!Array.isArray(m.juramentos)) m.juramentos = [0, 0, 0];
  if (m.portao === undefined) m.portao = false;
  if (!m.chefe) m.chefe = "pronto";
  if (!m.onda) m.onda = 0;
  return m;
}
const done = (rec) => state(rec).juramentos.filter(Boolean).length;
const mid = (pos) => ({ x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 });

CELESTE.afterBuild = (rec) => {
  rec.m = { juramentos: [0, 0, 0], portao: false, chefe: "pronto", onda: 0, vitorias: 0, derrotadoEm: 0 };
};
registerType(CELESTE);

export function celesteAt(dimId, loc) {
  for (const r of allSites()) {
    if (r.tipo !== "celeste" || r.dim !== dimId || r.estado === "construindo") continue;
    if (r.area && inBox(r.area, loc, 4)) return r;
  }
  return undefined;
}
function islandPlayers(dim, rec, r = 80) {
  const c = layout(rec).marks.ceu[0];
  return dim.getPlayers({ location: mid(c), maxDistance: r }).filter(isActivePlayer);
}

// ------------------------------------------------------------------ a Pedra dos Ventos
export function windStone(player, rec, up) {
  const L = layout(rec);
  const to = mid(up ? L.marks.chegada[0] : L.marks.retorno[0]);
  const dim = player.dimension;
  particle(dim, "vento_tornado", player.location, { radius: 1.2 });
  sound(dim, "mob.enderdragon.flap", player.location, 0.6, 1.4);
  try {
    player.teleport(to, { facingLocation: up ? mid(L.marks.chefe[0]) : mid(L.marks.subida[0]), keepVelocity: false });
  } catch {
    return;
  }
  effect(player, "slow_falling", 100, 0);
  particle(dim, "sagrado_pilar", to, {});
  psound(player, "beacon.activate", 1.4, 0.7);
  if (up) {
    player.onScreenDisplay.setTitle("§bSantuário Celestial", { subtitle: `§7Juramentos cumpridos: ${done(rec)}/3`, fadeInDuration: 10,
      stayDuration: 50, fadeOutDuration: 15 });
    setFlag(player, "subiu_celeste");
  } else {
    player.onScreenDisplay.setActionBar("§7Os ventos o levam de volta ao chão.");
  }
}

// ------------------------------------------------------------------ os Três Juramentos
function completeOath(dim, rec, i) {
  const m = state(rec);
  if (m.juramentos[i]) return;
  m.juramentos[i] = 1;
  saveSite(rec);
  const L = layout(rec);
  const a = mid(L.marks[`altar_${i}`][0]);
  particle(dim, "sagrado_pilar", a, {});
  particle(dim, "sagrado_explosao", V.up(a, 1), { radius: 2 });
  sound(dim, "beacon.power", a, 0.8, 1);
  const n = done(rec);
  for (const p of islandPlayers(dim, rec)) {
    addXP(p, 220, `Juramento do ${OATH_NAME[i]}`);
    questEvent(p, "juramento", "celeste");
    p.onScreenDisplay.setTitle(`§eJuramento do ${OATH_NAME[i]}`, { subtitle: `§7${n}/3 juramentos cumpridos`, fadeInDuration: 5,
      stayDuration: 50, fadeOutDuration: 10 });
    if (n >= 3) setFlag(p, "juramentos_celeste");
  }
  if (n >= 3) openGate(dim, rec);
}
export function openGate(dim, rec) {
  const m = state(rec);
  if (m.portao) return;
  m.portao = true;
  saveSite(rec);
  const L = layout(rec);
  for (const pos of L.marks.barreira) {
    try { dim.setBlockType(pos, "minecraft:air"); } catch { /* */ }
  }
  const c = mid(L.marks.barreira[Math.floor(L.marks.barreira.length / 2)]);
  particle(dim, "sagrado_explosao", c, { radius: 3 });
  sound(dim, "beacon.activate", c, 0.7, 1);
  for (const p of islandPlayers(dim, rec, 90)) {
    p.onScreenDisplay.setTitle("§eO Portão Celestial se abre", { subtitle: "§7Suba a escadaria. O Guardião espera.", fadeInDuration: 10,
      stayDuration: 60, fadeOutDuration: 15 });
  }
}

// Valor: uma onda de sentinelas e harpias
function waveAlive(dim, rec) {
  try {
    return dim.getEntities({ tags: [WTAG(rec.id)] }).length;
  } catch {
    return 0;
  }
}
export function startValor(player, rec) {
  const m = state(rec);
  const dim = player.dimension;
  if (m.onda) {
    const n = waveAlive(dim, rec);
    return `§6O altar espera. §fDerrote os desafiantes do Valor §7(${n} de pé).`;
  }
  const L = layout(rec);
  m.onda = 1;
  saveSite(rec);
  memOf(rec.id).waveAt = system.currentTick;
  const list = [SENTINEL, HARPY, SENTINEL, HARPY];
  L.marks.onda.forEach((pos, k) => {
    particle(dim, "cor_circulo_magico", mid(pos), { color: "holy", radius: 1.2 });
    system.runTimeout(() => {
      const e = spawnGuard(dim, list[k % list.length], list[k % list.length] === HARPY ? V.up(pos, 2) : pos, rec.id);
      if (e) e.addTag(WTAG(rec.id));
      particle(dim, "sagrado_explosao", V.up(mid(pos), 1), { radius: 1 });
    }, 30);
  });
  sound(dim, "mob.evocation_illager.prepare_summon", player.location, 0.6, 1.2);
  return "§6\"Mostre seu valor.\" §fDesafiantes descem do céu!";
}
function valorTick(dim, rec) {
  const m = state(rec);
  if (!m.onda || m.juramentos[0]) return;
  if (system.currentTick - memOf(rec.id).waveAt < 60) return;
  if (waveAlive(dim, rec) > 0) return;
  m.onda = 0;
  completeOath(dim, rec, 0);
}

// Sabedoria: uma pergunta sobre as Crônicas
export const QUESTIONS = [
  ["Quem guardava o fragmento do Coração nas montanhas?", "O Titã de Pedra", ["O Rei Durgan", "Morthil", "Vaelith"]],
  ["Qual era o nome do Rei Demônio do Trono Sombrio?", "Azrakar", ["Malachar", "Durgan", "Ignaroth"]],
  ["De que cristal era feito o Coração que se partiu?", "Aetherita", ["Mithril", "Obsidiana", "Ametista"]],
  ["Quem governa Aelthar, o Reino Élfico?", "A Rainha Lyrael", ["Vaelith", "A Irmã Ada", "O Rei Aldemar III"]],
  ["Qual rei anão ainda guarda as Ruínas de Kar'Dum?", "Durgan", ["Aldemar", "Azrakar", "Malachar"]],
  ["Quem é o Senhor dos Mortos?", "Malachar", ["Morthil", "Azrakar", "Durgan"]],
  ["Quem reina em Aurendel, a capital de Valdoria?", "O Rei Aldemar III", ["A Rainha Lyrael", "O Rei Durgan", "Vaelith"]],
];
async function showForm(player, form, tries = 0) {
  try {
    const r = await form.show(player);
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && tries < 20) {
      await new Promise((res) => system.runTimeout(() => res(undefined), 10));
      return showForm(player, form, tries + 1);
    }
    return r;
  } catch {
    return { canceled: true };
  }
}
export async function askSabedoria(player, rec) {
  const mm = memOf(rec.id);
  const wait = (mm.wrong.get(player.id) || 0) - system.currentTick;
  if (wait > 0) return `§7A luz do altar ainda está apagada. Tente de novo em ${Math.ceil(wait / 20)}s.`;
  const [q, right, wrong] = /** @type {[string, string, string[]]} */ (QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]);
  const opts = [right, ...wrong].sort(() => Math.random() - 0.5);
  const f = new ActionFormData().title("Juramento da Sabedoria").body(`§7Uma voz serena pergunta:\n\n§f${q}`);
  for (const o of opts) f.button(o);
  const r = await showForm(player, f);
  if (r.canceled || r.selection === undefined || !ok(player)) return "§7A voz espera, paciente.";
  if (opts[r.selection] === right) {
    completeOath(player.dimension, rec, 1);
    return "§e\"Você lembra. Isso basta.\"";
  }
  mm.wrong.set(player.id, system.currentTick + WRONG_CD);
  particle(player.dimension, "raio_explosao", V.up(player.location, 1), { radius: 1 });
  psound(player, "random.fizz", 1, 0.6);
  return "§c\"Não.\" §7A luz do altar se apaga por um tempo. Leia os diários das Crônicas e volte.";
}

// Sacrifício: uma Maçã Dourada e parte da própria vida
export function offerSacrificio(player, rec) {
  if (countItem(player, "minecraft:golden_apple") < 1) {
    return "§6O altar pede algo que cura. §fTraga uma Maçã Dourada §7(o juramento também cobra parte da sua vida).";
  }
  takeItem(player, "minecraft:golden_apple", 1);
  completeOath(player.dimension, rec, 2);
  // o custo em vida vem depois da recompensa, para que uma subida de nível não o desfaça
  const h = health(player);
  if (h) {
    try { h.setCurrentValue(Math.max(1, Math.floor(h.currentValue * 0.6))); } catch { /* */ }
  }
  particle(player.dimension, "sangue_explosao", V.up(player.location, 1), { radius: 1 });
  psound(player, "random.orb", 0.5, 0.8);
  return "§e\"Quem entrega o que cura, sabe o que custa.\"";
}

function useAltar(player, rec, i) {
  const m = state(rec);
  if (m.juramentos[i]) return Promise.resolve(`§7O Juramento do ${OATH_NAME[i]} já foi cumprido aqui.`);
  if (i === 0) return Promise.resolve(startValor(player, rec));
  if (i === 1) return askSabedoria(player, rec);
  return Promise.resolve(offerSacrificio(player, rec));
}

// ------------------------------------------------------------------ a Plataforma do Guardião
function startFight(dim, rec, players) {
  const L = layout(rec);
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  for (const p of players) p.onScreenDisplay.setActionBar("§eAs nuvens se abrem acima de você...");
  system.runTimeout(() => {
    try {
      spawnAuriel(dim, L.marks.chefe[0], rec.id);
    } catch (e) {
      console.warn(`[Valdoria] Auriel: ${e}`);
      resetFight(dim, rec);
    }
  }, 30);
}
function resetFight(dim, rec) {
  despawnAuriel(dim, rec.id);
  state(rec).chefe = "pronto";
  saveSite(rec);
  for (const p of islandPlayers(dim, rec, 90)) p.onScreenDisplay.setActionBar("§7Auriel volta para além das nuvens... a luta foi reiniciada.");
}
function arena(dim, rec, players) {
  const L = layout(rec);
  const inside = players.filter((p) => isActivePlayer(p) && inBox(L.marks.arena, p.location, 0.2));
  const m = state(rec);
  const mm = memOf(rec.id);
  if (m.chefe === "pronto") {
    if (inside.length) startFight(dim, rec, inside);
    return;
  }
  if (m.chefe !== "luta") return;
  mm.arenaEmpty = inside.length ? 0 : mm.arenaEmpty + 1;
  mm.bossMissing = aurielOf(dim, rec.id) ? 0 : mm.bossMissing + 1;
  if (mm.arenaEmpty > 60 || mm.bossMissing > 20) resetFight(dim, rec);
}
function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec || rec.tipo !== "celeste") return;
  const L = layout(rec);
  const m = state(rec);
  const first = !m.vitorias;
  m.chefe = "derrotado";
  m.derrotadoEm = Date.now();
  m.vitorias = (m.vitorias || 0) + 1;
  saveSite(rec);
  const bau = L.marks.bau[0];
  try { dim.setBlockType(bau, "minecraft:chest"); } catch { /* */ }
  const extra = {};
  if (first || Math.random() < 0.3) extra.item = `${NS}:lanca_auriel`;
  if (first) extra.lore = "auriel_ultimas";
  system.runTimeout(() => {
    fillChests(dim, [{ pos: bau, tier: "celeste_tesouro", extra }]);
    particle(dim, "sagrado_explosao", V.up(mid(bau), 0.5), { radius: 1.5 });
  }, 10);
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, "guardiao_celeste");
    questEvent(p, "limpar", "celeste");
    const d = getData(p);
    if (!d.flags?.coracao_entregue) {
      setFlag(p, "coracao_entregue");
      giveItem(p, new ItemStack(HEART, 1));
      say(p, "§bAs mãos de Auriel se abrem antes de virar luz: o último fragmento se une aos outros. §fVocê recebeu o §bCoração de Aetherita§f.");
    }
  }
}
/** Reativa a plataforma: Auriel pode ser enfrentado de novo (os juramentos continuam cumpridos). */
export function rearm(dim, rec) {
  despawnAuriel(dim, rec.id);
  try { dim.setBlockType(layout(rec).marks.bau[0], "minecraft:air"); } catch { /* */ }
  state(rec).chefe = "pronto";
  saveSite(rec);
  const keep = memOf(rec.id).wrong;
  mem.delete(rec.id);
  memOf(rec.id).wrong = keep;
}

/** Modo de Teste: cumpre os juramentos que faltam (a onda do Valor some). */
export function oathsForTest(rec) {
  const dim = world.getDimension(rec.dim);
  try { for (const e of dim.getEntities({ tags: [WTAG(rec.id)] })) e.remove(); } catch { /* */ }
  state(rec).onda = 0;
  for (let i = 0; i < 3; i++) completeOath(dim, rec, i);
  openGate(dim, rec);
}
/** Modo de Teste: abre o portão e faz Auriel descer. */
export function wakeAurielForTest(rec) {
  const dim = world.getDimension(rec.dim);
  openGate(dim, rec);
  if (aurielOf(dim, rec.id)) return false;
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  spawnAuriel(dim, layout(rec).marks.chefe[0], rec.id);
  return true;
}

// ------------------------------------------------------------------ o Coração de Aetherita
export function useHeart(player) {
  const dim = player.dimension;
  particle(dim, "sagrado_pilar", player.location, {});
  particle(dim, "cor_anel", V.up(player.location, 1), { color: "arcane", radius: 2 });
  psound(player, "beacon.power", 1, 0.8);
  player.onScreenDisplay.setTitle("§bO Coração de Aetherita", { subtitle: "§7Ele pulsa... e Valdoria pulsa junto.", fadeInDuration: 10,
    stayDuration: 60, fadeOutDuration: 20 });
  setFlag(player, "coracao_reunido");
  system.runTimeout(() => ok(player) && readLore(player, "coracao_reunido").catch(() => { /* */ }), 40);
}

// ------------------------------------------------------------------ laço
function windRescue(dim, rec, L, mm) {
  const [a, b] = rec.area;
  for (const p of dim.getPlayers({ location: mid(L.marks.ceu[0]), maxDistance: 140 })) {
    const loc = p.location;
    if (loc.x < a.x || loc.x > b.x + 1 || loc.z < a.z || loc.z > b.z + 1) continue;
    if (loc.y < rec.y + 10 || loc.y > L.sky + 2) continue;
    let vy = 0;
    try { vy = p.getVelocity().y; } catch { /* */ }
    if (vy > -0.6) continue;
    const last = mm.fall.get(p.id) || 0;
    if (system.currentTick - last < 60) continue;
    mm.fall.set(p.id, system.currentTick);
    effect(p, "slow_falling", 200, 0);
    particle(dim, "vento_rastro", loc, {});
    p.onScreenDisplay.setActionBar("§bOs ventos do Santuário amparam sua queda.");
  }
}

function loop() {
  for (const rec of allSites()) {
    if (rec.tipo !== "celeste" || rec.estado === "construindo") continue;
    let dim;
    try { dim = world.getDimension(rec.dim); } catch { continue; }
    const m = state(rec);
    const L = layout(rec);
    const c = mid(L.marks.ceu[0]);
    const ground = mid(L.marks.subida[0]);
    const near = dim.getPlayers({ location: c, maxDistance: 110 });
    const nearGround = dim.getPlayers({ location: ground, maxDistance: 40 });
    if (m.chefe === "derrotado" && Date.now() - (m.derrotadoEm || 0) > REARM_MIN * 60000 && !near.length) {
      try { if (dim.isChunkLoaded(c)) rearm(dim, rec); } catch { /* */ }
      continue;
    }
    const mm = memOf(rec.id);
    if (nearGround.length && system.currentTick - mm.fx > 40) {
      mm.fx = system.currentTick;
      particle(dim, "sagrado_pilar", V.up(ground, 0.5), {});
    }
    if (!near.length && !nearGround.length) continue;
    windRescue(dim, rec, L, mm);
    if (!near.length) continue;
    valorTick(dim, rec);
    if (done(rec) >= 3) {
      if (!m.portao) openGate(dim, rec);
      for (const p of near) if (isActivePlayer(p) && V.dist(p.location, c) < 60) setFlag(p, "juramentos_celeste");
    }
    if (m.portao) arena(dim, rec, near);
  }
}

export function startCeleste() {
  setAurielArenaResolver((siteId) => {
    const rec = getSite(siteId);
    if (!rec) return undefined;
    const L = layout(rec);
    return { arena: L.marks.arena, center: mid(L.marks.chefe[0]) };
  });
  onAurielDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] Santuário Celestial: ${e}`); }
  }, 10);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const id = ev.block.typeId;
    const isStone = id === `${NS}:pedra_ventos`;
    const isAltar = id === `${NS}:altar_juramento`;
    const isGate = id === `${NS}:barreira_celeste`;
    const isLectern = id === "minecraft:lectern";
    if (!isStone && !isAltar && !isGate && !isLectern) return;
    const pos = { ...ev.block.location };
    const rec = celesteAt(ev.block.dimension.id, pos);
    if (!rec) return;
    const L = layout(rec);
    if (isLectern && ![...(L.marks.inscricao || []), ...(L.marks.inscricao_chao || [])].some((q) => key(q) === key(pos))) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    system.run(() => {
      if (!ok(p)) return;
      if (isStone) {
        windStone(p, rec, key(pos) === key(L.marks.subida[0]));
      } else if (isAltar) {
        const i = L.altarAt.get(key(pos));
        if (i !== undefined) useAltar(p, rec, i).then((msg) => ok(p) && msg && say(p, msg)).catch(() => { /* */ });
      } else if (isGate) {
        say(p, `§eUma cortina de luz. §fEla só se abre quando os Três Juramentos forem cumpridos §7(${done(rec)}/3).`);
        psound(p, "beacon.ambient", 1.4, 0.6);
      } else {
        readLore(p, "inscricao_celeste").catch(() => { /* */ });
      }
    });
  });
}

