// Reversão Vital: inverte o fluxo do Éter para curar e purificar.
import { COR, PARTICULAS, SONS } from '../core/config.js';
import { iniciarEfeito } from '../core/efeitos.js';
import { anel, particula, som } from '../core/fx.js';
import { registrarTecnica } from '../core/lancar.js';

const NEGATIVOS = [
  'minecraft:poison', 'minecraft:fatal_poison', 'minecraft:wither', 'minecraft:slowness', 'minecraft:weakness',
  'minecraft:blindness', 'minecraft:nausea', 'minecraft:hunger', 'minecraft:mining_fatigue', 'minecraft:darkness', 'minecraft:levitation',
];

registrarTecnica('reversao', {
  lancar(player) {
    const dim = player.dimension;
    const vida = player.getComponent('minecraft:health');
    if (vida) vida.setCurrentValue(Math.min(vida.effectiveMax, vida.currentValue + 12));
    player.addEffect('minecraft:regeneration', 100, { amplifier: 1, showParticles: true });
    for (const ef of NEGATIVOS) {
      try {
        player.removeEffect(ef);
      } catch {
        /* não tinha o efeito */
      }
    }
    try {
      player.extinguishFire(true);
    } catch {
      /* ignora */
    }
    som(dim, SONS.reversao, player.location, 1, 1);
    anel(dim, { x: player.location.x, y: player.location.y + 0.1, z: player.location.z }, 1.0, 18, PARTICULAS.brilho, COR.ouro, 0.3);
    iniciarEfeito({
      dono: player.id,
      passo(i) {
        if (i >= 24 || !player.isValid) return false;
        const l = player.location;
        for (let k = 0; k < 2; k++) {
          const a = i * 0.5 + k * Math.PI;
          particula(dim, PARTICULAS.estrela, { x: l.x + Math.cos(a) * 0.8, y: l.y + i * 0.09, z: l.z + Math.sin(a) * 0.8 }, k ? COR.branco : COR.ouro, 0.3);
        }
        return true;
      },
    });
    return true;
  },
});
