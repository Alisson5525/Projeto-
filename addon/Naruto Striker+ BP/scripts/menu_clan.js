//import
import { world, system } from "@minecraft/server";
import { cmd } from "./lib/cmd.js";

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
cmd(player, '/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê Se Tornou Do Clan §eUchiha"}]}');
cmd(player, '/tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §aVocê tem um VIP para resgatar! §eUse o Pergaminho Inicial."}]}');
cmd(player, '/replaceitem entity @s[tag=vip_storm] slot.hotbar 4 tnt:pergaminho_inicial 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
cmd(player, '/scoreboard players set @s clans 0');
cmd(player, '/clear @s tnt:escolha_clan');
        break;
       case 1:
cmd(player, '/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê Se Tornou Do Clan §eHyuga"}]}');
cmd(player, '/tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §aVocê tem um VIP para resgatar! §eUse o Pergaminho Inicial."}]}');
cmd(player, '/replaceitem entity @s[tag=vip_storm] slot.hotbar 4 tnt:pergaminho_inicial 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
cmd(player, '/scoreboard players set @s clans 1');
cmd(player, '/clear @s tnt:escolha_clan');
        break; 
        
    }
  }).catch(() => {});
}