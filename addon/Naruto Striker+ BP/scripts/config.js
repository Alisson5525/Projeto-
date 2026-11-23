export const MODES = {

sharingan: {
          scoreTime: "tempo_doujutsu",
          tempo: 120,
          cmdStart: [
          "playsound sharingan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSharingan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:sharingan_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 10",
          "scoreboard players add @s dano_stats 2",
          "tag @s add modo_ativado",
          "tag @s add sh_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 10",
          "scoreboard players remove @s dano_stats 2",
          "event entity @s uchiha:desativar",
          "tag @s remove modo_ativado",
          "tag @s remove sh_cooldown"
]},

mgk_itachi: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aMangekyou §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:mgk_itachi_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 20",
          "scoreboard players add @s dano_stats 4",
          "tag @s add modo_ativado",
          "tag @s add mgk_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 20",
          "scoreboard players remove @s dano_stats 4",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove mgk_cooldown"
]},

mgk_obito: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aMangekyou §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:mgk_obito_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 20",
          "scoreboard players add @s dano_stats 4",
          "tag @s add modo_ativado",
          "tag @s add mgk_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 20",
          "scoreboard players remove @s dano_stats 4",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove mgk_cooldown"
]},

mgk_sasuke: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aMangekyou §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:mgk_sasuke_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 20",
          "scoreboard players add @s dano_stats 4",
          "tag @s add modo_ativado",
          "tag @s add mgk_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 20",
          "scoreboard players remove @s dano_stats 4",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove mgk_cooldown"
]},

susanoo_1_itachi: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "effect @s resistance 360 0 true",
          "scoreboard players add @s health_stats2 40",
          "scoreboard players add @s dano_stats 6",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 40",
          "scoreboard players remove @s dano_stats 6",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

susanoo_1_obito: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "effect @s resistance 360 0 true",
          "scoreboard players add @s health_stats2 50",
          "scoreboard players add @s dano_stats 5",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 50",
          "scoreboard players remove @s dano_stats 5",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

susanoo_1_sasuke: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound mgk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "effect @s resistance 360 0 true",
          "scoreboard players add @s health_stats2 35",
          "scoreboard players add @s dano_stats 7",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 35",
          "scoreboard players remove @s dano_stats 7",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

susanoo_2_itachi: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound susanoo_2 @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:susanoo_it2_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 999 0 true",
          "scoreboard players add @s health_stats2 75",
          "scoreboard players add @s dano_stats 13",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 75",
          "scoreboard players remove @s dano_stats 13",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

susanoo_2_obito: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound susanoo_2 @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:susanoo_ob2_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 999 0 true",
          "scoreboard players add @s health_stats2 90",
          "scoreboard players add @s dano_stats 11",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 90",
          "scoreboard players remove @s dano_stats 11",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

susanoo_2_sasuke: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound susanoo_2 @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aSusanoo §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:susanoo_sk2_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 999 0 true",
          "scoreboard players add @s health_stats2 65",
          "scoreboard players add @s dano_stats 15",
          "tag @s add modo_ativado",
          "tag @s add susanoo_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "effect @s resistance 0 0 true",
          "scoreboard players remove @s health_stats2 65",
          "scoreboard players remove @s dano_stats 15",
          "tag @s remove modo_ativado",
          "event entity @s uchiha:desativar",
          "tag @s remove susanoo_cooldown"
]},

rinnegan: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound rinnegan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aRinnegan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:rinnegan_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 200",
          "scoreboard players add @s dano_stats 17",
          "tag @s add modo_ativado",
          "effect @s speed 360 2 true",            
          "effect @s resistance 360 1 true",
          "tag @s add rinnegan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 200",
          "scoreboard players remove @s dano_stats 17",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s uchiha:desativar",
          "tag @s remove rinnegan_cooldown"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


byakugan: {
          scoreTime: "tempo_doujutsu",
          tempo: 120,
          cmdStart: [
          "playsound byakugan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aByakugan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:byakugan_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 10",
          "scoreboard players add @s dano_stats 4",
          "tag @s add modo_ativado",
          "tag @s add byakugan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 10",
          "scoreboard players remove @s dano_stats 4",
          "tag @s remove modo_ativado",
          "event entity @s hyuga:desativar",
          "tag @s remove byakugan_cooldown"
]},

