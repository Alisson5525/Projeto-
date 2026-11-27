// Comandos customizados /zenite:*.
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { COMANDOS } from '../core/config.js';
import { ganchos } from '../core/ganchos.js';
import { tr } from '../core/texto.js';
import { abrirCodice } from '../ui/codice.js';
import { abrirRoda } from '../ui/roda.js';
import { darKit } from './entregas.js';
import { definirNivel } from './maestria.js';

/** @param {import('@minecraft/server').CustomCommandRegistry} reg */
export function registrarComandos(reg) {
  /**
   * @param {string} nome @param {string} descricao @param {boolean} trapaca
   * @param {(p: import('@minecraft/server').Player, ...args: any[]) => void} fn
   * @param {import('@minecraft/server').CustomCommandParameter[]} [obrigatorios]
   */
  const comando = (nome, descricao, trapaca, fn, obrigatorios) => {
    /** @type {import('@minecraft/server').CustomCommand} */
    const def = {
      name: nome,
      description: descricao,
      permissionLevel: trapaca ? CommandPermissionLevel.GameDirectors : CommandPermissionLevel.Any,
      cheatsRequired: trapaca,
    };
    if (obrigatorios) def.mandatoryParameters = obrigatorios;
    reg.registerCommand(
      def,
      (origem, ...args) => {
        const p = origem.sourceEntity ?? origem.initiator;
        if (!p || p.typeId !== 'minecraft:player') return { status: CustomCommandStatus.Failure, message: 'Zênite: use este comando como jogador.' };
        system.run(() => {
          try {
            fn(/** @type {import('@minecraft/server').Player} */ (p), ...args);
          } catch (err) {
            console.warn(`[Zênite] /${nome}: ${err}`);
          }
        });
        return { status: CustomCommandStatus.Success };
      },
    );
  };
  comando(COMANDOS.menu, 'Abre a Roda de Técnicas do Zênite', false, (p) => void abrirRoda(p));
  comando(COMANDOS.codice, 'Abre o Códice do Zênite', false, (p) => void abrirCodice(p));
  comando(COMANDOS.kit, 'Recebe o kit completo do Zênite', true, (p) => darKit(p));
  comando(COMANDOS.nivel, 'Define o nível de maestria do Zênite (1 a 10)', true, (p, n) => {
    definirNivel(p, Number(n));
    p.sendMessage({ rawtext: [tr('zenite.msg.nivel_definido'), { text: ` §f${Math.max(1, Math.min(10, Math.floor(Number(n))))}` }] });
  }, [{ name: 'nivel', type: CustomCommandParamType.Integer }]);
  comando(COMANDOS.arconte, 'Invoca o Arconte do Eclipse na sua frente', true, (p) => ganchos.invocarArconte?.(p));
  comando(COMANDOS.limpar, 'Remove cúpulas da Abóbada Celeste que ficaram no mundo', true, (p) => {
    const n = ganchos.limparAbobadas?.(p) ?? 0;
    p.sendMessage({ rawtext: [tr('zenite.msg.limpo'), { text: ` §f${n}` }] });
  });
}
