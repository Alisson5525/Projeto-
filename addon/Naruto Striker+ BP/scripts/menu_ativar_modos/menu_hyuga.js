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
  if (data.itemStack.typeId === "tnt:menu_modos_hyuga") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    runTimeoutSeguro(() => {
      menu(player);
      cooldownSet.delete(player.name);
    }, 1);
  }
});
 
// função para gerar texto do botão com XP atual
function criarTextod(tag, itemname) {
  return player => {
    return !player.hasTag(tag)
      ? `§0Lock `
  : `§a${itemname}`;
  }
}
function criarTexto(tag, itemname, texto1, texto2, texto3, itemname2) {
  return player => {
    return !player.hasTag(tag)
      ? `§0Lock 
§a${itemname} 
§7${texto1} 
${texto2} 
${texto3} 
`
  : `§a${itemname2}`;
  }
}

// criação do menu
export function menu(player) {
  const form = new ActionFormData();
  form.title("ui.menu_modo_hyuga.title");

  const textos = [
    criarTexto("byakugan", "Byakugan","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","byakugan"),
    criarTexto("byakugan_evoluido", "Byakugan evoluido","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","byakugan evoluido"),
    criarTexto("tenseigan", "Tenseigan","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","tenseigan"),
    criarTexto("tenseigan_manto", "Manto Tenseigan","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","manto tenseigan"),

    criarTextod("all_desativar_mds", "Desativar Modo"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (!player.hasTag("modo_ativado") && !player.hasTag("byakugan_cooldown") && player.hasTag("byakugan")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s hyuga:byakugan');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;

case 1:
if (!player.hasTag("modo_ativado") && !player.hasTag("byakugan_cooldown") && player.hasTag("byakugan_evoluido")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s hyuga:byakugan_evoluido');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;

case 2:
if (!player.hasTag("modo_ativado") && !player.hasTag("tenseigan_cooldown") && player.hasTag("tenseigan")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s hyuga:tenseigan');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;

case 3:
if (!player.hasTag("modo_ativado") && !player.hasTag("tenseigan_cooldown") && player.hasTag("tenseigan_manto")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s hyuga:tenseigan_manto');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;




case 4:
if (player.hasTag("all_desativar_mds")) {
player.runCommand('/tag @s remove modo_ativado');
player.runCommand('/function tag/tags_cooldown_slot_1');
player.runCommand('/event entity @s desativar_slot_1');
}
break;



      }
    }).catch(() => {});
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}


// Aviso quando o botao de modo nao pode ativar (antes: nada acontecia)
function avisoModo(player) {
  try {
    const ativo = player.hasTag("modo_ativado") || player.hasTag("modo_ativado_2");
    player.sendMessage(ativo
      ? "§c[!] §7Já existe um modo ativo. Espere ele terminar para ativar outro."
      : "§c[!] §7Modo bloqueado ou em recarga. Desbloqueie-o na Árvore de Modos.");
  } catch (e) {}
}
