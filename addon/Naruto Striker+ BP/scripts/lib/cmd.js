// Execucao de comandos centralizada (API @minecraft/server 2.x).
//
// A API 2.x removeu runCommandAsync. runCommand e sincrono e lanca erro quando:
//  - o comando falha (ex.: seletor sem alvo), ou
//  - e chamado em contexto somente-leitura (dentro de beforeEvents).
// cmd() preserva o comportamento antigo do add-on: nunca lanca erro para quem chama
// e, em contexto somente-leitura, adia a execucao para o proximo tick (como o
// runCommandAsync fazia). Retorna o successCount (0 em falha ou quando adiado).
import { system } from "@minecraft/server";

function restrito(e) {
  const t = String(e?.message ?? e ?? "");
  return /read-?only|restricted|privilege|permission|early execution/i.test(t);
}

export function cmd(alvo, comando) {
  if (!alvo || typeof comando !== "string" || comando.length === 0) return 0;
  try {
    return alvo.runCommand(comando)?.successCount ?? 0;
  } catch (e) {
    if (restrito(e)) {
      system.run(() => {
        try {
          if (alvo.isValid === false) return;
          alvo.runCommand(comando);
        } catch {}
      });
    }
    return 0;
  }
}

/** Executa uma lista de comandos em ordem; cada falha e isolada. */
export function cmds(alvo, lista) {
  let ok = 0;
  for (const c of lista) ok += cmd(alvo, c) > 0 ? 1 : 0;
  return ok;
}
