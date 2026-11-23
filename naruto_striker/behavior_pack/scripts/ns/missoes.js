// Livro Bingo: contratos de caça. Cada jogador tem 3 contratos ativos; ao concluir
// um, recebe TP + XP e um novo contrato é sorteado no lugar.
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ehJogador, lerJSON, gravarJSON, somarScore, lerScore, particula, som, msg, barra } from "./util";
import { darXP, somarStat, BOTOES_EXTRAS, abrirPerfil } from "./progressao";

const ALVOS = [
  { tipo: "tnt:ninja_folha_b", nome: "Ninja da Folha §a#B", meta: 8, tp: 250, xp: 150 },
  { tipo: "tnt:ninja_folha_s", nome: "Ninja da Folha §b#S", meta: 4, tp: 450, xp: 260 },
  { tipo: "tnt:ninja_areia_b", nome: "Ninja da Areia §a#B", meta: 8, tp: 250, xp: 150 },
  { tipo: "tnt:ninja_areia_s", nome: "Ninja da Areia §b#S", meta: 4, tp: 450, xp: 260 },
  { tipo: "tnt:uchiha_b", nome: "Uchiha §a#B", meta: 6, tp: 350, xp: 220 },
  { tipo: "tnt:uchiha_s", nome: "Uchiha §b#S", meta: 3, tp: 600, xp: 350 },
  { tipo: "tnt:espadachin_s", nome: "Espadachim §6#S", meta: 3, tp: 500, xp: 300 },
  { tipo: "tnt:espadachin_ss", nome: "Espadachim §d#SS", meta: 1, tp: 800, xp: 500 },
  { tipo: "tnt:bandidos_rank_c", nome: "Bandidos §eRank C", meta: 10, tp: 200, xp: 120 },
  { tipo: "tnt:bandidos_rank_a", nome: "Bandidos §eRank A", meta: 6, tp: 350, xp: 220 },
  { tipo: "tnt:zetsu_branco", nome: "Zetsu Branco", meta: 15, tp: 300, xp: 200 },
  { tipo: "tnt:anbu", nome: "ANBU §eRank A", meta: 3, tp: 500, xp: 300 },
  { tipo: "*", nome: "Qualquer inimigo", meta: 30, tp: 300, xp: 200 },
];
const POR_TIPO = new Map(ALVOS.map((a) => [a.tipo, a]));
const CHAVE = "ns:contratos";
const CUSTO_TROCA = 50;

function sortear(excluir) {
  const opcoes = ALVOS.filter((a) => !excluir.includes(a.tipo));
  const a = opcoes[Math.floor(Math.random() * opcoes.length)] ?? ALVOS[ALVOS.length - 1];
  return { tipo: a.tipo, prog: 0 };
}

function contratos(player) {
  let c = lerJSON(player, CHAVE, []);
  if (!Array.isArray(c)) c = [];
  c = c.filter((x) => x && POR_TIPO.has(x.tipo) && typeof x.prog === "number");
  let mudou = false;
  while (c.length < 3) {
    c.push(sortear(c.map((x) => x.tipo)));
    mudou = true;
  }
  if (mudou) gravarJSON(player, CHAVE, c);
  return c;
}

world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const player = ev.damageSource?.damagingEntity;
    if (!ehJogador(player)) return;
    const tipo = ev.deadEntity?.typeId;
    if (!tipo || tipo === "minecraft:player" || tipo === "tnt:ns_texto") return;
    let vidaMax = 0;
    try { vidaMax = ev.deadEntity.getComponent("health")?.effectiveMax ?? 0; } catch {}
    if (vidaMax < 2) return;

    const c = contratos(player);
    let mudou = false;
    for (let i = 0; i < c.length; i++) {
      const k = c[i];
      if (k.tipo !== tipo && !(k.tipo === "*" && !ehJogador(ev.deadEntity))) continue;
      const alvo = POR_TIPO.get(k.tipo);
      k.prog++;
      mudou = true;
      if (k.prog >= alvo.meta) {
        somarScore(player, "tp", alvo.tp);
        msg(player, `§4§l[LIVRO BINGO]§r §fContrato concluído: §e${alvo.nome}§r §a+${alvo.tp} TP §b+${alvo.xp} XP`);
        som(player, "random.levelup", 0.7, 1.4);
        particula(player.dimension, "tnt:ns_critico", { x: player.location.x, y: player.location.y + 1.2, z: player.location.z });
        darXP(player, alvo.xp, "contrato");
        somarStat(player, "ns:contratos_ok", 1);
        c[i] = sortear(c.map((x) => x.tipo));
        const novo = POR_TIPO.get(c[i].tipo);
        msg(player, `§7Novo contrato: §e${novo.nome} §7(0/${novo.meta})`);
      } else if (alvo.meta <= 10 || k.prog % 5 === 0) {
        msg(player, `§8[Livro Bingo] §7${alvo.nome}§7: §f${k.prog}§7/§f${alvo.meta}`);
      }
    }
    if (mudou) gravarJSON(player, CHAVE, c);
  } catch {}
});

async function abrirLivroBingo(player) {
  if (!ehJogador(player)) return;
  const c = contratos(player);
  let txt = "§7Derrote os alvos para receber TP e XP.\nNovos contratos surgem quando você conclui um.\n\n";
  for (const k of c) {
    const a = POR_TIPO.get(k.tipo);
    txt += `§e${a.nome}\n ${barra(k.prog, a.meta, 16, "§c", "§8")} §f${k.prog}§7/§f${a.meta}  §6${a.tp} TP §b${a.xp} XP\n\n`;
  }
  const form = new ActionFormData()
    .title("§4§lLivro Bingo")
    .body(txt)
    .button(`§lSortear novos contratos\n§r§8(custa ${CUSTO_TROCA} TP)`)
    .button("§lVoltar");
  try {
    const r = await form.show(player);
    if (r.canceled) return;
    if (r.selection === 0) {
      if (lerScore(player, "tp") < CUSTO_TROCA) {
        msg(player, `§cVocê precisa de ${CUSTO_TROCA} TP para sortear novos contratos.`);
        som(player, "note.bass", 1, 0.6);
      } else {
        somarScore(player, "tp", -CUSTO_TROCA);
        const novos = [];
        while (novos.length < 3) novos.push(sortear(novos.map((x) => x.tipo)));
        gravarJSON(player, CHAVE, novos);
        som(player, "random.click", 1, 1.2);
      }
      system.run(() => abrirLivroBingo(player));
      return;
    }
    return abrirPerfil(player);
  } catch {}
}

BOTOES_EXTRAS.push({ nome: "§4§lLivro Bingo §r§8(contratos)", abrir: abrirLivroBingo });

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "ns:bingo" && ehJogador(ev.sourceEntity)) abrirLivroBingo(ev.sourceEntity);
});
