import { world, system } from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

const cooldownSet = new Set();

world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  if (data.itemStack.typeId === "tnt:menu_status_evoluir") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    runTimeoutSeguro(() => {
      menu_status(player);
      cooldownSet.delete(player.name);
    }, 1);
  }
});
 function getScore(player, objetivo) {
  try {
    return world.scoreboard.getObjective(objetivo)?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}




function pergaminho(tag, nome, info, texto_2,) {
  return player => {
    return !player.hasTag(tag)
      ? `§0Lock 
§e${nome}

§fComplete os requisitos.
§7${texto_2}

§fInformaçoes.
§7${info}

`
  : `§aPergaminho Ninja Completo.

§fInformaçoes.
§7Você desbloqueou a capacidade\nde evoluir seu status!
`;
  }
}





function criarTexto(tag, nome, info, texto_2, texto_3, custo, itemname2) {
  return player => {
    const score_tp = getScore(player, "tp");
    return !player.hasTag(tag)
      ? `§0Lock 
§e${nome}

§fInformaçoes
§7${info}

§fComplete os requisitos.
§7${texto_2}

§7Necessário:§7 §e${custo}.Tp

§7Seu Tp atual: §e${score_tp}

§aBonus
§7${texto_3}

`
  : `§7${itemname2}`;
  }
}


export function menu_status(player) {
  const form = new ActionFormData();
  form.title("ui.menu_status.title." + Math.max(0, Math.min(10, Math.floor(getScore(player,"reset_all")))));

  const textos = [

    pergaminho("pergaminha_ninja_lock",   "Pergaminho Ninja.", "Liberar a árvore de status\npodendo aumentar o \n§bchakra\n§avida\n§cforça\n§dhabilidades.\n§7e podendo dar o §freset.",  "Faça a missão inicial,\npara desbloquear o status"),
    criarTexto("vida_status_1",   "Vida Nivel 1.", "+20 de Vida",  "Sem Requisitos", "Sem Bonus",  "300",  "§aVida Nivel 1."),
    criarTexto("vida_status_2",   "Vida Nivel 2.", "+20 de Vida",  "Sem Requisitos", "Sem Bonus",  "600",  "§aVida Nivel 2."),
    criarTexto("vida_status_3",   "Vida Nivel 3.", "+40 de Vida",  "Sem Requisitos", "Sem Bonus",  "1400",  "§aVida Nivel 3."),


    criarTexto("forca_status_1",   "Força Nivel 1.", "+3 de força",  "Sem Requisitos", "Sem Bonus",  "450",  "§aForça Nivel 1."),
    criarTexto("forca_status_2",   "Força Nivel 2.", "+6 de força",  "Sem Requisitos", "Sem Bonus",  "800",  "§aForça Nivel 2."),
    criarTexto("forca_status_3",   "Força Nivel 3.", "+9 de força",  "Sem Requisitos", "Sem Bonus",  "1700",  "§aForça Nivel 3."),


    criarTexto("chakra_status_1",   "Chakra Nivel 1.", "Agachar faz com que seu chakra\nse recarregue mais rápido.\n+10 de velocidade de\nrecarga de chakra",  "Sem Requisitos", "Sem Bonus",  "200",  "§aChakra Nivel 1."),
    criarTexto("chakra_status_2",   "Chakra Nivel 2.", "Capacidade aumentada:\n0/100 > 0/125",  "Sem Requisitos", "Sem Bonus",  "300",  "§aChakra Nivel 2."),
    criarTexto("chakra_status_3",   "Chakra Nivel 3.", "O fluxo do seu chakra se\nrenova por conta própria.",  "Sem Requisitos", "Sem Bonus",  "700",  "§aChakra Nivel 3."),





    criarTexto("all_status_dash",   "Dash Nivel 1.", "Pulo duplo ativa um dash\nna direção do olhar.",  "Sem Requisitos", "Sem Bonus",  "500",  "§aDash Nivel 1."),
    criarTexto("all_status_implantar_olho",   "Implantar Olho e Celulas.", "Permite a coleta de olhos\nApos Derrotar um Uchiha,\ne implantar celulas",  "Sem Requisitos", "Quando um Uchiha é derrotado,\no olho da entidade pode ser\ncoletado como recompensa.",  "500",  "§aImplantar Olho."),
    criarTexto("all_status_vida_regen",   "Regeneraçao Nivel 1.", "Concede regeneração após\no tempo do modo se encerrar.",  "Sem Requisitos", "Quando o modo chega ao fim,\no usuário recupera\n20 pontos de vida.",  "1300",  "§aRegeneraçao Nivel 1."),
    



    criarTexto("all_desativar_mds",   "Status Secreto.", "Poderar Desativar Os Modos\nQue Tiver Equipado .",  "Sem Requisitos", "Poder Desativar o Modo\na Qualquer Momento",  "3500",  "§aStatus Secreto."),
    criarTexto("all_regeneracao_v2",   "Regeneraçao Nivel 2.", "Concede regeneração\nde 4 coração a cada\n20s.",  "Sem Requisitos", "regeneração a cada 20s",  "2000",  "§aRegeneraçao Nivel 2."),

    criarTexto("chakra_status_4",   "Chakra Nivel 4.", "Capacidade aumentada:\n0/125 > 0/200",  "Requer chakra Nivel 3.", "Sem Bonus",  "1400",  "§aChakra Nivel 4."),

    criarTexto("vida_status_4",   "Vida Nivel 4.", "+200 de Vida",  "Requer vida Nivel 3.", "Sem Bonus",  "6000",  "§aVida Nivel 4."),

    criarTexto("chakra_status_5",   "Chakra Nivel 5.", "Capacidade aumentada:\n0/200 > 0/300",  "Requer chakra Nivel 4.", "O fluxo do seu chakra\nfoi aumentado para recaregar\n+15 de cahkra",  "2500",  "§aChakra Nivel 5."),

    criarTexto("skills_sword",   "Habilidades Espadas.", "Todas Espadas Tera skills Unicas",  "Sem Requisitos", "Novas Skill",  "4000",  "§aHabilidades Espadas."),

    criarTexto("deus_shinobi",   "Deus Shinobi.", "Sofrera Um Buff Nos Status",  "Sem Requisitos", "§21000 de Vida\n§c17 de Dano\n§bChakra 0/300 > 0/600\n§dEm falta de chakra, não sofrerá\nefeitos negativos.",  "16000",  "§dDeus Shinobi."),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {

case 0:
if (player.hasTag("pergaminha_ninja_miss")) {
player.runCommand('/tag @s add pergaminha_ninja_lock');
}
break;


case 1:
if (player.hasTag("pergaminha_ninja_lock") && !player.hasTag("vida_status_1")) {
player.runCommand('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=300..}] run function status/vida/vida_status_1');
player.runCommand('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300');
}
break;

case 2:
if (player.hasTag("vida_status_1") && !player.hasTag("vida_status_2")) {
player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=600..}] run function status/vida/vida_status_2');
player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

case 3:
if (player.hasTag("vida_status_2") && !player.hasTag("vida_status_3")) {
player.runCommand('/execute as @s[scores={tp=0..1299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1400. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1400..}] run function status/vida/vida_status_3');
player.runCommand('/execute as @s[scores={tp=1400..}] run scoreboard players remove @s tp 1400');
}
break;













case 4:
if (player.hasTag("pergaminha_ninja_lock") && !player.hasTag("forca_status_1")) {
player.runCommand('/execute as @s[scores={tp=0..449}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 450. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=450..}] run function status/forca/forca_status_1');
player.runCommand('/execute as @s[scores={tp=450..}] run scoreboard players remove @s tp 450');
}
break;

case 5:
if (player.hasTag("forca_status_1") && !player.hasTag("forca_status_2")) {
player.runCommand('/execute as @s[scores={tp=0..799}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 800. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=800..}] run function status/forca/forca_status_2');
player.runCommand('/execute as @s[scores={tp=800..}] run scoreboard players remove @s tp 800');
}
break;

case 6:
if (player.hasTag("forca_status_2") && !player.hasTag("forca_status_3")) {
player.runCommand('/execute as @s[scores={tp=0..1699}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1700. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1700..}] run function status/forca/forca_status_3');
player.runCommand('/execute as @s[scores={tp=1700..}] run scoreboard players remove @s tp 1700');
}
break;

















case 7:
if (player.hasTag("pergaminha_ninja_lock") && !player.hasTag("chakra_status_1")) {
player.runCommand('/execute as @s[scores={tp=0..199}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 200. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=200..}] run function status/chakra/chakra_status_1');
player.runCommand('/execute as @s[scores={tp=200..}] run scoreboard players remove @s tp 200');
}
break;


case 8:
if (player.hasTag("chakra_status_1") && !player.hasTag("chakra_status_2")) {
player.runCommand('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=300..}] run function status/chakra/chakra_status_2');
player.runCommand('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300');
}
break;

case 9:
if (player.hasTag("chakra_status_2") && !player.hasTag("chakra_status_3")) {
player.runCommand('/execute as @s[scores={tp=0..699}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 700. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=700..}] run function status/chakra/chakra_status_3');
player.runCommand('/execute as @s[scores={tp=700..}] run scoreboard players remove @s tp 700');
}
break;














case 10:
if (player.hasTag("pergaminha_ninja_lock") && !player.hasTag("all_status_dash")) {
player.runCommand('/execute as @s[scores={tp=0..499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 500. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=500..}] run tag @s add all_status_dash');
player.runCommand('/execute as @s[scores={tp=500..}] run scoreboard players remove @s tp 500');
}
break;








case 11:
if (player.hasTag("all_status_dash") && !player.hasTag("all_status_implantar_olho")) {
player.runCommand('/execute as @s[scores={tp=0..499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 500. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=500..}] run tag @s add all_status_implantar_olho');
player.runCommand('/execute as @s[scores={tp=500..}] run scoreboard players remove @s tp 500');
}
break;








case 12:
if (player.hasTag("all_status_implantar_olho") && !player.hasTag("all_status_vida_regen")) {
player.runCommand('/execute as @s[scores={tp=0..1299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1300. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1300..}] run tag @s add all_status_vida_regen');
player.runCommand('/execute as @s[scores={tp=1300..}] run scoreboard players remove @s tp 1300');
}
break;








case 13:
if (player.hasTag("chakra_status_3") && player.hasTag("all_status_vida_regen") && !player.hasTag("all_desativar_mds")) {
player.runCommand('/execute as @s[scores={tp=0..3499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 3500. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=3500..}] run tellraw @s {"rawtext":[{"text":"§c[!] §eNovo Botão disponível Nos Menu"}]}');
player.runCommand('/execute as @s[scores={tp=3500..}] run tag @s add all_desativar_mds');
player.runCommand('/execute as @s[scores={tp=3500..}] run scoreboard players remove @s tp 3500');
}
break;



case 14:
if (player.hasTag("vida_status_3") && player.hasTag("forca_status_3") && !player.hasTag("all_regeneracao_v2")) {
player.runCommand('/execute as @s[scores={tp=0..1999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 2000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=2000..}] run tag @s add all_regeneracao_v2');
player.runCommand('/execute as @s[scores={tp=2000..}] run scoreboard players remove @s tp 2000');
}
break;










case 15:
if (player.hasTag("all_regeneracao_v2") && player.hasTag("all_desativar_mds") && !player.hasTag("chakra_status_4")) {
player.runCommand('/execute as @s[scores={tp=0..1399}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1400. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1400..}] run function status/chakra/chakra_status_4');
player.runCommand('/execute as @s[scores={tp=1400..}] run scoreboard players remove @s tp 1400');
}
break;










case 16:
if (player.hasTag("chakra_status_4") && !player.hasTag("vida_status_4")) {
player.runCommand('/execute as @s[scores={tp=0..5999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 6000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=6000..}] run function status/vida/vida_status_4');
player.runCommand('/execute as @s[scores={tp=6000..}] run scoreboard players remove @s tp 6000');
}
break;








case 17:
if (player.hasTag("vida_status_4") && !player.hasTag("chakra_status_5")) {
player.runCommand('/execute as @s[scores={tp=0..2499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 2500. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=2500..}] run function status/chakra/chakra_status_5');
player.runCommand('/execute as @s[scores={tp=2500..}] run scoreboard players remove @s tp 2500');
}
break;








case 18:
if (player.hasTag("chakra_status_5") && !player.hasTag("skills_sword")) {
player.runCommand('/execute as @s[scores={tp=0..3999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 4000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=4000..}] run tag @s add skills_sword');
player.runCommand('/execute as @s[scores={tp=4000..}] run scoreboard players remove @s tp 4000');
}
break;








case 19:
if (player.hasTag("skills_sword") && !player.hasTag("deus_shinobi")) {
player.runCommand('/execute as @s[scores={tp=0..15999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 16000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=16000..}] run tellraw @s {"rawtext":[{"text":"§d[!] §aParabens Voce Se Tornou §eDeus Shinobi"}]}');
player.runCommand('/execute as @s[scores={tp=16000..}] run function status/deus_shinobi');
player.runCommand('/execute as @s[scores={tp=16000..}] run scoreboard players remove @s tp 16000');
}
break;
      }
    }).catch(() => {});
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