byakugan_evolucao: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound byakugan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aByakugan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:byakugan_skill_evoluido_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 20",
          "scoreboard players add @s dano_stats 6",
          "tag @s add modo_ativado",
          "tag @s add byakugan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 20",
          "scoreboard players remove @s dano_stats 6",
          "tag @s remove modo_ativado",
          "event entity @s hyuga:desativar",
          "tag @s remove byakugan_cooldown"
]},

tenseigan: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound tenseigan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aTenseigan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:tenseigan_olho_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 50",
          "scoreboard players add @s dano_stats 8",
          "effect @s speed 360 2 true",            
          "tag @s add modo_ativado",
          "tag @s add tenseigan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 50",
          "scoreboard players remove @s dano_stats 8",
          "effect @s speed 0 0 true",  
          "tag @s remove modo_ativado",
          "event entity @s hyuga:desativar",
          "tag @s remove tenseigan_cooldown"
]},

manto_tenseigan: {
          scoreTime: "tempo_doujutsu",
          tempo: 360,
          cmdStart: [
          "playsound tenseigan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto Tenseigan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:tenseigan_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 250",
          "scoreboard players add @s dano_stats 13",
          "effect @s speed 360 2 true",            
          "effect @s resistance 360 2 true",
          "tag @s add modo_ativado",
          "tag @s add tenseigan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 250",
          "scoreboard players remove @s dano_stats 13",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s hyuga:desativar",
          "tag @s remove tenseigan_cooldown"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


marca_v1: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aMarca da Maldiçao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 15",
                  "scoreboard players add @s dano_stats 3",
                  "tag @s add modo_ativado_2",
                  "tag @s add marca_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 15",
                  "scoreboard players remove @s dano_stats 3",
                  "tag @s remove modo_ativado_2",
                  "event entity @s marca:desativar",
                  "tag @s remove marca_cooldown",
                  "event entity @s desativar_slot_2"
]},

marca_v2: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
                  "playsound marca_2 @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aMarca da Maldiçao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 35",
                  "scoreboard players add @s dano_stats 5",
                  "tag @s add modo_ativado_2",
                  "tag @s add marca_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 35",
                  "scoreboard players remove @s dano_stats 5",
                  "tag @s remove modo_ativado_2",
                  "event entity @s marca:desativar",
                  "tag @s remove marca_cooldown",
                  "event entity @s desativar_slot_2"
]},

marca_v3: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "playsound marca_2 @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aMarca da Maldiçao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 60",
                  "scoreboard players add @s dano_stats 7",
                  "effect @s speed 180 1 true",            
                  "tag @s add modo_ativado_2",
                  "tag @s add marca_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 60",
                  "scoreboard players remove @s dano_stats 7",
                  "effect @s speed 0 0 true",            
                  "tag @s remove modo_ativado_2",
                  "event entity @s marca:desativar",
                  "tag @s remove marca_cooldown",
                  "event entity @s desativar_slot_2"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


modo_sennin_incompleto: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aModo Sennin §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 40",
                  "scoreboard players add @s dano_stats 6",
                  "effect @s speed 180 2 true",            
                  "effect @s resistance 180 1 true",
                  "tag @s add modo_ativado_2",
                  "tag @s add sennin_sapo_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 40",
                  "scoreboard players remove @s dano_stats 6",
                  "effect @s speed 0 0 true",            
                  "effect @s resistance 0 0 true",
                  "tag @s remove modo_ativado_2",
                  "event entity @s sennin:desativar",
                  "tag @s remove sennin_sapo_cooldown",
                  "event entity @s desativar_slot_2"
]},

modo_sennin_perfeito: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aModo Sennin §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 120",
                  "scoreboard players add @s dano_stats 12",
                  "effect @s speed 360 2 true",            
                  "effect @s resistance 360 1 true",
                  "tag @s add modo_ativado_2",
                  "tag @s add sennin_sapo_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 120",
                  "scoreboard players remove @s dano_stats 12",
                  "effect @s speed 0 0 true",            
                  "effect @s resistance 0 0 true",
                  "tag @s remove modo_ativado_2",
                  "event entity @s sennin:desativar",
                  "tag @s remove sennin_sapo_cooldown",
                  "event entity @s desativar_slot_2"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


