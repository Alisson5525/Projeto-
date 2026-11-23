

import * as mc from "@minecraft/server";

/* =======================================================
   FUNÇÃO SCORE
======================================================= */
export function getScore(objective, player) { 
  try { 
    return mc.world.scoreboard
      .getObjective(objective)
      .getScore(player.scoreboardIdentity) ?? 0; 
  } catch { 
    return 0; 
  } 
}

const Itens = {
  "tnt:chidori": { nome: "[texto_jutsu_raio_1] [custo_jutsu_raio_1]" },
  "tnt:chidori_negro": { nome: "[texto_jutsu_raio_2] [custo_jutsu_raio_2]" },
  "tnt:chidori_nagashi": { nome: "[texto_jutsu_raio_3] [custo_jutsu_raio_3]" },
  "tnt:raikiri": { nome: "[texto_jutsu_raio_4] [custo_jutsu_raio_4]" },
  "tnt:shiden": { nome: "[texto_jutsu_raio_5] [custo_jutsu_raio_5]" },


  "tnt:corte_de_agua": { nome: "[texto_jutsu_agua_1] [custo_jutsu_agua_1]" },
  "tnt:grande_onda_choque_": { nome: "[texto_jutsu_agua_2] [custo_jutsu_agua_2]" },
  "tnt:prisao_agua_": { nome: "[texto_jutsu_agua_3] [custo_jutsu_agua_3]" },
  "tnt:saudacao_agua_": { nome: "[texto_jutsu_agua_4] [custo_jutsu_agua_4]" },
  "tnt:tubarao_triplo": { nome: "[texto_jutsu_agua_5] [custo_jutsu_agua_5]" },

  "tnt:disparos_terra": { nome: "[texto_jutsu_terra_1] [custo_jutsu_terra_1]" },
  "tnt:esconderijo_toupeira": { nome: "[texto_jutsu_terra_2] [custo_jutsu_terra_2]" },
  "tnt:mao_terra": { nome: "[texto_jutsu_terra_3] [custo_jutsu_terra_3]" },
  "tnt:prisao_terra_": { nome: "[texto_jutsu_terra_4] [custo_jutsu_terra_4]" },
  "tnt:terra_sanduiche_": { nome: "[texto_jutsu_terra_5] [custo_jutsu_terra_5]" },

  "tnt:bola_fogo": { nome: "[texto_jutsu_fogo_1] [custo_jutsu_fogo_1]" },
  "tnt:bola_fogo_projetil_": { nome: "[texto_jutsu_fogo_2] [custo_jutsu_fogo_2]" },
  "tnt:grande_aniquilacao_fogo": { nome: "[texto_jutsu_fogo_3] [custo_jutsu_fogo_3]" },

  "tnt:esfera_vacuo_": { nome: "[texto_jutsu_vento_1] [custo_jutsu_vento_1]" },
  "tnt:rasen_shuriken": { nome: "[texto_jutsu_vento_2] [custo_jutsu_vento_2]" },









  "tnt:suigetsu_skill_1": { nome: "[texto_suigetsu_1] [custo_suigetsu_1]" },
  "tnt:suigetsu_skill_2": { nome: "[texto_suigetsu_2] [custo_suigetsu_2]" },
  "tnt:suigetsu_skill_3": { nome: "[texto_suigetsu_3] [custo_suigetsu_3]" },


  




  "tnt:jutsu_medico": { nome: "[texto_jutsu_medico] [custo_jutsu_medico]" },
  "tnt:jutsu_medico_avancado": { nome: "[texto_jutsu_medico_avancado] [custo_jutsu_medico_avancado]" },











  "tnt:menu_all_modos_evoluir": { nome: "[troca_menu_evoluir_1]" },
  "tnt:menu_modos_uchiha_evoluir": { nome: "[troca_menu_evoluir_2]" },
  "tnt:menu_modos_hyuga_evoluir": { nome: "[troca_menu_evoluir_2]" },
  "tnt:menu_status_evoluir": { nome: "[troca_menu_evoluir_3]" },
  "tnt:menu_jutsus_evoluir": { nome: "[troca_menu_evoluir_4]" },
  "tnt:menu_all_modos": { nome: "[troca_menu_1]" },
  "tnt:menu_modos_uchiha": { nome: "[troca_menu_2]" },
  "tnt:menu_modos_hyuga": { nome: "[troca_menu_2]" },
  "tnt:menu_missao": { nome: "[troca_menu_3]" },

  "tnt:sharingan_skill_1": { nome: "[hud_skill_sharingan] [slot_select_1] [texto_sharingan_skill_1] [custo_sharingan]" },
  "tnt:sharingan_skill_2": { nome: "[hud_skill_sharingan] [slot_select_2] [texto_sharingan_skill_2] [custo_sharingan]" },

  "tnt:mgk_itachi_skill_1": { nome: "[hud_skill_mgk_itachi] [slot_select_1] [texto_mgk_itachi_skill_1] [custo_mgk_itachi]" },
  "tnt:mgk_itachi_skill_2": { nome: "[hud_skill_mgk_itachi] [slot_select_2] [texto_mgk_itachi_skill_2] [custo_mgk_itachi]" },
  "tnt:mgk_itachi_skill_3": { nome: "[hud_skill_mgk_itachi] [slot_select_3] [texto_mgk_itachi_skill_3] [custo_mgk_itachi]" },
  "tnt:mgk_itachi_skill_4": { nome: "[hud_skill_mgk_itachi] [slot_select_4] [texto_mgk_itachi_skill_4] [custo_mgk_itachi]" },

  "tnt:mgk_sasuke_skill_1": { nome: "[hud_skill_mgk_sasuke] [slot_select_1] [texto_mgk_sasuke_skill_1] [custo_mgk_sasuke]" },
  "tnt:mgk_sasuke_skill_2": { nome: "[hud_skill_mgk_sasuke] [slot_select_2] [texto_mgk_sasuke_skill_2] [custo_mgk_sasuke]" },
  "tnt:mgk_sasuke_skill_3": { nome: "[hud_skill_mgk_sasuke] [slot_select_3] [texto_mgk_sasuke_skill_3] [custo_mgk_sasuke]" },

  "tnt:mgk_obito_skill_1": { nome: "[hud_skill_mgk_obito] [slot_select_1] [texto_mgk_obito_skill_1] [custo_mgk_obito]" },
  "tnt:mgk_obito_skill_2": { nome: "[hud_skill_mgk_obito] [slot_select_2] [texto_mgk_obito_skill_2] [custo_mgk_obito]" },
  "tnt:mgk_obito_skill_3": { nome: "[hud_skill_mgk_obito] [slot_select_3] [texto_mgk_obito_skill_3] [custo_mgk_obito]" },
  "tnt:mgk_obito_skill_4": { nome: "[hud_skill_mgk_obito] [slot_select_4] [texto_mgk_obito_skill_4] [custo_mgk_obito]" },

  "tnt:rinnegan_skill_1": { nome: "[hud_skill_rinnegan] [slot_select_1] [texto_rinnegan_skill_1] [custo_rinnegan]" },
  "tnt:rinnegan_skill_2": { nome: "[hud_skill_rinnegan] [slot_select_2] [texto_rinnegan_skill_2] [custo_rinnegan]" },
  "tnt:rinnegan_skill_3": { nome: "[hud_skill_rinnegan] [slot_select_3] [texto_rinnegan_skill_3] [custo_rinnegan]" },
  "tnt:rinnegan_skill_4": { nome: "[hud_skill_rinnegan] [slot_select_4] [texto_rinnegan_skill_4] [custo_rinnegan]" },
  "tnt:rinnegan_skill_5": { nome: "[hud_skill_rinnegan] [slot_select_5] [texto_rinnegan_skill_5] [custo_rinnegan]" },

  "tnt:manto_kurama_skill_1": { nome: "[hud_skill_mt_kurama_1_3] [slot_select_1] [texto_mt_kurama_1_3_skill_1] [custo_kurama_1_3]" },
  "tnt:manto_kurama_skill_2": { nome: "[hud_skill_mt_kurama_1_3] [slot_select_2] [texto_mt_kurama_1_3_skill_2] [custo_kurama_1_3]" },

  "tnt:manto_kurama_4_skill_1": { nome: "[hud_skill_mt_kurama_4] [slot_select_1_salto] [texto_mt_kurama_4_skill_1] [custo_kurama_4]" },
  "tnt:manto_kurama_4_skill_2": { nome: "[hud_skill_mt_kurama_4] [slot_select_2] [texto_mt_kurama_4_skill_2] [custo_kurama_4]" },

  "tnt:mk2_skill_1": { nome: "[texto_mk2] [custo_mk2]" },

  
  "tnt:byakugan_skill_1": { nome: "[hud_skill_byakugan] [slot_select_1] [texto_byakugan_skill_1] [custo_byakugan]" },
  "tnt:byakugan_skill_2": { nome: "[hud_skill_byakugan] [slot_select_2] [texto_byakugan_skill_2] [custo_byakugan]" },
  "tnt:byakugan_skill_3": { nome: "[hud_skill_byakugan] [slot_select_3] [texto_byakugan_skill_3] [custo_byakugan]" },

  "tnt:byakugan_skill_evoluido_1": { nome: "[hud_skill_byakugan_evoluido] [slot_select_1] [texto_byakugan_evoluido_skill_1] [custo_byakugan_evoluido]" },
  "tnt:byakugan_skill_evoluido_2": { nome: "[hud_skill_byakugan_evoluido] [slot_select_2] [texto_byakugan_evoluido_skill_2] [custo_byakugan_evoluido]" },
  "tnt:byakugan_skill_evoluido_3": { nome: "[hud_skill_byakugan_evoluido] [slot_select_3] [texto_byakugan_evoluido_skill_3] [custo_byakugan_evoluido]" },
  "tnt:byakugan_skill_evoluido_4": { nome: "[hud_skill_byakugan_evoluido] [slot_select_4] [texto_byakugan_evoluido_skill_4] [custo_byakugan_evoluido]" },
  "tnt:byakugan_skill_evoluido_5": { nome: "[hud_skill_byakugan_evoluido] [slot_select_5] [texto_byakugan_evoluido_skill_5] [custo_byakugan_evoluido]" },

  "tnt:tenseigan_olho_skill_1": { nome: "[hud_skill_tenseigan_olho] [slot_select_1] [texto_tenseigan_skill_olho_1] [custo_tenseigan]" },
  "tnt:tenseigan_olho_skill_2": { nome: "[hud_skill_tenseigan_olho] [slot_select_2] [texto_tenseigan_skill_olho_2] [custo_tenseigan]" },
  "tnt:tenseigan_olho_skill_3": { nome: "[hud_skill_tenseigan_olho] [slot_select_3] [texto_tenseigan_skill_olho_3] [custo_tenseigan]" },
  "tnt:tenseigan_olho_skill_4": { nome: "[hud_skill_tenseigan_olho] [slot_select_4] [texto_tenseigan_skill_olho_4] [custo_tenseigan]" },

  "tnt:tenseigan_skill_1": { nome: "[hud_skill_tenseigan] [slot_select_1] [texto_tenseigan_skill_1] [custo_manto_tenseigan]" },
  "tnt:tenseigan_skill_2": { nome: "[hud_skill_tenseigan] [slot_select_2] [texto_tenseigan_skill_2] [custo_manto_tenseigan]" },
  "tnt:tenseigan_skill_3": { nome: "[hud_skill_tenseigan] [slot_select_3] [texto_tenseigan_skill_3] [custo_manto_tenseigan]" },
  "tnt:tenseigan_skill_4": { nome: "[hud_skill_tenseigan] [slot_select_4] [texto_tenseigan_skill_4] [custo_manto_tenseigan]" },
  "tnt:tenseigan_skill_5": { nome: "[hud_skill_tenseigan] [slot_select_5] [texto_tenseigan_skill_5] [custo_manto_tenseigan]" },
  "tnt:tenseigan_skill_6": { nome: "[hud_skill_tenseigan] [slot_select_6] [texto_tenseigan_skill_6] [custo_manto_tenseigan]" },

  "tnt:susanoo_it2_skill_1": { nome: "[hud_skill_mgk_susanoo_it2] [slot_select_1] [texto_susanoo_it2_skill_1] [custo_susanoo_it2]" },
  "tnt:susanoo_it2_skill_2": { nome: "[hud_skill_mgk_susanoo_it2] [slot_select_2] [texto_susanoo_it2_skill_2] [custo_susanoo_it2]" },
  "tnt:susanoo_it2_skill_3": { nome: "[hud_skill_mgk_susanoo_it2] [slot_select_3] [texto_susanoo_it2_skill_3] [custo_susanoo_it2]" },
  "tnt:susanoo_it2_skill_4": { nome: "[hud_skill_mgk_susanoo_it2] [slot_select_4] [texto_susanoo_it2_skill_4] [custo_susanoo_it2]" },

  "tnt:susanoo_sk2_skill_1": { nome: "[hud_skill_susanoo_sk2] [slot_select_1] [texto_susanoo_sk2_skill_1] [custo_susanoo_sk2]" },
  "tnt:susanoo_sk2_skill_2": { nome: "[hud_skill_susanoo_sk2] [slot_select_2] [texto_susanoo_sk2_skill_2] [custo_susanoo_sk2]" },
  "tnt:susanoo_sk2_skill_3": { nome: "[hud_skill_susanoo_sk2] [slot_select_3] [texto_susanoo_sk2_skill_3] [custo_susanoo_sk2]" },
  "tnt:susanoo_sk2_skill_4": { nome: "[hud_skill_susanoo_sk2] [slot_select_4] [texto_susanoo_sk2_skill_4] [custo_susanoo_sk2]" },

  "tnt:susanoo_ob2_skill_1": { nome: "[hud_skill_susanoo_ob2] [slot_select_1] [texto_mgk_obito_skill_2] [custo_susanoo_ob2]" },
  "tnt:susanoo_ob2_skill_2": { nome: "[hud_skill_susanoo_ob2] [slot_select_2] [texto_mgk_obito_skill_3] [custo_susanoo_ob2]" },
  "tnt:susanoo_ob2_skill_3": { nome: "[hud_skill_susanoo_ob2] [slot_select_3] [texto_susanoo_ob2_skill_3] [custo_susanoo_ob2]" },

};

