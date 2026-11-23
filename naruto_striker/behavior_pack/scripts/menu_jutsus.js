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
  if (data.itemStack.typeId === "tnt:menu_jutsus_evoluir") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    runTimeoutSeguro(() => {
      menu_jutsus(player);
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

function criarTexto(tag, cor, namejutsu2, cor2, namejutsu, chakra, combo, custo, itemname2) {
  return player => {
    const score_tp = getScore(player, "tp");
    return !player.hasTag(tag)
      ? `§0Lock
§${cor}Estilo ${namejutsu2}.
§${cor2}${namejutsu} 

§fInformaçoes
§7Gasto de Chakra: §a${chakra} 

§7Combos: ${combo} 

§fComplete os requisitos.
§7necessário:§7 §e${custo}.Tp

§7Seu Tp atual: §e${score_tp}
`
  : `§${cor}${itemname2}`;
  }
}


export function menu_jutsus(player) {
  const form = new ActionFormData();
  form.title("ui.menu_jutsus.title");

  const textos = [

    criarTexto("jutsu_r_chidori", "b", "Raio", "e", "Chidori", "50", "§cnao", 400, "Estilo Raio.\n§eChidori"),
    criarTexto("jutsu_r_chidori_negro", "b", "Raio", "e", "Chidori Negro", "70", "§cnao", 800, "Estilo Raio.\n§eChidori"),
    criarTexto("jutsu_r_chidori_nagashin", "b", "Raio", "e", "Chidori Nagashin", "70", "§cnao", 900, "Estilo Raio.\n§eChidori"),
    criarTexto("jutsu_r_chidori_raikiri", "b", "Raio", "e", "Chidori Raikiri", "80", "§cnao", 1000, "Estilo Raio.\n§eChidori"),
    criarTexto("jutsu_r_shiden", "b", "Raio", "e", "Shiden", "80", "§aSim", 1500, "Estilo Raio.\n§eChidori"),

    criarTexto("jutsu_a_lamina", "9", "Agua", "e", "Lamina De Agua", "70", "§cnao", 300, "Estilo Agua.\n§eLamina De Agua"),
    criarTexto("jutsu_a_onda_choque", "9", "Agua", "e", "Grande Onda De Choque", "60", "Absover Chakra", 1000, "Estilo Agua.\n§eGrande Onda De Choque"),
    criarTexto("jutsu_a_prisao_agua", "9", "Agua", "e", "Prisao De Aagua", "125", "§cnao", 1500, "Estilo Agua.\n§ePrisao De Aagua"),
    criarTexto("jutsu_a_saudacao", "9", "Agua", "e", "Saudacao De Agua", "70", "§cnao", 450, "Estilo Agua.\n§eSaudacao De Agua"),
    criarTexto("jutsu_a_tubarao", "9", "Agua", "e", "Tubarao Triplo", "70", "§cnao", 1700, "Estilo Agua.\n§eTubarao Triplo"),

    criarTexto("jutsu_t_disparos_terra", "6", "terra", "e", "Disparos De Terra", "60", "§cnao", 600, "Estilo Terra.\n§eDisparos De Terra"),
    criarTexto("jutsu_t_toupeira", "6", "terra", "e", "Esconderijo Da Toupeira", "60", "§cnao", 250, "Estilo Terra.\n§eEsconderijo Da Toupeira"),
    criarTexto("jutsu_t_punho", "6", "terra", "e", "Punho De Terra", "90", "§cnao", 300, "Estilo Terra.\n§ePunho De Terra"),
    criarTexto("jutsu_t_prisao", "6", "terra", "e", "Prisao De Terra", "125", "§cnao", 600, "Estilo Terra.\n§ePrisao De Terra"),
    criarTexto("jutsu_t_sanduiche", "6", "terra", "e", "Terra Sanduiche", "200", "§cnao", 1200, "Estilo Terra.\n§eTerra Sanduiche"),

    criarTexto("jutsu_f_bola_fogo", "c", "fogo", "e", "Bola de Fogo", "90", "§cnao", 500, "Estilo Fogo.\n§eBola de Fogo"),
    criarTexto("jutsu_f_esfera_fogo", "c", "fogo", "e", "Esfera de Fogo", "60", "§cnao", 300, "Estilo Fogo.\n§eEsfera de Fogo"),
    criarTexto("jutsu_f_aniquilacao_fogo", "c", "fogo", "e", "Aniquilacao de Fogo", "200", "§cnao", 1700, "Estilo Fogo.\n§eAniquilacao de Fogo"),

    criarTexto("jutsu_v_esfera_vento", "7", "vento", "e", "Esferas de Vento", "50", "§cnao", 200, "Estilo Vento.\n§eEsferas de Vento"),
    criarTexto("jutsu_v_rasen_shuriken", "7", "vento", "e", "Rasen Shuriken", "125", "§cnao", 1200, "Estilo Vento.\n§eRasen Shuriken"),



  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {

case 0:
if (!player.hasTag("jutsu_r_chidori")) {
player.runCommandAsync('/execute as @s[scores={tp=0..399}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 400. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=400..}] run give @s tnt:chidori')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=400..}] run scoreboard players remove @s tp 400')?.catch?.(() => {});
}break;

case 1:
if (!player.hasTag("jutsu_r_chidori_negro")) {
player.runCommandAsync('/execute as @s[scores={tp=0..799}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 800. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=800..}] run give @s tnt:chidori_negro')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=800..}] run scoreboard players remove @s tp 800')?.catch?.(() => {});
}break;

case 2:
if (!player.hasTag("jutsu_r_chidori_nagashin")) {
player.runCommandAsync('/execute as @s[scores={tp=0..899}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 900. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=900..}] run give @s tnt:chidori_nagashi')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=900..}] run scoreboard players remove @s tp 900')?.catch?.(() => {});
}break;

