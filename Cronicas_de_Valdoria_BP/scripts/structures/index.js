// Ponto de entrada do sistema de estruturas: tipos, avisos de descoberta, Mapa do Explorador e ligação com missões.
import { system } from "@minecraft/server";
import { V, tick } from "../core/util.js";
import { particle, psound } from "../core/fx.js";
import { getData } from "../core/store.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { registerType, onSite, startRegistry, nearestSite, compass, TYPES, center } from "./registry.js";
import { startGeneration, tryGenerate, lastGenerationInfo } from "./generation.js";
import { startDungeon } from "./dungeon.js";
import { startLairs } from "./lairs.js";
import { startKarDum } from "./kardum_run.js";
import { startNyxhal } from "./nyxhal_run.js";
import { startCeleste } from "./celeste_run.js";
import { CAMP } from "./camp.js";
import { TOWER } from "./tower.js";
import { NINHO_GRIFO } from "./ninho_grifo.js";
import { rarityOf } from "../exploration/rarity.js";
import { addRumor } from "../exploration/rumors.js";

registerType(CAMP);
registerType(TOWER);
registerType(NINHO_GRIFO);

const mapCd = new Map();

/** Mapa do Explorador: aponta o local não descoberto mais próximo ou revela um novo nas redondezas. */
export async function useMap(player) {
  if ((mapCd.get(player.id) || 0) > tick()) {
    player.onScreenDisplay.setActionBar("§7A tinta do mapa ainda está se reorganizando...");
    return;
  }
  mapCd.set(player.id, tick() + 200);
  const d = getData(player);
  const known = d.locais || [];
  let hit = nearestSite(player.location, player.dimension.id, (r) => !known.includes(r.id) && r.estado !== "construindo");
  if (!hit || hit.dist > 1500) {
    player.onScreenDisplay.setActionBar("§7O mapa procura algo nas redondezas...");
    const rec = await tryGenerate(player, {});
    hit = rec ? { rec, dist: V.dist2d(player.location, center(rec)) } : null;
  }
  if (!hit) {
    player.onScreenDisplay.setActionBar(`§7O mapa não revela nada por perto. §8(${lastGenerationInfo() || "explore mais longe"})`);
    return;
  }
  const { rec, dist } = hit;
  const dir = V.flat(V.sub(center(rec), player.location));
  for (let i = 1; i <= 6; i++) particle(player.dimension, "cor_ponto", V.add(V.up(player.location, 1.2), V.mul(dir, i * 0.8)), { color: "holy" });
  psound(player, "item.book.page_turn", 0.9, 1);
  const R = rarityOf(TYPES[rec.tipo]);
  player.onScreenDisplay.setActionBar(`${R.cor}${TYPES[rec.tipo]?.nome || rec.nome} §7(${R.nome.toLowerCase()})§f: ~${Math.round(dist)} blocos ${compass(player.location, rec)}`);
  addRumor(player, rec, "Mapa do Explorador");
}

export function startStructures() {
  startRegistry();
  startGeneration();
  startDungeon();
  startLairs();
  startKarDum();
  startNyxhal();
  startCeleste();
  onSite("descoberto", (p, rec) => {
    setFlag(p, `descoberto_${rec.tipo}`);
    questEvent(p, "descobrir", rec.tipo);
  });
  onSite("limpo", (p, rec) => {
    setFlag(p, `limpo_${rec.tipo}`);
    questEvent(p, "limpar", rec.tipo);
  });
  onSite("criado", (rec, dim) => {
    const T = TYPES[rec.tipo];
    if (!T?.dica) return;
    system.runTimeout(() => {
      for (const p of dim.getPlayers({ location: center(rec), maxDistance: 120 })) {
        p.onScreenDisplay.setActionBar(`${T.dica} §7${compass(p.location, rec)}...`);
      }
    }, 20);
  });
}

