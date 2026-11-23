hud @s hide item_text

scoreboard players remove @a[scores={dash=1..}] dash 1


execute as @a[tag=!start_vip] run function vip_list

execute as @a[tag=!start] run function start
execute as @s[scores={slot_select=8..200}] run scoreboard players set @s slot_select 1
execute as @s[scores={slot_select=..0}] run scoreboard players set @s slot_select 1
function execute_jutsus
function infinito
 