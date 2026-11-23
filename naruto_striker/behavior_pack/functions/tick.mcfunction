hud @s hide item_text

scoreboard players remove @s[scores={dash=1..}] dash 1


execute as @s[tag=!start_vip] run function vip_list

execute as @s[tag=!start] run function start
execute as @s[scores={slot_select=8..200}] run scoreboard players set @s slot_select 1
execute as @s[scores={slot_select=..0}] run scoreboard players set @s slot_select 1
# execute_jutsus agora roda 1x por tick por dimensao (scripts/ns/otimizacoes.js), nao 1x por jogador
function infinito
 