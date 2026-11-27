// Pontos de extensão preenchidos por módulos carregados depois (técnicas e chefe),
// evitando importações circulares com os comandos e os itens.
export const ganchos = {
  /** @type {((player: import('@minecraft/server').Player) => void) | undefined} */
  invocarArconte: undefined,
  /** @type {((player: import('@minecraft/server').Player) => void) | undefined} */
  iniciarRitual: undefined,
  /** @type {((player?: import('@minecraft/server').Player) => number) | undefined} */
  limparAbobadas: undefined,
  /** Funções chamadas quando o mundo termina de carregar. @type {(() => void)[]} */
  aoCarregar: [],
};
