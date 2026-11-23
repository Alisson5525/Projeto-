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
  if (ev.id !== "npc:jiraiya") return;

  const player = ev.sourceEntity;
  if (!player || player.typeId !== "minecraft:player") return;

  npc_jiraiya(player);
});
 function getScore(player, objetivo) {
  try {
    return world.scoreboard.getObjective(objetivo)?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}
export function npc_jiraiya(player) {

  const pergminho = getScore(player, "pergminho_konoha");
  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 


`§fEntão… você quer aprender o §eRasengan, §fé?
Muito bem! Eu, §aJiraiya, §fum dos Três Sannins Lendários, irei te ensinar.

§aInformaçoes do Treinamento.
§fRequer §bchakra nivel 3.

§c[!] §bRasengan: §ecusta §a§a700. tp,
` 



  : 
  
`§fNão temos a permissão para transmitir nossos §etreinamentos secretos§f a alguém de fora da aldeia!

torne-se um §eninja de Konoha!

§c[!] §eFale diretamente com a Hokage!
`;

  const corBotao1 = hasTag ? "§aTecnica Rasengan" : "§eOk, irei falar com ela";
  const corBotao2 = hasTag ? "§eVoltar" : "§cVoltar Depois";
  const corBotao3 = hasTag ? "§bComprar Balao" : "§eInfo:§c forasteiro";

  const form = new ActionFormData();
  form.title("ui.npc_jiraiya.title");
  form.body(
    `${conversa}`
  );

  form.button(`§l${corBotao1}`);
  form.button(`§l${corBotao2}`);

  form.button(`§l${corBotao3}`);



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
cmd(player, 'execute as @s[tag=ninja_konoha,scores={tp=0..699}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer: §a700. Tp"}]}');
cmd(player, 'execute as @s[tag=ninja_konoha,scores={tp=700..}] run give @s tnt:rasengan');
cmd(player, 'execute as @s[tag=ninja_konoha,scores={tp=700..}] run scoreboard players remove @s tp 700');
break;

case 1:
break;

case 2:
player.runCommand('/execute as @s[tag=ninja_konoha] run tellraw @s {"rawtext":[{"text":"§a[Tsunade] §eAgora Voce E um Membro Da Aldeia Da Folha"}]}');
player.runCommand('/execute as @s[tag=!ninja_konoha] run tellraw @s {"rawtext":[{"text":"§a[Tsunade] §eTermina As Missoes Para Se Tornar um ninja da Folha"}]}');
break;

    }

  }).catch(() => {});
}
