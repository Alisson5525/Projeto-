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
        case "tnt:menu_custon":
          runTimeoutSeguro(() => {
            menu_custon(player);
          }, 1);
          break;
  }
});

//creation

export function menu_custon(player) {
  const form = new ActionFormData();
  form.title("ui.menu_custon.title");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");



  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
player.runCommand('event entity @s cabelo:naruto');
menu_custon_cabelo_2(player);
        break; 

       case 1:
player.runCommand('event entity @s custon:masculino_claro');
menu_custon(player);
        break; 

       case 2:
player.runCommand('event entity @s custon:masculino_escuro');
menu_custon(player);
        break; 

       case 3:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person');
menu_custon(player);
        break; 

       case 4:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person_front');
menu_custon(player);
        break; 

       case 5:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_set 1 1 in_back');
player.runCommand('camera @s set minecraft:fixed_boom');
menu_custon(player);
        break; 

         case 6:
player.runCommand('replaceitem entity @s slot.hotbar 4 tnt:escolha_clan 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s clear');
        break; 
    }
  });
}

export function menu_custon_cabelo_2(player) {
  const form = new ActionFormData();
  form.title("ui.menu_custon.title");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");



  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
player.runCommand('event entity @s cabelo:sasuke');
menu_custon_cabelo_3(player);
        break; 

       case 1:
player.runCommand('event entity @s custon:masculino_claro');
menu_custon_cabelo_2(player);
        break; 

       case 2:
player.runCommand('event entity @s custon:masculino_escuro');
menu_custon_cabelo_2(player);
        break; 

       case 3:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person');
menu_custon_cabelo_2(player);
        break; 

       case 4:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person_front');
menu_custon_cabelo_2(player);
        break; 

       case 5:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_set 1 1 in_back');
player.runCommand('camera @s set minecraft:fixed_boom');
menu_custon_cabelo_2(player);
        break; 

         case 6:
player.runCommand('replaceitem entity @s slot.hotbar 4 tnt:escolha_clan 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s clear');
        break; 
    }
  });
}

export function menu_custon_cabelo_3(player) {
  const form = new ActionFormData();
  form.title("ui.menu_custon.title");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");
  form.button("");



  form.show(player).then((response) => {
    switch (response.selection) {


       case 0:
player.runCommand('event entity @s cabelo:madara');
menu_custon(player);
        break; 

       case 1:
player.runCommand('event entity @s custon:masculino_claro');
menu_custon_cabelo_3(player);
        break; 

       case 2:
player.runCommand('event entity @s custon:masculino_escuro');
menu_custon_cabelo_3(player);
        break; 

       case 3:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person');
menu_custon_cabelo_3(player);
        break; 

       case 4:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s set minecraft:third_person_front');
menu_custon_cabelo_3(player);
        break; 

       case 5:
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_set 1 1 in_back');
player.runCommand('camera @s set minecraft:fixed_boom');
menu_custon_cabelo_3(player);
        break; 

         case 6:
player.runCommand('replaceitem entity @s slot.hotbar 4 tnt:escolha_clan 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} ');
player.runCommand('tp @s @s ');
player.runCommand('camera @s fov_clear');
player.runCommand('camera @s clear');
        break; 
    }
  });
}