// import
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

system.afterEvents.scriptEventReceive.subscribe((ev) => {

  if (!ev.id) return;
  if (ev.id !== "npc:guy") return;

  const player = ev.sourceEntity;
  if (!player) return;

  if (player.isPlayer && player.isPlayer()) {
    try {
      player.sendMessage("§a[scriptevent] Recebido: tnt:guy");
    } catch (e) {
      console.warn("Não foi possível enviar mensagem de debug ao player.");
    }
  }

  npc_guy(player);
});




world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  switch (data.itemStack.typeId) {
    case "":
      system.runTimeout(() => {
        npc_guy(player);
      }, 0);
      break;
  }
});
 function getScore(player, objetivo) {
  try {
    return world.scoreboard.getObjective(objetivo)?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}
export function npc_guy(player) {

  const pergminho = getScore(player, "pesos_guy");
  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§aJOVEM DE ESPÍRITO ARDENTE!§f
Para aprender os §aOito Portões,§f você passará por um duro §etreinamento com pesos!
§fSuporte o peso, fortaleça o corpo e prove sua determinação!
O fogo da juventude decidirá seu limite!

§aInformaçoes das missoes.
§fTempo de uso do pesos. [ §e${pergminho} §f] 

§c[!] §etempo total e de 10 minutos.
§c[!] §ese retirar o pesso o tempo ira Reniciar, 

` 


  : 


`§fNão temos a permissão para transmitir nossos §etreinamentos secretos§f a alguém de fora da aldeia!

Se deseja trilhar o caminho do verdadeiro poder da juventude,
torne-se um §eninja de Konoha!

§c[!] §eFale diretamente com a Hokage — ela o aguarda na §aResidência do Hokage!
`;

  const corBotao1 = hasTag ? "§aComeçar Treino" : "§eIrei Falar Com Hokage";
  const corBotao2 = hasTag ? "§eVoltar" : "§cVoltar Depois";
  const corBotao3 = hasTag ? "§eFinalizar Treino" : "";

  const form = new ActionFormData();
  form.title("ui.npc_guy.title");
  form.body(
    `${conversa}`
  );

  form.button(`§l${corBotao1}`);
  form.button(`§l${corBotao2}`);
  form.button(`§l${corBotao3}`);



  form.show(player).then((response) => {

    switch (response.selection) {

case 0:
player.runCommand('/execute as @s[tag=ninja_konoha,tag=portao_1] run tellraw @s {"rawtext":[{"text":"§a[Might Guy] §eSeu treinamento Ja Foi Comcluido"}]}');
player.runCommand('/execute as @s[tag=ninja_konoha,tag=!portao_1] run tellraw @s {"rawtext":[{"text":"§a[Might Guy] §eentão você finalmente decidiu Começar o treinamento."}]}');
player.runCommand('/execute as @s[tag=ninja_konoha,tag=!portao_1] run tellraw @s {"rawtext":[{"text":"§c[!] §eIrei te Entregar os Pesos."}]}');
player.runCommand('/give @s[tag=ninja_konoha,tag=!portao_1] tnt:pesos');
break;

case 1:
break;

case 2:
player.runCommand('/execute as @s[tag=ninja_konoha,tag=treino_pesos,scores={pesos_guy=0..10}] run tag @s remove portao_1_lock');
player.runCommand('execute as @s[tag=ninja_konoha,tag=treino_pesos,scores={pesos_guy=0..10}] run tag @s add portao_1');
player.runCommand('/execute as @s[tag=ninja_konoha,tag=portao_1] run clear @s tnt:pesos 0 1');
player.runCommand('/execute as @s[tag=ninja_konoha,tag=portao_1] run tellraw @s {"rawtext":[{"text":"§a[Might Guy] §aParabens, §ePrimeiro Portao Desbloqueado"}]}');
player.runCommand('/execute as @s[tag=ninja_konoha,tag=!portao_1] run tellraw @s {"rawtext":[{"text":"§a[Might Guy] §eTermina o Treinamento Para Aprender os Oito Portoes"}]}');
break;

    }

  });
}
