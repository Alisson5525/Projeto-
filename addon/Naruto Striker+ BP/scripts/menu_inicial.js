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
        case "tnt:pergaminho_inicial":
          runTimeoutSeguro(() => {
            menu_inicial(player);
          }, 1);
          break;
  }
});

//creation

export function menu_inicial(player) {
  const form = new ActionFormData();
  form.title("ui.menu_inicial.title");

  form.button("§oPróximo");

  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
menu_inicial_pg2(player);
        break; 

    }
  }).catch(() => {});
}

export function menu_inicial_pg2(player) {
  const form = new ActionFormData();
  form.title("ui.menu_inicial_pg2.title");

  form.button("§oresgatar");

  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
cmd(player, 'tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §eVIP resgatado com sucesso!"}]}');
cmd(player, 'scoreboard players add @s[tag=vip_storm] tp 600');
cmd(player, 'give @s[tag=vip_storm] tnt:kunai_asuma');
cmd(player, 'scoreboard players add @s[tag=vip_storm] health_stats 20');
cmd(player, 'tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§c[!]§f: §dModo Especial: §eBarion Kurama"}]}');
cmd(player, 'clear @s tnt:pergaminho_inicial');
break; 

    }
  }).catch(() => {});
}