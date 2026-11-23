//import
import { world, system } from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

//itemUse
world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  switch (data.itemStack.typeId) {
        case "tnt:escolha_clan":
          runTimeoutSeguro(() => {
            menu_clan(player);
          }, 1);
          break;
  }
});

//creation

export function menu_clan(player) {
  const form = new ActionFormData();
  form.title("ui.menu_clan.title");
  form.button("");
  form.button("");



  form.show(player).then((response) => {
    switch (response.selection) {

      case 0:
player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVoce Se Tornou Do Clan §eUchiha"}]}');
player.runCommand('/tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §aVocê tem um VIP para resgatar! §eUse o Pergaminho Inicial."}]}');
player.runCommand('/replaceitem entity @s[tag=vip_storm] slot.hotbar 4 tnt:pergaminho_inicial 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
player.runCommand('/scoreboard players set @s clans 0');
player.runCommand('/clear @s tnt:escolha_clan');
        break;
       case 1:
player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVoce Se Tornou Do Clan §eHyuga"}]}');
player.runCommand('/tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §aVocê tem um VIP para resgatar! §eUse o Pergaminho Inicial."}]}');
player.runCommand('/replaceitem entity @s[tag=vip_storm] slot.hotbar 4 tnt:pergaminho_inicial 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
player.runCommand('/scoreboard players set @s clans 1');
player.runCommand('/clear @s tnt:escolha_clan');
        break; 
        
    }
  });
}