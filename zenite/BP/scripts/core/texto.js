// Ajudantes de texto: chaves de idioma viram RawMessage (traduzidas no jogo).

/** @param {string} chave @returns {import('@minecraft/server').RawMessage} */
export const tr = (chave) => ({ translate: chave });

/**
 * Junta partes (texto puro ou RawMessage) numa única RawMessage.
 * @param {...(string | import('@minecraft/server').RawMessage)} partes
 * @returns {import('@minecraft/server').RawMessage}
 */
export function raw(...partes) {
  return { rawtext: partes.map((p) => (typeof p === 'string' ? { text: p } : p)) };
}
