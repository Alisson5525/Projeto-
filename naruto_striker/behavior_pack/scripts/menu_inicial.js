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

  form.button("§oProximo");

  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
menu_inicial_pg2(player);
        break; 

    }
  });
}

export function menu_inicial_pg2(player) {
  const form = new ActionFormData();
  form.title("ui.menu_inicial_pg2.title");

  form.button("§oresgatar");

  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
player.runCommand('tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§d[!]§f: §eVIP resgatado com sucesso!"}]}');
player.runCommand('scoreboard players add @s[tag=vip_storm] tp 600');
player.runCommand('give @s[tag=vip_storm] tnt:kunai_asuma');
player.runCommand('scoreboard players add @s[tag=vip_storm] health_stats 20');
player.runCommand('tellraw @s[tag=vip_storm] {"rawtext":[{"text":"§c[!]§f: §dModo Especial: §eBarion Kurama"}]}');
player.runCommand('clear @s tnt:pergaminho_inicial');
break; 

    }
  });
}