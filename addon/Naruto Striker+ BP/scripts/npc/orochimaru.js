// import
import { world, system } from "@minecraft/server";
import { cmd } from "../lib/cmd.js";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

system.afterEvents.scriptEventReceive.subscribe((ev) => {

  if (!ev.id) return;
  if (ev.id !== "npc:orochimaru") return;

  const player = ev.sourceEntity;
  if (!player || player.typeId !== "minecraft:player") return;

  npc_orochimaru(player);
});

export function npc_orochimaru(player) {

  const hasTag = player.hasTag("orochimaru_complet");
  const conversa = hasTag ? 
  "§fimpressionante. Você conseguiu me derrotar. Poucos chegam tão longe…\n\n\n§aRecompensa:\n§dMarca da Maldição." 
  : 
  "§fVocê deseja receber a marca da maldição… não é? Mas, para obtê-la, terá de cumprir certas missões…\n\n\n§aMissão.§e\nTente me derrotar… e então descobrirei\nse você é digno da §dMarca Da Maldição.";

  const corBotao1 = hasTag ? "" : "§aComeçar Batalha";
  const corBotao3 = hasTag ? "§a*Finalizar Missão*" : "§cMissão Incompleta";

  const form = new ActionFormData();
  form.title("ui.npc_orochimaru.title");
  form.body(
    `${conversa}`
  );

  form.button(`§o§l${corBotao1}`);
  form.button("§o§l§eOutros..");

  form.button(`§o§l${corBotao3}`);



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
player.runCommand('/execute as @s run tellraw @s {"rawtext":[{"text":"§a[Orochimaru] §eentão você finalmente decidiu lutar. Mostre-me se é digno da marca que carrega."}]}');
player.runCommand('/tag @s add treino_orochimaru');
player.runCommand('/tag @e[r=10,type=tnt:orochimaru_npc,c=1] add mentor_furia');
break;

case 1:
npc_orochimaru_pg2(player);
break;

case 2:
player.runCommand('/execute as @s[tag=orochimaru_complet] run tellraw @s {"rawtext":[{"text":"§a[Orochimaru] §eQue Interessante. Você Finalmente Recebeu Minha §dMarca Da Maldição."}]}');
player.runCommand('/execute as @s[tag=orochimaru_complet] run tag @s add marca_v1');
player.runCommand('/execute as @s[tag=orochimaru_complet] run tag @s remove treino_orochimaru');
player.runCommand('/execute as @s[tag=orochimaru_complet] run tag @s remove marca_v1_lock');
player.runCommand('/execute as @s[tag=!orochimaru_complet] run tellraw @s {"rawtext":[{"text":"§c[!] §eDerrote Orochimaru Para Receber a §dMarca Da Maldição"}]}');
break;

    }

  }).catch(() => {});
}




export function npc_orochimaru_pg2(player) {

  const hasTag = player.hasTag("orochimaru_complet");
  const conversa = hasTag ? 
  "§fPara implantar as células de Hashirama, obtenha fragmentos nos §bZetsus Brancos.\n\n§alocalizaçao. §eJardim Pálido.\n\n§aInformações.\n______________________________________\n\n§c[!].§eImplantar DNA Hashirama:§f requer 10 fragmentos de Zetsu.\n§c[!].§eDNA Evoluido Hashirama:§f requer 34 fragmentos de Zetsu.\n§c[!].§eImplantar Braço Danzo:§f requer 128 fragmentos de Zetsu..\ne 7 sharingan.\n§c[!].§eCeifeiro Da Morte: §fRequer§a 6000.Tp\n§a______________________________________\n\n§aBenefícios.\n\n§c[!].§eImplantar DNA Hashirama:§f +30 de Vida.\n§c[!].§eDNA Evoluido Hashirama:§f +70 de Vida, regeneração de 2 coraçao.\n§c[!].§eBraço Danzo:§f +150 de Vida, regeneração de 5 coraçao.\n§c[!].§eCeifeiro Da Morte:§f Concede a habilidade de selar bijus"
  : 
  "§fVocê deseja receber a marca da maldição… não é? Mas, para obtê-la, terá de cumprir certas missões…\n\n\n§aMissão.§e\nTente me derrotar… e então descobrirei\nse você é digno da §dMarca Da Maldição.";

  const corBotao3 = hasTag ? "" : "";

  const form = new ActionFormData();
  form.title("ui.npc_orochimaru_pg2.title");
  form.body(
    `${conversa}`
  );

  form.button("§l§o§e.Implantar DNA Hashirama           ");
  form.button("§l§o§e.DNA Evoluido Hashirama            ");
  form.button("§l§o§e.Implantar Braço Danzo             ");
  form.button("§l§o§e.Ceifeiro Da Morte                    ");
  form.button("§l§o§c Voltar.                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
cmd(player, 'function npc/orochimaru_dna_v1');
break;


case 1:
cmd(player, 'function npc/orochimaru_dna_v2');
break;

case 2:
cmd(player, 'execute as @s[hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=128..},{item=tnt:olho_sharingan,location=slot.hotbar,quantity=7..}]] run function npc/orochimaru_dna_braco_danzo');
break;

case 3:
cmd(player, 'execute as @s[scores={tp=0..5999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 6000. Tp"}]}');
cmd(player, 'execute as @s[scores={tp=6000..}] run give @s tnt:pergaminho_ceifeiro');
cmd(player, 'execute as @s[scores={tp=6000..}] run scoreboard players remove @s tp 6000');
break;

case 4:
npc_orochimaru(player);
break;

    }

  }).catch(() => {});
}