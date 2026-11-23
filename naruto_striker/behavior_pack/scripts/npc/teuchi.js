// import
import { world, system } from "@minecraft/server";

// Agenda com protecao: se o jogador sair no meio da espera, o callback nao gera erro.
function runTimeoutSeguro(fn, ticks) {
  return system.runTimeout(() => {
    try { fn(); } catch (e) {}
  }, ticks);
}

import { ActionFormData } from "@minecraft/server-ui";

// ================= CONFIG =================

const ITEMS = [
  {
    button: "§l§o§e.Ramen",
    item: "tnt:ramen",
    price: 45
  },
  {
    button: "§l§o§e.Picole",
    item: "tnt:picole",
    price: 25
  },
  {
    button: "§l§o§e.Espetinho de doce",
    item: "tnt:espetinho",
    price: 30
  },
  {
    button: "§l§o§e.Espetinho de Peixe",
    item: "tnt:peixe",
    price: 35
  },
  {
    button: "§l§o§e.Bolinho arroz",
    item: "tnt:bolinho_arroz",
    price: 45
  }
];

// ================= SCORE =================

function getScore(player, objetivo) {
  try {
    return world.scoreboard
      .getObjective(objetivo)
      ?.getScore(player.scoreboardIdentity) ?? 0;
  } catch {
    return 0;
  }
}

// ================= SCRIPT EVENT =================

system.afterEvents.scriptEventReceive.subscribe((ev) => {

  if (ev.id !== "npc:teuchi") return;

  const player = ev.sourceEntity;

  if (!player) return;

  npc_teuchi(player);
});

// ================= ITEM USE =================

world.beforeEvents.itemUse.subscribe((data) => {

  const player = data.source;

  switch (data.itemStack.typeId) {

    case "":

      runTimeoutSeguro(() => {
        npc_teuchi(player);
      }, 1);

      break;
  }
});

// ================= MENU =================

export function npc_teuchi(player, amount = 1) {

  const tp = getScore(player, "tp");

  const hasTag = player.hasTag("ninja_konoha");

  // ================= TEXTO =================

  const conversa = hasTag ?

`§6Bem-vindo, §a jovem§6!!
§eAqui estão os §bpreços§e e as §avariedades dos alimentos§e.
§fFique à vontade para escolher,

§a---------------------tabela d preço---------------------

${ITEMS.map(item =>
`§c[!]. §e${item.button.replace(/§./g, "").replace(".", "")}:  §f> §a${item.price * amount} Tp.`
).join("\n\n")}

§a----------------------------------------------------------

§d[!]. §fseu tp atual:  §a${tp} Tp.
`

:

`§6Opa, §a jovem forasteiro§6! Vejo que você chegou agora na §2vila§6, hein?
§eAqui eu tenho várias delícias quentinhas §fpara encher o estômago e a alma§e…
§cMas, sem a permissão da §dHokage§c, minhas mãos ficam atadas.
§7Regras da vila, entende?

§c[!] §eFale diretamente com a Hokage — ela o aguarda na §aResidência do Hokage!
`;

  // ================= FORM =================

  const form = new ActionFormData();

  form.title("ui.npc_orochimaru_pg2.title");

  form.body(conversa);

  // ================= BOTÕES =================

  for (const item of ITEMS) {
    form.button(hasTag ? item.button : "");
  }

  if (hasTag) {

    form.button(
      amount === 1
        ? "§l§o§a.Comprar 5x"
        : "§l§o§a.Voltar"
    );
  }

  form.button("§l§o§c.Sair                                  ");

  // ================= SHOW =================

  form.show(player).then((response) => {

    if (response.canceled) return;

    if (response.selection === undefined) return;

    const selection = response.selection;

    // ================= ITENS =================

    if (selection < ITEMS.length && hasTag) {

      const item = ITEMS[selection];

      const totalPrice = item.price * amount;

      const playerTp = getScore(player, "tp");

      // sem tp
      if (playerTp < totalPrice) {

        player.sendMessage(
          `§o§c[!] §eRequer: §a${totalPrice}. Tp`
        );

        return;
      }

      // give
      player.runCommandAsync(
        `give @s ${item.item} ${amount}`
      )?.catch?.(() => {});

      // remove tp
      player.runCommandAsync(
        `scoreboard players remove @s tp ${totalPrice}`
      )?.catch?.(() => {});

      // reopen
      runTimeoutSeguro(() => {
        npc_teuchi(player, amount);
      }, 1);

      return;
    }

    // ================= 5X / VOLTAR =================

    if (hasTag && selection === ITEMS.length) {

      runTimeoutSeguro(() => {

        npc_teuchi(
          player,
          amount === 1 ? 5 : 1
        );

      }, 1);

      return;
    }
  });
}