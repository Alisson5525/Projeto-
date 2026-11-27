// Mostrar formulários com nova tentativa enquanto o jogador está ocupado
// (por exemplo, quando o comando foi digitado e o chat ainda está aberto).
import { system } from '@minecraft/server';
import { FormCancelationReason } from '@minecraft/server-ui';

const esperar = (ticks) => new Promise((ok) => system.runTimeout(() => ok(undefined), ticks));

/**
 * @template {{ show: (p: import('@minecraft/server').Player) => Promise<any> }} F
 * @param {import('@minecraft/server').Player} player
 * @param {F} form
 */
export async function mostrar(player, form, tentativas = 20) {
  for (let i = 0; i < tentativas; i++) {
    const r = await form.show(player);
    if (!(r.canceled && r.cancelationReason === FormCancelationReason.UserBusy)) return r;
    await esperar(10);
  }
  return undefined;
}
