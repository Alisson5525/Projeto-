import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const cooldownSet = new Set();

world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  if (data.itemStack.typeId === "tnt:menu_all_modos") {
    if (cooldownSet.has(player.name)) return;

    cooldownSet.add(player.name);
    system.runTimeout(() => {
      menu_all_modos_ativar(player);
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



function criarTextod(tag, itemname) {
  return player => {
    return !player.hasTag(tag)
      ? `§0Lock `
  : `§a${itemname}`;
  }
}
function criarTexto2(tag) {
  return player => {
    return player.hasTag(tag)
      ? ``
:``;
  }
}

export function menu_all_modos_ativar(player) {
  const form = new ActionFormData();
  form.title("ui.all_modos.title");

  const textos = [
    criarTexto2("a"),
    criarTexto2("a"),

    criarTexto("marca_v1", "Marca Da Maldiçao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "marca da maldiçao"),
    criarTexto("marca_v2", "Marca Da Maldiçao v2", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "marca da maldiçao v2"),
    criarTexto("marca_v3", "Marca Da Maldiçao v3", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "marca da maldiçao v3"),

    criarTexto("sennin_sapo_v1", "sennin do sapos incompleto", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "sennin do sapos incompleto"),
    criarTexto("sennin_sapo_v2", "sennin do sapos completo", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "sennin do sapos completo"),

    criarTexto("portao_1", "primeiro portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "primeiro portao"),
    criarTexto("portao_2", "segundo portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "segundo portao"),
    criarTexto("portao_3", "terceiro portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "terceiro portao"),
    criarTexto("portao_4", "quarto portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "quarto portao"),
    criarTexto("portao_5", "quinto portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "quinto portao"),
    criarTexto("portao_6", "sexto portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "sexto portao"),
    criarTexto("portao_7", "setimo portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "setimo portao"),
    criarTexto("portao_8", "oitavo portao", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "oitavo portao"),

    criarTexto("dna_hashirama_sh", "dna Hashirama braço", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "§abraço com dna hashirama.\n§fRequisitos:§7\nRepor os 7 Olhos Sharingan"),
    criarTexto("byakugou_marca", "marca Byakugou", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "marca Byakugou"),

    criarTexto("rinnegan_2", "Rinnegan Esquerdo", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Rinnegan"),

    criarTexto("modo_suigetsu", "Modo Suigetsu", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Modo Suigetsu"),

    criarTextod("all_desativar_mds", "Desativar Modo"),


  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {

case 0:
if (player.hasTag("")) {
}
menu_all_modos_ativar(player);
break;

case 1:
if (player.hasTag("")) {
}
bijus_modos_ativar(player);
break;

case 2:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("marca_cooldown") && player.hasTag("marca_v1")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s marca:maldicao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 3:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("marca_cooldown") && player.hasTag("marca_v2")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s marca:maldicao_v1');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 4:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("marca_cooldown") && player.hasTag("marca_v3")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s marca:maldicao_v2');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 5:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("sennin_sapo_cooldown") && player.hasTag("sennin_sapo_v1")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s sennin:modo_sennin_incompleto');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 6:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("sennin_sapo_cooldown") && player.hasTag("sennin_sapo_v2")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s sennin:modo_sennin_perfeito');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;


case 7:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_1")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:primeiro_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 8:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_2")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:segundo_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 9:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_3")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:terceiro_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 10:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_4")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:quarto_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 11:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_5")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:quinto_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 12:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_6")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:sexto_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 13:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_7")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:setimo_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 14:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("portoes_cooldown") && player.hasTag("portao_8")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s portoes:oitavo_portao');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;

case 15:
if (player.hasTag("dna_hashirama_sh")) {
player.runCommand('execute as @s[hasitem=[{item=tnt:olho_sharingan,location=slot.hotbar,quantity=7..}]] run scoreboard players set @s isanagi 0');
system.runTimeout(() => {
player.runCommand('');
}, 3);
system.runTimeout(() => { 
player.runCommand('execute as @s[hasitem=[{item=tnt:olho_sharingan,location=slot.hotbar,quantity=7..}]] run effect @s instant_health 1 7 true'); 
player.runCommand('execute as @s[hasitem=[{item=tnt:olho_sharingan,location=slot.hotbar,quantity=7..}]] run clear @s tnt:olho_sharingan 0 7 ');

}, 4);
}
break;

case 16:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("byakugou_cooldown") && player.hasTag("byakugou_marca")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s byakugou:ativado');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 17:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("rinnegan_cooldown") && player.hasTag("rinnegan_2")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s uchiha:rinnegan_esquerdo');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 18:
if (!player.hasTag("modo_ativado_2") && !player.hasTag("modo_suigetsu_cooldown") && player.hasTag("modo_suigetsu")) {
player.runCommand('/event entity @s desativar_slot_2');
system.runTimeout(() => {
player.runCommand('/event entity @s suigetsu:ativado');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;














case 19:
if (player.hasTag("all_desativar_mds")) {
player.runCommand('/tag @s remove modo_ativado_2');
player.runCommand('/function tag/tags_cooldown_slot_2');
player.runCommand('/event entity @s desativar_slot_2');
}
break;


      }
    });
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}







export function bijus_modos_ativar(player) {
  const form = new ActionFormData();
  form.title("ui.bijus_modos_unlock.title");

  const textos = [
    criarTexto2("a"),
    criarTexto2("a"),

    criarTexto("manto_kurama_1", "Manto de Chakra Kurama", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto de Chakra Kurama 1 Caldas"),
    criarTexto("manto_kurama_3", "Manto de Chakra Kurama 3 Caldas", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto de Chakra Kurama 3 Caldas"),
    criarTexto("manto_kurama_4", "Manto de Chakra Kurama 4 Caldas", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto de Chakra Kurama 4 Caldas"),
    criarTexto("manto_kurama_6", "Manto de Chakra Kurama 6 Caldas",  "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto de Chakra Kurama 6 Caldas"),
    criarTexto("mk1", "Manto Kurama 1", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto Kurama 1"),
    criarTexto("mk2", "Manto Kurama 2", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Manto Kurama 2"),
    criarTexto("mk_barion", "Modo Barion Kurama", "Modo bloqueado!","Desbloqueie este modo","na Árvore de Modos.", "Modo Barion Kurama"),

    criarTextod("all_desativar_mds", "Desativar Modo"),

  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {


case 0:
if (player.hasTag("")) {
}
menu_all_modos_ativar(player);
break;

case 1:
if (player.hasTag("")) {
}
bijus_modos_ativar(player);
break;


case 2:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("manto_kurama_1")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_chakra_1');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 3:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("manto_kurama_3")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_chakra_3');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 4:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("manto_kurama_4")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_chakra_4');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 5:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("manto_kurama_6")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_chakra_6');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 6:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("mk1")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_kurama_1');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 7:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("mk2")) {
player.runCommand('/event entity @s desativar_slot_1');
system.runTimeout(() => {
player.runCommand('/event entity @s kurama:manto_kurama_2');
}, 3);
system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 4);
}
break;



case 8:
if (!player.hasTag("modo_ativado") && !player.hasTag("kurama_cooldown") && player.hasTag("mk_barion") && player.hasTag("vip_storm")) {
player.runCommand('/event entity @s desativar_slot_1');
player.runCommand('/camerashake add @a[r=15] 0.4 0.1 rotational');
player.runCommand('/playsound mob.wither.shoot @a[r=15]');
system.runTimeout(() => { 
player.runCommand('/playanimation @s animation.barion_transf');
player.runCommand('/camera @s fov_set 1 0.3 in_back');
player.runCommand('/particle tnt:barion_k');
}, 0);
system.runTimeout(() => { player.runCommand('/camera @s fade time 0.3 0.2 0.2 color 250 30 60');}, 0.2);
system.runTimeout(() => { 
player.runCommand('/event entity @s[tag=vip_storm] kurama:barion_kurama');
player.runCommand('/camera @s fov_clear');

}, 5);

system.runTimeout(() => {player.runCommand('/effect @s instant_health 1 7 true');}, 6);
}
break;







case 9:
if (player.hasTag("all_desativar_mds")) {
player.runCommand('/tag @s remove modo_ativado');
player.runCommand('/function tag/tags_cooldown_slot_1');
player.runCommand('/event entity @s desativar_slot_1');
}
break;







      }
    });
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}
