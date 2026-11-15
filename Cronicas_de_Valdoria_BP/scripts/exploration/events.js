// Eventos dinâmicos do mundo: acontecimentos temporários perto dos jogadores, variando com bioma, horário e nível.
//  patrulha   - bando goblin em marcha            confronto - guardas do reino contra goblins
//  caravana   - mercador emboscado por salteadores mercador - mercador viajante com mercadorias raras
//  aventureiros - grupo que troca rumores          fera     - criatura rara (elite) para caçar
//  estrela    - estrela cadente deixa minério de Aetherita     fenda - fenda corrompida com núcleo a destruir
//  tesouro    - mapa rabiscado leva a um baú enterrado
// Limites: no máximo 3 eventos ativos, 1 por jogador, intervalo mínimo por jogador; entidades marcadas são removidas ao expirar.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, V, ok, isActivePlayer, effect, say, giveItem, pick, rand } from "../core/util.js";
import { particle, sound, psound, line } from "../core/fx.js";
import { getData, getWorldCfg } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { addCoins, spendCoins, coins, addRep } from "../npc/economy.js";
import { groundAt, Plan, B, build } from "../structures/builder.js";
import { rollLoot, fillChest } from "../structures/loot.js";
import { revealRumor } from "./rumors.js";
import { questEvent } from "../quests/quests.js";
import { onNpcInteract } from "../npc/dialogue.js";

const KEY = `${NS}:eventos`;
const ETAG = "valdoria_evento";
const TAGOF = (id) => `ve_${id}`;
const MAX_ACTIVE = 3;
const PLAYER_GAP_MS = 4 * 60 * 1000; // intervalo mínimo entre eventos para o mesmo jogador
let events = null; // [{id, tipo, dim, x, y, z, ate, dono, st}]
let counter = 0;
const lastFor = new Map(); // jogador -> Date.now() do último evento

function load() {
  if (events) return events;
  try {
    const raw = world.getDynamicProperty(KEY);
    events = typeof raw === "string" ? JSON.parse(raw) : [];
  } catch {
    events = [];
  }
  if (!Array.isArray(events)) events = [];
  return events;
}
function save() {
  try { world.setDynamicProperty(KEY, JSON.stringify(events)); } catch { /* */ }
}
export function activeEvents() {
  return load().filter((e) => e.ate > Date.now());
}

function isNight() {
  const t = world.getTimeOfDay();
  return t >= 13000 && t < 23000;
}
function biomeOf(dim, loc) {
  try { return dim.getBiome(loc)?.id || ""; } catch { return ""; }
}
const has = (b, keys) => keys.some((k) => b.includes(k));
const DIRS = ["a leste", "a sudeste", "ao sul", "a sudoeste", "a oeste", "a noroeste", "ao norte", "a nordeste"];
function dirText(from, to) {
  const a = Math.round((((Math.atan2(to.z - from.z, to.x - from.x) * 180) / Math.PI + 360) % 360) / 45) % 8;
  return DIRS[a];
}

function spawn(dim, id, loc, ev, o = {}) {
  try {
    const e = dim.spawnEntity(id, { x: loc.x + rand(-1.5, 1.5), y: loc.y, z: loc.z + rand(-1.5, 1.5) }, o.persist ? { initialPersistence: true } : undefined);
    e.addTag(ETAG);
    e.addTag(TAGOF(ev.id));
    if (o.tag) e.addTag(o.tag);
    if (o.name) e.nameTag = o.name;
    if (o.oficio !== undefined) try { e.setProperty(`${NS}:oficio`, o.oficio); } catch { /* */ }
    return e;
  } catch {
    return undefined;
  }
}
function tagged(dim, ev, extraTag) {
  try {
    return dim.getEntities({ tags: extraTag ? [TAGOF(ev.id), extraTag] : [TAGOF(ev.id)] });
  } catch {
    return [];
  }
}
function near(dim, ev, r = 40) {
  try {
    return dim.getPlayers({ location: ev, maxDistance: r }).filter(isActivePlayer);
  } catch {
    return [];
  }
}
function elite(e, lv, name) {
  effect(e, "health_boost", 20 * 60 * 20, Math.min(9, 2 + lv));
  effect(e, "strength", 20 * 60 * 20, lv >= 3 ? 1 : 0);
  effect(e, "resistance", 20 * 60 * 20, 0);
  effect(e, "speed", 20 * 60 * 20, 0);
  system.runTimeout(() => { try { e.getComponent("minecraft:health")?.resetToMaxValue(); } catch { /* */ } }, 2);
  if (name) e.nameTag = name;
}

