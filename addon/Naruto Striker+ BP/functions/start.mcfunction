function menu_hyuga/reset
function menu_uchiha/reset
function menu_all_modos/reset

hud @s hide health 
hud @s hide status_effects

scoreboard objectives add skill_selados_timer dummy
scoreboard players set @s skill_selados_timer 0
tag @s remove skill_selados
tag @s remove skill_selados_skill

scoreboard objectives add chakra_acumulado dummy
scoreboard players set @s chakra_acumulado 0

scoreboard objectives add charge_bijuu dummy
scoreboard players set @s charge_bijuu 0

scoreboard objectives add charge_bijuu_max dummy
scoreboard players set @s charge_bijuu_max 100

scoreboard objectives add pesos_guy dummy
scoreboard players set @s pesos_guy 12000

scoreboard objectives add bndidos_c_miss dummy
scoreboard players set @s bndidos_c_miss 0

scoreboard objectives add missao_classico dummy
scoreboard players set @s missao_classico 1

scoreboard objectives add bndidos_a_miss dummy
scoreboard players set @s bndidos_a_miss 0

scoreboard objectives add pergminho_konoha dummy
scoreboard players set @s pergminho_konoha 0

scoreboard objectives add gatos_miss dummy
scoreboard players set @s gatos_miss 0

scoreboard objectives add cooldown_miss dummy
scoreboard players set @s cooldown_miss 0
scoreboard objectives add cooldown_miss_tick dummy
scoreboard players set @s cooldown_miss_tick 0


#wg
#gamerule naturalregeneration false

scoreboard objectives add current_health dummy
scoreboard players set @s current_health 20

scoreboard objectives add tempo_doujutsu dummy
scoreboard players set @s tempo_doujutsu 0

scoreboard objectives add tempo_doujutsu_slot_2 dummy
scoreboard players set @s tempo_doujutsu_slot_2 0

scoreboard objectives add tempo_modos dummy
scoreboard players set @s tempo_modos 0

scoreboard objectives add health_stats2 dummy
scoreboard players set @s health_stats2 0

scoreboard objectives add health_stats3 dummy
scoreboard players set @s health_stats3 0

scoreboard objectives add health_dna dummy
scoreboard players set @s health_dna 0

event entity @s tnt:hp


scoreboard objectives add clans dummy
scoreboard players set @s clans 2

scoreboard objectives add chakra dummy
scoreboard objectives add chakra_max dummy
scoreboard players set @s chakra 100
scoreboard players set @s chakra_max 100

scoreboard objectives add isanagi dummy
scoreboard players set @s isanagi 7

scoreboard objectives add tp dummy
scoreboard players set @s tp 0

scoreboard objectives add health_stats dummy
scoreboard players set @s health_stats 0

scoreboard objectives add dano_stats dummy
scoreboard players set @s dano_stats 1

replaceitem entity @s slot.hotbar 4 tnt:menu_custon 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 
replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 
replaceitem entity @s slot.hotbar 1 tnt:item_lock 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 
replaceitem entity @s slot.hotbar 7 tnt:menu_all_modos 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 
replaceitem entity @s slot.hotbar 8 tnt:menu_all_modos_evoluir 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 


tellraw @s {"rawtext":[{"text":"§c[!] §aSeja Bem Vindo, ao Naruto Stiker"}]}




tag @s remove missao_1_c
tag @s remove missao_2_c
tag @s remove missao_3_c
tag @s remove missao_4_c
tag @s remove missao_5_c
tag @s remove missao_6_c
tag @s remove missao_7_c



tag @s add status_chakra_v1_lmt
tag @s add status_chakra_v2_lmt
tag @s add status_chakra_v3_lmt



function menu_all_modos/reset
function reset_menu_modos_unlock
tag @s add start