case 3:
if (!player.hasTag("jutsu_r_chidori_raikiri")) {
player.runCommandAsync('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1000..}] run give @s tnt:raikiri')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000')?.catch?.(() => {});
}break;

case 4:
if (!player.hasTag("jutsu_r_shiden")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1500. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1500..}] run give @s tnt:shiden')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1500..}] run scoreboard players remove @s tp 1500')?.catch?.(() => {});
}break;





case 5:
if (!player.hasTag("jutsu_a_lamina")) {
player.runCommandAsync('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run give @s tnt:corte_de_agua')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300')?.catch?.(() => {});
}break;

case 6:
if (!player.hasTag("jutsu_a_onda_choque")) {
player.runCommandAsync('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1000..}] run give @s tnt:grande_onda_choque_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000')?.catch?.(() => {});
}break;

case 7:
if (!player.hasTag("jutsu_a_prisao_agua")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1500. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1500..}] run give @s tnt:prisao_agua_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1500..}] run scoreboard players remove @s tp 1500')?.catch?.(() => {});
}break;

case 8:
if (!player.hasTag("jutsu_a_saudacao")) {
player.runCommandAsync('/execute as @s[scores={tp=0..449}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 450. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=450..}] run give @s tnt:saudacao_agua_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=450..}] run scoreboard players remove @s tp 450')?.catch?.(() => {});
}break;

case 9:
if (!player.hasTag("jutsu_a_tubarao")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1699}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1700. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1700..}] run give @s tnt:tubarao_triplo')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1700..}] run scoreboard players remove @s tp 1700')?.catch?.(() => {});
}break;





case 10:
if (!player.hasTag("jutsu_t_disparos_terra")) {
player.runCommandAsync('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=600..}] run give @s tnt:disparos_terra')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600')?.catch?.(() => {});
}break;

case 11:
if (!player.hasTag("jutsu_t_toupeira")) {
player.runCommandAsync('/execute as @s[scores={tp=0..249}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 250. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=250..}] run give @s tnt:esconderijo_toupeira')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=250..}] run scoreboard players remove @s tp 250')?.catch?.(() => {});
}break;

case 12:
if (!player.hasTag("jutsu_t_punho")) {
player.runCommandAsync('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run give @s tnt:mao_terra')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300')?.catch?.(() => {});
}break;

case 13:
if (!player.hasTag("jutsu_t_prisao")) {
player.runCommandAsync('/execute as @s[scores={tp=0..799}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=600..}] run give @s tnt:prisao_terra_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600')?.catch?.(() => {});
}break;

case 14:
if (!player.hasTag("jutsu_t_sanduiche")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1199}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1200. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1200..}] run give @s tnt:terra_sanduiche_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1200..}] run scoreboard players remove @s tp 1200')?.catch?.(() => {});
}break;





case 15:
if (!player.hasTag("jutsu_f_bola_fogo")) {
player.runCommandAsync('/execute as @s[scores={tp=0..499}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 500. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=500..}] run give @s tnt:bola_fogo')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=500..}] run scoreboard players remove @s tp 500')?.catch?.(() => {});
}break;

case 16:
if (!player.hasTag("jutsu_f_esfera_fogo")) {
player.runCommandAsync('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run give @s tnt:bola_fogo_projetil_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300')?.catch?.(() => {});
}break;

case 17:
if (!player.hasTag("jutsu_f_aniquilacao_fogo")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1699}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1700. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1700..}] run give @s tnt:grande_aniquilacao_fogo')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1700..}] run scoreboard players remove @s tp 1700')?.catch?.(() => {});
}break;





case 18:
if (!player.hasTag("jutsu_v_esfera_vento")) {
player.runCommandAsync('/execute as @s[scores={tp=0..199}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 200. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=200..}] run give @s tnt:esfera_vacuo_')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=200..}] run scoreboard players remove @s tp 200')?.catch?.(() => {});
}break;

case 19:
if (!player.hasTag("jutsu_v_rasen_shuriken")) {
player.runCommandAsync('/execute as @s[scores={tp=0..1199}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1200. Tp"}]}')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1200..}] run give @s tnt:rasen_shuriken')?.catch?.(() => {});
player.runCommandAsync('/execute as @s[scores={tp=1200..}] run scoreboard players remove @s tp 1200')?.catch?.(() => {});
}break;







      }
    });
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