// ====================================================================== definições
const FERAS = [
  { id: "minecraft:spider", nome: "§cViúva-de-Breu", biomas: ["forest", "jungle", "dark_forest", "roofed", "swamp"], lv: 1 },
  { id: "minecraft:husk", nome: "§6Rei das Dunas", biomas: ["desert", "badlands", "mesa"], lv: 2 },
  { id: "minecraft:stray", nome: "§bCaçador do Gelo Eterno", biomas: ["snow", "frozen", "ice", "grove", "peaks"], lv: 2 },
  { id: "minecraft:vindicator", nome: "§4Bandoleiro Rubro", biomas: ["plains", "meadow", "savanna", "sunflower", "taiga"], lv: 2 },
  { id: `${NS}:chefe_goblin`, nome: "§2Grishnak, o Saqueador", biomas: ["forest", "plains", "taiga", "savanna", "birch"], lv: 2, min: 6 },
  { id: `${NS}:gargula`, nome: "§8Gárgula Anciã", biomas: ["mountain", "peaks", "windswept", "stony", "grove"], lv: 3, min: 10 },
  { id: `${NS}:cavaleiro_corrompido`, nome: "§5Cavaleiro do Véu", biomas: ["dark_forest", "roofed", "pale", "swamp", "taiga"], lv: 3, min: 12 },
  { id: `${NS}:harpia`, nome: "§fRainha das Harpias", biomas: ["peaks", "mountain", "windswept", "stony", "meadow"], lv: 3, min: 14 },
  { id: `${NS}:espectro`, nome: "§7Espectro Ancião", biomas: [""], lv: 2, noite: true, min: 4 },
];

const MERCHANT_STOCK = [
  [`${NS}:fragmento_mapa`, 1, 140, "Fragmento de Mapa Antigo"], [`${NS}:chave_antiga`, 1, 110, "Chave Antiga"],
  [`${NS}:tomo_perdido`, 1, 180, "Tomo Perdido"], [`${NS}:mapa_explorador`, 1, 70, "Mapa do Explorador"],
  [`${NS}:pedra_aprimoramento`, 2, 55, "Pedras de Aprimoramento (2)"], [`${NS}:pocao_energia`, 3, 24, "Poções de Energia (3)"],
  [`${NS}:cristal_aetherita`, 1, 45, "Cristal de Aetherita"],
];