portao_1: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 120,
          cmdStart: [
                 "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aPrimeiro Portao §eAtivado\"}]}",
                  "scoreboard players add @s dano_stats 4",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s dano_stats 4",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_2: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 120,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aSegundo Portao §eAtivado\"}]}",
                  "scoreboard players add @s dano_stats 4",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s dano_stats 4",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_3: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 120,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aTerceiro Portao §eAtivado\"}]}",
                  "scoreboard players add @s dano_stats 5",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s dano_stats 5",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_4: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aQuarto Portao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 20",
                  "scoreboard players add @s dano_stats 6",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 20",
                  "scoreboard players remove @s dano_stats 6",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_5: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 180,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aQuinto Portao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 25",
                  "scoreboard players add @s dano_stats 6",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 25",
                  "scoreboard players remove @s dano_stats 6",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_6: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
                  "playsound modo_sabio @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aSexto Portao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 80",
                  "scoreboard players add @s dano_stats 8",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 80",
                  "scoreboard players remove @s dano_stats 8",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_7: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
                  "playsound rinnegan @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aSetimo Portao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 400",
                  "scoreboard players add @s dano_stats 14",
                  "effect @s speed 180 2 true",            
                  "effect @s resistance 180 1 true",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
          "effect @s slowness 10 1 true",
          "effect @s weakness 10 0 true",
                  "scoreboard players remove @s health_stats3 400",
                  "scoreboard players remove @s dano_stats 14",
                  "effect @s speed 0 0 true",            
                  "effect @s resistance 0 0 true",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},

portao_8: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 120,
          cmdStart: [
                  "playsound rinnegan @a[r=15] ^^^2",
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aOitavo Portao §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 800",
                  "scoreboard players add @s dano_stats 30",
                  "effect @s speed 120 3 true",            
                  "effect @s resistance 120 2 true",
                  "tag @s add modo_ativado_2",
                  "tag @s add portoes_cooldown"
          ],cmdFinish: [
          "effect @s slowness 30 2 true",
          "effect @s weakness 30 1 true",
          "effect @s mining_fatigue 30 2 true",
          "scoreboard players set @s chakra 0",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[!] §7O Portão da Morte cobrou seu preço: corpo exausto e chakra esgotado.\"}]}",
                  "scoreboard players remove @s health_stats3 800",
                  "scoreboard players remove @s dano_stats 30",
                  "effect @s speed 0 0 true",            
                  "effect @s resistance 0 0 true",
                  "tag @s remove modo_ativado_2",
                  "event entity @s portoes:desativar",
                  "tag @s remove portoes_cooldown",
                  "event entity @s desativar_slot_2"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


byakugou_ativado: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
                  "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aByakugou §eAtivado\"}]}",
                  "scoreboard players add @s health_stats3 60",
                  "scoreboard players add @s dano_stats 8",
                  "tag @s add modo_ativado_2",
                  "tag @s add byakugou_cooldown"
          ],cmdFinish: [
                  "scoreboard players remove @s health_stats3 60",
                  "scoreboard players remove @s dano_stats 8",
                  "tag @s remove modo_ativado_2",
                  "event entity @s byakugou:marca",
                  "tag @s remove byakugou_cooldown"
]},

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


suigetsu: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
          "playsound modo_sabio @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aSuigetsu §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 1 tnt:suigetsu_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats3 80",
          "scoreboard players add @s dano_stats 7",
          "tag @s add modo_ativado_2",
          "tag @s add suigetsu_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 1 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats3 80",
          "scoreboard players remove @s dano_stats 7",
          "tag @s remove modo_ativado_2",
          "event entity @s desativar_slot_2",
          "tag @s remove suigetsu_cooldown"
]},


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


rinnegan_esquerdo: {
          scoreTime: "tempo_doujutsu_slot_2",
          tempo: 360,
          cmdStart: [
          "playsound rinnegan @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.2]§f: §aRinnegan §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 1 tnt:rinnegan_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats3 150",
          "scoreboard players add @s dano_stats 14",
          "tag @s add modo_ativado",
          "effect @s speed 360 2 true",            
          "effect @s resistance 360 1 true",
          "tag @s add rinnegan_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 1 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "event entity @s desativar_slot_2",
          "scoreboard players remove @s health_stats3 150",
          "scoreboard players remove @s dano_stats 14",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "tag @s remove rinnegan_cooldown"
]},





