// Defesa da Vila: ataques goblins em 3 ondas pelos portões. Desafio do Capitão da Guarda (uma vez por dia) ou
// ataque noturno ocasional quando o jogador já é conhecido na vila. Os guardas lutam e os moradores fogem.
import { world, system } from "@minecraft/server";
import { NS, V, ok, isActivePlayer } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { addXP } from "../rpg/progression.js";
import { ground } from "../abilities/engine.js";
import { allSites, getSite, saveSite, center, inBox } from "../structures/registry.js";
import { addCoins, addRep, today, isNight, npcData } from "./economy.js";

const RTAG = (id) => `vr_${id}`;
const WAVES = [
  [[`${NS}:goblin`, 4]],
  [[`${NS}:goblin`, 3], [`${NS}:goblin_xama`, 2]],
  [[`${NS}:chefe_goblin`, 1], [`${NS}:goblin`, 3], [`${NS}:goblin_xama`, 1]],
];
const raids = new Map(); // siteId -> {onda, inicio, vazio, visto, porta}

export function raidActive(siteId) {
  return raids.has(siteId);
}

function playersIn(dim, rec) {
  return dim.getPlayers({ location: center(rec), maxDistance: 60 }).filter((p) => isActivePlayer(p) && inBox(rec.area, p.location, 6));
}

function spawnWave(dim, rec, st) {
  const gate = rec.m.ataque?.[st.porta] || { x: rec.x, y: rec.y + 1, z: rec.z + 32 };
  const base = ground(dim, { x: gate.x + 0.5, y: gate.y + 6, z: gate.z + 0.5 });
  let i = 0;
  for (const [id, n] of WAVES[st.onda - 1]) {
    for (let k = 0; k < Number(n); k++) {
      const loc = { x: base.x + ((i % 3) - 1) * 1.5, y: base.y, z: base.z + Math.floor(i / 3) * 1.5 };
      i++;
      try {
        const e = dim.spawnEntity(String(id), loc, { initialPersistence: true });
        e.addTag(RTAG(rec.id));
        particle(dim, "poeira", loc, { radius: 0.8 });
      } catch { /* */ }
    }
  }
  sound(dim, "mob.ravager.roar", base, 1.6, 2);
  st.inicio = system.currentTick;
  st.vazio = 0;
  st.visto = false;
}

/** Inicia um ataque à vila. `motivo` = "desafio" (Capitão) ou "noite". */
export function startRaid(rec, motivo = "desafio") {
  if (raids.has(rec.id)) return false;
  const dim = world.getDimension(rec.dim);
  const st = { onda: 1, porta: Math.floor(Math.random() * (rec.m.ataque?.length || 1)), motivo };
  raids.set(rec.id, st);
  const names = ["sul", "norte", "leste"];
  for (const p of playersIn(dim, rec)) {
    p.onScreenDisplay.setTitle("§c§lATAQUE GOBLIN!", { subtitle: `§7Eles vêm pelo portão ${names[st.porta] || "sul"} - onda 1/3`,
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
    shake(p, 0.2, 1);
  }
  sound(dim, "raid.horn", center(rec), 1, 4);
  spawnWave(dim, rec, st);
  return true;
}

function endRaid(dim, rec, won) {
  const st = raids.get(rec.id);
  raids.delete(rec.id);
  for (const e of dim.getEntities({ tags: [RTAG(rec.id)] })) e.remove();
  rec.m.ultimoAtaque = today();
  saveSite(rec);
  const players = playersIn(dim, rec);
  if (!won) {
    for (const p of dim.getPlayers({ location: center(rec), maxDistance: 120 })) p.onScreenDisplay.setActionBar("§7Os goblins recuaram para a floresta... a defesa terminou sem vencedor.");
    return;
  }
  for (const p of players) {
    const lvl = npcData(p).nivel;
    addCoins(p, 100 + lvl * 4, "defesa da vila");
    addRep(p, st?.motivo === "noite" ? 15 : 25, "defendeu a vila");
    addXP(p, 300, "defesa da vila");
    p.onScreenDisplay.setTitle("§a§lVILA DEFENDIDA", { subtitle: "§7Os moradores comemoram!", fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  }
  particle(dim, "nivel_anel", center(rec), {});
  sound(dim, "random.levelup", center(rec), 1, 2);
}

function raidTick() {
  for (const [siteId, st] of [...raids]) {
    const rec = getSite(siteId);
    if (!rec) {
      raids.delete(siteId);
      continue;
    }
    const dim = world.getDimension(rec.dim);
    const players = playersIn(dim, rec);
    st.longe = players.length ? 0 : (st.longe || 0) + 1;
    if (st.longe > 15) {
      endRaid(dim, rec, false);
      continue;
    }
    if (system.currentTick - st.inicio < 40) continue;
    const alive = dim.getEntities({ tags: [RTAG(siteId)] }).length;
    if (alive) {
      st.visto = true;
      st.vazio = 0;
      for (const p of players) p.onScreenDisplay.setActionBar(`§cOnda ${st.onda}/3 §7- restam §f${alive} §7goblins`);
      continue;
    }
    if (++st.vazio < (st.visto ? 1 : 3)) continue;
    if (st.onda >= 3) {
      endRaid(dim, rec, true);
      continue;
    }
    st.onda++;
    for (const p of players) p.onScreenDisplay.setTitle(" ", { subtitle: `§cOnda ${st.onda}/3`, fadeInDuration: 5, stayDuration: 30, fadeOutDuration: 10 });
    spawnWave(dim, rec, st);
  }
}

/** Ataques noturnos ocasionais quando o jogador já é conhecido (reputação >= 50). */
function nightRaids() {
  if (!isNight()) return;
  for (const rec of allSites()) {
    if (rec.tipo !== "vila" || rec.estado === "construindo" || raids.has(rec.id) || !rec.area) continue;
    if ((rec.m.ultimoAtaque ?? -99) > today() - 3) continue;
    const dim = world.getDimension(rec.dim);
    const ps = playersIn(dim, rec).filter((p) => npcData(p).rep >= 50 && npcData(p).nivel >= 5);
    if (!ps.length || Math.random() > 0.04) continue;
    startRaid(rec, "noite");
  }
}

export function startDefense() {
  system.runInterval(() => {
    try { raidTick(); } catch (e) { console.warn(`[Valdoria] defesa: ${e}`); }
  }, 20);
  system.runInterval(() => {
    try { nightRaids(); } catch (e) { console.warn(`[Valdoria] ataque noturno: ${e}`); }
  }, 1200);
}