/* Itens exibidos quando as skills estao seladas (antes esta tabela nao existia
   e gerava ReferenceError a cada tick). Mostra o mesmo texto do item. */
const ItensCooldown = Itens;

function ratio(value, max, steps) {
  if (!max || max <= 0 || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(steps, Math.round(value * steps / max)));
}

/* =======================================================
   HUD
======================================================= */
mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {

    if (!player.isValid()) continue;
    const heldItem = player.getComponent("equippable")?.getEquipment("Mainhand");
    let itemName = "";

    if (heldItem) {
      if (!player.hasTag("skill_selados") && Itens[heldItem.typeId]) {
        itemName = Itens[heldItem.typeId].nome;
      } else if (player.hasTag("skill_selados") && ItensCooldown[heldItem.typeId]) {
        itemName = ItensCooldown[heldItem.typeId].nome;
      }
    }

    const currentHealth = getScore("current_health", player);
    const maxHealth =
      20 +
      getScore("health_stats", player) +
      getScore("health_stats2", player) +
      getScore("health_stats3", player) +
      getScore("health_dna", player);

    player.onScreenDisplay.setTitle(
      `[charge_bijuu${ratio(getScore("charge_bijuu", player), getScore("charge_bijuu_max", player), 11)}]` +
      `[clans${getScore("clans", player)}]` +
      `[hp${ratio(currentHealth, maxHealth, 20)}]` +
      `[chakra${ratio(getScore("chakra", player), getScore("chakra_max", player), 20)}]` +
      `[${itemName}]`
    );

    player.onScreenDisplay.setActionBar(
      `${Math.round(currentHealth)}/${Math.round(maxHealth)}` +
      `                       ` +
      `${Math.round(getScore("chakra", player))}/${Math.round(getScore("chakra_max", player))}`
    );
  }
}, 1);

/* =======================================================
   VIDA REAL → SCOREBOARD (CORRIGIDO)
======================================================= */
mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {

    if (!player.isValid()) continue;
    const healthComp = player.getComponent("health");
    if (!healthComp) continue;
    const vidaReal = healthComp.currentValue;
    const currentHealth = getScore("current_health", player);

    const maxHealth =
      20 +
      getScore("health_stats", player) +
      getScore("health_stats2", player) +
      getScore("health_stats3", player) +
      getScore("health_dna", player);

    if (vidaReal > maxHealth) {
      healthComp.setCurrentValue(maxHealth);
    }

    if (currentHealth !== Math.floor(vidaReal)) {
      player.runCommandAsync(
        `scoreboard players set @s current_health ${Math.floor(vidaReal)}`
      );
    }
  }
}, 1);
