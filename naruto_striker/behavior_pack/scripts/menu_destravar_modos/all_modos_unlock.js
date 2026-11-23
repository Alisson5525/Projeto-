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
  if (data.itemStack.typeId === "tnt:menu_all_modos_evoluir") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    runTimeoutSeguro(() => {
      menu_all_modos(player);
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

function criarTextobiju(tag, cor, itemsname, requisito, valor,  itemsname2) {
  return player => {
    const score_tp = getScore(player, "tp");

    return player.hasTag(tag)
      ? `§0Lock 
§${cor}${itemsname}

§bComplete os requisitos para acessar.
§fRequisitos:§7
${requisito}

§fnecessário:§7 §e${valor}.Tp

§7Seu Tp atual: §e${score_tp}
`
:`§a${itemsname2}.
§fdisponível no menu all modos!`;


  }
}

function criarTextobiju_1(tag, cor, itemsname, requisito,  itemsname2) {
  return player => {

    return player.hasTag(tag)
      ? `§0Lock 
§${cor}${itemsname}

§bComplete os requisitos para acessar.

§fRequisitos:§7
${requisito}

`
:`§a${itemsname2}.
§fdisponível no menu all modos!`;


  }
}



function criarTexto(tag, cor, itemsname, requisito, valor,  itemsname2) {
  return player => {
    const score_tp = getScore(player, "tp");

    return player.hasTag(tag)
      ? `§0Lock 
§${cor}${itemsname}

§bComplete os requisitos para acessar.
§fRequisitos:§7
${requisito}

§fnecessário:§7 §e${valor}.Tp

§7Seu Tp atual: §e${score_tp}
`
:`§a${itemsname2}.
§fdisponível no menu all modos!`;


  }
}

function criarTexto_marca(tag, cor, itemsname, requisito,  itemsname2) {
  return player => {

    return player.hasTag(tag)
      ? `§0Lock 
§${cor}${itemsname}

§bComplete os requisitos para acessar.
§fRequisitos:§7
${requisito}
`
:`§a${itemsname2}.
§fdisponível no menu all modos!`;


  }
}





function criarTexto2(tag) {
  return player => {

    return player.hasTag(tag)
      ? ``
:``;


  }
}


export function menu_all_modos(player) {
  const form = new ActionFormData();
  form.title("ui.all_modos_unlock.title");

  const textos = [
    criarTexto2("a"),
    criarTexto2("a"),

    criarTexto_marca("marca_v1_lock", "d", "Marca Da Maldiçao", "Requer Treinamento Com orochimaru", "marca da maldiçao"),
    criarTexto("marca_v2_lock", "d", "Marca Da Maldiçao v2", "Requer a Marca Da Maldiçao", "700", "marca da maldiçao"),
    criarTexto("marca_v3_lock", "d", "Marca Da Maldiçao v3", "Requer a Marca Da Maldiçao v2", "1200", "marca da maldiçao"),

    criarTexto("sennin_sapo_v1_lock", "e", "Modo Sennin Sapo Incompleto", "Requer pontos de status\n§eVida Nível 3,\nForça Nível 3,\nChakra Nível 3", "900", "sennin do sapos incompleto"),
    criarTexto("sennin_sapo_v2_lock", "e", "Modo Sennin Sapo Completo", "Requer sennin dos sapos incompleto", "1500", "sennin do sapos completo"),

    criarTexto_marca("portao_1_lock", "a", "Primeiro Portao", "Requer Treinamento Com Guy", "Primeiro Portao"),
    criarTexto("portao_2_lock", "a", "Segundo Portao", "Primeiro Portao", "400", "segundo portao"),
    criarTexto("portao_3_lock", "a", "Terceiro Portao", "Segundo Portao", "600", "terceiro portao"),
    criarTexto("portao_4_lock", "a", "Quarto Portao", "Terceiro Portao", "700", "quarto portao"),
    criarTexto("portao_5_lock", "a", "Quinto Portao", "Quarto Portao", "900", "quinto portao"),
    criarTexto("portao_6_lock", "a", "Sexto Portao", "Quinto Portao", "1500", "sexto portao"),
    criarTexto("portao_7_lock", "b", "Setimo Portao", "Sexto Portao", "2500", "setimo portao"),
    criarTexto("portao_8_lock", "c", "Oitavo Portao", "Setimo Portao", "9500", "oitavo portao"),

    criarTexto("dna_hashirama_sh_lock", "a", "Dna Hashirama braço", "Requer celulas do Hashirama\n7 Sharingans\n\n§bBeneficios.\n§e+50 De Vida", "800", "Dna Hashirama braço"),
    criarTexto_marca("byakugou_lock", "d", "Selo Byakugou", "Requer Treinamento Com tsunade", "Selo Byakugou"),

    criarTexto("rinnegan_2_lock", "d", "Rinnegan Esquerdo", "Requer DNA Evoluido Hashirama", "6000", "Rinnegan"),

    criarTexto("modo_suigetsu_lock", "d", "Estilo liquido suigetsu", "sem requisitos", "600", "Estilo liquido suigetsu"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (player.hasTag("")) {
}
menu_all_modos(player);
break;

case 1:
if (player.hasTag("")) {
}
bijus_modos(player);
break;


case 2:
if (player.hasTag("marca_v1_lock")) {
player.runCommand('/execute as @s run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer Treinamento Com Orochimaru"}]}');
}
break;

case 3:
if (player.hasTag("marca_v2_lock") && !player.hasTag("marca_v1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..699}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a700. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s add marca_v2');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s remove marca_v2_lock');
            player.runCommand('/execute as @s[scores={tp=700..}] run scoreboard players remove @s tp 700');
}
break;

case 4:
if (player.hasTag("marca_v3_lock") && !player.hasTag("marca_v1_lock") && !player.hasTag("marca_v2_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..1199}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a1200. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=1200..}] run tag @s add marca_v3');
            player.runCommand('/execute as @s[scores={tp=1200..}] run tag @s remove marca_v3_lock');
            player.runCommand('/execute as @s[scores={tp=1200..}] run scoreboard players remove @s tp 1200');
}
break;




case 5:
if (player.hasTag("sennin_sapo_v1_lock") && player.hasTag("forca_status_3") && player.hasTag("vida_status_3") && player.hasTag("chakra_status_3")) {
            player.runCommand('/execute as @s[scores={tp=0..899}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a900. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=900..}] run tag @s add sennin_sapo_v1');
            player.runCommand('/execute as @s[scores={tp=900..}] run tag @s remove sennin_sapo_v1_lock');
            player.runCommand('/execute as @s[scores={tp=900..}] run scoreboard players remove @s tp 900');
}
break;

case 6:
if (player.hasTag("sennin_sapo_v2_lock") && !player.hasTag("sennin_sapo_v1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..1499}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a1500. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=1500..}] run tag @s add sennin_sapo_v2');
            player.runCommand('/execute as @s[scores={tp=1500..}] run tag @s remove sennin_sapo_v2_lock');
            player.runCommand('/execute as @s[scores={tp=1500..}] run scoreboard players remove @s tp 1500');
}
break;




case 7:
if (player.hasTag("portao_1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..149}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer Treinamento Com guy"}]}');
            player.runCommand('/execute as @s[scores={tp=150..}] run tag @s add portao_1');
            player.runCommand('/execute as @s[scores={tp=150..}] run tag @s remove portao_1_lock');
            player.runCommand('/execute as @s[scores={tp=150..}] run scoreboard players remove @s tp 150');
}
break;

case 8:
if (player.hasTag("portao_2_lock") && !player.hasTag("portao_1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..399}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a400. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=400..}] run tag @s add portao_2');
            player.runCommand('/execute as @s[scores={tp=400..}] run tag @s remove portao_2_lock');
            player.runCommand('/execute as @s[scores={tp=400..}] run scoreboard players remove @s tp 400');
}
break;

case 9:
if (player.hasTag("portao_3_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a600. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=600..}] run tag @s add portao_3');
            player.runCommand('/execute as @s[scores={tp=600..}] run tag @s remove portao_3_lock');
            player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

case 10:
if (player.hasTag("portao_4_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock") && !player.hasTag("portao_3_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..699}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a700. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s add portao_4');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s remove portao_4_lock');
            player.runCommand('/execute as @s[scores={tp=700..}] run scoreboard players remove @s tp 700');
}
break;

case 11:
if (player.hasTag("portao_5_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock") && !player.hasTag("portao_3_lock") && !player.hasTag("portao_4_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..899}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a900. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=900..}] run tag @s add portao_5');
            player.runCommand('/execute as @s[scores={tp=900..}] run tag @s remove portao_5_lock');
            player.runCommand('/execute as @s[scores={tp=900..}] run scoreboard players remove @s tp 900');
}
break;

case 12:
if (player.hasTag("portao_6_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock") && !player.hasTag("portao_3_lock") && !player.hasTag("portao_4_lock") && !player.hasTag("portao_5_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..1499}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a1500. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=1500..}] run tag @s add portao_6');
            player.runCommand('/execute as @s[scores={tp=1500..}] run tag @s remove portao_6_lock');
            player.runCommand('/execute as @s[scores={tp=1500..}] run scoreboard players remove @s tp 1500');
}
break;

case 13:
if (player.hasTag("portao_7_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock") && !player.hasTag("portao_3_lock") && !player.hasTag("portao_4_lock") && !player.hasTag("portao_5_lock") && !player.hasTag("portao_6_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..2499}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a2500. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=2500..}] run tag @s add portao_7');
            player.runCommand('/execute as @s[scores={tp=2500..}] run tag @s remove portao_7_lock');
            player.runCommand('/execute as @s[scores={tp=2500..}] run scoreboard players remove @s tp 2500');
}
break;

case 14:
if (player.hasTag("portao_8_lock") && !player.hasTag("portao_1_lock") && !player.hasTag("portao_2_lock") && !player.hasTag("portao_3_lock") && !player.hasTag("portao_4_lock") && !player.hasTag("portao_5_lock") && !player.hasTag("portao_6_lock") && !player.hasTag("portao_7_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..9499}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a9500. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=9500..}] run tag @s add portao_8');
            player.runCommand('/execute as @s[scores={tp=9500..}] run tag @s remove portao_8_lock');
            player.runCommand('/execute as @s[scores={tp=9500..}] run scoreboard players remove @s tp 9500');
}
break;




case 15:
if (player.hasTag("dna_hashirama_sh_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..799}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a800. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=800..}] run event entity @s celula:dna_hashirama');
            player.runCommand('/execute as @s[scores={tp=800..}] run scoreboard players add @s health_stats 50');
            player.runCommand('/execute as @s[scores={tp=800..}] run scoreboard players set @s isanagi 0');
            player.runCommand('/execute as @s[scores={tp=800..}] run tag @s add dna_hashirama_sh');
            player.runCommand('/execute as @s[scores={tp=800..}] run tag @s remove dna_hashirama_sh_lock');
            player.runCommand('/execute as @s[scores={tp=800..}] run scoreboard players remove @s tp 800');
}
break;




case 16:
if (player.hasTag("byakugou_lock")) {
}
break;




case 17:
if (player.hasTag("rinnegan_2_lock")) {
            player.runCommand('/execute as @s[tag=!dna_hashirama_v2] run tellraw @s {"rawtext":[{"text":"§c[!] §aPrecisa da celula hashirama"}]}');
            player.runCommand('/execute as @s[scores={tp=0..5999},tag=dna_hashirama_v2] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a6000. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=6000..},tag=dna_hashirama_v2] run tag @s add rinnegan_2');
            player.runCommand('/execute as @s[scores={tp=6000..},tag=dna_hashirama_v2] run tag @s remove rinnegan_2_lock');
            player.runCommand('/execute as @s[scores={tp=6000..},tag=dna_hashirama_v2] run scoreboard players remove @s tp 6000');
}
break;



case 18:
if (player.hasTag("modo_suigetsu_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a600. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=600..}] run tag @s add modo_suigetsu');
            player.runCommand('/execute as @s[scores={tp=600..}] run tag @s remove modo_suigetsu_lock');
            player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

      }
    });
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}












export function bijus_modos(player) {
  const form = new ActionFormData();
  form.title("ui.bijus_modos_unlock.title");

  const textos = [
    criarTexto2("a"),
    criarTexto2("a"),

    criarTextobiju_1("manto_kurama_1_lock", "c", "Manto de Chakra Kurama", "Requer Chakra da Kurama", "manto de chakra kurama"),
    criarTextobiju("manto_kurama_3_lock", "c", "Manto de Chakra Kurama 3 Caldas", "Requer Manto de Chakra Kurama", "1000", "manto de chakra kurama 3 caldas"),
    criarTextobiju("manto_kurama_4_lock", "c", "Manto de Chakra Kurama 4 Caldas", "Requer Manto de Chakra Kurama 3 Caldas", "3000", "manto de chakra kurama 4 caldas"),
    criarTextobiju("manto_kurama_6_lock", "c", "Manto de Chakra Kurama 6 Caldas", "Requer Manto de Chakra Kurama 4 Caldas", "4500", "manto de chakra kurama 6 caldas"),
    criarTextobiju("mk1_lock", "6", "Manto Kurama 1", "Requer Manto de Chakra Kurama 6 Caldas", "3000", "Manto Kurama 1"),
    criarTextobiju("mk2_lock", "6", "Manto Kurama 2", "Requer Manto Kurama 1", "8000", "Manto Kurama 2"),
    criarTextobiju("mk_barion_lock", "c", "Modo Barion Kurama", "Requer Manto Kurama 2\n§dVip Storm", "10000", "Modo Barion Kurama"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (player.hasTag("")) {
player.runCommand('');
}
menu_all_modos(player);
break;

case 1:
if (player.hasTag("")) {
player.runCommand('');
}
bijus_modos(player);
break;


case 2:
if (player.hasTag("manto_kurama_1_lock") && player.hasTag("jinchuuriki_kurama")) {
            player.runCommand('/execute as @s[scores={tp=0..699}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a700. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s add manto_kurama_1');
            player.runCommand('/execute as @s[scores={tp=700..}] run tag @s remove manto_kurama_1_lock');
            player.runCommand('/execute as @s[scores={tp=700..}] run scoreboard players remove @s tp 700');
}
break;



case 3:
if (player.hasTag("manto_kurama_3_lock") && !player.hasTag("manto_kurama_1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a1000. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s add manto_kurama_3');
            player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s remove manto_kurama_3_lock');
            player.runCommand('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000');
}
break;



case 4:
if (player.hasTag("manto_kurama_4_lock") && !player.hasTag("manto_kurama_3_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..2999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a3000. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=3000..}] run tag @s add manto_kurama_4');
            player.runCommand('/execute as @s[scores={tp=3000..}] run tag @s remove manto_kurama_4_lock');
            player.runCommand('/execute as @s[scores={tp=3000..}] run scoreboard players remove @s tp 3000');
}
break;



case 5:
if (player.hasTag("manto_kurama_6_lock") && !player.hasTag("manto_kurama_4_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..4399}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a4500. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=4500..}] run tag @s add manto_kurama_6');
            player.runCommand('/execute as @s[scores={tp=4500..}] run tag @s remove manto_kurama_6_lock');
            player.runCommand('/execute as @s[scores={tp=4500..}] run scoreboard players remove @s tp 4500');
}
break;



case 6:
if (player.hasTag("mk1_lock") && !player.hasTag("manto_kurama_6_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..2999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a3000. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=3000..}] run tag @s add mk1');
            player.runCommand('/execute as @s[scores={tp=3000..}] run tag @s remove mk1_lock');
            player.runCommand('/execute as @s[scores={tp=3000..}] run scoreboard players remove @s tp 3000');
}
break;



case 7:
if (player.hasTag("mk2_lock") && !player.hasTag("mk1_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..7999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a8000. Tp"}]}');
            player.runCommand('/execute as @s[scores={tp=8000..}] run tag @s add mk2');
            player.runCommand('/execute as @s[scores={tp=8000..}] run tag @s remove mk2_lock');
            player.runCommand('/execute as @s[scores={tp=8000..}] run scoreboard players remove @s tp 8000');
}
break;



case 8:
if (player.hasTag("mk_barion_lock") && !player.hasTag("mk2_lock")) {
            player.runCommand('/execute as @s[scores={tp=0..9999}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §a10000. Tp"}]}');
            player.runCommand('/execute as @s[tag=!vip_storm,scores={tp=10000..}] run tellraw @s {"rawtext":[{"text":"§o§c[!] §eRequer §dVip Storm"}]}');
            player.runCommand('/execute as @s[tag=vip_storm,scores={tp=10000..}] run tag @s add mk_barion');
            player.runCommand('/execute as @s[tag=vip_storm,scores={tp=10000..}] run tag @s remove mk_barion_lock');
            player.runCommand('/execute as @s[tag=vip_storm,scores={tp=10000..}] run scoreboard players remove @s tp 10000');
}
break;













      }
    });
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
