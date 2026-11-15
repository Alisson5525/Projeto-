// Covis dos chefes da Etapa 4 (Ninho do Dragão e Santuário do Véu Negro): a luta começa quando alguém entra na arena,
// reinicia se a arena esvaziar, entrega o tesouro após a vitória e o chefe retorna depois de um tempo (retorno controlado).
import { world, system, BlockPermutation } from "@minecraft/server";
import { NS, V, ok, isActivePlayer } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { allSites, getSite, saveSite, inBox, center, fillChests, repopulate, TAG, registerType } from "./registry.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { NINHO } from "./ninho.js";
import { SANTUARIO } from "./santuario.js";
import { spawnDragon, dragonOf, despawnDragon, setDragonArenaResolver, onDragonDefeated } from "../bosses/dragao.js";
import { spawnQueen, queenOf, despawnQueen, setQueenArenaResolver, onQueenDefeated } from "../bosses/rainha.js";

registerType(NINHO);
registerType(SANTUARIO);

export const REARM_MIN = 90; // minutos reais até o chefe voltar ao covil
const LAIRS = {
  ninho: { spawn: spawnDragon, of: dragonOf, despawn: despawnDragon, flag: "ignaroth", nome: "Ignaroth", tier: "ninho_tesouro",
    primeiro: { lore: "cronica_ignaroth", item: `${NS}:coracao_dragao` }, fim: "§6O tesouro de Ignaroth está ao seu alcance!",
    reinicio: "§7Ignaroth bate as asas e some entre as nuvens... a luta foi reiniciada." },
  santuario: { spawn: spawnQueen, of: queenOf, despawn: despawnQueen, flag: "vaelith", nome: "Vaelith", tier: "santuario_tesouro",
    primeiro: { lore: "carta_vaelith", item: `${NS}:coroa_veu` }, fim: "§5O Véu se rasga: o tesouro da Rainha surge diante do trono.",
    reinicio: "§7Vaelith dissolve-se em sombras e retorna ao trono... a luta foi reiniciada." },
};
const mem = new Map(); // id -> {empty, missing}

function memOf(id) {
  let m = mem.get(id);
  if (!m) mem.set(id, (m = { empty: 0, missing: 0 }));
  return m;
}
function door(dim, rec, closed) {
  const pts = rec.m?.porta;
  if (!pts) return;
  // grades no sentido da largura da porta (eixo x local; com rotação ímpar vira eixo z)
  const ew = (rec.rot & 1) === 0;
  const perm = closed ? BlockPermutation.resolve("minecraft:iron_bars", { "minecraft:connection_east": ew, "minecraft:connection_west": ew,
    "minecraft:connection_north": !ew, "minecraft:connection_south": !ew }) : BlockPermutation.resolve("minecraft:air");
  for (const p of pts) {
    try { dim.setBlockPermutation(p, perm); } catch { /* */ }
  }
  sound(dim, closed ? "close.iron_door" : "open.iron_door", pts[0], 0.7, 1);
}

function startFight(dim, rec, players) {
  const L = LAIRS[rec.tipo];
  rec.m.chefe = "luta";
  saveSite(rec);
  const m = memOf(rec.id);
  m.empty = 0;
  m.missing = 0;
  door(dim, rec, true);
  if (rec.tipo === "santuario") {
    for (const p of players) p.onScreenDisplay.setActionBar("§8As grades descem atrás de você... algo se move no trono.");
  } else {
    for (const p of players) p.onScreenDisplay.setActionBar("§6Um rugido ecoa acima das nuvens...");
  }
  system.runTimeout(() => {
    try {
      L.spawn(dim, rec.m.boss, rec.id);
    } catch (e) {
      console.warn(`[Valdoria] covil ${rec.tipo}: ${e}`);
      resetFight(dim, rec);
    }
  }, rec.tipo === "ninho" ? 40 : 30);
}
function resetFight(dim, rec) {
  const L = LAIRS[rec.tipo];
  L.despawn(dim, rec.id);
  door(dim, rec, false);
  rec.m.chefe = "pronto";
  saveSite(rec);
  for (const p of dim.getPlayers({ location: center(rec), maxDistance: 90 })) p.onScreenDisplay.setActionBar(L.reinicio);
}

