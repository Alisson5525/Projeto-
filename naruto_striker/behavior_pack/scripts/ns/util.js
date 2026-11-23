// Utilitarios compartilhados dos sistemas "Naruto Striker+" (pasta ns/).
// Tudo aqui e defensivo: nenhuma funcao lanca erro para quem chama.
import { world, system, MolangVariableMap } from "@minecraft/server";

export const PLAYER = "minecraft:player";

export function valido(e) {
  try {
    return !!e && e.isValid();
  } catch {
    return false;
  }
}

export function ehJogador(e) {
  return valido(e) && e.typeId === PLAYER;
}

/* ---------------- Scoreboard ---------------- */
export function objetivo(nome) {
  try {
    return world.scoreboard.getObjective(nome) ?? world.scoreboard.addObjective(nome, nome);
  } catch {
    return undefined;
  }
}

export function lerScore(player, nome) {
  try {
    const obj = world.scoreboard.getObjective(nome);
    if (!obj || !player.scoreboardIdentity) return 0;
    return obj.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}

export function somarScore(player, nome, valor) {
  try {
    const obj = objetivo(nome);
    if (!obj) return;
    // via comando para funcionar mesmo antes do jogador ter identidade no placar
    const v = Math.trunc(valor);
    if (v === 0) return;
    player.runCommandAsync(`scoreboard players ${v > 0 ? "add" : "remove"} @s ${nome} ${Math.abs(v)}`);
  } catch {}
}

export function definirScore(player, nome, valor) {
  try {
    const obj = objetivo(nome);
    if (!obj) return;
    player.runCommandAsync(`scoreboard players set @s ${nome} ${Math.trunc(valor)}`);
  } catch {}
}

/* ---------------- Dynamic properties ---------------- */
export function lerNum(ent, chave, padrao = 0) {
  try {
    const v = ent.getDynamicProperty(chave);
    return typeof v === "number" && Number.isFinite(v) ? v : padrao;
  } catch {
    return padrao;
  }
}

export function gravar(ent, chave, valor) {
  try {
    ent.setDynamicProperty(chave, valor);
  } catch {}
}

export function lerJSON(ent, chave, padrao) {
  try {
    const v = ent.getDynamicProperty(chave);
    if (typeof v !== "string") return padrao;
    const o = JSON.parse(v);
    return o ?? padrao;
  } catch {
    return padrao;
  }
}

export function gravarJSON(ent, chave, valor) {
  try {
    const s = JSON.stringify(valor);
    if (s.length < 30000) ent.setDynamicProperty(chave, s);
  } catch {}
}

/* ---------------- Configuracoes do jogador ---------------- */
const CFG_PADRAO = { numeros: true, aura: true, tremor: true, rastro: true };

export function config(player) {
  return Object.assign({}, CFG_PADRAO, lerJSON(player, "ns:cfg", {}));
}

export function salvarConfig(player, cfg) {
  gravarJSON(player, "ns:cfg", cfg);
}

/* ---------------- Efeitos ---------------- */
export function particula(dim, id, loc, cor) {
  try {
    if (cor) {
      const m = new MolangVariableMap();
      m.setFloat("variable.cor_r", cor[0]);
      m.setFloat("variable.cor_g", cor[1]);
      m.setFloat("variable.cor_b", cor[2]);
      dim.spawnParticle(id, loc, m);
    } else {
      dim.spawnParticle(id, loc);
    }
  } catch {}
}

export function som(player, id, volume = 1, pitch = 1) {
  try {
    player.playSound(id, { volume, pitch });
  } catch {}
}

export function somArea(dim, id, loc, volume = 1, pitch = 1) {
  try {
    if (typeof dim.playSound === "function") dim.playSound(id, loc, { volume, pitch });
    else world.playSound(id, loc, { volume, pitch });
  } catch {}
}

export function tremer(player, intensidade, segundos) {
  try {
    if (!config(player).tremor) return;
    const i = Math.min(4, Math.max(0.01, intensidade)).toFixed(2);
    const s = Math.min(3, Math.max(0.05, segundos)).toFixed(2);
    player.runCommandAsync(`camerashake add @s ${i} ${s} positional`);
  } catch {}
}

export function msg(player, texto) {
  try {
    player.sendMessage(texto);
  } catch {}
}

/* Cor da aura de chakra conforme o modo ativo do jogador. */
export function corDoChakra(player) {
  const prop = (n) => {
    try {
      const v = player.getProperty(n);
      return typeof v === "number" ? v : 0;
    } catch {
      return 0;
    }
  };
  if (prop("tnt:kurama") > 0) return prop("tnt:kurama") >= 7 ? [1.0, 0.85, 0.3] : [1.0, 0.45, 0.08];
  if (prop("tnt:uchiha") > 0) return prop("tnt:uchiha") >= 5 ? [0.55, 0.25, 1.0] : [1.0, 0.12, 0.12];
  if (prop("tnt:hyuga") > 0) return prop("tnt:hyuga") >= 3 ? [0.55, 0.9, 1.0] : [0.92, 0.92, 1.0];
  if (prop("tnt:8_portoes") > 0) return [0.3, 1.0, 0.45];
  if (prop("tnt:shukaku") > 0) return [0.85, 0.7, 0.4];
  if (prop("tnt:sennin_sapo") > 0) return [1.0, 0.6, 0.2];
  if (prop("tnt:marca_maldicao") > 0) return [0.35, 0.05, 0.45];
  return [0.35, 0.7, 1.0];
}

/* ---------------- Formatacao ---------------- */
export function barra(valor, max, tamanho = 10, cheio = "§a", vazio = "§8") {
  const r = max > 0 ? Math.max(0, Math.min(1, valor / max)) : 0;
  const n = Math.round(r * tamanho);
  return cheio + "|".repeat(n) + vazio + "|".repeat(tamanho - n);
}

export function aleatorio(min, max) {
  return min + Math.random() * (max - min);
}

export const tick = () => system.currentTick;

/* ---------------- Configuracao do mundo (admin) ----------------
   /scriptevent ns:config <opcao> <on|off>
   opcoes: kawarimi, elite, furia, esconderijo, lua_vermelha, ambiente, exploracao */
const MUNDO_PADRAO = { kawarimi: true, elite: true, furia: true, esconderijo: true, lua_vermelha: true, ambiente: true, exploracao: true };

export function mundoCfg(chave) {
  try {
    const v = world.getDynamicProperty("ns:mundo_cfg");
    const o = typeof v === "string" ? JSON.parse(v) : {};
    return (o[chave] ?? MUNDO_PADRAO[chave]) !== false;
  } catch {
    return MUNDO_PADRAO[chave] !== false;
  }
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "ns:config") return;
  const quem = ev.sourceEntity;
  const responder = (t) => { try { if (quem && quem.typeId === PLAYER) quem.sendMessage(t); else console.warn(t); } catch {} };
  const [opcao, valor] = (ev.message || "").trim().split(/\s+/);
  let o = {};
  try { const v = world.getDynamicProperty("ns:mundo_cfg"); o = typeof v === "string" ? JSON.parse(v) : {}; } catch {}
  if (!opcao || !(opcao in MUNDO_PADRAO)) {
    const linhas = Object.keys(MUNDO_PADRAO).map((k) => `§7- ${k}: ${(o[k] ?? MUNDO_PADRAO[k]) !== false ? "§aon" : "§coff"}`);
    responder(`§6[Naruto Striker+] Configuração do mundo\n${linhas.join("\n")}\n§7Uso: /scriptevent ns:config <opção> <on|off>`);
    return;
  }
  if (valor !== "on" && valor !== "off") {
    responder("§cUse on ou off.");
    return;
  }
  o[opcao] = valor === "on";
  try { world.setDynamicProperty("ns:mundo_cfg", JSON.stringify(o)); } catch {}
  responder(`§6[Naruto Striker+] §f${opcao} §7=> ${valor === "on" ? "§aon" : "§coff"}`);
});

