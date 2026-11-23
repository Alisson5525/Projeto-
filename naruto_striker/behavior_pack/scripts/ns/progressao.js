// Sistema de Progressao Ninja: nivel, XP, ranks (Estudante -> Lenda Shinobi),
// conquistas e o menu "Pergaminho Ninja" (perfil / conquistas / ajustes).
// Integra com a economia original do add-on: recompensas sao dadas em TP (placar "tp").
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import {
  ehJogador, valido, lerNum, gravar, lerJSON, gravarJSON, somarScore, definirScore, lerScore,
  particula, som, tremer, msg, barra, config, salvarConfig, corDoChakra,
} from "./util";

export const NIVEL_MAX = 100;

export const RANKS = [
  { min: 1, nome: "Estudante da Academia", cor: "§7" },
  { min: 5, nome: "Genin", cor: "§a" },
  { min: 15, nome: "Chunin", cor: "§2" },
  { min: 30, nome: "Jounin", cor: "§b" },
  { min: 45, nome: "ANBU", cor: "§9" },
  { min: 60, nome: "Sannin", cor: "§d" },
  { min: 75, nome: "Kage", cor: "§6" },
  { min: 90, nome: "Lenda Shinobi", cor: "§c" },
];

export function rankDe(nivel) {
  let r = RANKS[0];
  for (const k of RANKS) if (nivel >= k.min) r = k;
  return r;
}

export function xpParaProximo(nivel) {
  return Math.floor(60 * Math.pow(nivel, 1.45));
}

export function nivelDe(player) {
  return Math.max(1, Math.min(NIVEL_MAX, lerNum(player, "ns:nivel", 1)));
}

/* ------------------------------------------------------------------ */
/* Conquistas                                                          */
/* ------------------------------------------------------------------ */
export const CONQUISTAS = [
  { id: "sangue", nome: "Primeiro Sangue", desc: "Derrote seu primeiro inimigo.", stat: "ns:kills", meta: 1, tp: 50 },
  { id: "cacador", nome: "Caçador de Recompensas", desc: "Derrote 50 inimigos.", stat: "ns:kills", meta: 50, tp: 250 },
  { id: "extermin", nome: "Shinobi Implacável", desc: "Derrote 250 inimigos.", stat: "ns:kills", meta: 250, tp: 800 },
  { id: "chefe", nome: "Matador de Gigantes", desc: "Derrote um inimigo com 500+ de vida.", stat: "ns:chefes", meta: 1, tp: 400 },
  { id: "combo10", nome: "Taijutsu Fluido", desc: "Alcance um combo de 10 golpes.", stat: "ns:combo_max", meta: 10, tp: 150 },
  { id: "combo25", nome: "Fúria do Leão", desc: "Alcance um combo de 25 golpes.", stat: "ns:combo_max", meta: 25, tp: 500 },
  { id: "crit50", nome: "Ponto Vital", desc: "Acerte 50 golpes críticos.", stat: "ns:criticos", meta: 50, tp: 200 },
  { id: "crit300", nome: "Olhos de Falcão", desc: "Acerte 300 golpes críticos.", stat: "ns:criticos", meta: 300, tp: 700 },
  { id: "explora10", nome: "Viajante", desc: "Descubra 10 regiões.", stat: "ns:regioes_n", meta: 10, tp: 200 },
  { id: "explora50", nome: "Andarilho das Cinco Nações", desc: "Descubra 50 regiões.", stat: "ns:regioes_n", meta: 50, tp: 900 },
  { id: "genin", nome: "Bandana de Genin", desc: "Alcance o nível 5.", stat: "ns:nivel", meta: 5, tp: 100 },
  { id: "chunin", nome: "Exame Chunin", desc: "Alcance o nível 15.", stat: "ns:nivel", meta: 15, tp: 300 },
  { id: "jounin", nome: "Colete de Jounin", desc: "Alcance o nível 30.", stat: "ns:nivel", meta: 30, tp: 600 },
  { id: "kage", nome: "Chapéu de Kage", desc: "Alcance o nível 75.", stat: "ns:nivel", meta: 75, tp: 2000 },
];

function checarConquistas(player) {
  if (!valido(player)) return;
  const feitas = lerJSON(player, "ns:conquistas", []);
  let mudou = false;
  for (const c of CONQUISTAS) {
    if (feitas.includes(c.id)) continue;
    if (lerNum(player, c.stat, c.stat === "ns:nivel" ? 1 : 0) >= c.meta) {
      feitas.push(c.id);
      mudou = true;
      somarScore(player, "tp", c.tp);
      msg(player, `§6§l[CONQUISTA]§r §e${c.nome} §7- ${c.desc} §a(+${c.tp} TP)`);
      som(player, "random.toast", 1, 1);
      particula(player.dimension, "tnt:ns_critico", { x: player.location.x, y: player.location.y + 1.2, z: player.location.z });
    }
  }
  if (mudou) gravarJSON(player, "ns:conquistas", feitas);
}