function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec || !LAIRS[rec.tipo]) {
    for (const p of players) if (ok(p)) setFlag(p, siteId.startsWith("e") ? "chefe_avulso" : "chefe");
    return;
  }
  const L = LAIRS[rec.tipo];
  const first = !rec.m.vitorias;
  rec.m.chefe = "derrotado";
  rec.m.derrotadoEm = Date.now();
  rec.m.vitorias = (rec.m.vitorias || 0) + 1;
  rec.estado = "limpo";
  rec.limpoEm = Date.now();
  saveSite(rec);
  door(dim, rec, false);
  system.runTimeout(() => {
    const perm = BlockPermutation.resolve("minecraft:chest", { "minecraft:cardinal_direction": "south" });
    const chests = (rec.m.tesouro || []).map((pos, i) => {
      try { dim.setBlockPermutation(pos, perm); } catch { /* */ }
      particle(dim, "nivel_anel", { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, {});
      const extra = {};
      if (i === 0 && first) extra.lore = L.primeiro.lore;
      if (i === 1 && first) extra.item = L.primeiro.item;
      return { pos, tier: L.tier, extra };
    });
    fillChests(dim, chests);
    for (const p of dim.getPlayers({ location: center(rec), maxDistance: 90 })) p.onScreenDisplay.setActionBar(L.fim);
  }, 30);
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, L.flag);
    questEvent(p, "limpar", rec.tipo);
  }
}

/** O chefe volta ao covil: baús do tesouro somem, guardiões renascem. */
export function rearmLair(dim, rec) {
  const L = LAIRS[rec.tipo];
  L.despawn(dim, rec.id);
  for (const pos of rec.m.tesouro || []) {
    try { dim.setBlockType(pos, "minecraft:air"); } catch { /* */ }
  }
  door(dim, rec, false);
  repopulate(dim, rec, true);
  rec.m.chefe = "pronto";
  rec.estado = "ativo";
  saveSite(rec);
  mem.delete(rec.id);
}

function loop() {
  for (const rec of allSites()) {
    const L = LAIRS[rec.tipo];
    if (!L || rec.estado === "construindo" || !rec.m?.boss) continue;
    let dim;
    try {
      dim = world.getDimension(rec.dim);
    } catch {
      continue;
    }
    const c = center(rec);
    const players = dim.getPlayers({ location: c, maxDistance: 100 });
    if (rec.m.chefe === "derrotado") {
      if (Date.now() - rec.m.derrotadoEm > REARM_MIN * 60000 && !players.some((p) => V.dist(p.location, c) < 80)) {
        try {
          if (dim.isChunkLoaded(c)) rearmLair(dim, rec);
        } catch { /* */ }
      }
      continue;
    }
    if (!players.length) {
      if (rec.m.chefe === "luta") {
        try {
          if (dim.isChunkLoaded(c)) resetFight(dim, rec);
        } catch { /* */ }
      }
      continue;
    }
    const inside = players.filter((p) => isActivePlayer(p) && inBox(rec.m.arena, p.location, 0.3));
    if (rec.m.chefe === "pronto") {
      if (inside.length) startFight(dim, rec, inside);
      continue;
    }
    if (rec.m.chefe !== "luta") continue;
    const m = memOf(rec.id);
    m.empty = players.some((p) => isActivePlayer(p) && inBox(rec.m.arena, p.location, 6)) ? 0 : m.empty + 1;
    m.missing = L.of(dim, rec.id) ? 0 : m.missing + 1;
    if (m.empty > 60 || m.missing > 20) resetFight(dim, rec);
  }
}

export function startLairs() {
  const resolve = (siteId) => {
    const rec = getSite(siteId);
    if (!rec || !rec.m?.boss) return undefined;
    const b = rec.m.boss;
    return { arena: rec.m.arena, center: { x: b.x + 0.5, y: b.y, z: b.z + 0.5 } };
  };
  setDragonArenaResolver(resolve);
  setQueenArenaResolver(resolve);
  onDragonDefeated(onDefeat);
  onQueenDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] covis: ${e}`); }
  }, 10);
}

export { TAG };
