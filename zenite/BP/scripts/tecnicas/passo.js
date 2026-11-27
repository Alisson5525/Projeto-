// Passo Espacial: dobra o espaço até onde você mira; numa criatura, surge às costas dela.
import { SONS, COR, PARTICULAS } from '../core/config.js';
import { anel, esfera, linha, som } from '../core/fx.js';
import { avisar, registrarTecnica } from '../core/lancar.js';
import { tr } from '../core/texto.js';
import * as V from '../core/vec.js';
import { blocoEm, obstaculo, olhar } from './comum.js';

const ALCANCE = 28;

/** Cabe um jogador (pés e cabeça livres)? */
function livre(dim, p) {
  const pe = blocoEm(dim, p);
  const cab = blocoEm(dim, { x: p.x, y: p.y + 1, z: p.z });
  return !!pe && !!cab && !obstaculo(pe) && !obstaculo(cab);
}

registrarTecnica('passo', {
  lancar(player) {
    const dim = player.dimension;
    const { cabeca, dir } = olhar(player);
    const origem = { ...player.location };
    /** @type {{x:number,y:number,z:number}} */
    let destino;
    let olharPara;
    let ent;
    try {
      ent = player.getEntitiesFromViewDirection({ maxDistance: ALCANCE }).find((h) => h.entity.getComponent('minecraft:health') && h.entity.typeId !== 'minecraft:item')?.entity;
    } catch {
      ent = undefined;
    }
    if (ent) {
      const fl = ent.location;
      const h = V.norm({ x: fl.x - origem.x, y: 0, z: fl.z - origem.z });
      destino = { x: fl.x + h.x * 1.6, y: fl.y, z: fl.z + h.z * 1.6 };
      olharPara = V.add(fl, { x: 0, y: 1.2, z: 0 });
    } else {
      let hit;
      try {
        hit = player.getBlockFromViewDirection({ maxDistance: ALCANCE, includePassableBlocks: false });
      } catch {
        hit = undefined;
      }
      if (hit) {
        const b = hit.block;
        destino = hit.face === 'Up' ? { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 } : V.sub(V.add(b.location, hit.faceLocation), V.scale(dir, 0.8));
      } else destino = V.sub(V.add(cabeca, V.scale(dir, 20)), { x: 0, y: 1.62, z: 0 });
      olharPara = V.add(destino, V.add(V.scale(dir, 4), { x: 0, y: 1.62, z: 0 }));
    }
    let ok = false;
    for (let k = 0; k < 6; k++) {
      if (livre(dim, destino)) {
        ok = true;
        break;
      }
      destino = V.sub(destino, V.norm(V.sub(destino, origem)));
    }
    if (!ok || V.dist(destino, origem) < 2) {
      avisar(player, [tr('zenite.msg.passo_falhou')]);
      return false;
    }
    const meio = V.add(origem, { x: 0, y: 1, z: 0 });
    esfera(dim, meio, 0.9, 20, PARTICULAS.estrela, COR.prata, 0.25);
    linha(dim, meio, V.add(destino, { x: 0, y: 1, z: 0 }), 0.7, PARTICULAS.rastro, COR.ciano, 0.45);
    som(dim, SONS.passo, origem, 1, 1);
    player.teleport(destino, { facingLocation: olharPara, keepVelocity: false });
    som(dim, SONS.passo, destino, 1, 1.25);
    anel(dim, { x: destino.x, y: destino.y + 0.1, z: destino.z }, 0.9, 14, PARTICULAS.brilho, COR.ciano, 0.3);
    esfera(dim, V.add(destino, { x: 0, y: 1, z: 0 }), 0.8, 16, PARTICULAS.estrela, COR.branco, 0.2);
    if (!obstaculo(blocoEm(dim, { x: destino.x, y: destino.y - 1, z: destino.z })) && !obstaculo(blocoEm(dim, { x: destino.x, y: destino.y - 2, z: destino.z }))) {
      player.addEffect('minecraft:slow_falling', 40, { amplifier: 0, showParticles: false });
    }
    return true;
  },
});
