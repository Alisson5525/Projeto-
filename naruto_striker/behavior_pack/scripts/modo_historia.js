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
        case "tnt:menu_missao":
          runTimeoutSeguro(() => {
            modo_historia_c(player);
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


function criarTexto(tag, rank, objetivo, vida, dano, skill, recompensa, complet) {
  return player => {
    return !player.hasTag(tag)
      ? `§0Lock
§fMissao §aRank§f ${rank}.

§fObjetivo. 
§7${objetivo}.

§fInformação.
§fVida: §7${vida}
§fDano: §7${dano}
§fSkill: §7${skill}

§fRecompensa.
§7${recompensa}
`
  : `§a${complet}`;
  }
}

function criarTexto1(tag, rank, objetivo, info, recompensa, complet) {
  return player => {
    const gatos_miss = getScore(player, "gatos_miss");
    return !player.hasTag(tag)
      ? `§0Lock
§fMissao §aRank§f ${rank}.

§fObjetivo. 
§7${objetivo}.

§fInformação.
§7${info}.

§fFalta. §7[${gatos_miss}/15]

§fRecompensa.
§7${recompensa}
`
  : `§a${complet}`;
  }
}

function criarTexto3(tag, rank, objetivo, info, recompensa, complet) {
  return player => {
    const bndidos_c_miss = getScore(player, "bndidos_c_miss");
    return !player.hasTag(tag)
      ? `§0Lock
§fMissao §aRank§f ${rank}.

§fObjetivo. 
§7${objetivo}.

§fInformação.
§7${info}.

§fFalta. §7[${bndidos_c_miss}/10]

§fRecompensa.
§7${recompensa}
`
  : `§a${complet}`;
  }
}

function criarTexto4(tag, rank, objetivo, info, recompensa, complet) {
  return player => {
    const bndidos_c_miss = getScore(player, "bndidos_c_miss");
    const bndidos_a_miss = getScore(player, "bndidos_a_miss");
    return !player.hasTag(tag)
      ? `§0Lock
§fMissao §aRank§f ${rank}.

§fObjetivo. 
§7${objetivo}.

§fInformação.
§7${info}.

§aRank A.
§fFalta. §7[${bndidos_a_miss}/5]

§aRank C.
§fFalta. §7[${bndidos_c_miss}/15]

§fRecompensa.
§7${recompensa}
`
  : `§a${complet}`;
  }
}
function criarTexto2(tag, rank, objetivo, info, recompensa, complet, click) {
  return player => {
    const cooldown_miss = getScore(player, "cooldown_miss");
    return !player.hasTag(tag)
      ? `§0Lock
§fMissao §aRank§f ${rank}.

§fObjetivo. 
§7${objetivo}.

§fInformação.
§7${info}.

§fRecompensa.
§7${recompensa}

§fCooldown: §a${cooldown_miss}§fs

§e${click}
`
  : `§a${complet}`;
  }
}



export function modo_historia(player) {
  const form = new ActionFormData();
  form.title("ui.modo_historia.title");
  form.body(
    `asdadwda`
  );
  form.button("");
  form.button("");



  form.show(player).then((response) => {
    switch (response.selection) {

case 0:
break;

case 1:
modo_historia_c(player);
break; 
        
    }
  }).catch(() => {});
}




export function modo_historia_c(player) {
  const form = new ActionFormData();
  form.title("ui.modo_historia_c.title." + Math.max(0, Math.min(10, Math.floor(getScore(player,"missao_classico")))));


  const textos = [

    criarTexto1("missao_1_c", "§eD", "Capture os gatos", "A captura dos gatos pode\nser feita em qualquer vila.\n§aClique/segure na tela\npara capturá-los", "50.Tp", "missão finalizada"),

    criarTexto2("missao_2_c", "§eC", "Capture Os Sinos Do Kakashi", "Tente Recuperar os sinos com o Kakashi.\n§c[!]. §aClique/segure após o Kakashi\nficar cansado\n§c[!]. §eKakashi Ira Desaparecer\nem 2 Minutos", "170.Tp", "missão finalizada", "Click Para Começar" ),
   
    criarTexto2("missao_3_c", "§eB", "Derrote os Membros da Anbu", "Derrote os anbus\nAntes do tempo acabar.\n§c[!]. §eOs anbus irão desaparecer\nem 2 minutos", "200.Tp", "missão finalizada", "Click Para Começar" ),
   
    criarTexto2("missao_4_c", "§eC", "Pontos de Status", "Desbloqueie os pontos de status\n§eVida Nível 1,\nForça Nível 1,\nChakra Nível 1,\nDash Nível 1", "", "Missão finalizada", "" ),
   
    criarTexto2("missao_5_c", "§eA", "Derrote Zabuza", "§c[!]. §eZabuza Ira ativar\no modo Beserk em 2 minutos", "300.Tp", "Missão finalizada", "Click Para Começar" ),

    criarTexto3("missao_6_c", "§eC", "Derrote Bandidos", "Derrote Bandidos §aRank C.\n§c[!]. §eOs bandidos aparece\nnormalmente pelo mundo", "400.Tp", "Missão finalizada" ),

    criarTexto4("missao_7_c", "§eA", "Esquadrao dos Bandidos", "Derrote Bandidos\n§aRank C.\n§aRank A.\n§c[!]. §eOs bandidos aparece\nnormalmente pelo mundo", "700.Tp", "Missão finalizada" ),

    criarTexto2("missao_8_c", "§eA", "Proteja O Pergaminho", "Ira Aparecer Inimigos Tentando\nRecoperar o Pergaminho\n§c[!]. §ecada 10s ira aparecer inimigos\n§c[!]. §ea missao ira durar 1 minutos", "300.Tp", "Missão finalizada", "Click Para Começar" ),
   
    criarTexto2("missao_9_c", "§eS", "Recupera O Pergainho", "Tente Recuperar o Pergainho.\n§c[!]. §aClique/segure após o Orochimaru\nficar cansado\n§c[!]. §eOrochimaru Ira Desaparecer\nem 2 Minutos", "700.Tp", "Missão finalizada", "Click Para Começar" ),
  
    criarTexto2("missao_10_c", "§eS", "Derrote Neji", "§c[!]. §eNeji Ira ativar\no modo Beserk em 2 minutos", "1500.Tp", "Missão finalizada", "Click Para Começar" ),

    criarTexto2("missao_11_c", "§eS", "Derrote Ninja Desconhecido", "§c[!]. §eNinja Desconhecido Ira Fugir\nem 4 Minutos", "2500.Tp", "Missão finalizada", "Click Para Começar" ),

    criarTexto2("missao_12_c", "§eS", "Derrote Gaara Do Deserto", "§c[!]. §eCada Derrota Gaara ira Acordar o Shukaku.\n§c[!]. §eModo Beserk #2, tera um tempo de 3 minutos,\npara evoluir para besta de calda", "6000.Tp", "Missão finalizada", "Click Para Começar" ),




  ];

  textos.forEach(fn => form.button(fn(player)));

  try {
    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {

case 0:
break;



case 1:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_1_c") && !player.hasTag("missao_2_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 240');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:kakashi_sinos ^^2^2'); }, 30); } else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;



case 2:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_1_c") && player.hasTag("missao_2_c") && !player.hasTag("missao_3_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 300');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_boss ^^2^2'); }, 30); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_basico ^^2^2'); }, 30); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_basico ^^2^2'); }, 30); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_basico ^^2^2'); }, 30); 

} else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;