//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


manto_kurama_1: {
          scoreTime: "tempo_doujutsu",
          tempo: 120,
          cmdStart: [
          "playsound manto_chakra_biju @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:manto_kurama_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 60",
          "scoreboard players add @s dano_stats 4",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 60",
          "scoreboard players remove @s dano_stats 4",
          "tag @s remove modo_ativado",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

manto_kurama_3: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound manto_chakra_biju @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:manto_kurama_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 80",
          "scoreboard players add @s dano_stats 7",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 80",
          "scoreboard players remove @s dano_stats 7",
          "tag @s remove modo_ativado",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

manto_kurama_4: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound manto_kurama_4 @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:manto_kurama_4_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 120",
          "scoreboard players add @s dano_stats 12",
          "effect @s instant_health 1 10 true",
          "effect @s speed 180 2 true",               
          "effect @s resistance 180 1 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 120",
          "scoreboard players remove @s dano_stats 12",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

manto_kurama_6: {
          scoreTime: "tempo_doujutsu",
          tempo: 120,
          cmdStart: [
          "playsound manto_kurama_4 @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:manto_kurama_4_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 160",
          "scoreboard players add @s dano_stats 16",
          "effect @s instant_health 1 10 true",
          "effect @s speed 120 2 true",               
          "effect @s resistance 180 1 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 160",
          "scoreboard players remove @s dano_stats 16",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

mk_1: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound mk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto De Chakra Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:manto_kurama_4_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 200",
          "scoreboard players add @s dano_stats 10",
          "effect @s instant_health 1 10 true",
          "effect @s speed 180 3 true",            
          "effect @s resistance 180 1 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 200",
          "scoreboard players remove @s dano_stats 10",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

mk_2: {
          scoreTime: "tempo_doujutsu",
          tempo: 180,
          cmdStart: [
          "playsound mk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aManto De Chakra Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:mk2_skill_1 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 350",
          "scoreboard players add @s dano_stats 14",
          "effect @s instant_health 1 10 true",
          "effect @s speed 120 3 true",          
          "effect @s resistance 120 1 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 350",
          "scoreboard players remove @s dano_stats 14",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

rikudou_kurama: {
          scoreTime: "tempo_doujutsu",
          tempo: 150,
          cmdStart: [
          "playsound mk @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aModo Rikudou Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 1200",
          "scoreboard players add @s dano_stats 22",
          "effect @s instant_health 1 10 true",
          "effect @s speed 150 3 true",          
          "effect @s resistance 150 2 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 1200",
          "scoreboard players remove @s dano_stats 22",
          "tag @s remove modo_ativado",
          "effect @s speed 0 0 true",            
          "effect @s resistance 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]},

barion_kurama: {
          scoreTime: "tempo_doujutsu",
          tempo: 120,
          cmdStart: [
          "playsound barion @a[r=15] ^^^2",
          "tellraw @s {\"rawtext\":[{\"text\":\"§c[slot.1]§f: §aModo Barion Kurama §eAtivado\"}]}",
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players add @s health_stats2 2000",
          "scoreboard players add @s dano_stats 5",
          "effect @s resistance 120 3 true",
          "effect @s instant_health 1 20 true",
          "effect @s speed 120 4 true",
          "tag @s add modo_ativado",
          "tag @s add kurama_cooldown"
          ],cmdFinish: [
          "replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {\"minecraft:keep_on_death\":{},\"item_lock\":{\"mode\":\"lock_in_slot\"}}",
          "scoreboard players remove @s health_stats2 2000",
          "scoreboard players remove @s dano_stats 5",
          "effect @s mining_fatigue 20 5 true",
          "effect @s slowness 20 2 true",
          "scoreboard players set @s chakra 0",
          "tag @s remove modo_ativado",
          "effect @s resistance 0 0 true",
          "effect @s speed 0 0 true",
          "event entity @s kurama:desativar_manto",
          "tag @s remove kurama_cooldown"
]}


};