/* Placares que o add-on original usa mas nunca criava (ex.: "dash" e o tempo de
   recarga do dash duplo; sem ele a recarga nunca funcionava). Criados ao carregar
   o mundo, inclusive em mundos antigos. */
system.runTimeout(() => {
  for (const nome of ["dash", "slot_select", "slot_cooldown_1", "stamina", "reset_all", "ns_nivel"]) objetivo(nome);
}, 1);

/* Propriedade visual do Izanagi (olhos do DNA Hashirama) a partir do placar "isanagi".
   Antes: infinito.mcfunction disparava um evento de entidade A CADA TICK por jogador
   reescrevendo o mesmo valor. Agora so altera quando muda (mesmo mapeamento:
   0 -> 0, 1..7 -> 7..1, 8+ -> mantem). */
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      const obj = world.scoreboard.getObjective("isanagi");
      const s = obj && player.scoreboardIdentity ? obj.getScore(player.scoreboardIdentity) : undefined;
      if (typeof s !== "number" || s >= 8 || s < 0) continue; // sem placar: original nao fazia nada
      const alvo = s === 0 ? 0 : 8 - s;
      if (player.getProperty("tnt:dna_hashirama_isanagi") !== alvo) player.setProperty("tnt:dna_hashirama_isanagi", alvo);
    } catch {}
  }
}, 2);
