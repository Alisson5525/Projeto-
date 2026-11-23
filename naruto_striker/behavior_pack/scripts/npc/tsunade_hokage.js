// import
import { world, system } from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

system.afterEvents.scriptEventReceive.subscribe((ev) => {

  if (!ev.id) return;
  if (ev.id !== "npc:tsunade_hokage") return;

  const player = ev.sourceEntity;
  if (!player) return;

  if (player.isPlayer && player.isPlayer()) {
    try {
      player.sendMessage("§a[scriptevent] Recebido: tnt:tsunade_hokage");
    } catch (e) {
      console.warn("Não foi possível enviar mensagem de debug ao player.");
    }
  }

  npc_tsunade_hokage(player);
});




world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  switch (data.itemStack.typeId) {
    case "":
      runTimeoutSeguro(() => {
        npc_tsunade_hokage(player);
      }, 0);
      break;
  }
});

export function npc_tsunade_hokage(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§f§aParabéns.§f A partir de agora, você é oficialmente um membro da §aVila da Folha.§f
Você conquistou a confiança dos §ementores§f da aldeia não desperdice isso.

§aLembre-se: §eCada mentor da aldeia tem seu próprio método de treinamento.` 


  : 


`§fEntão você é o §eforasteiro.§f
Vou permitir sua entrada na aldeia, mas a confiança só será conquistada através das §amissões.

§c[!]. §eÉ necessário completar as três primeiras missões do modo clássico.

§fMissao §arank §eD.
§fMissao §arank §eC.
§fMissao §arank §eB.

`;

  const corBotao1 = hasTag ? "§aMissoes Completa" : "§eSe Tornar Ninja Da Folha";
  const corBotao2 = hasTag ? "§o§l§eOutros.." : "§cVoltar Depois";
  const corBotao3 = hasTag ? "§eInfo: §aNinja Da Folha" : "§eInfo:§c forasteiro";

  const form = new ActionFormData();
  form.title("ui.npc_tsunade_hokage.title");
  form.body(
    `${conversa}`
  );

  form.button(`§l${corBotao1}`);
  form.button(`§l${corBotao2}`);

  form.button(`§l${corBotao3}`);



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
player.runCommand('/execute as @s[tag=!missao_3_c] run tellraw @s {"rawtext":[{"text":"§a[Hokage] §cSuas missões ainda não foram concluídas."}]}');
player.runCommand('/execute as @s[tag=missao_3_c] run tellraw @s {"rawtext":[{"text":"§a[Hokage] §aParabéns!§e Você agora é um Ninja da Vila da Folha."}]}');
player.runCommand('/execute as @s[tag=missao_3_c] run tag @s add ninja_konoha');
break;

case 1:
if (player.hasTag("ninja_konoha")) {
npc_tsunade_hokage_pg2(player);
}
break;

case 2:
player.runCommand('/execute as @s[tag=ninja_konoha] run tellraw @s {"rawtext":[{"text":"§a[Tsunade] §eAgora Voce E um Membro Da Aldeia Da Folha"}]}');
player.runCommand('/execute as @s[tag=!ninja_konoha] run tellraw @s {"rawtext":[{"text":"§a[Tsunade] §eTermina As Missoes Para Se Tornar um ninja da Folha"}]}');
break;

    }

  });
}




export function npc_tsunade_hokage_pg2(player) {

  const hasTag = player.hasTag("orochimaru_complet");
  const conversa = hasTag ? 
`§fVejo determinação em seus olhos,
§aVocê realmente deseja aprender §btécnicas avançadas de cura§f?

§6Se estiver disposto, §feu mesma irei te treinar
§fpara dominar a §dMarca do Byakugou§r§d,
§fum poder que exige controle, força e disciplina!

§cMas não se engane…
§fEsse treinamento será §4extremamente difícil§f,
§fe apenas os verdadeiramente fortes chegam até o fim!

§ainformaçoes.
§a________________________________________

§c[!].§e Jutsu Medico:  §frequer §a500 tp.

§c[!].§e Jutsu Medico Avançado:  §frequer §a2000 tp.

§c[!].§e selo byakugou:  §frequer §a750 tp.

§d[!].§c O treinamento do Selo Byakugou se resume,
à prática contínua de §eacumular chakra em um item,.
§a________________________________________

`
  : 
  "§fVocê deseja receber a marca da maldição… não é? Mas, para obtê-la, terá de cumprir certas missões…\n\n\n§aMissao.§e\nTente me derrotar… e então descobrirei\nse você é digno da §dMarca Da Maldiçao.";

  const corBotao3 = hasTag ? "" : "";

  const form = new ActionFormData();
  form.title("ui.npc_orochimaru_pg2.title");
  form.body(
    `${conversa}`
  );

  form.button("§l§o§e.Jutsu Medico                            ");
  form.button("§l§o§e.jutsu medico avançado                   ");
  form.button("§l§o§e.selo byakugou                           ");
  form.button("§l§o§c Voltar.                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
player.runCommandAsync('execute as @s[scores={tp=0..499}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a500. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=500..}] run give @s tnt:jutsu_medico')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=500..}] run scoreboard players remove @s tp 500')?.catch?.(() => {});
break;


case 1:
player.runCommandAsync('execute as @s[scores={tp=0..1999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a2000. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=2000..}] run give @s tnt:jutsu_medico_avancado')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=2000..}] run scoreboard players remove @s tp 2000')?.catch?.(() => {});
break;

case 2:
player.runCommandAsync('execute as @s[scores={tp=0..749}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a750. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=750..}] run give @s tnt:selo_byakugou')?.catch?.(() => {});
player.runCommandAsync('execute as @s[scores={tp=750..}] run scoreboard players remove @s tp 750')?.catch?.(() => {});
break;

case 3:
npc_tsunade_hokage(player);
break;

    }

  });
}
