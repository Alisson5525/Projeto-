// importações
import { world, system } from "@minecraft/server";
import { cmd } from "../lib/cmd.js";

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
  if (data.itemStack.typeId === "tnt:menu_modos_hyuga_evoluir") {
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
  form.title("ui.hyuga_modos_unlock.title");

  const textos = [
    criarTexto("byakugan_lock", "Byakugan", "", 100, "d", "Byakugan"),
    criarTexto("byakugan_evoluido_lock", "Byakugan evoluido", "", 300, "d", "Byakugan evoluido"),
    criarTexto("tenseigan_lock", "Tenseigan", "", 1000, "b", "Tenseigan"),
    criarTexto("tenseigan_manto_lock", "Manto tenseigan", "", 10000, "b", "Manto Tenseigan"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (player.hasTag("byakugan_lock")) {
cmd(player, '/execute as @s[scores={tp=0..99}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 100. Tp"}]}');
cmd(player, '/execute as @s[scores={tp=100..}] run tag @s add byakugan');
cmd(player, '/execute as @s[scores={tp=100..}] run tag @s remove byakugan_lock');
cmd(player, '/execute as @s[scores={tp=100..}] run scoreboard players remove @s tp 100');
}
break;

case 1:
if (!player.hasTag("byakugan_lock") && player.hasTag("byakugan_evoluido_lock")) {
cmd(player, '/execute as @s[scores={tp=0..299}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 300. Tp"}]}');
cmd(player, '/execute as @s[scores={tp=300..}] run tag @s add byakugan_evoluido');
cmd(player, '/execute as @s[scores={tp=300..}] run tag @s remove byakugan_evoluido_lock');
cmd(player, '/execute as @s[scores={tp=300..}] run scoreboard players remove @s tp 300');
}
break;

case 2:
if (!player.hasTag("byakugan_evoluido_lock") && !player.hasTag("byakugan_lock") && player.hasTag("tenseigan_lock")) {
cmd(player, '/execute as @s[scores={tp=0..999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 1000. Tp"}]}');
cmd(player, '/execute as @s[scores={tp=1000..}] run tag @s add tenseigan');
cmd(player, '/execute as @s[scores={tp=1000..}] run tag @s remove tenseigan_lock');
cmd(player, '/execute as @s[scores={tp=1000..}] run scoreboard players remove @s tp 1000');
}
break;

case 3:
if (!player.hasTag("tenseigan_lock") && !player.hasTag("byakugan_evoluido_lock") && !player.hasTag("byakugan_lock") && player.hasTag("tenseigan_manto_lock")) {
cmd(player, '/execute as @s[scores={tp=0..9999}] run tellraw @s {"rawtext":[{"text":"§c[!] §aRequer 10000. Tp"}]}');
cmd(player, '/execute as @s[scores={tp=10000..}] run tag @s add tenseigan_manto');
cmd(player, '/execute as @s[scores={tp=10000..}] run tag @s remove tenseigan_manto_lock');
cmd(player, '/execute as @s[scores={tp=10000..}] run scoreboard players remove @s tp 10000');
}
break;






























      }
    }).catch(() => {});
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