/** Cada tipo: quando pode acontecer (ok), como começa (start), o que acontece a cada passo (tick). */
const TIPOS = {
  patrulha: {
    nome: "Patrulha Goblin", peso: 4, dur: 6,
    ok: (c) => c.lvl >= 2 && has(c.bioma, ["forest", "plains", "taiga", "savanna", "birch", "meadow", "sunflower", "grove"]),
    start(dim, at, ev, c) {
      const n = 3 + (c.lvl >= 8 ? 1 : 0);
      for (let i = 0; i < n; i++) spawn(dim, `${NS}:goblin`, at, ev);
      if (c.lvl >= 5) spawn(dim, `${NS}:goblin_xama`, at, ev);
      return `§6Tambores de guerra: §fuma patrulha goblin marcha ${c.dir} (~${c.dist} blocos).`;
    },
    tick(dim, ev, players) {
      const alive = tagged(dim, ev).length;
      if (alive) { ev.st.visto = 1; return; }
      if (!ev.st.visto || !players.length) return;
      for (const p of players) {
        addXP(p, 90, "patrulha dispersa");
        addCoins(p, 12, "insígnias da patrulha");
      }
      return "fim";
    },
  },
  confronto: {
    nome: "Confronto de Facções", peso: 3, dur: 6,
    ok: (c) => c.lvl >= 3 && has(c.bioma, ["forest", "plains", "taiga", "savanna", "birch", "meadow"]),
    start(dim, at, ev, c) {
      for (let i = 0; i < 3; i++) spawn(dim, `${NS}:guarda`, at, ev, { tag: "vr_lado_a", oficio: 10, name: "§9Guarda do Reino" });
      const g = V.add(at, { x: 5, y: 0, z: 0 });
      for (let i = 0; i < 4; i++) spawn(dim, `${NS}:goblin`, g, ev, { tag: "vr_lado_b" });
      if (c.lvl >= 6) spawn(dim, `${NS}:goblin_xama`, g, ev, { tag: "vr_lado_b" });
      return `§9Gritos e aço: §fguardas do reino enfrentam goblins ${c.dir} (~${c.dist} blocos). Ajude-os!`;
    },
    tick(dim, ev, players) {
      const a = tagged(dim, ev, "vr_lado_a").length;
      const b = tagged(dim, ev, "vr_lado_b").length;
      if (!players.length) return;
      if (b === 0 && a > 0) {
        for (const p of players) {
          addXP(p, 140, "confronto vencido");
          addCoins(p, 20, "gratidão da guarda");
          addRep(p, 12, "ajudou a guarda");
          say(p, "§9Guarda do Reino: §f\"Valdoria agradece, aventureiro! Vou falar de você ao capitão.\"");
        }
        for (const e of tagged(dim, ev, "vr_lado_a")) particle(dim, "nivel_anel", e.location, {});
        return "fim";
      }
      if (a === 0) {
        for (const p of players) p.onScreenDisplay.setActionBar("§cOs guardas caíram... os goblins comemoram.");
        return "falha";
      }
    },
  },
  caravana: {
    nome: "Caravana Emboscada", peso: 2, dur: 7,
    ok: (c) => c.lvl >= 5 && !c.noite && has(c.bioma, ["plains", "savanna", "meadow", "forest", "taiga", "desert", "sunflower"]),
    start(dim, at, ev, c) {
      spawn(dim, `${NS}:aldeao`, at, ev, { tag: "vr_mercador", oficio: 2, name: "§eMercadora Hesna\n§7Caravana", persist: true });
      spawn(dim, `${NS}:guarda`, at, ev, { oficio: 10, name: "§9Escolta" });
      for (const d of [-2, 2]) spawn(dim, "minecraft:horse", V.add(at, { x: d, y: 0, z: 2 }), ev);
      return `§eUma caravana passa ${c.dir} (~${c.dist} blocos)... e há movimento suspeito no mato.`;
    },
    tick(dim, ev, players) {
      const merc = tagged(dim, ev, "vr_mercador")[0];
      if (!ev.st.emboscada) {
        if (!merc || !players.some((p) => V.dist(p.location, merc.location) < 18)) return;
        ev.st.emboscada = 1;
        const at = V.add(merc.location, { x: 7, y: 0, z: -4 });
        for (const id of ["minecraft:vindicator", "minecraft:pillager", "minecraft:vindicator"]) spawn(dim, id, at, ev, { tag: "vr_bandido" });
        for (const p of players) p.onScreenDisplay.setTitle("§cEmboscada!", { subtitle: "§7Proteja a mercadora", fadeInDuration: 5, stayDuration: 30, fadeOutDuration: 10 });
        return;
      }
      const band = tagged(dim, ev, "vr_bandido").length;
      if (!merc) {
        for (const p of players) p.onScreenDisplay.setActionBar("§cA mercadora caiu. A caravana está perdida.");
        return "falha";
      }
      if (band > 0 || !players.length) return;
      for (const p of players) {
        addXP(p, 180, "caravana salva");
        addRep(p, 15, "salvou a caravana");
        for (const it of rollLoot("caravana", 0)) giveItem(p, it);
        say(p, "§eMercadora Hesna: §f\"Você salvou minha vida e minha carga! Tome, fique com uma parte. Que a estrada lhe seja leve.\"");
      }
      particle(dim, "nivel_anel", merc.location, {});
      return "fim";
    },
  },
  mercador: {
    nome: "Mercador Viajante", peso: 3, dur: 8,
    ok: (c) => c.lvl >= 3 && !c.noite,
    start(dim, at, ev, c) {
      spawn(dim, `${NS}:aldeao`, at, ev, { tag: "vr_viajante", oficio: 12, name: "§6Orrin, o Viajante\n§7Mercador", persist: true });
      spawn(dim, "minecraft:llama", V.add(at, { x: 2, y: 0, z: 1 }), ev);
      ev.st.estoque = MERCHANT_STOCK.map(() => 1);
      return `§6Um mercador viajante armou sua banca ${c.dir} (~${c.dist} blocos). Dizem que vende raridades.`;
    },
    tick(dim, ev) {
      if (!tagged(dim, ev, "vr_viajante").length && ev.st.visto) return "fim";
      if (tagged(dim, ev, "vr_viajante").length) ev.st.visto = 1;
    },
  },
  aventureiros: {
    nome: "Grupo de Aventureiros", peso: 2, dur: 6,
    ok: (c) => c.lvl >= 2,
    start(dim, at, ev, c) {
      spawn(dim, `${NS}:aldeao`, at, ev, { tag: "vr_aventureiro", oficio: 6, name: "§aBrann\n§7Aventureiro", persist: true });
      spawn(dim, `${NS}:aldeao`, at, ev, { tag: "vr_aventureiro", oficio: 24, name: "§aLyria\n§7Batedora", persist: true });
      ev.st.ouviram = [];
      return `§aVozes e risadas: §fum grupo de aventureiros descansa ${c.dir} (~${c.dist} blocos).`;
    },
    tick() {},
  },
  fera: {
    nome: "Criatura Rara", peso: 3, dur: 10,
    ok: (c) => c.lvl >= 3 && FERAS.some((f) => (f.min || 0) <= c.lvl && (!f.noite || c.noite) && has(c.bioma, f.biomas)),
    start(dim, at, ev, c) {
      const opts = FERAS.filter((f) => (f.min || 0) <= c.lvl && (!f.noite || c.noite) && has(c.bioma, f.biomas));
      const F = pick(opts.length ? opts : FERAS.filter((f) => !f.noite && (f.min || 0) <= Math.max(c.lvl, 1)));
      const e = spawn(dim, F.id, at, ev, { tag: "vr_fera" });
      if (!e) return undefined;
      elite(e, F.lv, F.nome);
      ev.st.nome = F.nome;
      return `§c[Caçada] §f${F.nome}§f foi avistado ${c.dir} (~${c.dist} blocos). Uma presa rara, com espólio raro.`;
    },
    tick(dim, ev, players) {
      const f = tagged(dim, ev, "vr_fera")[0];
      if (f) {
        ev.st.visto = 1;
        if (system.currentTick % 80 < 40) particle(dim, "cor_aura", V.up(f.location, 0.2), { color: "red", radius: 0.9 });
        return;
      }
      if (!ev.st.visto) return;
      for (const p of players) {
        addXP(p, 220, "caçada");
        for (const it of rollLoot("fera_rara", 0)) giveItem(p, it);
        p.onScreenDisplay.setTitle("§6Caçada concluída", { subtitle: `§f${ev.st.nome || "criatura rara"}`, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
        questEvent(p, "evento", "fera");
      }
      return "fim";
    },
  },
  estrela: {
    nome: "Estrela Cadente", peso: 3, dur: 15,
    ok: (c) => c.noite && c.lvl >= 2,
    start(dim, at, ev, c) {
      const sky = V.add(at, { x: 30, y: 60, z: -20 });
      for (let i = 0; i < 16; i++) {
        system.runTimeout(() => {
          const pos = V.lerp(sky, at, i / 15);
          particle(dim, "meteoro", pos, {});
          particle(dim, "fogo_rastro", pos, {});
          if (i === 15) {
            particle(dim, "fogo_explosao", V.up(at, 1), { radius: 2.5 });
            particle(dim, "detritos", V.up(at, 1), { radius: 2 });
            sound(dim, "random.explode", at, 0.6, 2);
            crater(dim, at);
          }
        }, i * 2);
      }
      sound(dim, "mob.blaze.shoot", sky, 0.3, 2);
      return `§d[Céu] §fUma estrela cadente risca a noite e cai ${c.dir} (~${c.dist} blocos)! Há Aetherita no impacto.`;
    },
    tick(dim, ev, players) {
      for (const p of players) {
        if (ev.st.achou?.includes(p.id) || V.dist(p.location, ev) > 5) continue;
        ev.st.achou = [...(ev.st.achou || []), p.id];
        addXP(p, 80, "estrela cadente");
        p.onScreenDisplay.setActionBar("§dAinda quente... minério de Aetherita brilha na cratera.");
      }
    },
  },
  fenda: {
    nome: "Fenda Corrompida", peso: 2, dur: 7,
    ok: (c) => c.lvl >= 8 && (c.noite || has(c.bioma, ["dark_forest", "roofed", "swamp", "pale"])),
    start(dim, at, ev, c) {
      const core = spawn(dim, `${NS}:filacterio`, at, ev, { tag: "vr_nucleo", name: "§5Núcleo da Fenda", persist: true });
      if (!core) return undefined;
      return `§5[Corrupção] §fUma fenda do Véu se abriu ${c.dir} (~${c.dist} blocos). Destrua o núcleo antes que ela cresça!`;
    },
    tick(dim, ev, players) {
      const core = tagged(dim, ev, "vr_nucleo")[0];
      if (!core) {
        if (!ev.st.visto) return;
        for (const p of players) {
          addXP(p, 200, "fenda selada");
          for (const it of rollLoot("fenda", 0)) giveItem(p, it);
          p.onScreenDisplay.setTitle("§aFenda selada", { subtitle: "§7O Véu recua", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
          questEvent(p, "evento", "fenda");
        }
        particle(dim, "sagrado_explosao", ev, { radius: 3 });
        return "fim";
      }
      ev.st.visto = 1;
      particle(dim, "sombra_zona", ev, { radius: 3 });
      if (system.currentTick % 20 === 0) particle(dim, "praga", V.up(ev, 0.5), { radius: 2 });
      ev.st.n = (ev.st.n || 0) + 1;
      if (ev.st.n % 8 === 0 && tagged(dim, ev, "vr_cria").length < 5 && players.length) {
        const pos = V.add(ev, { x: rand(-4, 4), y: 0, z: rand(-4, 4) });
        spawn(dim, `${NS}:broto_corrompido`, pos, ev, { tag: "vr_cria" });
        line(dim, V.up(core.location, 1), V.up(pos, 0.5), "sombra_rastro", {}, 0.6);
        sound(dim, "mob.wither.ambient", pos, 1.5, 0.5);
      }
    },
  },
  tesouro: {
    nome: "Tesouro Enterrado", peso: 2, dur: 30,
    ok: (c) => c.lvl >= 2 && !has(c.bioma, ["ocean", "river", "beach", "swamp"]),
    start(dim, at, ev, c) {
      buryChest(dim, at);
      return `§6Você encontra um mapa rabiscado no chão: §fum X marcado ${c.dir} (~${c.dist} blocos). Cave sob o X de terra.`;
    },
    tick(dim, ev, players) {
      for (const p of players) {
        if (ev.st.achou?.includes(p.id) || V.dist2d(p.location, ev) > 3) continue;
        ev.st.achou = [...(ev.st.achou || []), p.id];
        addXP(p, 60, "tesouro encontrado");
        p.onScreenDisplay.setActionBar("§6O X está bem aqui! Cave dois blocos para baixo.");
        psound(p, "random.orb", 0.8, 1);
      }
    },
  },
};

// ====================================================================== efeitos no terreno (pequenos e locais)
function crater(dim, at) {
  const p = new Plan(at, 0, Math.random);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    const d = Math.hypot(x, z);
    if (d > 2.4) continue;
    p.set(x, 0, z, d < 1.2 ? "minecraft:magma" : p.pick([["minecraft:blackstone", 2], ["minecraft:basalt", 1], ["minecraft:coarse_dirt", 1]]));
    if (d < 1.6) p.set(x, 1, z, "minecraft:air");
  }
  p.set(0, 0, 0, `${NS}:minerio_aetherita`).set(1, -1, 0, `${NS}:minerio_aetherita`).set(0, -1, 0, "minecraft:obsidian");
  p.set(0, 1, 0, "minecraft:fire");
  build(dim, p, 60).catch(() => {});
}
function buryChest(dim, at) {
  const p = new Plan(at, 0, Math.random);
  for (const [x, z] of [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) p.set(x, 0, z, "minecraft:coarse_dirt");
  p.set(0, -1, 0, "minecraft:dirt");
  p.set(0, -2, 0, B.facing("minecraft:chest", "north"));
  build(dim, p, 60).then(() => fillChest(dim, p.world(0, -2, 0), "enterrado", [], 0)).catch(() => {});
}

// ====================================================================== interações com os NPCs dos eventos
async function show(player, form, tries = 0) {
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
function eventOf(entity) {
  const t = entity.getTags().find((x) => x.startsWith("ve_"));
  if (!t) return undefined;
  const id = t.slice(3);
  return load().find((e) => e.id === id);
}
async function merchantMenu(player, ev) {
  const st = ev.st.estoque || [];
  const f = new ActionFormData().title("§6Orrin, o Viajante").body(`§7\"Coisas que não se acham em loja de vila, amigo.\"\n\n§eSua bolsa: §f${coins(player)} moedas`);
  const opts = [];
  MERCHANT_STOCK.forEach(([, , price, nome], i) => {
    if (!st[i]) return;
    f.button(`§l${nome}§r\n§8${price} moedas`);
    opts.push(i);
  });
  f.button("Até logo");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined || r.selection >= opts.length) return;
  const i = opts[r.selection];
  const [id, n, price, nome] = MERCHANT_STOCK[i];
  if (!st[i]) return;
  if (!spendCoins(player, price)) {
    player.onScreenDisplay.setActionBar(`§cMoedas insuficientes (${price}).`);
    return;
  }
  st[i] = 0;
  save();
  giveItem(player, new ItemStack(id, n));
  psound(player, "random.orb", 1.2, 0.8);
  player.onScreenDisplay.setActionBar(`§6Comprado: §f${nome}`);
}
function adventurers(player, ev) {
  ev.st.ouviram = ev.st.ouviram || [];
  if (ev.st.ouviram.includes(player.id)) {
    player.onScreenDisplay.setActionBar("§a\"Já contamos tudo que sabíamos. Boa sorte na estrada!\"");
    return;
  }
  ev.st.ouviram.push(player.id);
  save();
  say(player, pick([
    "§aBrann: §f\"Vimos uma ruína estranha no caminho. Não entramos - a Lyria jura que ouviu sinos debaixo da terra.\"",
    "§aLyria: §f\"Tem coisa enterrada por essas bandas. Se achar um X de terra batida, cave.\"",
    "§aBrann: §f\"Dizem que três pedaços de um mapa velho levam ao tesouro dos reis antigos. Bobagem? Talvez.\"",
  ]));
  giveItem(player, new ItemStack(`${NS}:pocao_energia`, 1));
  revealRumor(player, { motivo: "os aventureiros", maxDist: 1200 }).catch(() => {});
}

// ====================================================================== laço
function chooseType(c) {
  const opts = Object.entries(TIPOS).filter(([, T]) => T.ok(c));
  const total = opts.reduce((a, [, T]) => a + T.peso, 0);
  let r = Math.random() * total;
  for (const [id, T] of opts) if ((r -= T.peso) <= 0) return id;
  return opts[0]?.[0];
}

function tryStart() {
  const cfg = getWorldCfg();
  if ((cfg.eventos ?? 1) <= 0) return;
  const list = activeEvents();
  if (list.length >= MAX_ACTIVE) return;
  const dim = world.getDimension("minecraft:overworld");
  const players = dim.getPlayers().filter(isActivePlayer);
  if (!players.length) return;
  const p = pick(players);
  if (Date.now() - (lastFor.get(p.id) || 0) < PLAYER_GAP_MS) return;
  if (list.some((e) => Math.hypot(e.x - p.location.x, e.z - p.location.z) < 140)) return;
  if (Math.random() > 0.45 * (cfg.eventos ?? 1)) return;
  if (p.location.y < 50) return;
  startNear(p);
}

/** Modo de Teste: força um evento (ignora intervalo, limite e condições de bioma/horário). Retorna a mensagem ou um erro. */
export function forceEvent(player, tipo) {
  if (player.dimension.id !== "minecraft:overworld") return "§cEventos só acontecem na superfície.";
  return startNear(player, tipo) || "§cNão encontrei chão firme carregado à frente. Tente em campo aberto.";
}
export const EVENT_TYPES = () => Object.entries(TIPOS).map(([id, T]) => [id, T.nome]);

function startNear(p, forced) {
  const dim = p.dimension;
  const view = V.flat(p.getViewDirection());
  const ang = Math.atan2(view.z, view.x) + (forced ? 0 : rand(-1.2, 1.2));
  const dist = forced ? 16 : rand(28, 44);
  const x = Math.floor(p.location.x + Math.cos(ang) * dist);
  const z = Math.floor(p.location.z + Math.sin(ang) * dist);
  try { if (!dim.isChunkLoaded({ x, y: 64, z })) return; } catch { return; }
  const g = groundAt(dim, x, z);
  if (g.err) return;
  const at = { x: x + 0.5, y: g.y + 1, z: z + 0.5 };
  const c = { lvl: getData(p).nivel, noite: isNight(), bioma: biomeOf(dim, at), dir: dirText(p.location, at), dist: Math.round(dist) };
  const tipo = forced || chooseType(c);
  if (!tipo) return;
  const ev = { id: (Date.now() % 1e9).toString(36) + (counter++ % 36).toString(36), tipo, dim: dim.id, x: at.x, y: at.y, z: at.z,
    ate: Date.now() + TIPOS[tipo].dur * 60000, dono: p.id, st: {} };
  const msg = TIPOS[tipo].start(dim, at, ev, c);
  if (!msg) return;
  load().push(ev);
  save();
  lastFor.set(p.id, Date.now());
  for (const q of dim.getPlayers({ location: at, maxDistance: 90 })) {
    q.sendMessage(msg);
    psound(q, "note.bell", 0.8, 0.6);
  }
  return msg;
}

function endEvent(ev, dim, how) {
  ev.ate = 0;
  if (how === "expirou" || how === "falha") {
    for (const e of tagged(dim, ev)) {
      // NPCs e núcleo somem; inimigos comuns ficam (podem ter sido atraídos para longe)
      if (e.hasTag("vr_viajante") || e.hasTag("vr_aventureiro") || e.hasTag("vr_mercador") || e.hasTag("vr_nucleo") || e.typeId === "minecraft:llama" || e.typeId === "minecraft:horse") {
        try { particle(dim, "poeira", e.location, {}); e.remove(); } catch { /* */ }
      }
    }
  }
}

function step() {
  const list = load();
  if (!list.length) return;
  let changed = false;
  for (const ev of list) {
    if (ev.ate <= 0) continue;
    let dim;
    try { dim = world.getDimension(ev.dim); } catch { continue; }
    if (Date.now() > ev.ate) {
      endEvent(ev, dim, "expirou");
      changed = true;
      continue;
    }
    const players = near(dim, ev, 48);
    let loaded = false;
    try { loaded = dim.isChunkLoaded(ev); } catch { /* */ }
    if (!loaded) continue;
    const r = TIPOS[ev.tipo]?.tick(dim, ev, players);
    if (r === "fim" || r === "falha") {
      endEvent(ev, dim, r);
      changed = true;
    }
  }
  const before = list.length;
  events = list.filter((e) => e.ate > 0);
  if (changed || events.length !== before) save();
}

/** Remove entidades de eventos que já terminaram (por exemplo, depois de recarregar o mundo). */
function sweep() {
  const live = new Set(activeEvents().map((e) => TAGOF(e.id)));
  for (const id of ["minecraft:overworld"]) {
    let list = [];
    try { list = world.getDimension(id).getEntities({ tags: [ETAG] }); } catch { continue; }
    for (const e of list) {
      const t = e.getTags().find((x) => x.startsWith("ve_"));
      if (t && live.has(t)) continue;
      if (e.hasTag("vr_viajante") || e.hasTag("vr_aventureiro") || e.hasTag("vr_mercador") || e.hasTag("vr_nucleo")) {
        try { e.remove(); } catch { /* */ }
      }
    }
  }
}

export function startWorldEvents() {
  system.runInterval(() => { try { tryStart(); } catch (e) { console.warn(`[Valdoria] eventos (início): ${e}`); } }, 400);
  system.runInterval(() => { try { step(); } catch (e) { console.warn(`[Valdoria] eventos: ${e}`); } }, 20);
  system.runInterval(() => { try { sweep(); } catch (e) { console.warn(`[Valdoria] eventos (limpeza): ${e}`); } }, 2400);
  onNpcInteract((player, npc) => {
    if (!npc.hasTag(ETAG)) return false;
    const ev = eventOf(npc);
    if (!ev || ev.ate <= Date.now()) {
      player.onScreenDisplay.setActionBar("§7\"Já estou de partida, viajante.\"");
      return true;
    }
    if (npc.hasTag("vr_viajante")) merchantMenu(player, ev).catch(() => {});
    else if (npc.hasTag("vr_aventureiro")) adventurers(player, ev);
    else if (npc.hasTag("vr_mercador")) player.onScreenDisplay.setActionBar(ev.st.emboscada ? "§e\"Cuidado, eles ainda estão por aí!\"" : "§e\"Bom dia! A estrada anda perigosa...\"");
    else player.onScreenDisplay.setActionBar("§9\"Fique atento, aventureiro.\"");
    return true;
  });
}

/** Lista curta para o Diário. */
export function eventLines(player) {
  return activeEvents().filter((e) => e.dim === player.dimension.id).map((e) => {
    const d = Math.round(Math.hypot(e.x - player.location.x, e.z - player.location.z));
    const min = Math.max(0, Math.ceil((e.ate - Date.now()) / 60000));
    return `§e${TIPOS[e.tipo]?.nome || e.tipo}§7 · ~${d} blocos ${dirText(player.location, e)} · ${min} min`;
  });
}