/* Incrementa uma estatistica numerica e verifica conquistas. */
export function somarStat(player, chave, valor = 1) {
  if (!valido(player)) return;
  gravar(player, chave, lerNum(player, chave, 0) + valor);
  checarConquistas(player);
}

export function maxStat(player, chave, valor) {
  if (!valido(player)) return;
  if (valor > lerNum(player, chave, 0)) {
    gravar(player, chave, valor);
    checarConquistas(player);
  }
}

/* ------------------------------------------------------------------ */
/* XP / Nivel                                                          */
/* ------------------------------------------------------------------ */
export function darXP(player, quantidade, motivo) {
  if (!ehJogador(player) || !(quantidade > 0)) return;
  let nivel = nivelDe(player);
  if (nivel >= NIVEL_MAX) return;
  let xp = lerNum(player, "ns:xp", 0) + Math.round(quantidade);
  let subiu = 0;
  let tpGanho = 0;
  const rankAntes = rankDe(nivel);

  while (nivel < NIVEL_MAX && xp >= xpParaProximo(nivel)) {
    xp -= xpParaProximo(nivel);
    nivel++;
    subiu++;
    tpGanho += 50 + nivel * 10;
  }
  if (nivel >= NIVEL_MAX) xp = 0;

  gravar(player, "ns:xp", xp);
  gravar(player, "ns:nivel", nivel);

  if (subiu > 0) {
    definirScore(player, "ns_nivel", nivel);
    somarScore(player, "tp", tpGanho);
    const rank = rankDe(nivel);
    const loc = player.location;
    particula(player.dimension, "tnt:ns_level_up", loc);
    particula(player.dimension, "tnt:ns_onda", { x: loc.x, y: loc.y + 0.1, z: loc.z });
    som(player, "random.levelup", 1, 1);
    tremer(player, 0.25, 0.4);
    msg(player,
      `§8§m----------------------------------§r\n` +
      `§6§l  NÍVEL ${nivel}!§r  ${rank.cor}${rank.nome}\n` +
      `§7  Recompensa: §e+${tpGanho} TP §7(use no Menu de Status)\n` +
      `§8§m----------------------------------`);
    if (rank !== rankAntes) {
      for (const p of world.getAllPlayers()) {
        msg(p, `§6§l[PROMOÇÃO]§r §f${player.name} §7agora é ${rank.cor}§l${rank.nome}§r§7!`);
      }
      somarScore(player, "tp", 300);
      msg(player, `§6Bônus de promoção: §e+300 TP`);
      particula(player.dimension, "tnt:ns_folhas", loc);
      tremer(player, 0.5, 0.8);
    }
    checarConquistas(player);
  } else if (motivo) {
    // feedback discreto de XP somente quando relevante
  }
}

/* ------------------------------------------------------------------ */
/* Menu do Pergaminho Ninja                                           */
/* ------------------------------------------------------------------ */
const ITEM_PERFIL = "tnt:pergaminho_ninja";
const emUso = new Set();

world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    if (ev.itemStack?.typeId !== ITEM_PERFIL) return;
    const player = ev.source;
    if (!player || emUso.has(player.id)) return;
    emUso.add(player.id);
    system.run(() => {
      abrirPerfil(player).finally(() => emUso.delete(player.id));
    });
  } catch {}
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "ns:perfil") return;
  if (ehJogador(ev.sourceEntity)) abrirPerfil(ev.sourceEntity);
});

export async function abrirPerfil(player) {
  if (!ehJogador(player)) return;
  const nivel = nivelDe(player);
  const rank = rankDe(nivel);
  const xp = lerNum(player, "ns:xp", 0);
  const prox = xpParaProximo(nivel);
  const feitas = lerJSON(player, "ns:conquistas", []);
  const cor = corDoChakra(player);
  const corTxt = cor[0] > 0.9 && cor[1] < 0.5 ? "§c" : cor[2] > 0.9 && cor[0] < 0.6 ? "§b" : "§e";

  const corpo =
    `§f${player.name}\n` +
    `${rank.cor}§l${rank.nome}§r\n\n` +
    `§7Nível: §e${nivel}${nivel >= NIVEL_MAX ? " §6(MAX)" : ""}\n` +
    (nivel < NIVEL_MAX ? `§7XP: ${barra(xp, prox, 20, "§6", "§8")} §f${xp}§7/§f${prox}\n` : "") +
    `§7TP disponível: §e${lerScore(player, "tp")}\n\n` +
    `§7Inimigos derrotados: §f${lerNum(player, "ns:kills", 0)}\n` +
    `§7Chefes derrotados: §f${lerNum(player, "ns:chefes", 0)}\n` +
    `§7Golpes críticos: §f${lerNum(player, "ns:criticos", 0)}\n` +
    `§7Maior combo: §f${lerNum(player, "ns:combo_max", 0)} golpes\n` +
    `§7Regiões descobertas: §f${lerNum(player, "ns:regioes_n", 0)}\n` +
    `§7Conquistas: §f${feitas.length}§7/§f${CONQUISTAS.length}\n` +
    `§7Chakra atual: ${corTxt}${lerScore(player, "chakra")}§7/§f${lerScore(player, "chakra_max")}\n\n` +
    `§8Dica: fique agachado e parado para meditar e recuperar chakra.`;

  const form = new ActionFormData()
    .title("§6§lPergaminho Ninja")
    .body(corpo)
    .button("§lConquistas")
    .button("§lAjustes visuais")
    .button("§lGuia de Progressão")
    .button("§cFechar");

  let r;
  try {
    r = await form.show(player);
  } catch {
    return;
  }
  if (r.canceled) return;
  if (r.selection === 0) return abrirConquistas(player);
  if (r.selection === 1) return abrirAjustes(player);
  if (r.selection === 2) return abrirGuia(player);
}

