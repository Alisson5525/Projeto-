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
  if (data.itemStack.typeId === "tnt:menu_modos_uchiha") {
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
  form.title("ui.menu_modo_uchiha.title");

  const textos = [
    criarTexto("sharingan", "Sharingan","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","sharingan"),
    criarTexto("mgk_itachi", "Mangekyou Itachi","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","mangekyou itachi"),
    criarTexto("mgk_sasuke", "Mangekyou Sasuke","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","mangekyou sasuke"),
    criarTexto("mgk_obito", "Mangekyou Obito","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","mangekyou obito"),
    criarTexto("susanoo_it_1", "Susanoo Itachi forma 1","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo itachi forma 1"),
    criarTexto("susanoo_it_2", "Susanoo Itachi forma 2","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo itachi forma 2"),
    criarTexto("susanoo_sk_1", "Susanoo Sasuke forma 1","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo sasuke forma 1"),
    criarTexto("susanoo_sk_2", "Susanoo Sasuke forma 2","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo sasuke forma 2"),
    criarTexto("susanoo_ob_1", "Susanoo Obito forma 1","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo obito forma 1"),
    criarTexto("susanoo_ob_2", "Susanoo Obito forma 2","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","susanoo obito forma 2"),
    criarTexto("rinnegan", "Rinnegan","Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.","rinnegan"),

    criarTextod("all_desativar_mds", "Desativar Modo"),



  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (!player.hasTag("modo_ativado") && !player.hasTag("sh_cooldown") && player.hasTag("sharingan")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:sharingan');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;

case 1:
if (!player.hasTag("modo_ativado") && !player.hasTag("mgk_cooldown") && player.hasTag("mgk_itachi")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:mgk_itachi');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break;

case 2:
if (!player.hasTag("modo_ativado") && !player.hasTag("mgk_cooldown") && player.hasTag("mgk_sasuke")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:mgk_sasuke');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

case 3:
if (!player.hasTag("modo_ativado") && !player.hasTag("mgk_cooldown") && player.hasTag("mgk_obito")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:mgk_obito');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

//susanoo itachi
case 4:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_it_1")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_itachi_f1');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

case 5:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_it_2")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_itachi_f2');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

//susanoo sasuke
case 6:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_sk_1")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_sasuke_f1');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

case 7:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_sk_2")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_sasuke_f2');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

//susanoo sasuke
case 8:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_ob_1")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_obito_f1');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

case 9:
if (!player.hasTag("modo_ativado") && !player.hasTag("susanoo_cooldown") && player.hasTag("susanoo_ob_2")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:susano_obito_f2');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 

case 10:
if (!player.hasTag("modo_ativado") && !player.hasTag("rinnegan_cooldown") && player.hasTag("rinnegan")) {
player.runCommand('/event entity @s desativar_slot_1');
runTimeoutSeguro(() => {
player.runCommand('/event entity @s uchiha:rinnegan');
}, 3);
runTimeoutSeguro(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
} else { avisoModo(player); }
break; 



case 11:
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
