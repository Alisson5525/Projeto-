// Ajudantes compartilhados pelas técnicas: mira, blocos e limites do mundo.
import { isAlvoValido } from '../core/combate.js';
import * as V from '../core/vec.js';

/** Plantas e enfeites que projéteis atravessam. */
const PASSAVEL = /^minecraft:(short_grass|tall_grass|fern|large_fern|deadbush|dead_bush|seagrass|kelp|vine|snow_layer|.*_flower|.*_tulip|poppy|dandelion|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|torchflower|.*_sapling|.*torch|.*_button|.*_carpet|.*rail|lever|.*_sign|.*_banner|.*pressure_plate|tripwire|redstone_wire|brown_mushroom|red_mushroom|reeds|sugar_cane|wheat|carrots|potatoes|beetroot|sweet_berry_bush|.*_vines?)$/;

/** @param {import('@minecraft/server').Player} player */
export function olhar(player) {
  return { cabeca: player.getHeadLocation(), dir: V.norm(player.getViewDirection()) };
}

/** @param {import('@minecraft/server').Dimension} dim @param {number} y */
export function dentroDoMundo(dim, y) {
  const h = dim.heightRange;
  return y >= h.min && y < h.max;
}

/** Bloco na posição, ou undefined fora do mundo / em chunk descarregado. */
export function blocoEm(dim, pos) {
  try {
    if (!dentroDoMundo(dim, pos.y)) return undefined;
    return dim.getBlock(pos);
  } catch {
    return undefined;
  }
}

/** Bloco que barra projéteis e ocupa espaço. */
export function obstaculo(bloco) {
  return !!bloco && !bloco.isAir && !bloco.isLiquid && !PASSAVEL.test(bloco.typeId);
}

/** Onde o jogador está mirando (entidade atingível ou bloco), até `alcance`. */
export function alvoMirado(player, alcance) {
  const { cabeca, dir } = olhar(player);
  let ent;
  try {
    ent = player.getEntitiesFromViewDirection({ maxDistance: alcance }).find((h) => isAlvoValido(player, h.entity));
  } catch {
    ent = undefined;
  }
  let hit;
  try {
    hit = player.getBlockFromViewDirection({ maxDistance: alcance, includeLiquidBlocks: false, includePassableBlocks: false });
  } catch {
    hit = undefined;
  }
  const pontoBloco = hit ? V.add(hit.block.location, hit.faceLocation) : undefined;
  const dBloco = pontoBloco ? V.dist(cabeca, pontoBloco) : Infinity;
  if (ent && ent.distance <= dBloco) return { pos: V.add(ent.entity.location, { x: 0, y: 1, z: 0 }), entidade: ent.entity, dist: ent.distance };
  if (hit && pontoBloco) return { pos: pontoBloco, bloco: hit.block, face: hit.face, dist: dBloco };
  return { pos: V.add(cabeca, V.scale(dir, alcance)), dist: alcance };
}
