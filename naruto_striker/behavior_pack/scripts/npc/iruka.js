// import
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

system.afterEvents.scriptEventReceive.subscribe((ev) => {

  if (!ev.id) return;
  if (ev.id !== "npc:iruka") return;

  const player = ev.sourceEntity;
  if (!player) return;

  if (player.isPlayer && player.isPlayer()) {
    try {
      player.sendMessage("§a[scriptevent] Recebido: tnt:iruka");
    } catch (e) {
      console.warn("Não foi possível enviar mensagem de debug ao player.");
    }
  }

  npc_iruka(player);
});




world.beforeEvents.itemUse.subscribe((data) => {
  const player = data.source;
  switch (data.itemStack.typeId) {
    case "":
      system.runTimeout(() => {
        npc_iruka(player);
      }, 0);
      break;
  }
});
 function getScore(player, objetivo) {
  try {
    return world.scoreboard.getObjective(objetivo)?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}



export function npc_iruka(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§6Bem-vindo, §a jovem shinobi§6!!
§eAqui eu vou te guiar e te ensinar tudo o que você precisa saber sobre o §cmundo ninja§e!


` 


  : 

`§6Bem-vindo, §a jovem shinobi§6!!
§eAqui eu vou te guiar e te ensinar tudo o que você precisa saber sobre o §cmundo ninja§e!

§cLembrando: §fSó posso te ensinar tudo sobre o mundo Jinja §fse você for um §aMembro de Konoha§f.
` ;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}





export function npc_iruka_evoluir(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§ePara evoluir seus §amodos§e e §bstatus§e, você precisará de §eTP§6!

§eFormas de conseguir TP:

§a1. §fDerrotando ninjas comuns §7(§aRecomendado para iniciantes§7)

§b2. §fMissões §7(§aRecomendado para iniciantes§7)

§c3. §fBijus §7(§cRecomendado para nível Deus Shinobi§7)

§64. §fRenegados §7(§6Recomendado para nível alto§7)



` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}


export function npc_iruka_status(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§ePara acessar seus §bStatus§e, será necessário completar a §amissão inicial§e.
§7Após concluí-la, você poderá evoluir seus atributos usando §eTP§7.

§6Missão Inicial:

§a• §fCapture §e15 gatos comuns §fde qualquer aldeia.


§6Habilidades que podem ser adquiridas:

§a• §fDash
§b• §fPotência de Chakra
§c• §fColeta de Olhos
§6• §fForça
§d• §fVida
§9• §fChakra
§e• §fRegeneração
` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}


export function npc_iruka_modos(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§6Para desbloquear seus §amodos§6, é necessário acessar o §bMenu de Evolução§6.
§7Ao abri-lo, cada modo terá seus próprios §erequisitos§7.

§a• §fAlguns modos podem ser desbloqueados apenas com §eTP
§b• §fOutros exigem §dtreinamento§f ou §citens específicos.

§6NPCs que podem oferecer treinamento:

§a• §fTsunade
§b• §fOrochimaru
§c• §fGuy


` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}



export function npc_iruka_npc(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§6Os §aninjas§6 e os §bmentores§6 poderão ser encontrados em §eestruturas§6 ou até mesmo §dvagando pelo mundo§6.
§7Cada um deles poderá oferecer §crecompensas§7 ou §atreinamentos especiais§7.

§c• uchiha
§6rank b. §eTP. 75
§6rank s. §eTP. 300
§f•
§a• ninja da folha
§6rank b. §eTP. 70 / 120
§6rank s. §eTP. 180 / 350
§f•
§e• ninja da areia
§6rank b. §eTP. 50 / 90
§6rank s. §eTP. 150 / 300
§f•
§f• zetsu branco
§6rank b. §eTP. 60 / 100
§f•
§7• renegado
§6rank c. §eTP. 50 / 90
§6rank a. §eTP. 120 / 200

` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}



export function npc_iruka_missoes(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§eAs §aMissões do Modo História§6 são simples.
§7Algumas exigem §celiminação de ninjas§7 ou §acaptura de alvos§7.
§7Dependendo da missão, também pode ser necessário um §enível de status§7.

§6Clique para começar:
§7As missões são iniciadas ao clicar no §bbotão§7.
§7O alvo irá §cnascer no mesmo local§7 que o jogador após alguns segundos.

§6Progresso das Missões:
§7As missões devem ser seguidas conforme o §ecaminho do menu§7.

§6Missões por Condição:
§7Missões de condição envolvem §celiminar ninjas§7 ou §acapturar alvos§7.

` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}



export function npc_iruka_menu(player) {

  const hasTag = player.hasTag("ninja_konoha");
  const conversa = hasTag ? 
`§6Menus §e#1:

§7O §eMenu #1§7 é usado para §aativar modos§7 e acessar o §bModo História§7.
§7Para desbloquear novos modos, será necessário §eTP§7 e acesso ao §6Menu #2§7.

§6Menus §e#2:

§7O §eMenu #2§7 permite desbloquear §amodos§7 e §bjutsus§7 usando §eTP§7.
§7Também é possível evoluir seus §dstatus§7, 

aumentando:
§a• §fVida
§c• §fForça
§b• §fHabilidades

` 


  : 


``;
  const corBotao1 = hasTag ? "§l§o§e.Evoluir" : "";
  const corBotao2 = hasTag ? "§l§o§e.Status" : "";
  const corBotao3 = hasTag ? "§l§o§e.Modos" : "";
  const corBotao4 = hasTag ? "§l§o§e.Npc" : "";
  const corBotao5 = hasTag ? "§l§o§e.Missoes" : "";
  const corBotao6 = hasTag ? "§l§o§e.Menu" : "";

  const form = new ActionFormData();
  form.title("ui.npc_iruka.title");
  form.body(
    `${conversa}`
  );


  form.button(`${corBotao1}                             `);
  form.button(`${corBotao2}                              `);
  form.button(`${corBotao3}                               `);
  form.button(`${corBotao4}                                 `);
  form.button(`${corBotao5}                             `);
  form.button(`${corBotao6}                                `);
  form.button("§l§o§c.Sair                                 ");



  form.show(player).then((response) => {

    switch (response.selection) {

case 0: npc_iruka_evoluir(player); break;
case 1: npc_iruka_status(player); break;
case 2: npc_iruka_modos(player); break;
case 3: npc_iruka_npc(player); break;
case 4: npc_iruka_missoes(player); break;
case 5: npc_iruka_menu(player); break;

case 6:
break;
    }

  });
}