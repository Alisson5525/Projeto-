import { world, system } from "@minecraft/server";
import { cmd } from "./lib/cmd.js";

// 📦 CONFIG DOS ITENS
const ITEMS = [

  {id: "tnt:chidori",
    hasCmd: "tag @s add jutsu_r_chidori",
  noCmd: "tag @s remove jutsu_r_chidori"},

  {id: "tnt:chidori_negro",
    hasCmd: "tag @s add jutsu_r_chidori_negro",
  noCmd: "tag @s remove jutsu_r_chidori_negro"},

  {id: "tnt:chidori_nagashi",
    hasCmd: "tag @s add jutsu_r_chidori_nagashin",
  noCmd: "tag @s remove jutsu_r_chidori_nagashin"},

  {id: "tnt:raikiri",
    hasCmd: "tag @s add jutsu_r_chidori_raikiri",
  noCmd: "tag @s remove jutsu_r_chidori_raikiri"},

  {id: "tnt:shiden",
    hasCmd: "tag @s add jutsu_r_shiden",
  noCmd: "tag @s remove jutsu_r_shiden"},




  {id: "tnt:corte_de_agua",
    hasCmd: "tag @s add jutsu_a_lamina",
  noCmd: "tag @s remove jutsu_a_lamina"},

  {id: "tnt:grande_onda_choque_",
    hasCmd: "tag @s add jutsu_a_onda_choque",
  noCmd: "tag @s remove jutsu_a_onda_choque"},

  {id: "tnt:prisao_agua_",
    hasCmd: "tag @s add jutsu_a_prisao_agua",
  noCmd: "tag @s remove jutsu_a_prisao_agua"},

  {id: "tnt:saudacao_agua_",
    hasCmd: "tag @s add jutsu_a_saudacao",
  noCmd: "tag @s remove jutsu_a_saudacao"},

  {id: "tnt:tubarao_triplo",
    hasCmd: "tag @s add jutsu_a_tubarao",
  noCmd: "tag @s remove jutsu_a_tubarao"},




  {id: "tnt:disparos_terra",
    hasCmd: "tag @s add jutsu_t_disparos_terra",
  noCmd: "tag @s remove jutsu_t_disparos_terra"},

  {id: "tnt:esconderijo_toupeira",
    hasCmd: "tag @s add jutsu_t_toupeira",
  noCmd: "tag @s remove jutsu_t_toupeira"},

  {id: "tnt:mao_terra",
    hasCmd: "tag @s add jutsu_t_punho",
  noCmd: "tag @s remove jutsu_t_punho"},

  {id: "tnt:prisao_terra_",
    hasCmd: "tag @s add jutsu_t_prisao",
  noCmd: "tag @s remove jutsu_t_prisao"},

  {id: "tnt:terra_sanduiche_",
    hasCmd: "tag @s add jutsu_t_sanduiche",
  noCmd: "tag @s remove jutsu_t_sanduiche"},




  {id: "tnt:bola_fogo",
    hasCmd: "tag @s add jutsu_f_bola_fogo",
  noCmd: "tag @s remove jutsu_f_bola_fogo"},

  {id: "tnt:bola_fogo_projetil_",
    hasCmd: "tag @s add jutsu_f_esfera_fogo",
  noCmd: "tag @s remove jutsu_f_esfera_fogo"},

  {id: "tnt:grande_aniquilacao_fogo",
    hasCmd: "tag @s add jutsu_f_aniquilacao_fogo",
  noCmd: "tag @s remove jutsu_f_aniquilacao_fogo"},




  {id: "tnt:esfera_vacuo_",
    hasCmd: "tag @s add jutsu_v_esfera_vento",
  noCmd: "tag @s remove jutsu_v_esfera_vento"},

  {id: "tnt:rasen_shuriken",
    hasCmd: "tag @s add jutsu_v_rasen_shuriken",
  noCmd: "tag @s remove jutsu_v_rasen_shuriken"},


  
];















// 🧠 CACHE (evita spam)
const playerState = new Map();
world.afterEvents.playerLeave.subscribe((ev) => playerState.delete(ev.playerId));

system.runInterval(() => {
  for (const player of world.getPlayers()) {

    let inv;
    try {
      inv = player.getComponent("minecraft:inventory").container;
    } catch {
      continue;
    }

    // estado anterior do player
    if (!playerState.has(player.id)) {
      playerState.set(player.id, {});
    }

    const state = playerState.get(player.id);

    // 🔍 le o inventario UMA vez (antes: 1 varredura completa por item configurado)
    const presentes = new Set();
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) presentes.add(item.typeId);
    }

    for (const itemConfig of ITEMS) {

      const hasItem = presentes.has(itemConfig.id);

      const lastState = state[itemConfig.id];

      // 🚀 só executa se mudou
      if (lastState !== hasItem) {

        state[itemConfig.id] = hasItem;

        try {
          if (hasItem) {
            cmd(player, itemConfig.hasCmd);
          } else {
            cmd(player, itemConfig.noCmd);
          }
        } catch (e) {
          console.warn(`Erro comando (${itemConfig.id}):`, e);
        }
      }
    }
  }
}, 20); // 1 segundo