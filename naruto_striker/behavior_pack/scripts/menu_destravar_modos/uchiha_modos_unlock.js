// importações
import { world, system } from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

// cooldown para evitar abrir o menu várias vezes rapidamente
const cooldownSet = new Set();

// ao usar item
world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  if (data.itemStack.typeId === "tnt:menu_modos_uchiha_evoluir") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    runTimeoutSeguro(() => {
      menu(player);
      cooldownSet.delete(player.name);
    }, 1);
  }
});
 
// função para gerar texto do botão com XP atual

 function getScore(player, objetivo) {
  try {
    return world.scoreboard.getObjective(objetivo)?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}

function criarTexto(tag, itemsname, requisito, valor, cor, itemsname2) {
  return player => {
    const score_tp = getScore(player, "tp");

    return player.hasTag(tag)
      ? `§0Lock 
§${cor}${itemsname}

§eComplete os requisitos para acessar.
§fRequisitos:§7
${requisito}

§fnecessário:§7 §e${valor}.Tp

§7Seu Tp atual: §e${score_tp}
`
:`§a${itemsname2}.
§fdisponível no menu all modos!`;


  }
}

// criação do menu
export function menu(player) {
  const form = new ActionFormData();
  form.title("ui.uchiha_modos_unlock.title");

  const textos = [
    criarTexto("sharingan_lock", "Sharingan", "", 50, "4", "Sharingan"),
    criarTexto("mgk_itachi_lock", "Mangekyou Itachi", "Requer o Sharingan", 300, "4", "Mangekyou Itachi"),
    criarTexto("mgk_sasuke_lock", "Mangekyou Sasuke", "Requer o Sharingan", 300, "4", "Mangekyou Sasuke"),
    criarTexto("mgk_obito_lock", "Mangekyou Obito", "Requer o Sharingan", 350, "4", "Mangekyou Obito"),

    criarTexto("susanoo_it_1_lock", "Susanoo Itachi forma 1", "Requer o Mangekyou Itachi", 600, "6", "Susanoo Itachi forma 1"),
    criarTexto("susanoo_it_2_lock", "Susanoo Itachi forma 2", "Requer o Susanoo Itachi forma 1", 1000, "6", "Susanoo Itachi forma 2"),
    criarTexto("susanoo_sk_1_lock", "Susanoo Sasuke forma 1", "Requer o Mangekyou Sasuke", 600, "d", "Susanoo Sasuke forma 1"),
    criarTexto("susanoo_sk_2_lock", "Susanoo Sasuke forma 2", "Requer o Susanoo Sasuke forma 1", 1000, "d", "Susanoo Sasuke forma 2"),
    criarTexto("susanoo_ob_1_lock", "Susanoo Obito forma 1", "Requer o Mangekyou Obito", 600, "b", "Susanoo Obito forma 1"),
    criarTexto("susanoo_ob_2_lock", "Susanoo Obito forma 2", "Requer o Susanoo Obito forma 1", 1000, "b", "Susanoo Obito forma 2"),

    criarTexto("rinnegan_lock", "Rinnegan", "Requer DNA Evoluido Hashirama", 7500, "d", "Rinnegan"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (player.hasTag("sharingan_lock")) {
player.runCommand('/execute as @s[scores={tp=0..49}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 50. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=50..}] run tag @s add sharingan');
player.runCommand('/execute as @s[scores={tp=50..}] run tag @s remove sharingan_lock');
player.runCommand('/execute as @s[scores={tp=50..}] run scoreboard players remove @s tp 50');
}
break;

case 1:
if (player.hasTag("mgk_obito_lock") && player.hasTag("mgk_sasuke_lock") && !player.hasTag("sharingan_lock") && player.hasTag("mgk_itachi_lock")) {
player.runCommand('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=300..}] run tag @s add mgk_itachi');
player.runCommand('/execute as @s[scores={tp=300..}] run tag @s remove mgk_itachi_lock');
player.runCommand('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300');
}
break;

case 2:
if (player.hasTag("mgk_obito_lock") && player.hasTag("mgk_itachi_lock") && !player.hasTag("sharingan_lock") && player.hasTag("mgk_sasuke_lock")) {
player.runCommand('/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=300..}] run tag @s add mgk_sasuke');
player.runCommand('/execute as @s[scores={tp=300..}] run tag @s remove mgk_sasuke_lock');
player.runCommand('/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300');
}
break;

case 3:
if (player.hasTag("mgk_sasuke_lock") && player.hasTag("mgk_itachi_lock") && !player.hasTag("sharingan_lock") && player.hasTag("mgk_obito_lock")) {
player.runCommand('/execute as @s[scores={tp=0..349}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 350. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=350..}]  run tag @s add mgk_obito');
player.runCommand('/execute as @s[scores={tp=350..}]  run tag @s remove mgk_obito_lock');
player.runCommand('/execute as @s[scores={tp=350..}] run scoreboard players remove @s tp 350');
}
break;










//susanoo itachi
case 4:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_itachi_lock") && player.hasTag("susanoo_it_1_lock")) {
player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s add susanoo_it_1');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s remove susanoo_it_1_lock');
player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

case 5:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_itachi_lock") && !player.hasTag("susanoo_it_1_lock") && player.hasTag("susanoo_it_2_lock")) {
player.runCommand('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s add susanoo_it_2');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s remove susanoo_it_2_lock');
player.runCommand('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000');
}
break;


//susanoo sasuke
case 6:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_sasuke_lock") && player.hasTag("susanoo_sk_1_lock")) {
player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s add susanoo_sk_1');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s remove susanoo_sk_1_lock');
player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

case 7:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_sasuke_lock") && !player.hasTag("susanoo_sk_1_lock") && player.hasTag("susanoo_sk_2_lock")) {
player.runCommand('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s add susanoo_sk_2');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s remove susanoo_sk_2_lock');
player.runCommand('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000');
}
break;





//susanoo obito
case 8:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_obito_lock") && player.hasTag("susanoo_ob_1_lock")) {
player.runCommand('/execute as @s[scores={tp=0..599}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 600. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s add susanoo_ob_1');
player.runCommand('/execute as @s[scores={tp=600..}] run tag @s remove susanoo_ob_1_lock');
player.runCommand('/execute as @s[scores={tp=600..}] run scoreboard players remove @s tp 600');
}
break;

case 9:
if (!player.hasTag("sharingan_lock") && !player.hasTag("mgk_obito_lock") && !player.hasTag("susanoo_ob_1_lock") && player.hasTag("susanoo_ob_2_lock")) {
player.runCommand('/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s add susanoo_ob_2');
player.runCommand('/execute as @s[scores={tp=1000..}] run tag @s remove susanoo_ob_2_lock');
player.runCommand('/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000');
}
break;


case 10:
if (player.hasTag("rinnegan_lock")) {
player.runCommand('/execute as @s[scores={tp=0..7499},tag=dna_hashirama_v2] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 7500. Tp"}]}');
player.runCommand('/execute as @s[tag=!dna_hashirama_v2] run tellraw @s {"rawtext":[{"text":"§c[!] §aPrecisa da celula hashirama"}]}');
player.runCommand('/execute as @s[scores={tp=7500..},tag=dna_hashirama_v2] run tag @s add rinnegan');
player.runCommand('/execute as @s[scores={tp=7500..},tag=dna_hashirama_v2] run tag @s remove rinnegan_lock');
player.runCommand('/execute as @s[scores={tp=1000..},tag=dna_hashirama_v2] run scoreboard players remove @s tp 7500');
}
break;























      }
    }).catch(() => {});
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