case 3:
break;



case 4:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_1_c") && player.hasTag("missao_2_c") && player.hasTag("missao_3_c") && player.hasTag("missao_4_c") && !player.hasTag("missao_5_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 300');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:zabuza ^^2^2'); }, 30); 

} else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;




case 7:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_6_c") && player.hasTag("missao_7_c") && !player.hasTag("missao_8_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 10 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 500');
player.runCommand('/tag @s add pergminho_miss_5');
player.runCommand('/give @s tnt:pergaminho_miss');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_c ^^2^2'); }, 100); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_c ^^2^2'); }, 200); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_a ^^2^2'); }, 300); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_c ^^2^2'); }, 400); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_a ^^2^2'); }, 500); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:anbu_ladrao_a ^^2^2'); }, 600); 

runTimeoutSeguro(() => { 
player.runCommand('/tellraw @s[tag=pergminho_miss_5] {"rawtext":[{"text":"§c[!]§f: §aMissao Completa"}]}');
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/tellraw @s[tag=!pergminho_miss_5] {"rawtext":[{"text":"§c[!]§f: §cMissao Fracassada"}]}');
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/tag @s[tag=pergminho_miss_5] add missao_8_c'); 
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/clear @s[tag=pergminho_miss_5] tnt:pergaminho_miss'); 
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/event entity @e[r=50,family=miss_5_c] tnt:despawn'); 
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/scoreboard players add @s[tag=pergminho_miss_5] tp 300'); 
}, 700); 
runTimeoutSeguro(() => { 
player.runCommand('/tellraw @s[tag=pergminho_miss_5] {"rawtext":[{"text":"§a[!] §e300.Tp"}]}');
}, 700); 
} else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;





case 8:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_7_c") && player.hasTag("missao_8_c") && !player.hasTag("missao_9_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 240');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:orochimaru_miss_c ^^2^2'); }, 30); } else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;




case 9:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_8_c") && player.hasTag("missao_9_c") && !player.hasTag("missao_10_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 340');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:neji_c ^^2^2'); }, 30); } else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;




case 10:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_9_c") && player.hasTag("missao_10_c") && !player.hasTag("missao_11_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §cNinjas Da Akatsuki"}]}');
player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 6 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 640');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:itachi_c ^^2^2'); }, 60); 
runTimeoutSeguro(() => { player.runCommand('/summon tnt:kisame_c ^^2^2'); }, 80); 

} else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;



case 11:
{const cooldown_miss = getScore(player, "cooldown_miss");
if (cooldown_miss === 0) { if (player.hasTag("missao_10_c") && player.hasTag("missao_11_c") && !player.hasTag("missao_12_c")) {

player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aA Missao ira começar em 3 segundos"}]}');
player.runCommand('/scoreboard players set @s cooldown_miss 800');

runTimeoutSeguro(() => { player.runCommand('/summon tnt:gaara_c ^^2^2'); }, 30); 

} else { player.runCommand('tellraw @s {"rawtext":[{"text":"§c[!]§f: §7Missão indisponível: já concluída ou bloqueada (complete as anteriores)."}]}'); }} 
        
else {player.runCommand('/tellraw @s {"rawtext":[{"text":"§c[!]§f: §aVocê ainda está em cooldown. Aguarde §c' + cooldown_miss + '§a segundos."}]}');}}
break;

      }
    }).catch(() => {});
  } catch (e) {
    console.warn(`Erro ao exibir menu: ${e}`);
  }
}