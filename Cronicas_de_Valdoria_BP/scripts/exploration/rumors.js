// Rumores: locais revelados ao jogador antes de serem visitados (cativos libertados, aventureiros, postos de observação, mapas).
// Ficam listados no Diário (Exploração > Rumores) com direção e distância até serem descobertos.
import { V } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { allSites, TYPES, compass, dist2d, center } from "../structures/registry.js";
import { tryGenerate } from "../structures/generation.js";
import { rarityOf } from "./rarity.js";

const HIDDEN = new Set(["vila", "capital", "aelthar"]); // locais habitados não viram "rumor"

function candidates(player, maxDist, filter) {
  const d = getData(player);
  const known = new Set([...(d.locais || []), ...(d.rumores || [])]);
  return allSites()
    .filter((r) => r.dim === player.dimension.id && r.estado !== "construindo" && !known.has(r.id) && !HIDDEN.has(r.tipo) && (!filter || filter(r)))
    .map((r) => ({ r, dist: dist2d(r, player.location) }))
    .filter((x) => x.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist);
}

export function addRumor(player, rec, motivo = "") {
  const d = getData(player);
  d.rumores = d.rumores || [];
  if (d.rumores.includes(rec.id) || (d.locais || []).includes(rec.id)) return false;
  d.rumores.push(rec.id);
  if (d.rumores.length > 30) d.rumores.shift();
  markDirty(player);
  const T = TYPES[rec.tipo];
  const R = rarityOf(T);
  const dist = Math.round(dist2d(rec, player.location));
  player.sendMessage(`§6[Rumor]§r ${motivo ? `§7(${motivo}) ` : ""}${R.cor}${T?.nome || rec.nome}§7 a ~${dist} blocos ${compass(player.location, rec)}. §8Anotado no Diário.`);
  psound(player, "item.book.page_turn", 0.8, 1);
  const dir = V.flat(V.sub(center(rec), player.location));
  for (let i = 1; i <= 5; i++) particle(player.dimension, "cor_ponto", V.add(V.up(player.location, 1.2), V.mul(dir, i * 0.9)), { color: "gold" });
  return true;
}

/**
 * Revela o local desconhecido mais próximo (até `maxDist`). Se não houver nenhum, tenta fazer surgir um nas redondezas.
 * @returns {Promise<boolean>}
 */
export async function revealRumor(player, o = {}) {
  const list = candidates(player, o.maxDist ?? 900, o.filter);
  if (list.length) return addRumor(player, list[0].r, o.motivo);
  if (o.noGenerate) return false;
  const rec = await tryGenerate(player, { tipo: o.tipo });
  if (rec) return addRumor(player, rec, o.motivo);
  return false;
}

/** Revela até `n` locais desconhecidos (posto de observação). */
export function revealMany(player, n, maxDist, motivo) {
  const list = candidates(player, maxDist);
  let k = 0;
  for (const { r } of list.slice(0, n)) if (addRumor(player, r, motivo)) k++;
  return k;
}