async function abrirConquistas(player) {
  const feitas = lerJSON(player, "ns:conquistas", []);
  let txt = "";
  for (const c of CONQUISTAS) {
    const ok = feitas.includes(c.id);
    const atual = Math.min(c.meta, lerNum(player, c.stat, c.stat === "ns:nivel" ? 1 : 0));
    txt += `${ok ? "§a[X]" : "§8[ ]"} §f${c.nome} §7(${atual}/${c.meta})\n§8   ${c.desc} §6+${c.tp} TP\n`;
  }
  const form = new ActionFormData().title("§6§lConquistas").body(txt).button("§lVoltar");
  try {
    const r = await form.show(player);
    if (!r.canceled) return abrirPerfil(player);
  } catch {}
}

async function abrirAjustes(player) {
  const cfg = config(player);
  const nome = { numeros: "Números de dano", aura: "Aura de chakra", tremor: "Tremor de câmera", rastro: "Rastro de velocidade" };
  const chaves = Object.keys(nome);
  const form = new ActionFormData().title("§6§lAjustes visuais").body("§7Toque para ligar/desligar:");
  for (const k of chaves) form.button(`${nome[k]}: ${cfg[k] ? "§aLIGADO" : "§cDESLIGADO"}`);
  form.button("§lVoltar");
  try {
    const r = await form.show(player);
    if (r.canceled) return;
    if (r.selection < chaves.length) {
      const k = chaves[r.selection];
      cfg[k] = !cfg[k];
      salvarConfig(player, cfg);
      som(player, "random.click", 1, cfg[k] ? 1.2 : 0.8);
      return abrirAjustes(player);
    }
    return abrirPerfil(player);
  } catch {}
}

async function abrirGuia(player) {
  let ranks = "";
  for (const r of RANKS) ranks += `${r.cor}${r.nome} §7- nível ${r.min}\n`;
  const txt =
    "§eComo evoluir:\n" +
    "§7- Derrote inimigos para ganhar XP (mais vida = mais XP).\n" +
    "§7- Explore o mundo: cada região nova dá XP e pode revelar\n  pergaminhos perdidos com TP.\n" +
    "§7- Cada nível dá TP para gastar no Menu de Status.\n" +
    "§7- Conquistas dão TP extra.\n\n" +
    "§eCombate:\n" +
    "§7- Golpes seguidos formam combos (bônus de XP).\n" +
    "§7- Críticos causam +60% de dano; a chance cresce com o nível.\n" +
    "§7- Meditar (agachado e parado) recupera chakra.\n\n" +
    "§eRanks:\n" + ranks;
  const form = new ActionFormData().title("§6§lGuia de Progressão").body(txt).button("§lVoltar");
  try {
    const r = await form.show(player);
    if (!r.canceled) return abrirPerfil(player);
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Primeira entrada: entrega o pergaminho e prepara o placar           */
/* ------------------------------------------------------------------ */
world.afterEvents.playerSpawn.subscribe((ev) => {
  const player = ev.player;
  if (!ev.initialSpawn) return;
  system.runTimeout(() => {
    if (!ehJogador(player)) return;
    definirScore(player, "ns_nivel", nivelDe(player));
    if (!player.getDynamicProperty("ns:recebeu_pergaminho")) {
      gravar(player, "ns:recebeu_pergaminho", true);
      try {
        player.runCommandAsync(`give @s ${ITEM_PERFIL} 1`);
      } catch {}
      msg(player, "§6[Naruto Striker+] §7Você recebeu o §6Pergaminho Ninja§7: veja seu nível, conquistas e ajustes.");
    }
  }, 60);
});
